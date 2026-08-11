(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage3-rules.js'),
      require('./social.js'),
      require('./event-engine.js'),
      require('./npc-simulation.js'),
      require('./sect-simulation.js'),
      require('../content/event-templates.js'),
      require('../content/regions.js'),
      require('../content/sects.js')
    )
    : factory(
      root && root.Stage3Rules,
      root && root.Social,
      root && root.EventEngine,
      root && root.NpcSimulation,
      root && root.SectSimulation,
      root && root.EventTemplateContent,
      root && root.RegionContent,
      root && root.SectContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage4Rules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultStage3Rules,
  Social,
  EventEngine,
  NpcSimulation,
  SectSimulation,
  EventTemplateContent,
  RegionContent,
  SectContent
) {
  'use strict';

  const ACTIVE_STEP_SECONDS = 900;
  const BACKGROUND_STEP_SECONDS = 21600;
  const SECT_STEP_SECONDS = 86400;
  const EVENT_SLOT_SECONDS = 7200;

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
    const templates = source.eventTemplates ||
      (EventTemplateContent && EventTemplateContent.TEMPLATES) ||
      [];

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
      const available = Social.isAvailable(
        state,
        action.npcId,
        action.interactionId,
        action.itemId,
        source
      );
      if (!available.ok) {
        return { ok: false, code: available.code, state: clone(state) };
      }
      const next = clone(state);
      if (!next) return { ok: false, code: 'invalid_state', state: state };
      if (next.current && next.current.key === key) {
        return { ok: true, code: 'no_change', state: next };
      }
      if (next.current) {
        next.lastActionStop = {
          key: next.current.key,
          reason: 'switched',
          atMs: Number.isFinite(nowMs) && nowMs >= 0 ? nowMs : 0
        };
        if (next.systems &&
            next.systems.combat &&
            typeof next.current.key === 'string' &&
            next.current.key.indexOf('combat:') === 0) {
          next.systems.combat.session = null;
        }
      }
      next.current = {
        key: key,
        mode: 'finite',
        count: 1,
        done: 0,
        elapsed: 0,
        elapsedAnchorMs: null,
        elapsedBaseSeconds: null,
        stalled: false
      };
      return { ok: true, code: 'ok', state: next };
    }

    function selected(descriptor) {
      return descriptor && descriptor.kind === 'social'
        ? rules
        : baseRules;
    }

    function worldHelpers(helpers) {
      return {
        random: helpers.random,
        report: helpers.report,
        nowSeconds: function () { return helpers.nowMs() / 1000; }
      };
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
        worldHelpers(helpers),
        { templates: templates }
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
        label: value.label
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
      nextBoundary: function (state) {
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
        return next;
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

    function pendingCount(state) {
      const pending = state.systems &&
        state.systems.events &&
        state.systems.events.pending;
      return Array.isArray(pending) ? pending.length : 0;
    }

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
      nextBoundary: function (state) {
        let next = Infinity;
        socialJobs(state).forEach(function (job) {
          if (job.ready === true) {
            if (pendingCount(state) < 20) next = 0;
            return;
          }
          const remaining = Math.max(
            0,
            finite(job.remainingSeconds, 0)
          );
          if (remaining < next) next = remaining;
        });
        return next;
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
        const ready = jobs.filter(function (job) {
          return job && job.kind === 'social' && job.ready === true;
        }).sort(function (left, right) {
          return left.id.localeCompare(right.id);
        });
        for (let index = 0;
            index < ready.length && pendingCount(state) < 20;
            index++) {
          const job = ready[index];
          const created = EventEngine.instantiate(
            state,
            job.followupTemplateId,
            job.context,
            {
              nowSeconds: function () {
                return helpers.nowMs() / 1000;
              }
            },
            templates
          );
          if (!created.ok) continue;
          replace(state, created.state);
          const queued = EventEngine.enqueue(state, created.event);
          if (!queued.ok) continue;
          replace(state, queued.state);
          const removeIndex = state.systems.parallel.jobs.findIndex(
            function (candidate) {
              return candidate && candidate.id === job.id;
            }
          );
          if (removeIndex >= 0) {
            state.systems.parallel.jobs.splice(removeIndex, 1);
          }
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

    const activeNpcLane = Object.freeze({
      id: 'stage4-active-npcs',
      nextBoundary: function (state) {
        return world(state)
          ? accumulatorBoundary(
            state,
            'activeAccumulator',
            ACTIVE_STEP_SECONDS
          )
          : Infinity;
      },
      elapse: function (state, seconds) {
        const target = world(state);
        if (!target) return;
        target.elapsedSeconds = finite(target.elapsedSeconds, 0) + seconds;
        addAccumulator(state, 'activeAccumulator', seconds);
        if (NpcSimulation &&
            typeof NpcSimulation.advanceAges === 'function') {
          NpcSimulation.advanceAges(state, seconds);
        }
      },
      resolve: function (state, helpers) {
        subtractAccumulator(
          state,
          'activeAccumulator',
          ACTIVE_STEP_SECONDS
        );
        if (NpcSimulation &&
            typeof NpcSimulation.advanceActiveStep === 'function') {
          NpcSimulation.advanceActiveStep(
            state,
            worldHelpers(helpers),
            {
              EventEngine: EventEngine,
              regions: RegionContent,
              sects: SectContent
            }
          );
        }
      }
    });

    const backgroundNpcLane = Object.freeze({
      id: 'stage4-background-npcs',
      nextBoundary: function (state) {
        return world(state)
          ? accumulatorBoundary(
            state,
            'backgroundAccumulator',
            BACKGROUND_STEP_SECONDS
          )
          : Infinity;
      },
      elapse: function (state, seconds) {
        addAccumulator(state, 'backgroundAccumulator', seconds);
      },
      resolve: function (state, helpers) {
        subtractAccumulator(
          state,
          'backgroundAccumulator',
          BACKGROUND_STEP_SECONDS
        );
        if (NpcSimulation &&
            typeof NpcSimulation.advanceBackgroundStep === 'function') {
          NpcSimulation.advanceBackgroundStep(
            state,
            worldHelpers(helpers),
            {
              EventEngine: EventEngine,
              regions: RegionContent,
              sects: SectContent
            }
          );
        }
      }
    });

    function initializeEventDay(state, helpers, dayIndex) {
      const events = state.systems.events;
      events.day = {
        index: dayIndex,
        budget: EventEngine.rollDailyBudget(worldHelpers(helpers)),
        attempted: 0,
        created: 0
      };
    }

    const eventScheduleLane = Object.freeze({
      id: 'stage4-event-schedule',
      nextBoundary: function (state) {
        return world(state)
          ? accumulatorBoundary(
            state,
            'eventAccumulator',
            EVENT_SLOT_SECONDS
          )
          : Infinity;
      },
      elapse: function (state, seconds) {
        addAccumulator(state, 'eventAccumulator', seconds);
      },
      resolve: function (state, helpers) {
        subtractAccumulator(
          state,
          'eventAccumulator',
          EVENT_SLOT_SECONDS
        );
        if (!state.systems.events.day ||
            state.systems.events.day.budget < 5) {
          initializeEventDay(state, helpers, Math.floor(
            Math.max(0, finite(world(state).elapsedSeconds, 0) - 1) /
              SECT_STEP_SECONDS
          ));
        }
        const scheduled = EventEngine.schedulePlayerEvent(
          state,
          worldHelpers(helpers),
          { templates: templates }
        );
        if (scheduled && scheduled.state) {
          replace(state, scheduled.state);
        }
        if (scheduled && scheduled.ok) {
          helpers.report.world.newPending =
            finite(helpers.report.world.newPending, 0) + 1;
          helpers.report.world.events.push({
            category: 'pending',
            eventId: scheduled.event.id,
            title: scheduled.event.title
          });
        }
        const elapsed = finite(world(state).elapsedSeconds, 0);
        if (elapsed > 0 &&
            Math.abs(elapsed % SECT_STEP_SECONDS) < 1e-9) {
          replace(state, EventEngine.compactWorldHistory(state));
          initializeEventDay(
            state,
            helpers,
            Math.floor(elapsed / SECT_STEP_SECONDS)
          );
        }
      }
    });

    const sectLane = Object.freeze({
      id: 'stage4-sects',
      nextBoundary: function (state) {
        return world(state)
          ? accumulatorBoundary(
            state,
            'sectAccumulator',
            SECT_STEP_SECONDS
          )
          : Infinity;
      },
      elapse: function (state, seconds) {
        addAccumulator(state, 'sectAccumulator', seconds);
      },
      resolve: function (state, helpers) {
        subtractAccumulator(state, 'sectAccumulator', SECT_STEP_SECONDS);
        if (!SectSimulation ||
            typeof SectSimulation.advanceDay !== 'function') return;
        const evolved = SectSimulation.advanceDay(
          state,
          worldHelpers(helpers),
          { sects: SectContent }
        );
        if (evolved && evolved.ok) replace(state, evolved.state);
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
          eventScheduleLane,
          sectLane
        ])
      )
    });
  }

  return Object.freeze({
    ACTIVE_STEP_SECONDS: ACTIVE_STEP_SECONDS,
    BACKGROUND_STEP_SECONDS: BACKGROUND_STEP_SECONDS,
    SECT_STEP_SECONDS: SECT_STEP_SECONDS,
    EVENT_SLOT_SECONDS: EVENT_SLOT_SECONDS,
    create: create
  });
});
