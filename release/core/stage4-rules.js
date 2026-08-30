(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage3-rules.js'),
      require('./social.js'),
      require('./npc-simulation.js'),
      require('./sect-simulation.js'),
      require('./world-month.js'),
      require('../content/regions.js'),
      require('../content/sects.js')
    )
    : factory(
      root && root.Stage3Rules,
      root && root.Social,
      root && root.NpcSimulation,
      root && root.SectSimulation,
      root && root.WorldMonth,
      root && root.RegionContent,
      root && root.SectContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4Rules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultStage3Rules,
  Social,
  NpcSimulation,
  SectSimulation,
  WorldMonth,
  RegionContent,
  SectContent
) {
  'use strict';

  const ACTIVE_STEP_SECONDS = 900;
  const BACKGROUND_STEP_SECONDS = 21600;
  const SECT_STEP_SECONDS = 86400;
  // 离线一次结算内各车道最多完整推演的步数；超出只吃掉时间、跳过细节。
  const OFFLINE_ACTIVE_STEP_CAP = 96;
  const OFFLINE_BACKGROUND_STEP_CAP = 24;
  const OFFLINE_SECT_STEP_CAP = 48;

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function replace(target, source) {
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.keys(source).forEach(function (key) { target[key] = source[key]; });
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function currentAction(state) {
    return state && state.current &&
      typeof state.current.key === 'string'
      ? state.current
      : null;
  }

  function socialDescriptor(state) {
    const current = currentAction(state);
    if (!current) return null;
    const action = Social.parseActionKey(current.key);
    if (!action) return null;
    return {
      key: action.key,
      kind: 'social',
      npcId: action.npcId,
      interactionId: action.interactionId,
      itemId: action.itemId,
      duration: Social.duration(state, action)
    };
  }

  function create(deps) {
    const source = deps && typeof deps === 'object' ? deps : {};
    const Stage3Rules = source.Stage3Rules || DefaultStage3Rules;
    if (!Stage3Rules || typeof Stage3Rules.create !== 'function') {
      throw new TypeError('deps.Stage3Rules.create is required');
    }
    const baseRuntime = Stage3Rules.create(deps);
    if (!baseRuntime ||
        !baseRuntime.rules ||
        !Array.isArray(baseRuntime.lanes)) {
      throw new TypeError('Stage 3 runtime is invalid');
    }
    const baseRules = baseRuntime.rules;
    [
      'start',
      'getAction',
      'nextBoundary',
      'elapse',
      'inspect',
      'complete',
      'random'
    ].forEach(function (name) {
      if (typeof baseRules[name] !== 'function') {
        throw new TypeError('Stage 3 rules.' + name + ' is required');
      }
    });
    function start(state, key, nowMs) {
      if (state &&
          state.player &&
          ((state.player.lifecycle &&
            state.player.lifecycle.status === 'safety_buffer') ||
           (Number.isFinite(state.player.shouyuan) &&
            state.player.shouyuan <= 1))) {
        return {
          ok: false,
          code: 'lifespan_buffer',
          state: clone(state)
        };
      }
      if (typeof key !== 'string' || key.indexOf('social:') !== 0) {
        return baseRules.start(state, key, nowMs);
      }
      const action = Social.parseActionKey(key);
      if (!action) {
        return { ok: false, code: 'invalid_action', state: clone(state) };
      }
      // 主动社交进入并行队列，不占用主行动槽。
      const queued = Social.enqueue(
        state,
        action.npcId,
        action.interactionId,
        action.itemId,
        source
      );
      if (!queued || !queued.ok) {
        return {
          ok: false,
          code: queued && queued.code,
          state: clone(state)
        };
      }
      return {
        ok: true,
        code: queued.code || 'ok',
        state: queued.state,
        value: queued.value || null
      };
    }

    function selected(descriptor) {
      return descriptor && descriptor.kind === 'social'
        ? rules
        : baseRules;
    }

    function worldHelpers(helpers) {
      const wrap = {
        random: helpers.random,
        report: helpers.report,
        source: helpers && helpers.source,
        nowSeconds: function () { return helpers.nowMs() / 1000; }
      };
      Object.defineProperty(wrap, 'offlineMonthBudget', {
        enumerable: true,
        configurable: true,
        get: function () {
          return helpers ? helpers.offlineMonthBudget : null;
        },
        set: function (value) {
          if (helpers) helpers.offlineMonthBudget = value;
        }
      });
      return wrap;
    }

    function offerFirstSectChoice(state, helpers) {
      if (!state.player ||
          !SectSimulation ||
          typeof SectSimulation.onFirstActionCompleted !== 'function') {
        return;
      }
      if (!state.player.flags) state.player.flags = {};
      state.player.flags.completedFirstAction = true;
      const offered = SectSimulation.onFirstActionCompleted(
        state,
        worldHelpers(helpers)
      );
      if (offered && offered.ok) replace(state, offered.state);
    }

    function recordSocial(report, value, action) {
      if (!report.social) {
        report.social = {
          completed: [],
          relationshipChanges: [],
          misunderstandings: []
        };
      }
      report.social.completed.push({
        npcId: value.npcId,
        interactionId: value.interactionId,
        label: value.label,
        narrative: value.narrative || value.label
      });
      report.social.relationshipChanges.push({
        npcId: value.npcId,
        playerToPerson: value.playerToPerson,
        personToPlayer: value.personToPlayer
      });
      if (value.misunderstood) {
        report.social.misunderstandings.push({
          npcId: value.npcId,
          interactionId: value.interactionId
        });
      }
      report.gains.skillXp.charm =
        finite(report.gains.skillXp.charm, 0) + value.charmXp;
      report.gains.cultivation =
        finite(report.gains.cultivation, 0) + value.cultivation;
      if (action.itemId) {
        report.costs.items[action.itemId] =
          finite(report.costs.items[action.itemId], 0) + 1;
      }
    }

    const rules = Object.freeze({
      start: start,
      getAction: function (state) {
        return socialDescriptor(state) || baseRules.getAction(state);
      },
      nextBoundary: function (state, descriptor, helpers) {
        if (selected(descriptor) !== rules) {
          return baseRules.nextBoundary(state, descriptor, helpers);
        }
        return Math.max(
          0,
          descriptor.duration - finite(state.current.elapsed, 0)
        );
      },
      elapse: function (state, descriptor, seconds, helpers) {
        if (selected(descriptor) !== rules) {
          return baseRules.elapse(state, descriptor, seconds, helpers);
        }
        state.current.elapsed =
          finite(state.current.elapsed, 0) + seconds;
        state.current.stalled = false;
      },
      inspect: function (state, descriptor) {
        if (selected(descriptor) !== rules) {
          return baseRules.inspect(state, descriptor);
        }
        const current = currentAction(state);
        if (!current || current.done >= current.count) {
          return { status: 'stop', reason: 'completed' };
        }
        const available = Social.isAvailable(
          state,
          descriptor.npcId,
          descriptor.interactionId,
          descriptor.itemId,
          source
        );
        return available.ok
          ? { status: 'ready', reason: null }
          : { status: 'stop', reason: 'requirements_invalid' };
      },
      complete: function (state, descriptor, helpers) {
        if (selected(descriptor) !== rules) {
          const before = finite(helpers.report.action.completed, 0);
          const result = baseRules.complete(state, descriptor, helpers);
          if (finite(helpers.report.action.completed, 0) > before) {
            offerFirstSectChoice(state, helpers);
          }
          return result;
        }
        const action = Social.parseActionKey(descriptor.key);
        const completed = Social.complete(
          state,
          action,
          {
            nowSeconds: function () {
              return helpers.nowMs() / 1000;
            },
            random: helpers.random
          },
          source
        );
        if (!completed.ok) {
          return { stopReason: 'requirements_invalid' };
        }
        const remainder = Math.max(
          0,
          finite(state.current.elapsed, 0) - descriptor.duration
        );
        replace(state, completed.state);
        state.current.elapsed = remainder;
        state.current.elapsedAnchorMs = helpers.nowMs();
        state.current.elapsedBaseSeconds = remainder;
        state.current.done = finite(state.current.done, 0) + 1;
        state.current.stalled = false;
        helpers.report.action.completed++;
        recordSocial(helpers.report, completed.result, action);
        offerFirstSectChoice(state, helpers);
        return { stopReason: 'completed' };
      },
      random: function (state) {
        return baseRules.random(state);
      }
    });

    const benefitLane = Object.freeze({
      id: 'social-benefits',
      nextBoundary: function (state, helpers) {
        const benefits = state.systems &&
          state.systems.social &&
          state.systems.social.benefits;
        if (!Array.isArray(benefits)) return Infinity;
        let next = Infinity;
        benefits.forEach(function (benefit) {
          const remaining = Math.max(
            0,
            finite(benefit.remainingSeconds, 0)
          );
          if (remaining < next) next = remaining;
        });
        return offlineBatchBoundary(helpers, next);
      },
      elapse: function (state, seconds) {
        const benefits = state.systems &&
          state.systems.social &&
          state.systems.social.benefits;
        if (!Array.isArray(benefits)) return;
        benefits.forEach(function (benefit) {
          benefit.remainingSeconds = Math.max(
            0,
            finite(benefit.remainingSeconds, 0) - seconds
          );
        });
      },
      resolve: function (state) {
        const benefits = state.systems &&
          state.systems.social &&
          state.systems.social.benefits;
        if (!Array.isArray(benefits)) return;
        state.systems.social.benefits = benefits.filter(function (benefit) {
          return finite(benefit.remainingSeconds, 0) > 0;
        });
      }
    });

    function socialJobs(state) {
      const jobs = state.systems &&
        state.systems.parallel &&
        state.systems.parallel.jobs;
      return Array.isArray(jobs)
        ? jobs.filter(function (job) {
          return job && job.kind === 'social';
        })
        : [];
    }

    const parallelSocialLane = Object.freeze({
      id: 'social-parallel',
      nextBoundary: function (state, helpers) {
        let next = Infinity;
        socialJobs(state).forEach(function (job) {
          if (job.ready === true) {
            next = 0;
            return;
          }
          const remaining = Math.max(
            0,
            finite(job.remainingSeconds, 0)
          );
          if (remaining < next) next = remaining;
        });
        return offlineBatchBoundary(helpers, next);
      },
      elapse: function (state, seconds) {
        socialJobs(state).forEach(function (job) {
          if (job.ready === true) return;
          job.remainingSeconds = Math.max(
            0,
            finite(job.remainingSeconds, 0) - seconds
          );
        });
      },
      resolve: function (state, helpers) {
        const jobs = state.systems.parallel.jobs;
        jobs.forEach(function (job) {
          if (!job || job.kind !== 'social' || job.ready === true) return;
          if (finite(job.remainingSeconds, 0) > 0) return;
          job.ready = true;
          if (job.completionReported !== true) {
            helpers.report.passive.parallelCompleted.push({
              id: job.id,
              npcId: job.npcId,
              label: job.label
            });
            job.completionReported = true;
          }
        });

        // 玩家主动社交：到时直接结算；带 followup 的遗留任务直接丢弃（无待决策）。
        for (let index = jobs.length - 1; index >= 0; index--) {
          const job = jobs[index];
          if (!job || job.kind !== 'social' || job.ready !== true) continue;
          if (job.followupTemplateId) {
            jobs.splice(index, 1);
            continue;
          }
          if (!(job.actionKey || job.interactionId)) continue;
          const action = job.actionKey
            ? Social.parseActionKey(job.actionKey)
            : {
              key: null,
              npcId: job.npcId,
              interactionId: job.interactionId,
              itemId: job.itemId || job.paidItemId || null
            };
          if (!action) {
            jobs.splice(index, 1);
            continue;
          }
          jobs.splice(index, 1);
          const completed = Social.complete(
            state,
            action,
            {
              nowSeconds: function () {
                return helpers.nowMs() / 1000;
              },
              random: helpers.random
            },
            source,
            { giftPrepaid: !!job.paidItemId }
          );
          if (!completed.ok) continue;
          replace(state, completed.state);
          recordSocial(
            helpers.report,
            completed.result || completed.value,
            action
          );
          offerFirstSectChoice(state, helpers);
        }
      }
    });

    function world(state) {
      return state.systems && state.systems.world;
    }

    function accumulatorBoundary(state, key, step) {
      const current = finite(world(state) && world(state)[key], 0);
      return Math.max(0, step - current);
    }

    function offlineBatchBoundary(helpers, onlineBoundary) {
      if (!helpers || helpers.source !== 'offline') return onlineBoundary;
      if (onlineBoundary === 0) return 0;
      const rem = helpers.remainingSeconds;
      if (Number.isFinite(rem) && rem > 0) return rem;
      return onlineBoundary;
    }

    function addAccumulator(state, key, seconds) {
      const target = world(state);
      if (!target) return;
      target[key] = finite(target[key], 0) + seconds;
    }

    function subtractAccumulator(state, key, step) {
      const target = world(state);
      if (!target) return;
      target[key] = Math.max(0, finite(target[key], 0) - step);
    }

    function burnWholeSteps(state, key, step) {
      const target = world(state);
      if (!target || !(step > 0)) return;
      const acc = finite(target[key], 0);
      const skip = Math.floor(acc / step);
      if (skip > 0) target[key] = acc - skip * step;
    }

    function drainAccumulatorSteps(state, key, step, maxSteps, onStep) {
      let count = 0;
      while (finite(world(state) && world(state)[key], 0) >= step &&
          count < maxSteps) {
        subtractAccumulator(state, key, step);
        onStep();
        count += 1;
      }
      return count;
    }

    const activeNpcLane = Object.freeze({
      id: 'stage4-active-npcs',
      nextBoundary: function (state, helpers) {
        if (!world(state)) return Infinity;
        return offlineBatchBoundary(
          helpers,
          accumulatorBoundary(state, 'activeAccumulator', ACTIVE_STEP_SECONDS)
        );
      },
      elapse: function (state, seconds, helpers) {
        const target = world(state);
        if (!target) return;
        target.elapsedSeconds = finite(target.elapsedSeconds, 0) + seconds;
        addAccumulator(state, 'activeAccumulator', seconds);
        // 4C：全体在世 NPC 缓慢堆修为并尝试突破（与玩家同量级需求表）。
        // 事件仍只刷关系圈；修炼与事件解耦。
        if (NpcSimulation &&
            typeof NpcSimulation.advanceAges === 'function') {
          NpcSimulation.advanceAges(state, seconds);
        }
        if (NpcSimulation &&
            typeof NpcSimulation.advanceCultivation === 'function') {
          NpcSimulation.advanceCultivation(state, seconds, helpers || {});
        }
      },
      resolve: function (state, helpers) {
        const offline = helpers && helpers.source === 'offline';
        const maxSteps = offline ? OFFLINE_ACTIVE_STEP_CAP : 8;
        // P5：旧版每 tick 调用 NpcSimulation.advanceActiveStep，让全体活跃 NPC
        // 自主修炼 / 游历 / 结交 / 换宗——即「模拟一个 NPC 世界」，且 NPC 会
        // 自主产生事件。该自主模拟已在 core/npc-simulation.js 重写中彻底移除：
        // NPC 不再自主生活、不再自主产出事件，只在玩家关系网里被 world-month.js
        // 唤醒。此处仅排空累加器以维持节拍记账，不再执行任何旧版自主逻辑。
        drainAccumulatorSteps(
          state,
          'activeAccumulator',
          ACTIVE_STEP_SECONDS,
          maxSteps,
          function () {}
        );
        if (offline) burnWholeSteps(state, 'activeAccumulator', ACTIVE_STEP_SECONDS);
      }
    });

    const backgroundNpcLane = Object.freeze({
      id: 'stage4-background-npcs',
      nextBoundary: function (state, helpers) {
        if (!world(state)) return Infinity;
        return offlineBatchBoundary(
          helpers,
          accumulatorBoundary(
            state,
            'backgroundAccumulator',
            BACKGROUND_STEP_SECONDS
          )
        );
      },
      elapse: function (state, seconds) {
        addAccumulator(state, 'backgroundAccumulator', seconds);
      },
      resolve: function (state, helpers) {
        const offline = helpers && helpers.source === 'offline';
        const maxSteps = offline ? OFFLINE_BACKGROUND_STEP_CAP : 4;
        // P5：旧版每 tick 调用 NpcSimulation.advanceBackgroundStep，对后台 NPC
        // 做同样的自主生存模拟。该逻辑已随 P5 重写彻底移除（见 core/npc-simulation.js）。
        // 后台 NPC 仍随真实时间走被动生命周期（在 activeNpcLane.elapse 的
        // advanceAges / advanceCultivation 中统一结算），此处仅排空累加器。
        drainAccumulatorSteps(
          state,
          'backgroundAccumulator',
          BACKGROUND_STEP_SECONDS,
          maxSteps,
          function () {}
        );
        if (offline) {
          burnWholeSteps(
            state,
            'backgroundAccumulator',
            BACKGROUND_STEP_SECONDS
          );
        }
      }
    });

    const sectLane = Object.freeze({
      id: 'stage4-sects',
      nextBoundary: function (state, helpers) {
        if (!world(state)) return Infinity;
        return offlineBatchBoundary(
          helpers,
          accumulatorBoundary(state, 'sectAccumulator', SECT_STEP_SECONDS)
        );
      },
      elapse: function (state, seconds) {
        addAccumulator(state, 'sectAccumulator', seconds);
      },
      resolve: function (state, helpers) {
        const offline = helpers && helpers.source === 'offline';
        const maxSteps = offline ? OFFLINE_SECT_STEP_CAP : 4;
        drainAccumulatorSteps(
          state,
          'sectAccumulator',
          SECT_STEP_SECONDS,
          maxSteps,
          function () {
            if (!SectSimulation ||
                typeof SectSimulation.advanceDay !== 'function') return;
            const evolved = SectSimulation.advanceDay(
              state,
              worldHelpers(helpers),
              { sects: SectContent }
            );
            if (evolved && evolved.ok) replace(state, evolved.state);
          }
        );
        if (offline) burnWholeSteps(state, 'sectAccumulator', SECT_STEP_SECONDS);
      }
    });

    const worldMonthLane = Object.freeze({
      id: 'stage4-world-month',
      nextBoundary: function (state, helpers) {
        const target = world(state);
        if (!target || !WorldMonth ||
            typeof WorldMonth.ensureCalendar !== 'function') {
          return Infinity;
        }
        const cal = WorldMonth.ensureCalendar(target);
        const acc = finite(cal.monthAccumulator, 0);
        // 已攒满整月必须立刻 resolve；不可再人为加大边界，否则会被
        // 900 秒 NPC 车道永远抢先，离线时世界见闻永不生成。
        if (acc >= WorldMonth.MONTH_REAL_SECONDS) return 0;
        const onlineBoundary = WorldMonth.MONTH_REAL_SECONDS - acc;
        return offlineBatchBoundary(helpers, onlineBoundary);
      },
      elapse: function (state, seconds) {
        const target = world(state);
        if (!target || !WorldMonth ||
            typeof WorldMonth.ensureCalendar !== 'function') {
          return;
        }
        const cal = WorldMonth.ensureCalendar(target);
        cal.monthAccumulator = finite(cal.monthAccumulator, 0) + seconds;
      },
      resolve: function (state, helpers) {
        const target = world(state);
        if (!target || !WorldMonth) {
          return;
        }
        WorldMonth.ensureCalendar(target);
        const cal = target.calendar;
        const months = Math.floor(
          finite(cal.monthAccumulator, 0) / WorldMonth.MONTH_REAL_SECONDS
        );
        if (months <= 0) return;
        cal.monthAccumulator = finite(cal.monthAccumulator, 0) -
          months * WorldMonth.MONTH_REAL_SECONDS;
        // 长离线一次 resolve 可推进多月；超额由 advanceMonths / offlineMonthBudget 封顶。
        if (typeof WorldMonth.advanceMonths === 'function') {
          WorldMonth.advanceMonths(
            state,
            months,
            worldHelpers(helpers)
          );
          return;
        }
        for (let index = 0; index < months; index++) {
          WorldMonth.advanceOneMonth(state, worldHelpers(helpers));
        }
      }
    });

    return Object.freeze({
      rules: rules,
      lanes: Object.freeze(
        baseRuntime.lanes.concat([
          benefitLane,
          parallelSocialLane,
          activeNpcLane,
          backgroundNpcLane,
          sectLane,
          worldMonthLane
        ])
      )
    });
  }

  return Object.freeze({
    ACTIVE_STEP_SECONDS: ACTIVE_STEP_SECONDS,
    BACKGROUND_STEP_SECONDS: BACKGROUND_STEP_SECONDS,
    SECT_STEP_SECONDS: SECT_STEP_SECONDS,
    create: create
  });
});
