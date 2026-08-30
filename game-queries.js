'use strict';

function queryApp() {
  return readonlyQuery({
    phase: state.phase,
    appearance: {
      indices: normalizeParts(state.parts)
    },
    modals: {
      break: !!state.showBreak,
      offline: !!state.showOffline && !state.settlingOffline,
      settlingOffline: !!state.settlingOffline,
      legacyRebirth: !!state.showLunhui,
      lifespanBuffer: !!state.showLifespanBuffer
    }
  });
}

function querySettlingOffline() {
  const progress = state._offlineSettleProgress;
  return readonlyQuery({
    active: !!state.settlingOffline,
    fromMs: progress ? progress.fromMs : 0,
    currentMs: progress ? progress.currentMs : 0,
    toMs: progress ? progress.toMs : 0,
    label: typeof formatOfflineSettleProgress === 'function'
      ? formatOfflineSettleProgress(progress)
      : '正在结算离线收益，请稍候…'
  });
}

function queryNavigation() {
  return readonlyQuery({
    activeIndex: state.navIndex,
    items: NAV.map(function (label, index) {
      return {
        id: 'nav-' + index,
        label,
        active: index === state.navIndex
      };
    })
  });
}

function queryTop() {
  return readonlyQuery(getTopInfo());
}

function queryHome() {
  return readonlyQuery(getHomeInfo());
}

function queryInventory(options) {
  if (!useStage2Runtime) {
    return readonlyQuery({
      capacity: getInventoryList().length,
      used: getInventoryList().length,
      free: 0,
      categories: ['all'],
      selectedCategory: 'all',
      search: '',
      items: getInventoryList().map(function (item) {
        return {
          itemId: item.k,
          name: item.n,
          category: 'all',
          quantity: item.v,
          bound: 0,
          available: item.v,
          sellValue: 0
        };
      })
    });
  }
  const model = stage2QueryModel();
  return readonlyQuery(stage2Bootstrap.Inventory.query(
    model.player && model.player.inventory,
    options
  ));
}

function queryItemInfo(input) {
  const itemId = input && typeof input.itemId === 'string'
    ? input.itemId
    : '';
  if (!stage2Bootstrap || !stage2Bootstrap.ItemContent || !itemId) {
    return readonlyQuery(null);
  }
  const item = stage2Bootstrap.ItemContent.get(itemId);
  if (!item) return readonlyQuery(null);
  const row = {
    itemId: item.id || itemId,
    name: item.name || itemId,
    category: item.category || 'material',
    icon: item.icon || '📦',
    description: item.description || '暂无说明。',
    quality: item.quality || 'white',
    sellValue: Number.isSafeInteger(item.sellValue) ? item.sellValue : 0
  };
  ['iconSrc', 'iconSrc50', 'iconSrc100'].forEach(function (key) {
    if (item[key]) row[key] = item[key];
  });
  return readonlyQuery(row);
}

function safeOptionalInputFields(input, allowed, required) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        !safeInputData(input)) {
      return null;
    }
    const keys = Reflect.ownKeys(input);
    if (keys.some(function (key) {
      return typeof key !== 'string' || allowed.indexOf(key) < 0;
    })) {
      return null;
    }
    if ((required || []).some(function (key) {
      return keys.indexOf(key) < 0;
    })) {
      return null;
    }
    const result = {};
    keys.forEach(function (key) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(
        descriptor,
        'value'
      )) {
        throw new Error('invalid input descriptor');
      }
      result[key] = descriptor.value;
    });
    return result;
  } catch (error) {
    return null;
  }
}

function equipmentLoadout(model, requestedId) {
  const combat = model && model.player && model.player.combat;
  const loadouts = combat && Array.isArray(combat.loadouts)
    ? combat.loadouts
    : [];
  const loadoutId = typeof requestedId === 'string' && requestedId
    ? requestedId
    : combat && combat.activeLoadoutId;
  return loadouts.find(function (loadout) {
    return loadout && loadout.id === loadoutId;
  }) || null;
}

function equipmentReferences(model, instanceId) {
  const combat = model && model.player && model.player.combat;
  const loadouts = combat && Array.isArray(combat.loadouts)
    ? combat.loadouts
    : [];
  const references = [];
  loadouts.forEach(function (loadout) {
    Object.keys(loadout.equipment || {}).forEach(function (slot) {
      if (loadout.equipment[slot] === instanceId) {
        references.push({
          loadoutId: loadout.id,
          loadoutName: loadout.name,
          slot: slot
        });
      }
    });
  });
  return references;
}

function equipmentInstance(model, instanceId) {
  return useEquipmentRuntime && model && model.player
    ? stage2Bootstrap.Inventory.findEquipment(
      model.player.inventory,
      instanceId
    )
    : null;
}

function numericDelta(after, before) {
  const result = {};
  const keys = new Set(
    Object.keys(after || {}).concat(Object.keys(before || {}))
  );
  keys.forEach(function (key) {
    const delta = (Number(after && after[key]) || 0) -
      (Number(before && before[key]) || 0);
    if (delta !== 0) result[key] = Math.round(delta * 10000) / 10000;
  });
  return result;
}

function queryEquipmentInfo(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId', 'loadoutId'],
    ['instanceId']
  );
  if (!useEquipmentRuntime || !fields ||
      typeof fields.instanceId !== 'string') {
    return readonlyQuery(null);
  }
  const model = stage2QueryModel();
  const instance = equipmentInstance(model, fields.instanceId);
  const resolved = instance
    ? equipmentBootstrap.Equipment.resolve(instance)
    : null;
  if (!resolved) return readonlyQuery(null);
  const loadout = equipmentLoadout(model, fields.loadoutId);
  let current = null;
  const beforeItems = Object.keys(loadout && loadout.equipment || {}).map(
    function (slot) {
      const candidate = equipmentInstance(model, loadout.equipment[slot]);
      if (candidate &&
          equipmentBootstrap.Equipment.resolve(candidate).slot ===
            resolved.slot) {
        current = candidate;
      }
      return candidate;
    }
  ).filter(Boolean);
  const afterItems = beforeItems.filter(function (candidate) {
    return equipmentBootstrap.Equipment.resolve(candidate).slot !==
      resolved.slot;
  }).concat([instance]);
  const beforeAggregate = equipmentBootstrap.Equipment.aggregate(beforeItems);
  const afterAggregate = equipmentBootstrap.Equipment.aggregate(afterItems);
  const references = equipmentReferences(model, instance.instanceId);
  return readonlyQuery(Object.assign({}, resolved, {
    comparison: {
      currentInstanceId: current ? current.instanceId : null,
      currentName: current
        ? equipmentBootstrap.Equipment.resolve(current).name
        : null,
      flat: numericDelta(afterAggregate.flat, beforeAggregate.flat),
      percent: numericDelta(
        afterAggregate.percent,
        beforeAggregate.percent
      )
    },
    resonanceBefore: beforeAggregate.resonance,
    resonanceAfter: afterAggregate.resonance,
    references: references,
    permissions: {
      canEquip: !!loadout,
      canEnhance: instance.enhancementLevel < 15,
      canReforge: instance.affixes.length > 0,
      canSell: !instance.favorite && references.length === 0,
      canSalvage: !instance.favorite && references.length === 0
    }
  }));
}

function queryBreakModal() {
  return readonlyQuery(getBreakInfo());
}

function querySkillPage(navName) {
  if (typeof LazyContent !== 'undefined' &&
      LazyContent && typeof LazyContent.ensureHerblore === 'function') {
    LazyContent.ensureHerblore();
  }
  if (useStage2Runtime) {
    const page = STAGE2_PRODUCTION_PAGES[navName];
    if (!page) return readonlyQuery(null);
    const model = stage2QueryModel();
    if (!model.player) return readonlyQuery(null);
    const progress = stage2Progress(model.player, page.skillId);
    const bonuses = stage2ProductionBonuses(model, page.skillId);
    const recipes = stage2RecipeCards(model, page, bonuses);
    return readonlyQuery({
      title: page.title,
      skillId: page.skillId,
      skill: page.skillId,
      description: page.desc,
      desc: page.desc,
      level: progress.level,
      lv: progress.level,
      xp: progress.xp,
      nextXp: stage2Bootstrap.SkillProgression.skillXpNeed(
        progress.level
      ),
      xpNeed: stage2Bootstrap.SkillProgression.skillXpNeed(
        progress.level
      ),
      bonuses,
      recipes,
      actions: recipes.map(function (recipe) {
        return {
          key: recipe.actionKey,
          name: recipe.name,
          icon: recipe.name.charAt(0),
          skill: page.skillId,
          lv: progress.level,
          needLv: recipe.unlockLevel,
          time: recipe.durationSeconds,
          xp: recipe.skillXp,
          out: recipe.output.name + ' ×' + recipe.output.quantity,
          locked: !recipe.unlocked,
          active: recipe.active,
          stalled: recipe.stalled,
          progress: recipe.progress
        };
      })
    });
  }
  return readonlyQuery(getSkillPageInfo(navName));
}

function queryGatherPage(navName) {
  if (useStage2Runtime) {
    const skillId = STAGE2_GATHER_PAGES[navName];
    const content = skillId &&
      stage2Bootstrap.GatheringContent.GATHERING[skillId];
    if (!content) return readonlyQuery(null);
    const model = stage2QueryModel();
    if (!model.player) return readonlyQuery(null);
    const progress = stage2Progress(model.player, skillId);
    const formations = stage2Bootstrap.Formations.effects(model);
    const beast = stage2ScopedBeastEffects(
      model,
      skillId === 'fishing' ? 'fishing' : 'gathering',
      skillId
    );
    const bonuses = {
      skillSpeedBonus:
        stage2Bootstrap.SkillProgression.skillSpeedBonus(
          progress.level
        ),
      gatheringExtraYieldChance:
        (Number.isFinite(formations.gatheringExtraYieldChance)
          ? formations.gatheringExtraYieldChance
          : 0) +
        (Number.isFinite(beast.gatheringExtraYieldChance)
          ? beast.gatheringExtraYieldChance
          : 0),
      gatheringDurationReduction:
        Number.isFinite(beast.gatheringDurationReduction)
          ? beast.gatheringDurationReduction
          : 0,
      fishRecoveryReduction:
        (Number.isFinite(formations.fishRecoveryReduction)
          ? formations.fishRecoveryReduction
          : 0) +
        (Number.isFinite(beast.fishRecoveryReduction)
          ? beast.fishRecoveryReduction
          : 0)
    };
    const explore = content.explore
      ? (function () {
          const key = 'gather:explore:' + skillId;
          const duration = stage2GatherDuration(
            model,
            skillId,
            content.explore.masteryId,
            content.explore.time
          );
          const action = stage2ActionView(model, key, duration);
          const mastery = stage2Mastery(
            model.player,
            skillId,
            content.explore.masteryId
          );
          const discoverable = (content.entries || []).map(function (entry) {
            const unlocked = entry.unlockLevel <= progress.level;
            const drop0 = entry.drops && entry.drops[0];
            const item = drop0
              ? stage2Bootstrap.ItemContent.get(drop0.itemId)
              : null;
            return {
              entryId: entry.id,
              name: entry.name,
              unlockLevel: entry.unlockLevel,
              unlocked: unlocked,
              itemId: drop0 ? drop0.itemId : null,
              itemName: item ? item.name : (drop0 ? drop0.itemId : ''),
              iconItem: drop0
                ? {
                    itemId: drop0.itemId,
                    name: item ? item.name : drop0.itemId
                  }
                : null
            };
          }).sort(function (a, b) {
            if (a.unlockLevel !== b.unlockLevel) {
              return a.unlockLevel - b.unlockLevel;
            }
            return String(a.name).localeCompare(String(b.name), 'zh');
          });
          return {
            actionKey: key,
            name: content.explore.name,
            durationSeconds: duration,
            skillXp: content.explore.skillXp,
            masteryXp: content.explore.masteryXp,
            mastery: {
              level: mastery.level,
              xp: mastery.xp,
              nextXp:
                stage2Bootstrap.SkillProgression.masteryXpNeed(
                  mastery.level
                ),
              speedBonus:
                stage2Bootstrap.SkillProgression.masterySpeedBonus(
                  mastery.level
                ),
              extraYieldChance: 0
            },
            discoverable: discoverable,
            skillLevel: progress.level,
            active: action.active,
            stalled: action.stalled,
            progress: action.progress
          };
        })()
      : null;
    let resources = [];
    const spotStateRaw = model.systems.gathering.spots[skillId];
    const spotList = Array.isArray(spotStateRaw)
      ? spotStateRaw
      : (spotStateRaw ? [spotStateRaw] : []);
    if (skillId !== 'fishing') {
      resources = spotList.map(function (spotState) {
        const entry = stage2Bootstrap.GatheringContent.getEntry(
          skillId,
          spotState.entryId
        );
        if (!entry) return null;
        const mastery = stage2Mastery(
          model.player,
          skillId,
          entry.masteryId
        );
        const key = 'gather:collect:' + skillId + ':' +
          spotState.instanceId;
        const duration = stage2GatherDuration(
          model,
          skillId,
          entry.masteryId,
          entry.time
        );
        const action = stage2ActionView(model, key, duration);
        return {
          instanceId: spotState.instanceId,
          entryId: entry.id,
          name: entry.name,
          remaining: spotState.remaining,
          capacity: spotState.capacity,
          unlockLevel: entry.unlockLevel,
          durationSeconds: duration,
          skillXp: entry.xp,
          mastery: {
            level: mastery.level,
            xp: mastery.xp,
            nextXp:
              stage2Bootstrap.SkillProgression.masteryXpNeed(
                mastery.level
              ),
            speedBonus:
              stage2Bootstrap.SkillProgression.masterySpeedBonus(
                mastery.level
              ),
            extraYieldChance:
              stage2Bootstrap.SkillProgression
                .masteryYieldOrRetentionChance(mastery.level)
          },
          drops: stage2DropRows(entry.drops),
          actionKey: key,
          active: action.active,
          stalled: action.stalled,
          progress: action.progress
        };
      }).filter(Boolean);
    }
    const resource = resources.length ? resources[0] : null;
    const maxCapacity = skillId !== 'fishing' &&
      stage2Bootstrap.GatheringContent.maxSpotCapacity
      ? stage2Bootstrap.GatheringContent.maxSpotCapacity(progress.level)
      : 0;
    if (explore) {
      explore.heldSpots = resources.length;
      explore.maxCapacity = maxCapacity;
      explore.saturated = skillId !== 'fishing' &&
        stage2Bootstrap.GatheringContent.exploreSaturated
        ? !!stage2Bootstrap.GatheringContent.exploreSaturated(
          skillId,
          progress.level,
          (model.systems.gathering.spots &&
            model.systems.gathering.spots[skillId]) || []
        )
        : false;
    }
    const spots = skillId === 'fishing'
      ? content.spots.map(function (spot) {
          const duration = stage2GatherDuration(
            model,
            skillId,
            spot.masteryId || ('fishing:' + spot.id),
            spot.time
          );
          const key = 'fish:' + spot.id;
          const action = stage2ActionView(model, key, duration);
          const unlocks = model.systems.gathering.fishingUnlocks || {};
          const flagLocked = !!(spot.unlockFlag && unlocks[spot.unlockFlag] !== true);
          const mastery = stage2Mastery(
            model.player,
            skillId,
            spot.masteryId || ('fishing:' + spot.id)
          );
          return {
            spotId: spot.id,
            name: spot.name,
            unlockLevel: spot.unlockLevel,
            unlockFlag: spot.unlockFlag || null,
            unlocked: progress.level >= spot.unlockLevel && !flagLocked,
            flagLocked: flagLocked,
            fishChance: spot.fishChance,
            junkChance: spot.junkChance,
            specialChance: spot.specialChance,
            durationSeconds: duration,
            skillXp: spot.xp,
            actionKey: key,
            mastery: {
              level: mastery.level,
              xp: mastery.xp,
              nextXp:
                stage2Bootstrap.SkillProgression.masteryXpNeed(
                  mastery.level
                ),
              speedBonus:
                stage2Bootstrap.SkillProgression.masterySpeedBonus(
                  mastery.level
                ),
              extraYieldChance:
                stage2Bootstrap.SkillProgression
                  .masteryYieldOrRetentionChance(mastery.level)
            },
            species: spot.drops.map(function (drop) {
              const species =
                stage2Bootstrap.GatheringContent
                  .FISH_SPECIES[drop.itemId];
              return {
                speciesId: drop.itemId,
                name: species ? species.name : drop.itemId,
                weight: drop.w,
                quantity: drop.q,
                stock:
                  model.systems.gathering.fishStocks[drop.itemId] || 0,
                maxStock: species ? species.maxStock : 0
              };
            }),
            active: action.active,
            stalled: action.stalled,
            progress: action.progress
          };
        })
      : [];
    const cards = [];
    if (explore) {
      cards.push({
        type: 'explore',
        id: 'explore',
        name: explore.name,
        active: explore.active,
        stalled: explore.stalled,
        progress: explore.progress
      });
    }
    resources.forEach(function (row) {
      cards.push({
        type: 'entry',
        id: row.instanceId || row.entryId,
        name: row.name,
        unlockLv: row.unlockLevel,
        time: row.durationSeconds,
        xp: row.skillXp,
        left: row.remaining,
        cap: row.capacity,
        active: row.active,
        stalled: row.stalled,
        progress: row.progress
      });
    });
    spots.forEach(function (spot) {
      const stocks = spot.species.map(function (species) {
        return species.stock;
      });
      cards.push({
        type: 'entry',
        id: spot.spotId,
        name: spot.name,
        unlockLv: spot.unlockLevel,
        time: spot.durationSeconds,
        xp: spot.skillXp,
        left: stocks.length ? Math.min.apply(Math, stocks) : 0,
        cap: spot.species.length
          ? spot.species[0].maxStock
          : 0,
        active: spot.active,
        stalled: spot.stalled,
        progress: spot.progress,
        locked: !spot.unlocked
      });
    });
    return readonlyQuery({
      title: content.title,
      skillId,
      skill: skillId,
      description: '探索并采集' + content.title + '资源',
      desc: '探索并采集' + content.title + '资源',
      level: progress.level,
      lv: progress.level,
      xp: progress.xp,
      nextXp: stage2Bootstrap.SkillProgression.skillXpNeed(
        progress.level
      ),
      xpNeed: stage2Bootstrap.SkillProgression.skillXpNeed(
        progress.level
      ),
      bonuses,
      explore,
      resource,
      resources,
      spots,
      cards,
      noSpotHint: skillId !== 'fishing' && resources.length === 0
    });
  }
  return readonlyQuery(getGatherPageInfo(navName));
}

function queryHomestead(moduleId) {
  if (!useStage2Runtime) {
    return readonlyQuery({ implemented: false });
  }
  const model = stage2QueryModel();
  if (moduleId === 'farm') {
    return readonlyQuery(stage2Bootstrap.Farm.query(model));
  }
  if (moduleId === 'formations') {
    return readonlyQuery(stage2Bootstrap.Formations.query(model));
  }
  if (moduleId === 'inheritance') {
    return queryInheritanceHall({ section: 'overview' });
  }
  if (moduleId === 'meetingHall') {
    return readonlyQuery({ implemented: false });
  }
  if (moduleId !== 'beasts') return readonlyQuery(null);
  const base = stage2Bootstrap.SpiritBeasts.query(model);
  const content = stage2Bootstrap.HomesteadContent;
  const activeId = base.activeIds.length ? base.activeIds[0] : null;
  return readonlyQuery({
    encounters: base.encounters.map(function (encounter) {
      const species = content.getBeast(encounter.speciesId);
      const actionKey = 'beast:tame:' + encounter.id;
      const duration = stage2RuntimeActionDuration(model, actionKey);
      const action = stage2ActionView(model, actionKey, duration);
      return {
        id: encounter.id,
        speciesId: encounter.speciesId,
        speciesName: species ? species.name : encounter.speciesId,
        sourceSkillId: encounter.sourceSkillId,
        tame: {
          actionKey,
          itemId: species ? species.tamingItemId : null,
          durationSeconds: duration,
          active: action.active,
          stalled: action.stalled,
          progress: action.progress
        }
      };
    }),
    roster: base.roster.map(function (beast) {
      const species = content.getBeast(beast.speciesId);
      const trait = content.TRAITS[beast.traitId];
      const growth = content.GROWTH_TENDENCIES[beast.growthId];
      const actionKey = 'beast:train:' + beast.id;
      const duration = stage2RuntimeActionDuration(model, actionKey);
      const action = stage2ActionView(model, actionKey, duration);
      return {
        id: beast.id,
        speciesId: beast.speciesId,
        speciesName: species ? species.name : beast.speciesId,
        level: beast.level,
        xp: beast.xp,
        traitId: beast.traitId,
        traitName: trait ? trait.name : beast.traitId,
        growthId: beast.growthId,
        growthName: growth ? growth.name : beast.growthId,
        active: activeId === beast.id,
        training: {
          actionKey,
          itemId: species ? species.trainingItemId : null,
          durationSeconds: duration,
          active: action.active,
          stalled: action.stalled,
          progress: action.progress
        },
        assistant: {
          beastId: beast.id,
          active: activeId === beast.id,
          effect: species ? species.assistance : null
        }
      };
    }),
    activeIds: base.activeIds,
    effects: base.effects
  });
}

function queryInheritanceHall(input) {
  const model = useStage5Runtime ? stage4Model() : null;
  if (!model) return readonlyQuery({ implemented: false });
  // 防御：传承殿依赖 npc 档案 / 血脉 / 角色生命周期；老存档或新档未初始化这些
  // 子系统时不应抛错（否则每帧 renderGame 崩溃、主循环卡死）。缺失则视为未实装。
  const npcs = model.systems && model.systems.npcs;
  const lineage = model.systems && model.systems.lineage;
  if (!npcs || !npcs.records || !lineage || !model.player ||
      !model.player.lifecycle) {
    return readonlyQuery({ implemented: false });
  }
  const section = input && typeof input.section === 'string'
    ? input.section
    : 'overview';
  const hall = stage5Bootstrap.InheritanceHall.view(model);
  const records = npcs.records;
  const descendants = Object.keys(lineage.descendants).sort().map(
    function (npcId) {
      const person = records[npcId];
      const row = lineage.descendants[npcId];
      return {
        npcId,
        name: person && person.identity
          ? person.identity.name
          : npcId,
        gender: person && person.identity
          ? person.identity.gender
          : 'female',
        ageYears: person ? person.ageYears : 0,
        lifeStage: person ? person.lifeStage : 'child',
        status: person ? person.status : 'living',
        partnerNpcId: row.partnerNpcId,
        bornAt: row.bornAt,
        adultAt: row.adultAt,
        heirEligible: stage5Bootstrap.Lineage
          .adultHeirs(model).includes(npcId)
      };
    }
  );
  return readonlyQuery({
    implemented: true,
    section,
    overview: hall,
    lifespan: {
      ageYears: model.player.lifecycle.ageYears,
      remainingYears: model.player.shouyuan,
      maximumYears: model.player.shouMax,
      status: model.player.lifecycle.status
    },
    plan: hall.plan,
    descendants,
    rituals: lineage.rituals,
    lives: lineage.lives
  });
}

function queryLegacyTransition() {
  const model = useStage5Runtime ? stage4Model() : null;
  return readonlyQuery(model
    ? Object.assign(
      { implemented: true },
      stage5Bootstrap.LegacyTransition.view(model)
    )
    : { implemented: false, pending: null, eligibleHeirIds: [] });
}

function queryCharm() {
  if (!useStage2Runtime) {
    return readonlyQuery({
      level: 1,
      xp: 0,
      nextXp: skillXpNeed(1),
      benefits: {
        positiveRelationMultiplier: 1,
        misunderstandingReduction: 0
      },
      text: '通过社交互动自然提升'
    });
  }
  const model = stage2QueryModel();
  const progress = stage2Progress(model.player, 'charm');
  return readonlyQuery({
    level: progress.level,
    xp: progress.xp,
    nextXp: stage2Bootstrap.SkillProgression.skillXpNeed(
      progress.level
    ),
    benefits: stage2Bootstrap.SkillProgression.charmBenefits(
      progress.level
    ),
    text: '通过社交互动自然提升'
  });
}

function queryOffline() {
  const model = useStage2Runtime ? stage2QueryModel() : null;
  const reports = state.pendingOfflineReports
    .map(function (report) { return reportView(report, model); })
    .filter(Boolean);
  return readonlyQuery({
    visible: !!state.showOffline,
    reports,
    summary: Object.assign(
      offlineSummaryView(state.pendingOfflineReports, model),
      {
        world: SimulationReport.summarize(
          state.pendingOfflineReports
        ).world
      }
    )
  });
}

function stage4Model() {
  return useStage4Runtime ? stage2QueryModel() : null;
}

function queryPersistence() {
  const status = getPersistenceStatus();
  const publicKind = status.kind === 'future'
    ? 'save'
    : status.kind;
  return readonlyQuery({
    locked: !!status.locked,
    kind: publicKind || null,
    message: status.message || '',
    canRetry: !!status.canRetry && status.kind !== 'future'
  });
}

function breakthroughGateProgress(model, view) {
  if (!view || !view.gate) return view;
  if (!stage3Bootstrap.CombatProgress) {
    kickEnsureCombatRuntime();
    return view;
  }
  let current = 0;
  if (view.gate.type === 'enemyKills') {
    const regions = stage3Bootstrap.CombatProgress.queryRegions(model);
    regions.regions.some(function (region) {
      const enemy = region.enemies.find(function (row) {
        return row.id === view.gate.targetId;
      });
      if (!enemy) return false;
      current = enemy.killCount;
      return true;
    });
  } else if (view.gate.type === 'dungeonClears') {
    const dungeons = stage3Bootstrap.CombatProgress.queryDungeons(model);
    const dungeon = dungeons.dungeons.find(function (row) {
      return row.id === view.gate.targetId;
    });
    current = dungeon ? dungeon.clearCount : 0;
  }
  if (view.gate.completed) current = view.gate.count;
  view.gate.progress = {
    current: Math.min(view.gate.count, Math.max(0, current)),
    required: view.gate.count
  };
  return view;
}

function queryBreakthrough(input) {
  if (!useStage3Runtime) {
    return readonlyQuery({
      ok: false,
      code: 'stage3_unavailable'
    });
  }
  try {
    const model = stage2QueryModel();
    let selected = [];
    if (input !== undefined) {
      const fields = safeInputFields(
        input,
        ['pillItemId', 'quantity']
      );
      if (!fields ||
          (fields.pillItemId !== null &&
           typeof fields.pillItemId !== 'string') ||
          !Number.isSafeInteger(fields.quantity) ||
          fields.quantity < 0 ||
          fields.quantity > 2) {
        return readonlyQuery({
          ok: false,
          code: 'invalid_argument'
        });
      }
      const base = stage3Bootstrap.Breakthrough.query(model, []);
      const expectedItemId = base && base.pill
        ? base.pill.itemId
        : null;
      if ((fields.quantity === 0 && fields.pillItemId !== null) ||
          (fields.quantity > 0 &&
           fields.pillItemId !== expectedItemId) ||
          fields.quantity > (
            base && base.pill ? base.pill.maxSelectable : 0
          )) {
        return readonlyQuery({
          ok: false,
          code: 'invalid_argument'
        });
      }
      for (let index = 0; index < fields.quantity; index++) {
        selected.push(expectedItemId);
      }
    }
    const view = cloneRuntimeState(
      stage3Bootstrap.Breakthrough.query(model, selected)
    );
    if (view && view.pill && view.pill.itemId) {
      view.pill.name = stage3ItemDisplayName(view.pill.itemId);
    }
    return readonlyQuery(breakthroughGateProgress(model, view));
  } catch (error) {
    return readonlyQuery({
      ok: false,
      code: 'invalid_argument'
    });
  }
}
