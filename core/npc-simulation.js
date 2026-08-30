// 轻量 NPC 生命周期模块（对标反编译原版的「不模拟世界」设计）。
//
// 旧版的 npc-simulation.js 包含一整套「NPC 自主生存模拟」：
//   advanceActiveStep / advanceBackgroundStep 每 tick 遍历全体 NPC，
//   让它们自主修炼、游历、结交、换宗——这是 O(全体) 的沉重成本，
//   且 NPC 会自己产生事件，与「事件只来自玩家关系圈」的新模型冲突。
//
// 本文件只保留 NPC 的**被动生命周期**（对标原版 person 的 age/exp/status）：
//   · 随真实时间衰老（advanceAges）
//   · 随效率自然积累修为并按概率突破（advanceCultivation）
//   · 寿元尽则坐化、踏飞升境则离世（resolveLifespanDeath / resolveAscensionDeparture）
//
// NPC 不再「自主生活」、不再自主产生事件；它们只在玩家的关系网里
// 被 world-month.js 的新版事件系统唤醒。这正是原版轻量又聪明的核心。
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./relationships.js'),
      require('./npc-roster.js'),
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/equipment.js'),
      require('./equipment.js'),
      require('../content/npc-generation.js'),
      require('./dns.js'),
      require('./sect-offices.js')
    )
    : factory(
      root && root.Relationships,
      root && root.NpcRoster,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.EquipmentContent,
      root && root.Equipment,
      root && root.NpcGenerationContent,
      root && root.Dns,
      root && root.SectOffices
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Relationships,
  NpcRoster,
  RegionContent,
  SectContent,
  EquipmentContent,
  Equipment,
  NpcGenerationContent,
  Dns,
  SectOffices
) {
  'use strict';

  const YEAR_SECONDS = 12 * 60 * 60;
  // 修炼表与公式统一走 Dns.*（对标 level_exp1max / level_speed）。
  const LEVEL_EXP1MAX = (Dns && Dns.levelExp1max) || Object.freeze([
    10, 21, 81, 126, 252, 648, 1004, 4320, 14400, 14400
  ]);
  const LEVEL_SPEED = (Dns && Dns.levelSpeed) || Object.freeze([
    1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.6
  ]);
  function majorLevel(realmStage) {
    if (Dns && typeof Dns.majorLevel === 'function') {
      return Dns.majorLevel(realmStage);
    }
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    if (stage <= 8) return Math.min(8, stage);
    return Math.min(9, 8 + Math.ceil((stage - 8) / 2));
  }
  function cultivationNeedFor(realmStage) {
    if (Dns && typeof Dns.cultivationNeed === 'function') {
      return Dns.cultivationNeed(realmStage);
    }
    const major = majorLevel(realmStage);
    const base = LEVEL_EXP1MAX[Math.min(LEVEL_EXP1MAX.length - 1, major)] || 100;
    const stage = Math.max(0, Math.floor(Number(realmStage) || 0));
    const within = 1 + (stage % 3) * 0.12;
    return Math.max(1, Math.round(base * within));
  }
  function syncLevelAliases(person) {
    if (Dns && typeof Dns.syncLevelAliases === 'function') {
      return Dns.syncLevelAliases(person);
    }
    if (!person) return;
    const stage = Math.max(0, Math.floor(finite(person.realmStage, 0)));
    person.level_l = majorLevel(stage);
    person.level_s = stage <= 8 ? stage : ((stage - 9) % 3);
    person.exp1 = finite(person.cultivation, 0);
  }
  const ASCENSION_REALM_STAGE = 16;
  const REALM_BREAKTHROUGH_RATE = Object.freeze(
    (Dns && Dns.lvupRate) || [
      1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.65
    ]
  );

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function nowSeconds(helpers) {
    return helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, finite(helpers.nowSeconds(), 0))
      : 0;
  }

  function random(helpers) {
    const value = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0;
    return Number.isFinite(value) && value >= 0 && value < 1 ? value : 0;
  }

  function records(model) {
    return model && model.systems && model.systems.npcs &&
      model.systems.npcs.records;
  }

  function reportChange(helpers, amount) {
    const world = helpers && helpers.report && helpers.report.world;
    if (!world) return;
    world.npcChanges = finite(world.npcChanges, 0) +
      (amount == null ? 1 : amount);
  }

  function replace(target, source) {
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.keys(source).forEach(function (key) { target[key] = source[key]; });
  }

  function personDisplayName(person, npcId) {
    return person && person.identity && person.identity.name
      ? person.identity.name
      : npcId;
  }

  function pushEvolution(model, entry) {
    const events = model && model.systems && model.systems.events;
    if (!events) return;
    if (!Array.isArray(events.evolution)) events.evolution = [];
    events.evolution.push(entry);
  }

  // status: 'dead' 寿元尽；'ascended' 飞升离世。二者都离开日常人物池，records 保留。
  function markNpcDeparted(model, npcId, status, kind, title) {
    const all = records(model);
    const person = all && all[npcId];
    if (!person || person.status !== 'living') return false;
    person.status = status;
    person.activityStatus = 'normal';
    if (!Array.isArray(person.biography)) person.biography = [];
    const already = person.biography.some(function (entry) {
      return entry && entry.kind === kind;
    });
    if (!already) {
      person.biography.push({
        kind: kind,
        atAge: Math.max(0, Math.floor(finite(person.ageYears, 0)))
      });
    }
    pushEvolution(model, {
      id: kind + '-' + npcId,
      category: status === 'ascended' ? 'ascension' : 'lifecycle',
      npcId: npcId,
      title: title,
      at: finite(
        model.systems.world && model.systems.world.elapsedSeconds,
        0
      )
    });
    removeFromSimulationTiers(model, npcId);
    return true;
  }

  function removeFromSimulationTiers(model, npcId) {
    const npcs = model && model.systems && model.systems.npcs;
    if (!npcs) return;
    if (Array.isArray(npcs.activeIds)) {
      npcs.activeIds = npcs.activeIds.filter(function (id) {
        return id !== npcId;
      });
    }
    if (Array.isArray(npcs.backgroundIds)) {
      npcs.backgroundIds = npcs.backgroundIds.filter(function (id) {
        return id !== npcId;
      });
    }
  }

  function resolveLifespanDeath(model, npcId) {
    const person = records(model) && records(model)[npcId];
    if (!person || person.status !== 'living') return false;
    const lifespan = finite(person.lifespanYears, Infinity);
    if (!(lifespan < Infinity) ||
        person.ageYears < lifespan) {
      return false;
    }
    return markNpcDeparted(
      model,
      npcId,
      'dead',
      'lifespan-end',
      personDisplayName(person, npcId) + '寿元已尽，坐化于凡尘'
    );
  }

  function resolveAscensionDeparture(model, npcId, options) {
    const person = records(model) && records(model)[npcId];
    if (!person || person.status !== 'living') return false;
    const force = !!(options && options.force);
    if (!force &&
        Math.floor(finite(person.realmStage, 0)) < ASCENSION_REALM_STAGE) {
      return false;
    }
    return markNpcDeparted(
      model,
      npcId,
      'ascended',
      'ascension-departure',
      personDisplayName(person, npcId) + '飞升离去，不再居于凡间'
    );
  }

  function realmCultivationNeed(realmStage) {
    return cultivationNeedFor(realmStage);
  }

  function levelSpeedMult(realmStage) {
    if (Dns && typeof Dns.levelSpeedMult === 'function') {
      return Dns.levelSpeedMult(realmStage);
    }
    const major = majorLevel(realmStage);
    const speed = LEVEL_SPEED[Math.min(LEVEL_SPEED.length - 1, major)];
    return Number.isFinite(speed) && speed > 0 ? speed : 1;
  }

  function ensureEfficiency(person) {
    // 始终按当前日积月累公式重算，避免旧档二次曲线效率残留导致秒破。
    return refreshEfficiency(person);
  }

  function refreshEfficiency(person) {
    syncLevelAliases(person);
    let next;
    if (Dns && typeof Dns.getexps === 'function') {
      // 展示/存档效率 = 每月修为增量（游戏时间单位是月）
      next = Dns.getexps(person);
    } else if (NpcGenerationContent &&
        typeof NpcGenerationContent.cultivationEfficiencyFor === 'function') {
      next = NpcGenerationContent.cultivationEfficiencyFor(
        person.realmStage,
        person.spiritualRootId,
        0.5
      );
    } else {
      next = 1;
    }
    person.cultivationEfficiency = Math.round(next * 100) / 100;
    return person.cultivationEfficiency;
  }

  function realmBreakthroughRate(realmStage) {
    if (Dns && typeof Dns.breakthroughRate === 'function') {
      return Dns.breakthroughRate(realmStage);
    }
    const major = majorLevel(realmStage);
    const rate = REALM_BREAKTHROUGH_RATE[
      Math.min(REALM_BREAKTHROUGH_RATE.length - 1, major)
    ];
    return Number.isFinite(rate) ? rate : 0.6;
  }

  function equipmentRealmOrder(realmStage) {
    if (realmStage <= 8) return 1;
    return Math.min(9, realmStage - 7);
  }

  function equipmentRealmBand(realmStage) {
    return [
      'qi', 'foundation', 'core', 'nascent', 'spirit',
      'void', 'integration', 'mahayana', 'ascension'
    ][equipmentRealmOrder(realmStage) - 1];
  }

  function equipmentQuality(realmStage) {
    if (realmStage >= 14) return 'legendary';
    if (realmStage >= 11) return 'epic';
    if (realmStage >= 7) return 'rare';
    if (realmStage >= 3) return 'fine';
    return 'common';
  }

  function equipmentScore(instance) {
    const resolved = Equipment &&
      typeof Equipment.resolve === 'function'
      ? Equipment.resolve(instance)
      : null;
    if (!resolved) return -Infinity;
    let score = 0;
    Object.keys(resolved.flat || {}).forEach(function (stat) {
      score += Math.max(0, finite(resolved.flat[stat], 0));
    });
    Object.keys(resolved.percent || {}).forEach(function (stat) {
      score += Math.max(0, finite(resolved.percent[stat], 0)) * 100;
    });
    score += (resolved.rules || []).length * 8;
    return score;
  }

  function improveEquipment(person, helpers) {
    if (!person || !EquipmentContent || !Equipment ||
        typeof Equipment.generate !== 'function' ||
        !person.combatEquipment ||
        !Array.isArray(person.combatEquipment.instances) ||
        !person.combatEquipment.equipment) {
      return false;
    }
    const realmStage = Math.max(
      0,
      Math.floor(finite(person.realmStage, 0))
    );
    const order = equipmentRealmOrder(realmStage);
    const slots = EquipmentContent.SLOTS.filter(function (slot) {
      const meta = EquipmentContent.SLOT_META[slot];
      return meta && meta.unlockRealmOrder <= order;
    });
    if (!slots.length) return false;
    const slot = slots[Math.min(
      slots.length - 1,
      Math.floor(random(helpers) * slots.length)
    )];
    const seed = Math.max(
      1,
      Math.min(
        0xFFFFFFFF,
        Math.floor(random(helpers) * 0xFFFFFFFF)
      )
    );
    const instanceId = person.id + '-' + slot + '-upgrade-' +
      Math.max(0, Math.floor(nowSeconds(helpers)));
    const generated = Equipment.generate({
      baseId: equipmentRealmBand(realmStage) + '-' + slot,
      quality: equipmentQuality(realmStage),
      instanceId: instanceId,
      source: {
        type: 'npc-upgrade',
        sourceId: person.id || 'npc',
        acquiredAt: nowSeconds(helpers)
      },
      rngState: seed
    });
    if (!generated || !generated.ok) return false;
    const currentId = person.combatEquipment.equipment[slot];
    const current = person.combatEquipment.instances.find(
      function (instance) {
        return instance && instance.instanceId === currentId;
      }
    );
    if (current &&
        equipmentScore(generated.instance) <= equipmentScore(current)) {
      return false;
    }
    person.combatEquipment.instances =
      person.combatEquipment.instances.filter(function (instance) {
        return !instance || instance.instanceId !== currentId;
      });
    person.combatEquipment.instances.push(generated.instance);
    person.combatEquipment.equipment[slot] =
      generated.instance.instanceId;
    return true;
  }

  // 标记闭关倾向（决策仅标记，真实修为由 advanceCultivation 按效率结算）。
  function cultivate(person) {
    if (person && person.activityStatus === 'normal') {
      person.activityStatus = 'seclusion';
    }
    return 'cultivation';
  }

  function attemptBreakthrough(person, helpers, model, npcId) {
    const stage = Math.max(0, Math.floor(finite(person.realmStage, 0)));
    const required = realmCultivationNeed(stage);
    if (required <= 0) return 'breakthrough-capped';
    if (finite(person.cultivation, 0) < required) {
      return cultivate(person);
    }
    let rate = realmBreakthroughRate(stage);
    let bias = Number(person.breakthroughBias) || 0;
    // 敬天道心：渡劫/突破更顺（加法进偏见）。
    if (Array.isArray(person.traits) &&
        person.traits.indexOf('pious') >= 0 &&
        NpcGenerationContent &&
        typeof NpcGenerationContent.getDaoHeartTrait === 'function') {
      const trait = NpcGenerationContent.getDaoHeartTrait('pious');
      if (trait && Number.isFinite(trait.effects &&
          trait.effects.breakthroughBias)) {
        bias += trait.effects.breakthroughBias;
      }
    }
    if (bias) {
      rate = Math.max(0, Math.min(1, rate + bias));
      // 事件倾向只影响一次判定，用后衰减。
      person.breakthroughBias = bias * 0.5;
      if (Math.abs(person.breakthroughBias) < 0.01) {
        person.breakthroughBias = 0;
      }
    }
    if (rate >= 1 || random(helpers) < rate) {
      person.realmStage = stage + 1;
      person.cultivation = 0;
      syncLevelAliases(person);
      refreshEfficiency(person);
      improveEquipment(person, helpers);
      if (person.activityStatus === 'tribulation') {
        person.activityStatus = 'normal';
      }
      // 对标 lvup→changejob：突破后按 retjob 编制升职。
      if (model &&
          SectOffices &&
          typeof SectOffices.changeJobAfterBreakthrough === 'function') {
        SectOffices.changeJobAfterBreakthrough(model, person);
      }
      if (model && npcId &&
          Math.floor(finite(person.realmStage, 0)) >= ASCENSION_REALM_STAGE) {
        resolveAscensionDeparture(model, npcId);
        return 'ascension';
      }
      return 'breakthrough';
    }
    person.cultivation = 0;
    syncLevelAliases(person);
    if (person.activityStatus === 'tribulation') {
      person.activityStatus = 'normal';
    }
    return 'breakthrough-failed';
  }

  // 修炼按月效率连续结算（秒折算为月）；修为满则立刻尝试突破。
  function advanceCultivation(model, seconds, helpers) {
    const all = records(model);
    const elapsed = Math.max(0, finite(seconds, 0));
    if (!all || elapsed <= 0) return;
    Object.keys(all).forEach(function (npcId) {
      const person = all[npcId];
      if (!person ||
          person.status !== 'living' ||
          person.lifeStage === 'child') {
        return;
      }
      const status = person.activityStatus || 'normal';
      if (status === 'imprisoned' || status === 'missing') return;
      syncLevelAliases(person);
      // 每月 Δ = getexps；用真实秒 / MONTH_REAL_SECONDS 折算。
      const monthSec = Math.max(
        30,
        Number(Dns && Dns.MONTH_REAL_SECONDS) || 180
      );
      const months = elapsed / monthSec;
      const exps = Dns && typeof Dns.getexps === 'function'
        ? Dns.getexps(person)
        : ensureEfficiency(person);
      person.exps = exps;
      let mult = 1;
      if (status === 'seclusion') mult = 1.25;
      else if (status === 'injured') mult = 0.35;
      else if (status === 'tribulation') mult = 0;
      const delta = exps * months * mult;
      person.cultivation = finite(person.cultivation, 0) + delta;
      // 同步 exp1 条（同月增量再夹逼）
      if (Dns && typeof Dns.exp1Max === 'function') {
        const max1 = Dns.exp1Max(person.realmStage);
        person.exp1 = Math.min(
          max1,
          finite(person.exp1, 0) + delta
        );
      }
      person.cultivationEfficiency = Math.round(exps * 100) / 100;
      syncLevelAliases(person);
      // 修为满立刻尝试突破；单次推进最多一档（对齐玩家一次渡劫）。
      const stage = Math.max(0, Math.floor(finite(person.realmStage, 0)));
      const need = realmCultivationNeed(stage);
      if (need > 0 && finite(person.cultivation, 0) >= need) {
        if (status !== 'tribulation') {
          person.activityStatus = 'tribulation';
        }
        const result = attemptBreakthrough(
          person,
          helpers || {},
          model,
          npcId
        );
        if (result === 'breakthrough' || result === 'ascension') {
          reportChange(helpers, 1);
        }
      }
    });
  }

  // 随真实时间推进年龄，寿元尽则坐化。
  function advanceAges(model, seconds) {
    const elapsed = Math.max(0, finite(seconds, 0));
    const all = records(model) || {};
    Object.keys(all).sort().forEach(function (id) {
      const person = all[id];
      if (!person || person.status !== 'living') return;
      const total = Math.max(0, finite(person.ageRemainderSeconds, 0)) +
        elapsed;
      const years = Math.floor(total / YEAR_SECONDS);
      person.ageYears = Math.max(0, Math.floor(finite(person.ageYears, 0))) +
        years;
      person.ageRemainderSeconds = total - years * YEAR_SECONDS;
      resolveLifespanDeath(model, id);
    });
    return model;
  }

  return Object.freeze({
    YEAR_SECONDS: YEAR_SECONDS,
    ASCENSION_REALM_STAGE: ASCENSION_REALM_STAGE,
    LEVEL_EXP1MAX: LEVEL_EXP1MAX,
    LEVEL_SPEED: LEVEL_SPEED,
    REALM_BREAKTHROUGH_RATE: REALM_BREAKTHROUGH_RATE,
    advanceAges: advanceAges,
    advanceCultivation: advanceCultivation,
    realmCultivationNeed: realmCultivationNeed,
    realmBreakthroughRate: realmBreakthroughRate,
    majorLevel: majorLevel,
    syncLevelAliases: syncLevelAliases,
    attemptBreakthrough: attemptBreakthrough,
    improveEquipment: improveEquipment,
    resolveLifespanDeath: resolveLifespanDeath,
    resolveAscensionDeparture: resolveAscensionDeparture
  });
});
