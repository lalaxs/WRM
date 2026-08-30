'use strict';

const EMPTY_SECT_CONTEXT = Object.freeze({
  sectId: null,
  favoredTechniqueIds: Object.freeze([]),
  favoredTags: Object.freeze([])
});

function combatBasicAttackApi() {
  if (basicAttackContentApi) return basicAttackContentApi;
  if (typeof BasicAttackContent !== 'undefined') return BasicAttackContent;
  return null;
}

function combatActiveWeaponName(model) {
  try {
    if (stage3Bootstrap.CombatLoadouts &&
        typeof stage3Bootstrap.CombatLoadouts.query === 'function') {
      const viewed = stage3Bootstrap.CombatLoadouts.query(model);
      const loadoutId = model && model.player && model.player.combat
        ? model.player.combat.activeLoadoutId
        : null;
      const rows = viewed && Array.isArray(viewed.plans) ? viewed.plans : [];
      let row = null;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].id === loadoutId) {
          row = rows[i];
          break;
        }
      }
      if (!row) row = rows[0];
      const slots = row && Array.isArray(row.equipment) ? row.equipment : [];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i].slot === 'weapon' && slots[i].name) {
          return slots[i].name;
        }
      }
    }
  } catch (error) {
    return '';
  }
  return '';
}

function combatPlayerBasicAttack(model) {
  const api = combatBasicAttackApi();
  if (!api) return { id: 'basic:unarmed', name: '碎空拳', glyph: '拳' };
  return api.playerBasicAttack(combatActiveWeaponName(model));
}

function combatEnemyBasicAttack(enemyId) {
  const api = combatBasicAttackApi();
  if (!api) return { id: 'basic:enemy:default', name: '扑击', glyph: '扑' };
  return api.enemyBasicAttack(enemyId);
}

function combatCurrentActionView(session, model) {
  try {
    const selected = session && session.lastPlayerAction;
    if (!selected ||
        typeof selected.id !== 'string' ||
        !Number.isSafeInteger(selected.tick) ||
        selected.tick < 0) {
      return null;
    }
    const basicApi = combatBasicAttackApi();
    if (selected.id === 'normalAttack' ||
        (basicApi && basicApi.isBasicAttackId(selected.id))) {
      const basic = combatPlayerBasicAttack(model);
      return {
        id: basic.id,
        name: basic.name,
        slotIndex: 0,
        tick: selected.tick
      };
    }
    const technique = stage3Bootstrap.TechniqueContent.get(selected.id);
    if (!technique ||
        typeof technique.name !== 'string' ||
        !Number.isSafeInteger(selected.slotIndex) ||
        selected.slotIndex < 0) {
      return null;
    }
    return {
      id: selected.id,
      name: technique.name,
      slotIndex: selected.slotIndex + 1,
      tick: selected.tick
    };
  } catch (error) {
    return null;
  }
}

function combatStatusEffectRows(statuses) {
  const rows = [];
  if (statuses && typeof statuses === 'object') {
    Object.keys(statuses).forEach(function (statusId) {
      const status = statuses[statusId];
      const remaining = status && Number(status.remainingTicks);
      if (Number.isFinite(remaining) && remaining > 0) {
        rows.push({ id: statusId, remainingTicks: remaining });
      }
    });
  }
  return rows;
}

function combatTechniqueSlotRows(session, model) {
  const snapshot = session && session.loadoutSnapshot;
  const slots = snapshot && Array.isArray(snapshot.activeTechniques)
    ? snapshot.activeTechniques
    : [];
  const player = session && session.player;
  const cooldowns = player && player.techniqueCooldowns
    ? player.techniqueCooldowns
    : {};
  const derived = snapshot && snapshot.derivedStats
    ? snapshot.derivedStats
    : null;
  const cdr = derived && Number.isFinite(derived.cooldownReduction)
    ? Math.max(0, Math.min(0.5, derived.cooldownReduction))
    : 0;
  function effectiveCooldown(baseTicks) {
    if (!Number.isFinite(baseTicks) || baseTicks <= 0) return 0;
    return Math.max(1, Math.floor(baseTicks * (1 - cdr)));
  }
  const basic = combatPlayerBasicAttack(model);
  const interval = player && Number.isFinite(player.attackIntervalTicks)
    ? player.attackIntervalTicks
    : 8;
  const remainingBasic = player && Number.isFinite(player.cooldownTicks)
    ? Math.max(0, player.cooldownTicks)
    : 0;
  const rows = [{
    slotIndex: 0,
    techniqueId: basic.id,
    name: basic.name,
    glyph: basic.glyph,
    qiCost: 0,
    cooldownTicks: interval,
    remainingCooldownTicks: remainingBasic,
    kind: 'basic'
  }];
  slots.forEach(function (slot, index) {
    const techniqueId = slot && typeof slot.techniqueId === 'string'
      ? slot.techniqueId
      : null;
    if (!techniqueId) {
      rows.push({
        slotIndex: index + 1,
        techniqueId: null,
        name: null,
        qiCost: 0,
        cooldownTicks: 0,
        remainingCooldownTicks: 0,
        kind: 'technique'
      });
      return;
    }
    let technique = null;
    try {
      technique = stage3Bootstrap.TechniqueContent.get(techniqueId);
    } catch (error) {
      technique = null;
    }
    const baseCd = technique && Number.isFinite(technique.cooldownTicks)
      ? technique.cooldownTicks
      : 0;
    rows.push({
      slotIndex: index + 1,
      techniqueId: techniqueId,
      name: technique && typeof technique.name === 'string'
        ? technique.name
        : techniqueId,
      qiCost: technique && Number.isFinite(technique.qiCost)
        ? technique.qiCost
        : 0,
      cooldownTicks: effectiveCooldown(baseCd),
      remainingCooldownTicks: Number(cooldowns[techniqueId]) || 0,
      kind: 'technique'
    });
  });
  return rows;
}

function combatBattleTitle(session) {
  try {
    if (session.mode === 'dungeon' && session.dungeonId) {
      const dungeon = stage3Bootstrap.CombatContent.getDungeon(
        session.dungeonId
      );
      if (dungeon && typeof dungeon.name === 'string') return dungeon.name;
    }
    if (session.regionId) {
      const region = stage3Bootstrap.CombatContent.getRegion(
        session.regionId
      );
      if (region && typeof region.name === 'string') return region.name;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function combatWavePlanView(session) {
  if (session.mode !== 'dungeon' || !session.dungeonId) return null;
  try {
    const dungeon = stage3Bootstrap.CombatContent.getDungeon(
      session.dungeonId
    );
    if (!dungeon || !Array.isArray(dungeon.waves)) return null;
    const current = dungeon.waves[session.waveIndex];
    return {
      waveCount: dungeon.waves.length,
      enemyTotal: current && Number.isFinite(current.count)
        ? current.count
        : null
    };
  } catch (error) {
    return null;
  }
}

function combatUnitTechniqueRows(unit) {
  const techniques = unit && Array.isArray(unit.techniques)
    ? unit.techniques
    : [];
  const cooldowns = unit && unit.cooldowns && typeof unit.cooldowns === 'object'
    ? unit.cooldowns
    : {};
  const interval = unit && Number.isFinite(unit.actionIntervalTicks)
    ? unit.actionIntervalTicks
    : 8;
  const remainingBasic = unit && Number.isFinite(unit.cooldownTicks)
    ? Math.max(0, unit.cooldownTicks)
    : 0;
  let basic;
  if (unit && unit.sourceType === 'enemy') {
    basic = combatEnemyBasicAttack(unit.sourceId);
  } else {
    basic = combatPlayerBasicAttack(stage2QueryModel());
  }
  const rows = [{
    slotIndex: 0,
    techniqueId: basic.id,
    name: basic.name,
    glyph: basic.glyph,
    qiCost: 0,
    cooldownTicks: interval,
    remainingCooldownTicks: remainingBasic,
    kind: 'basic'
  }];
  techniques.slice(0, 3).forEach(function (slot, index) {
    const techniqueId = slot && typeof slot.techniqueId === 'string'
      ? slot.techniqueId
      : null;
    if (!techniqueId) {
      rows.push({
        slotIndex: index + 1,
        techniqueId: null,
        name: null,
        qiCost: 0,
        cooldownTicks: 0,
        remainingCooldownTicks: 0,
        kind: 'technique'
      });
      return;
    }
    let technique = null;
    try {
      technique = stage3Bootstrap.TechniqueContent
        ? stage3Bootstrap.TechniqueContent.get(techniqueId)
        : null;
    } catch (error) {
      technique = null;
    }
    rows.push({
      slotIndex: index + 1,
      techniqueId: techniqueId,
      name: technique && typeof technique.name === 'string'
        ? technique.name
        : techniqueId,
      qiCost: technique && Number.isFinite(technique.qiCost)
        ? technique.qiCost
        : 0,
      cooldownTicks: technique && Number.isFinite(technique.cooldownTicks)
        ? technique.cooldownTicks
        : 0,
      remainingCooldownTicks: Number(cooldowns[techniqueId]) || 0,
      kind: 'technique'
    });
  });
  return rows;
}

function combatEnemyPortraitSrc(enemyId) {
  if (typeof enemyId !== 'string' || !enemyId) return '';
  try {
    const definition = stage3Bootstrap.CombatContent.getEnemy(enemyId);
    if (definition && typeof definition.portraitSrc === 'string') {
      return definition.portraitSrc;
    }
  } catch (error) {
    // fall through
  }
  return '';
}

function combatUnitView(unit) {
  let portraitSrc = '';
  let rank = null;
  if (unit.sourceType === 'enemy') {
    portraitSrc = combatEnemyPortraitSrc(unit.sourceId);
    try {
      const definition = stage3Bootstrap.CombatContent.getEnemy(unit.sourceId);
      if (definition && typeof definition.rank === 'string') {
        rank = definition.rank;
      }
    } catch (error) {
      rank = null;
    }
  }
  return {
    id: unit.id,
    name: unit.name,
    sourceType: unit.sourceType,
    sourceId: unit.sourceId,
    portraitSrc: portraitSrc,
    rank: rank,
    hp: unit.hp,
    maxHp: unit.maxHp,
    qi: unit.qi,
    maxQi: unit.maxQi,
    fallen: unit.fallen === true,
    shield: Number.isFinite(unit.shield) ? unit.shield : 0,
    cooldownTicks: unit.cooldownTicks,
    actionIntervalTicks: unit.actionIntervalTicks,
    statusEffects: combatStatusEffectRows(unit.statuses),
    techniques: combatUnitTechniqueRows(unit),
    cooperation: Number.isFinite(unit.cooperation) ? unit.cooperation : 1
  };
}

function combatLootLogView(model) {
  const combat = model && model.systems && model.systems.combat
    ? model.systems.combat
    : {};
  return (combat.lootLog || []).map(function (entry) {
    const itemContent = stage2Bootstrap && stage2Bootstrap.ItemContent;
    const items = {};
    Object.keys(entry.items || {}).forEach(function (itemId) {
      const item = itemContent ? itemContent.get(itemId) : null;
      const row = {
        itemId: itemId,
        count: entry.items[itemId],
        name: item && item.name ? item.name : itemId,
        icon: item && item.icon ? item.icon : '📦',
        quality: item && item.quality ? item.quality : 'white',
        category: item && item.category ? item.category : 'material',
        description: item && item.description ? item.description : ''
      };
      if (item) {
        ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
          if (item[key]) row[key] = item[key];
        });
      }
      items[itemId] = row;
    });
    return {
      enemyId: entry.enemyId,
      enemyName: entry.enemyName,
      rank: entry.rank,
      rankLabel: combatRankDisplayName(entry.rank),
      items: items,
      currency: entry.currency,
      firstClear: !!entry.firstClear,
      dungeonClear: !!entry.dungeonClear,
      createdAtMs: entry.createdAtMs
    };
  });
}

function combatFxSkillName(techniqueId, skillType, side, sourceId, model) {
  const basicApi = combatBasicAttackApi();
  if (basicApi && basicApi.isBasicAttackId(techniqueId)) {
    if (side === 'enemy') {
      return combatEnemyBasicAttack(sourceId).name;
    }
    return combatPlayerBasicAttack(model).name;
  }
  if (typeof techniqueId === 'string' && techniqueId &&
      stage3Bootstrap.TechniqueContent) {
    try {
      const technique = stage3Bootstrap.TechniqueContent.get(techniqueId);
      if (technique && typeof technique.name === 'string' && technique.name) {
        return technique.name;
      }
    } catch (error) {
      // fall through
    }
  }
  if (skillType === 'attack') {
    if (side === 'enemy') return combatEnemyBasicAttack(sourceId).name;
    return combatPlayerBasicAttack(model).name;
  }
  return null;
}

function combatFxActionsView(model) {
  const combat = model && model.systems && model.systems.combat
    ? model.systems.combat
    : null;
  const rows = combat && Array.isArray(combat.fxActions)
    ? combat.fxActions
    : [];
  return rows.map(function (row) {
    const skillType = typeof row.skillType === 'string'
      ? row.skillType
      : 'other';
    return {
      id: Number(row.id) || 0,
      side: row.side === 'enemy' ? 'enemy' : 'player',
      targetSide: row.targetSide === 'enemy' ? 'enemy' : 'player',
      sourceId: typeof row.sourceId === 'string' ? row.sourceId : '',
      targetId: typeof row.targetId === 'string' ? row.targetId : '',
      skillName: combatFxSkillName(
        row.techniqueId,
        skillType,
        row.side === 'enemy' ? 'enemy' : 'player',
        typeof row.sourceId === 'string' ? row.sourceId : '',
        model
      ),
      skillType: skillType,
      hit: row.hit === true,
      damage: Math.max(0, Math.floor(Number(row.damage) || 0)),
      heal: Math.max(0, Math.floor(Number(row.heal) || 0)),
      critical: row.critical === true
    };
  });
}

function combatActiveView(model) {
  const session = model && model.systems && model.systems.combat
    ? model.systems.combat.session
    : null;
  if (!session) return null;
  const actions = combatFxActionsView(model);
  if (session.teams && Array.isArray(session.teams.allies) &&
      Array.isArray(session.teams.enemies)) {
    return {
      layout: 'vertical-team',
      mode: session.mode,
      actionKey: session.actionKey,
      title: combatBattleTitle(session),
      dangerLevel: session.dangerLevel || 'safe',
      allies: session.teams.allies.map(combatUnitView),
      enemies: session.teams.enemies.map(combatUnitView),
      wave: {
        index: session.waveIndex,
        number: session.waveIndex + 1,
        defeated: session.waveDefeated,
        intermissionTicks: session.intermissionTicks || 0
      },
      lootLog: combatLootLogView(model),
      actions: actions
    };
  }
  const player = session.player || {};
  const enemy = session.enemy || null;
  let enemyName = null;
  let enemyRank = null;
  let enemyPortraitSrc = '';
  if (enemy) {
    try {
      const definition = stage3Bootstrap.CombatContent.getEnemy(enemy.id);
      if (definition) {
        enemyName = typeof definition.name === 'string'
          ? definition.name
          : null;
        enemyRank = typeof definition.rank === 'string'
          ? definition.rank
          : null;
        enemyPortraitSrc = typeof definition.portraitSrc === 'string'
          ? definition.portraitSrc
          : '';
      }
    } catch (error) {
      enemyName = null;
    }
  }
  const wavePlan = combatWavePlanView(session);
  return {
    mode: session.mode,
    actionKey: session.actionKey,
    loadoutId: session.loadoutId,
    title: combatBattleTitle(session),
    currentAction: combatCurrentActionView(session, model),
    techniques: combatTechniqueSlotRows(session, model),
    unlockedActiveSlots: unlockedActiveSlotCount(model),
    player: {
      hp: player.hp,
      maxHp: player.maxHp,
      qi: player.qi,
      maxQi: player.maxQi,
      cooldownTicks: player.cooldownTicks,
      attackIntervalTicks: player.attackIntervalTicks,
      shield: Number.isFinite(player.shield) ? player.shield : 0,
      statusEffects: combatStatusEffectRows(player.statuses),
      techniqueCooldowns: Object.assign(
        {},
        player.techniqueCooldowns || {}
      )
    },
    enemy: enemy
      ? {
        id: enemy.id,
        name: enemyName || enemy.id,
        rank: enemyRank,
        rankLabel: combatRankDisplayName(enemyRank),
        portraitSrc: enemyPortraitSrc,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        cooldownTicks: enemy.cooldownTicks,
        attackIntervalTicks: enemy.attackIntervalTicks,
        statusEffects: combatStatusEffectRows(enemy.statuses),
        phase: enemy.phase
      }
      : null,
    wave: {
      index: session.waveIndex,
      number: session.waveIndex + 1,
      defeated: session.waveDefeated,
      intermissionTicks: session.intermissionTicks,
      waveCount: wavePlan ? wavePlan.waveCount : null,
      enemyTotal: wavePlan ? wavePlan.enemyTotal : null
    },
    lootLog: combatLootLogView(model),
    actions: actions,
    phase: {
      index: session.bossPhase,
      number: session.bossPhase + 1
    }
  };
}

function combatPendingLootView(model) {
  try {
    const pending = stage3Bootstrap.CombatRewards.queryPending(model);
    if (!pending) return null;
    const claim = stage3Bootstrap.CombatRewards.claimPending(model);
    if (!claim ||
        (claim.ok !== true && claim.code !== 'inventory_full')) {
      return null;
    }
    const inventory = stage2Bootstrap.Inventory.query(
      model.player.inventory,
      { category: 'all', search: '' }
    );
    if (!inventory ||
        !Number.isSafeInteger(inventory.free) ||
        inventory.free < 0 ||
        !Array.isArray(inventory.items)) {
      return null;
    }
    const occupied = {};
    inventory.items.forEach(function (item) {
      if (item && typeof item.itemId === 'string') {
        occupied[item.itemId] = true;
      }
    });
    const additionalSlots = Object.keys(pending.items).reduce(
      function (total, itemId) {
        return total + (occupied[itemId] ? 0 : 1);
      },
      0
    );
    return {
      id: pending.id,
      source: pending.source,
      items: pending.items,
      itemRows: displayCountRows(pending.items, stage3ItemDisplayName),
      currency: pending.currency,
      createdAtMs: pending.createdAtMs,
      requiredFreeSlots: Math.max(0, additionalSlots - inventory.free),
      canClaim: claim.ok === true
    };
  } catch (error) {
    return null;
  }
}

function combatInjuryView(model) {
  try {
    const injury = model &&
      model.player &&
      model.player.combat &&
      model.player.combat.injury;
    if (!injury ||
        injury.id !== 'severe-injury' ||
        !Number.isFinite(injury.remainingSeconds) ||
        injury.remainingSeconds < 0) {
      return null;
    }
    const owned = stage2Bootstrap.Inventory.availableQuantity(
      model.player.inventory,
      'healingPill'
    );
    if (!Number.isSafeInteger(owned) || owned < 0) return null;
    return {
      id: injury.id,
      remainingSeconds: injury.remainingSeconds,
      treatment: {
        itemId: 'healingPill',
        owned: owned,
        available: owned > 0
      }
    };
  } catch (error) {
    return null;
  }
}

function combatStatusView(model) {
  return {
    pendingLoot: combatPendingLootView(model),
    injury: combatInjuryView(model)
  };
}

function combatDropPreviewView(row) {
  const itemIds = Array.isArray(row.itemIds) ? row.itemIds.slice() : [];
  const names = row.itemId
    ? [stage3ItemDisplayName(row.itemId)]
    : itemIds.map(stage3ItemDisplayName);
  return {
    itemId: row.itemId,
    itemIds,
    name: names.join(' / ') || '未知战利品',
    min: row.min,
    max: row.max,
    chance: row.chance
  };
}

function combatDropPreviewRows(rows) {
  return Array.isArray(rows)
    ? rows.map(combatDropPreviewView)
    : [];
}

const COMBAT_RANK_LABELS = Object.freeze({
  normal: '普通',
  elite: '精英',
  boss: '首领'
});

function combatRankDisplayName(rank) {
  return COMBAT_RANK_LABELS[rank] || '未知';
}

function unlockedActiveSlotCount(model) {
  const realmId = model && model.player && model.player.breakthrough
    ? model.player.breakthrough.realmId
    : null;
  let index = 0;
  try {
    const realm = stage3Bootstrap.RealmContent.getRealm(realmId);
    if (realm && Number.isFinite(realm.index) && realm.index > 0) {
      index = realm.index;
    }
  } catch (error) {
    index = 0;
  }
  if (stage3Bootstrap.RealmContent &&
      typeof stage3Bootstrap.RealmContent.unlockedActiveTechniqueSlots ===
        'function') {
    return stage3Bootstrap.RealmContent.unlockedActiveTechniqueSlots(index);
  }
  return Math.min(3, Math.max(1, index >= 10 ? 3 : (index >= 9 ? 2 : 1)));
}

function unlockedPassiveSlotCount(model) {
  const realmId = model && model.player && model.player.breakthrough
    ? model.player.breakthrough.realmId
    : null;
  let index = 0;
  try {
    const realm = stage3Bootstrap.RealmContent.getRealm(realmId);
    if (realm && Number.isFinite(realm.index) && realm.index > 0) {
      index = realm.index;
    }
  } catch (error) {
    index = 0;
  }
  if (stage3Bootstrap.RealmContent &&
      typeof stage3Bootstrap.RealmContent.unlockedPassiveTechniqueSlots ===
        'function') {
    return stage3Bootstrap.RealmContent.unlockedPassiveTechniqueSlots(index);
  }
  if (index >= 12) return 5;
  if (index >= 11) return 4;
  if (index >= 10) return 3;
  if (index >= 9) return 2;
  return 1;
}

function combatRegionViewRows(rows) {
  return rows.map(function (region) {
    return Object.assign({}, region, {
      enemies: region.enemies.map(function (enemy) {
        const basic = combatEnemyBasicAttack(enemy.id);
        return Object.assign({}, enemy, {
          rankLabel: combatRankDisplayName(enemy.rank),
          drops: combatDropPreviewRows(enemy.drops),
          basicAttack: {
            id: basic.id,
            name: basic.name,
            glyph: basic.glyph
          }
        });
      })
    });
  });
}

function combatDungeonViewRows(rows) {
  return rows.map(function (dungeon) {
    const firstClear = dungeon.firstClear || {};
    const prerequisites = dungeon.prerequisites || {};
    return Object.assign({}, dungeon, {
      waves: (dungeon.waves || []).map(function (wave) {
        return Object.assign({}, wave, {
          rankLabel: combatRankDisplayName(wave.rank)
        });
      }),
      prerequisites: Object.assign({}, prerequisites, {
        items: (prerequisites.items || []).map(function (item) {
          return Object.assign({}, item, {
            name: stage3ItemDisplayName(item.itemId)
          });
        })
      }),
      firstClear: Object.assign({}, firstClear, {
        rewardRows: displayCountRows(
          firstClear.rewards || {},
          stage3ItemDisplayName
        )
      }),
      repeatDrops: combatDropPreviewRows(dungeon.repeatDrops)
    });
  });
}

function queryCombat(input) {
  if (!useStage3Runtime) return readonlyQuery(null);
  if (!useStage3CombatRuntime) {
    kickEnsureCombatRuntime();
    return readonlyQuery(null);
  }
  const fields = safeInputFields(input, ['tab']);
  if (!fields || typeof fields.tab !== 'string') {
    return readonlyQuery(null);
  }
  const model = stage2QueryModel();
  const active = combatActiveView(model);
  const status = combatStatusView(model);
  if (fields.tab === 'regions') {
    const view = stage3Bootstrap.CombatProgress.queryRegions(model);
    return readonlyQuery({
      tab: 'regions',
      regions: combatRegionViewRows(view.regions),
      active,
      pendingLoot: status.pendingLoot,
      injury: status.injury
    });
  }
  if (fields.tab === 'dungeons') {
    const view = stage3Bootstrap.CombatProgress.queryDungeons(model);
    return readonlyQuery({
      tab: 'dungeons',
      dungeons: combatDungeonViewRows(view.dungeons),
      active,
      pendingLoot: status.pendingLoot,
      injury: status.injury
    });
  }
  return readonlyQuery(null);
}

function combatLoadoutOption(row, selected) {
  const optionId = row.instanceId || row.itemId;
  const option = {
    itemId: optionId,
    name: row.name,
    quantity: row.quantity,
    bound: row.bound,
    available: row.available,
    selected: optionId === selected
  };
  if (row.instanceId) option.instanceId = row.instanceId;
  if (row.baseId) option.baseId = row.baseId;
  if (row.slot) option.slot = row.slot;
  if (row.quality) option.quality = row.quality;
  if (Number.isFinite(Number(row.enhancementLevel))) {
    option.enhancementLevel = Number(row.enhancementLevel) || 0;
  }
  ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
    if (typeof row[key] === 'string' && row[key]) option[key] = row[key];
  });
  return option;
}

function combatLoadoutSelectedOption(itemId, name, extra) {
  const option = {
    itemId: itemId,
    name: name || itemId,
    quantity: 0,
    bound: 0,
    available: 0,
    selected: true
  };
  if (extra && typeof extra === 'object') {
    if (extra.instanceId) option.instanceId = extra.instanceId;
    if (extra.slot) option.slot = extra.slot;
    if (extra.quality) option.quality = extra.quality;
    if (Number.isFinite(Number(extra.enhancementLevel))) {
      option.enhancementLevel = Number(extra.enhancementLevel) || 0;
    }
    ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
      if (typeof extra[key] === 'string' && extra[key]) {
        option[key] = extra[key];
      }
    });
  }
  return option;
}

const STAGE3_CONDITION_OPTIONS = Object.freeze({
  enemyHasStatus: Object.freeze([
    Object.freeze({ id: 'shock', label: '震慑' }),
    Object.freeze({ id: 'slow', label: '迟缓' }),
    Object.freeze({ id: 'burn', label: '灼烧' }),
    Object.freeze({ id: 'poison', label: '中毒' })
  ]),
  enemyMissingStatus: Object.freeze([
    Object.freeze({ id: 'shock', label: '震慑' }),
    Object.freeze({ id: 'slow', label: '迟缓' }),
    Object.freeze({ id: 'burn', label: '灼烧' }),
    Object.freeze({ id: 'poison', label: '中毒' }),
    Object.freeze({ id: 'weaken', label: '虚弱' })
  ]),
  selfMissingBuff: Object.freeze([
    Object.freeze({ id: 'haste', label: '迅捷' }),
    Object.freeze({ id: 'shield', label: '护盾' }),
    Object.freeze({ id: 'inspire', label: '鼓舞' }),
    Object.freeze({ id: 'guard', label: '替伤' })
  ])
});

function combatConditionOptionsView(available) {
  const source = available ? STAGE3_CONDITION_OPTIONS : {
    enemyHasStatus: [],
    enemyMissingStatus: [],
    selfMissingBuff: []
  };
  return {
    enemyHasStatus: source.enemyHasStatus.map(function (row) {
      return { id: row.id, label: row.label };
    }),
    enemyMissingStatus: (source.enemyMissingStatus || []).map(function (row) {
      return { id: row.id, label: row.label };
    }),
    selfMissingBuff: source.selfMissingBuff.map(function (row) {
      return { id: row.id, label: row.label };
    })
  };
}

function validEnumeratedCombatCondition(condition) {
  try {
    if (!condition || typeof condition !== 'object') return true;
    const type = condition.type;
    if (type !== 'enemyHasStatus' && type !== 'enemyMissingStatus' &&
        type !== 'selfMissingBuff') {
      return true;
    }
    const field = type === 'selfMissingBuff' ? 'buffId' : 'statusId';
    const options = STAGE3_CONDITION_OPTIONS[type] || [];
    const value = condition[field];
    return options.some(function (row) {
      return row.id === value;
    });
  } catch (error) {
    return false;
  }
}

function combatLoadoutPlans(model, plans) {
  let inventory;
  try {
    inventory = stage2Bootstrap.Inventory.query(
      model.player.inventory,
      { category: 'all', search: '' }
    );
  } catch (error) {
    inventory = null;
  }
  const inventoryRows = inventory && Array.isArray(inventory.items)
    ? inventory.items
    : [];
  const referencedEquipment = {};
  plans.forEach(function (plan) {
    plan.equipment.forEach(function (row) {
      if (row.itemId) referencedEquipment[row.itemId] = true;
    });
  });

  // 按槽位预分桶，避免每个方案×每个槽位反复扫整包。
  const instanceBySlot = Object.create(null);
  const stackBySlot = Object.create(null);
  const supplyByType = Object.create(null);
  inventoryRows.forEach(function (row) {
    if (!row) return;
    if (row.instanceId && row.slot) {
      if (
        row.available > 0 ||
        referencedEquipment[row.instanceId] === true
      ) {
        (instanceBySlot[row.slot] || (instanceBySlot[row.slot] = []))
          .push(row);
      }
      return;
    }
    if (row.instanceId) return;
    try {
      const equipmentDef =
        stage3Bootstrap.CombatContent.getEquipment(row.itemId);
      if (equipmentDef && equipmentDef.slot) {
        if (
          row.available > 0 ||
          referencedEquipment[row.itemId] === true
        ) {
          (stackBySlot[equipmentDef.slot] ||
            (stackBySlot[equipmentDef.slot] = [])).push(row);
        }
        return;
      }
    } catch (error) {}
    try {
      const supplyDef =
        stage3Bootstrap.CombatContent.getSupply(row.itemId);
      if (supplyDef && supplyDef.type && row.available > 0) {
        (supplyByType[supplyDef.type] ||
          (supplyByType[supplyDef.type] = [])).push(row);
      }
    } catch (error) {}
  });

  function equipmentOptions(slot, selected) {
    const options = [];
    const seen = {};
    (instanceBySlot[slot] || []).forEach(function (row) {
      if (
        row.available > 0 ||
        row.instanceId === selected ||
        referencedEquipment[row.instanceId] === true
      ) {
        if (!seen[row.instanceId]) {
          seen[row.instanceId] = true;
          options.push(combatLoadoutOption(row, selected));
        }
      }
    });
    (stackBySlot[slot] || []).forEach(function (row) {
      if (
        (
          row.available > 0 ||
          row.itemId === selected ||
          referencedEquipment[row.itemId] === true
        ) &&
        !seen[row.itemId]
      ) {
        seen[row.itemId] = true;
        options.push(combatLoadoutOption(row, selected));
      }
    });
    if (selected && !options.some(function (option) {
      return option.itemId === selected ||
        option.instanceId === selected;
    })) {
      try {
        if (useEquipmentRuntime && equipmentBootstrap.Equipment) {
          const instance = equipmentInstance(model, selected);
          const resolved = instance
            ? equipmentBootstrap.Equipment.resolve(instance)
            : null;
          if (resolved && resolved.slot === slot) {
            options.push(combatLoadoutSelectedOption(
              selected,
              resolved.name,
              {
                instanceId: selected,
                slot: resolved.slot,
                quality: resolved.quality,
                enhancementLevel: resolved.enhancementLevel,
                iconSrc50: resolved.iconSrc50,
                iconSrc100: resolved.iconSrc100
              }
            ));
            return options;
          }
        }
        const definition =
          stage3Bootstrap.CombatContent.getEquipment(selected);
        if (definition && definition.slot === slot) {
          options.push(combatLoadoutSelectedOption(
            selected,
            definition.name
          ));
        }
      } catch (error) {}
    }
    return options;
  }

  function supplyOptions(slot, selected) {
    const options = (supplyByType[slot] || []).filter(function (row) {
      return row.available > 0 || row.itemId === selected;
    }).map(function (row) {
      return combatLoadoutOption(row, selected);
    });
    if (selected && !options.some(function (option) {
      return option.itemId === selected;
    })) {
      try {
        const definition =
          stage3Bootstrap.CombatContent.getSupply(selected);
        const item = stage2Bootstrap.ItemContent.get(selected);
        if (definition && definition.type === slot) {
          const extra = {};
          ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
            if (item && typeof item[key] === 'string' && item[key]) {
              extra[key] = item[key];
            }
          });
          options.push(combatLoadoutSelectedOption(
            selected,
            item ? item.name : selected,
            extra
          ));
        }
      } catch (error) {}
    }
    return options;
  }

  return plans.map(function (plan) {
    return Object.assign({}, plan, {
      equipment: plan.equipment.map(function (row) {
        return Object.assign({}, row, {
          options: equipmentOptions(row.slot, row.itemId || row.instanceId)
        });
      }),
      supplies: plan.supplies.map(function (row) {
        const item = row.itemId && stage2Bootstrap.ItemContent
          ? stage2Bootstrap.ItemContent.get(row.itemId)
          : null;
        const enriched = {
          name: row.itemId ? stage3ItemDisplayName(row.itemId) : null,
          options: supplyOptions(row.slot, row.itemId)
        };
        if (item) {
          ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
            if (typeof item[key] === 'string' && item[key]) {
              enriched[key] = item[key];
            }
          });
        }
        return Object.assign({}, row, enriched);
      })
    });
  });
}

function queryCombatLoadouts() {
  if (!useStage3Runtime) {
    return readonlyQuery({
      activeLoadoutId: null,
      activeSessionLoadoutId: null,
      maxLoadouts: 5,
      canCreate: false,
      tabs: [],
      plans: [],
      conditionOptions: combatConditionOptionsView(false),
      currentDerivedStats: null
    });
  }
  if (!useStage3CombatRuntime) {
    kickEnsureCombatRuntime();
  }
  let model = stage2QueryModel();
  let view = stage3Bootstrap.CombatLoadouts.query(model);
  // queryView 热路径偶发无法通过 Loadouts 严检时，回退一次规范化模型，避免装备页空白。
  if ((!view || !Array.isArray(view.tabs) || view.tabs.length === 0) &&
      state.player &&
      state.player.combat &&
      Array.isArray(state.player.combat.loadouts) &&
      state.player.combat.loadouts.length > 0 &&
      typeof StateModel.fromRuntime === 'function') {
    model = StateModel.fromRuntime(state, state.processedThroughMs);
    view = stage3Bootstrap.CombatLoadouts.query(model);
  }
  const plans = combatLoadoutPlans(model, view.loadouts);
  return readonlyQuery({
    activeLoadoutId: view.activeLoadoutId,
    activeSessionLoadoutId: view.activeSessionLoadoutId,
    maxLoadouts: view.maxLoadouts,
    canCreate: view.canCreate,
    tabs: view.tabs,
    plans: plans,
    conditionOptions: combatConditionOptionsView(true),
    unlockedActiveSlots: unlockedActiveSlotCount(model),
    unlockedPassiveSlots: unlockedPassiveSlotCount(model),
    currentDerivedStats: view.activeLoadoutId &&
      stage3Bootstrap.CombatStats
      ? stage3Bootstrap.CombatStats.derive(model, view.activeLoadoutId)
      : null
  });
}

const STAGE3_TECHNIQUE_TAG_LABELS = Object.freeze({
  sword: '剑诀',
  fist: '拳法',
  spirit: '灵力',
  healing: '疗愈',
  qi: '真气',
  thunder: '雷法',
  talisman: '符法',
  beast: '御兽',
  array: '阵法',
  body: '炼体',
  movement: '身法',
  pill: '丹道',
  music: '音律'
});

function techniquePercent(value) {
  return Math.round((Number(value) || 0) * 100) + '%';
}

function techniqueStatusDisplayName(statusId) {
  if (statusId === 'shock') return '震慑';
  if (statusId === 'binding' || statusId === 'slow') return '迟缓';
  if (statusId === 'burn') return '灼烧';
  if (statusId === 'poison') return '中毒';
  if (statusId === 'haste') return '迅捷';
  if (statusId === 'weaken') return '虚弱';
  if (statusId === 'inspire') return '鼓舞';
  if (statusId === 'silence') return '禁言';
  if (statusId === 'vulnerable') return '易伤';
  return '状态';
}

function stage3TechniqueEffectText(effect) {
  if (!effect || typeof effect !== 'object') return '无';
  if (effect.type === 'attack' || effect.type === 'aoeAttack') {
    const damage = '造成 ' + techniquePercent(effect.multiplier) +
      ' 攻击伤害';
    const parts = [
      effect.type === 'aoeAttack'
        ? '群体' + damage
        : (effect.hits > 1 ? '连续 ' + effect.hits + ' 次' + damage : damage)
    ];
    if (effect.defenseIgnore) {
      parts.push('无视 ' + techniquePercent(effect.defenseIgnore) + ' 防御');
    }
    if (effect.status) {
      const status = effect.status;
      const duration = Math.round((Number(status.durationTicks) || 0) / 4);
      parts.push(
        (status.chance
          ? techniquePercent(status.chance) + ' 概率施加'
          : '施加') +
        techniqueStatusDisplayName(status.id) +
        (duration > 0 ? ' ' + duration + ' 秒' : '')
      );
    }
    if (effect.activeBeastMultiplier) {
      parts.push(
        '灵兽出战时效果提升至 ' +
        techniquePercent(effect.activeBeastMultiplier)
      );
    }
    return parts.join(' · ');
  }
  if (effect.type === 'heal') {
    const parts = [];
    if (effect.attackFactor || effect.maxHpRatio) {
      parts.push(
        '恢复 攻击×' + techniquePercent(effect.attackFactor || 0) +
        '＋最大气血×' + techniquePercent(effect.maxHpRatio || 0)
      );
    }
    if (effect.purge) parts.push('净化一个减益');
    return parts.length ? parts.join(' · ') : '无';
  }
  if (effect.type === 'restoreQi') {
    if (effect.maxQiRatio) {
      return '恢复 ' + techniquePercent(effect.maxQiRatio) + ' 真气上限';
    }
    return '恢复 ' + (effect.amount || 0) + ' 点真气';
  }
  if (effect.type === 'shield') {
    return '获得 防御×' + techniquePercent(effect.defenseFactor || 0) +
      '＋最大气血×' + techniquePercent(effect.maxHpRatio || 0) + ' 护盾';
  }
  if (effect.type === 'guard') {
    return '出战灵兽拦截下一次单体攻击（至多 ' +
      Math.round((Number(effect.durationTicks) || 0) / 4) + ' 秒）';
  }
  if (effect.type === 'beastAttack') {
    return '出战灵兽造成 ' + techniquePercent(effect.multiplier) + ' 攻击伤害';
  }
  if (effect.type === 'partyDamageBuff') {
    return '伤害提高 ' + techniquePercent(effect.damageBonus || 0) +
      '（约 ' + Math.round((Number(effect.durationTicks) || 0) / 4) + ' 秒）';
  }
  if (effect.type === 'purge') {
    return '净化一个减益';
  }
  if (effect.maxQiPercent) {
    return '真气上限 +' + techniquePercent(effect.maxQiPercent);
  }
  if (effect.defensePercent) {
    return '防御 +' + techniquePercent(effect.defensePercent);
  }
  if (effect.accuracyFlat) {
    return '命中 +' + Math.round(Number(effect.accuracyFlat) || 0);
  }
  if (effect.attackIntervalReduction) {
    return '攻击间隔 -' + techniquePercent(effect.attackIntervalReduction);
  }
  if (effect.cooldownReduction) {
    return '冷却减缩 +' + techniquePercent(effect.cooldownReduction);
  }
  if (effect.incomingHealBonus) {
    return '受到治疗 +' + techniquePercent(effect.incomingHealBonus);
  }
  if (effect.critChanceBonus) {
    return '暴击率 +' + techniquePercent(effect.critChanceBonus);
  }
  if (effect.healPowerBonus) {
    return '治疗强度 +' + techniquePercent(effect.healPowerBonus);
  }
  if (effect.shieldPowerBonus) {
    return '护盾强度 +' + techniquePercent(effect.shieldPowerBonus);
  }
  if (effect.selfAndBeastMaxHpPercent) {
    return '自身与出战灵兽气血上限 +' +
      techniquePercent(effect.selfAndBeastMaxHpPercent);
  }
  if (effect.controlResistBonus) {
    return '控制抗性 +' + techniquePercent(effect.controlResistBonus);
  }
  if (effect.affinityTeamBonus) {
    return '好感协作增益 +' + techniquePercent(effect.affinityTeamBonus);
  }
  if (effect.taggedDamageBonus) {
    const tag = Object.keys(effect.taggedDamageBonus)[0];
    return (STAGE3_TECHNIQUE_TAG_LABELS[tag] || '对应功法') +
      '伤害 +' + techniquePercent(effect.taggedDamageBonus[tag]);
  }
  if (effect.supplyHealingBonus) {
    return '补给治疗效果 +' + techniquePercent(effect.supplyHealingBonus);
  }
  if (effect.activeBeastEffectBonus) {
    return '出战灵兽效果 +' +
      techniquePercent(effect.activeBeastEffectBonus);
  }
  if (effect.normalAttackBonus) {
    return '普攻伤害 +' + techniquePercent(effect.normalAttackBonus);
  }
  if (effect.qiRegenBonus) {
    return '真气回复 +' + techniquePercent(effect.qiRegenBonus);
  }
  if (effect.lowHpDamageReduction || effect.lowHpIncomingHealBonus) {
    const parts = [];
    if (effect.lowHpDamageReduction) {
      parts.push(
        '减伤 ' + techniquePercent(effect.lowHpDamageReduction)
      );
    }
    if (effect.lowHpIncomingHealBonus) {
      parts.push(
        '受疗 +' + techniquePercent(effect.lowHpIncomingHealBonus)
      );
    }
    return '低血（低于 ' +
      techniquePercent(effect.lowHpThreshold || 0.3) +
      '）时' + parts.join(' · ');
  }
  if (effect.maxHpPercent) {
    return '气血上限 +' + techniquePercent(effect.maxHpPercent);
  }
  if (effect.ailmentPowerBonus) {
    return '异常状态强度 +' + techniquePercent(effect.ailmentPowerBonus);
  }
  if (effect.overflowHealToShield) {
    return '过量治疗转护盾 ' +
      techniquePercent(effect.overflowHealToShield) +
      '（上限 ' + techniquePercent(effect.overflowShieldCap || 0) + '）';
  }
  if (effect.buffDurationBonus) {
    return '增益持续时间 +' + techniquePercent(effect.buffDurationBonus);
  }
  if (effect.damageReduction && !effect.type) {
    return '减伤 +' + techniquePercent(effect.damageReduction);
  }
  return '无';
}

function stage3TechniqueViewRow(row) {
  return Object.assign({}, row, {
    tagLabels: (row.tags || []).map(function (tag) {
      return STAGE3_TECHNIQUE_TAG_LABELS[tag] || '其他';
    }),
    effectText: stage3TechniqueEffectText(row.effect)
  });
}

function queryTechniques() {
  if (!useStage3Runtime) {
    return readonlyQuery({
      learned: [],
      unlearned: [],
      techniques: []
    });
  }
  const view = stage3Bootstrap.Techniques.queryLibrary(
    stage2QueryModel(),
    EMPTY_SECT_CONTEXT
  );
  const techniques = view.techniques.map(stage3TechniqueViewRow);
  return readonlyQuery({
    learned: techniques.filter(function (row) {
      return row.learned;
    }),
    unlearned: techniques.filter(function (row) {
      return !row.learned;
    }),
    techniques
  });
}