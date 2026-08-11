(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/combat.js'),
      require('../content/techniques.js'),
      require('./combat-stats.js'),
      require('./combat-party.js'),
      require('./techniques.js'),
      require('./equipment.js')
    )
    : factory(
      root.CombatContent,
      root.TechniqueContent,
      root.CombatStats,
      root.CombatParty,
      root.Techniques,
      root.Equipment
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  TechniqueContent,
  CombatStats,
  CombatParty,
  Techniques,
  Equipment
) {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }
  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }
  function integer(value, fallback) {
    return Number.isFinite(value) ? Math.floor(value) : fallback;
  }
  function baseNpcStats(realmStage) {
    const index = Math.max(0, integer(Number(realmStage), 0));
    return {
      maxHp: 95 + index * 38,
      maxQi: 90 + index * 10,
      attack: 10 + index * 5,
      defense: 4 + index * 3,
      accuracy: 70 + index * 2,
      evasion: 4 + index,
      critChance: Math.min(0.25, 0.04 + index * 0.005),
      critDamage: 1.5,
      actionIntervalTicks: Math.max(4, 8 - Math.floor(index / 4))
    };
  }
  function mergeStats(stats, additions) {
    Object.keys(additions || {}).forEach(function (key) {
      if (Number.isFinite(additions[key]) &&
          Object.prototype.hasOwnProperty.call(stats, key)) {
        stats[key] += additions[key];
      }
    });
  }
  function effectFor(techniqueId, level, definition) {
    if (Techniques && typeof Techniques.scaledEffect === 'function') {
      return clone(Techniques.scaledEffect(techniqueId, level));
    }
    return clone(definition && definition.effect || {});
  }
  function techniqueSnapshot(slot, level) {
    if (!slot || !slot.techniqueId || !TechniqueContent ||
        typeof TechniqueContent.get !== 'function') {
      return null;
    }
    const definition = TechniqueContent.get(slot.techniqueId);
    if (!definition) return null;
    const resolvedLevel = Math.max(1, Math.min(20, integer(Number(level), 1)));
    return {
      techniqueId: slot.techniqueId,
      level: resolvedLevel,
      condition: clone(slot.condition || { type: 'always' }),
      targetRule: slot.targetRule || definition.targetRule || 'highestThreatEnemy',
      effect: effectFor(slot.techniqueId, resolvedLevel, definition)
    };
  }
  function unitFromStats(id, side, sourceType, sourceId, name, stats, techniques,
    supplies, cooperation) {
    return {
      id: id,
      side: side,
      sourceType: sourceType,
      sourceId: sourceId,
      name: name,
      hp: finite(stats.maxHp, 1),
      maxHp: finite(stats.maxHp, 1),
      qi: finite(stats.maxQi, 0),
      maxQi: finite(stats.maxQi, 0),
      attack: finite(stats.attack, 0),
      defense: finite(stats.defense, 0),
      accuracy: finite(stats.accuracy, 0),
      evasion: finite(stats.evasion, 0),
      critChance: finite(stats.critChance, 0),
      critDamage: finite(stats.critDamage, 1.5),
      actionIntervalTicks: finite(
        stats.actionIntervalTicks || stats.attackIntervalTicks,
        8
      ),
      cooldownTicks: 0,
      statuses: {},
      cooldowns: {},
      shield: 0,
      threat: 1,
      fallen: false,
      techniques: clone(techniques || []),
      supplies: clone(supplies || {}),
      cooperation: finite(cooperation, 1)
    };
  }
  function playerUnit(model, loadoutId) {
    if (!CombatStats || typeof CombatStats.derive !== 'function') return null;
    const combat = model && model.player && model.player.combat;
    const loadouts = combat && Array.isArray(combat.loadouts) ? combat.loadouts : [];
    const loadout = loadouts.filter(function (row) {
      return row && row.id === loadoutId;
    })[0];
    if (!loadout) return null;
    const levels = model.player.techniques && model.player.techniques.known || {};
    const techniques = (loadout.activeTechniques || []).map(function (slot) {
      const record = slot && levels[slot.techniqueId];
      return techniqueSnapshot(slot, record && record.level || 1);
    }).filter(Boolean);
    const instances = model.player.inventory &&
      model.player.inventory.equipment &&
      Array.isArray(model.player.inventory.equipment.instances)
      ? model.player.inventory.equipment.instances
      : [];
    const byId = {};
    instances.forEach(function (instance) {
      const normalized = Equipment.normalizeInstance(instance);
      if (normalized) byId[normalized.instanceId] = normalized;
    });
    const equipped = Object.keys(loadout.equipment || {}).map(function (slot) {
      const instanceId = loadout.equipment[slot];
      return instanceId && byId[instanceId] ? byId[instanceId] : null;
    }).filter(Boolean);
    const unit = unitFromStats(
      'ally-player',
      'ally',
      'player',
      'player',
      '你',
      clone(CombatStats.derive(model, loadoutId)),
      techniques,
      loadout.supplies,
      1
    );
    unit.equipment = deepFreeze(equipped.map(function (instance) {
      return clone(Equipment.resolve(instance));
    }));
    unit.equipmentModifiers = deepFreeze(clone(Equipment.aggregate(equipped)));
    return unit;
  }
  function npcUnit(model, npcId, index) {
    const records = model && model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    const npc = records && records[npcId];
    if (!npc) return null;
    const profile = npc.combatProfile || {};
    const stats = baseNpcStats(npc.realmStage);
    Object.keys(profile.equipment || {}).forEach(function (slot) {
      const equipment = profile.equipment[slot];
      if (equipment) mergeStats(stats, equipment.stats || {});
    });
    const techniques = (profile.activeTechniques || []).map(function (slot) {
      return techniqueSnapshot(slot, slot && slot.level);
    }).filter(Boolean);
    const cooperation = CombatParty && typeof CombatParty.cooperationFor === 'function'
      ? CombatParty.cooperationFor(model, npcId)
      : 1;
    return unitFromStats(
      'ally-npc-' + (index + 1),
      'ally',
      'npc',
      npcId,
      npc.identity && npc.identity.name || npcId,
      stats,
      techniques,
      profile.supplies || {},
      cooperation
    );
  }
  function enemyUnit(enemyId, index) {
    const enemy = CombatContent && typeof CombatContent.getEnemy === 'function'
      ? CombatContent.getEnemy(enemyId)
      : null;
    if (!enemy || !enemy.stats) return null;
    return unitFromStats(
      'enemy-' + (index + 1),
      'enemy',
      'enemy',
      enemyId,
      enemy.name,
      {
        maxHp: enemy.stats.hp,
        maxQi: 0,
        attack: enemy.stats.attack,
        defense: enemy.stats.defense,
        accuracy: enemy.stats.accuracy,
        evasion: enemy.stats.evasion,
        critChance: enemy.stats.critChance || 0.05,
        critDamage: 1.5,
        actionIntervalTicks: enemy.stats.attackIntervalTicks
      },
      [],
      {},
      1
    );
  }
  function dangerFor(options) {
    const source = options.mode === 'dungeon' && CombatContent &&
      typeof CombatContent.getDungeon === 'function'
      ? CombatContent.getDungeon(options.dungeonId)
      : CombatContent && typeof CombatContent.getRegion === 'function'
        ? CombatContent.getRegion(options.regionId)
        : null;
    return source && source.dangerLevel || 'safe';
  }
  function createSession(model, options) {
    if (!model || !options || !Array.isArray(options.enemyIds) ||
        options.enemyIds.length < 1 || options.enemyIds.length > 4) {
      return null;
    }
    const loadoutId = options.loadoutId || model.player && model.player.combat &&
      model.player.combat.activeLoadoutId;
    const player = playerUnit(model, loadoutId);
    if (!player) return null;
    const allies = [player];
    const companionIds = model.systems && model.systems.teamCombat &&
      model.systems.teamCombat.companionIds || [];
    companionIds.slice(0, 3).forEach(function (npcId, index) {
      const unit = npcId ? npcUnit(model, npcId, index) : null;
      if (unit) allies.push(unit);
    });
    const enemies = options.enemyIds.map(enemyUnit);
    if (enemies.some(function (unit) { return !unit; })) return null;
    return Object.freeze({
      mode: options.mode,
      actionKey: options.actionKey || (options.mode === 'dungeon'
        ? 'combat:dungeon:' + options.dungeonId
        : 'combat:region:' + options.regionId + ':' + options.enemyIds[0]),
      dangerLevel: dangerFor(options),
      teams: { allies: allies, enemies: enemies },
      waveIndex: Math.max(0, integer(Number(options.waveIndex), 0)),
      waveDefeated: Math.max(0, integer(Number(options.waveDefeated), 0)),
      elapsedTicks: 0,
      tickRemainderSeconds: 0,
      rngStateAtStart: finite(Number(options.rngState), 0) >>> 0
    });
  }

  return Object.freeze({ createSession: createSession });
});
