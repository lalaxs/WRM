'use strict';

// game-commands-combat.js — combat / equipment / loadout / companion
// Depends on: game-commands.js (stage3 helpers)
// Classic script globals; no IIFE.

function commandConsumeTechniqueBook(input) {
  const fields = safeInputFields(input, ['itemId']);
  if (!fields) return invalidStage3Argument('功法书参数无效');
  const definition = typeof fields.itemId === 'string'
    ? stage3Bootstrap.TechniqueContent.getByBookItemId(fields.itemId)
    : null;
  return stage3ModelCommand({
    key: 'consumeTechniqueBook',
    operation: function (candidate) {
      return stage3Bootstrap.Techniques.consumeBook(
        candidate,
        fields.itemId,
        EMPTY_SECT_CONTEXT
      );
    },
    successMessage: '功法书已研读',
    failureMessage: '研读功法书失败',
    saveFailureMessage: '功法研读结果保存失败，请重试',
    data: function (domain) {
      return {
        itemId: fields.itemId,
        techniqueId: definition ? definition.id : null,
        gainedXp: domain.gainedXp,
        levelsGained: domain.levelsGained,
        capped: domain.capped
      };
    },
    gains: function (domain) {
      if (!definition || domain.gainedXp <= 0) return null;
      const techniqueXp = {};
      techniqueXp[definition.id] = domain.gainedXp;
      return { techniqueXp };
    },
    costs: function () {
      const items = {};
      items[fields.itemId] = 1;
      return { items };
    }
  });
}

function commandCreateCombatLoadout(input) {
  const fields = safeInputFields(input, ['name']);
  if (!fields) return invalidStage3Argument('方案参数无效');
  return stage3ModelCommand({
    key: 'createCombatLoadout',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.create(
        candidate,
        fields.name
      );
    },
    successMessage: '战斗方案已创建',
    failureMessage: '创建战斗方案失败',
    data: function (domain) { return domain.result; }
  });
}

function commandRenameCombatLoadout(input) {
  const fields = safeInputFields(input, ['loadoutId', 'name']);
  if (!fields) return invalidStage3Argument('方案参数无效');
  return stage3ModelCommand({
    key: 'renameCombatLoadout',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.rename(
        candidate,
        fields.loadoutId,
        fields.name
      );
    },
    successMessage: '战斗方案已重命名',
    failureMessage: '重命名战斗方案失败',
    data: function (domain) { return domain.result; }
  });
}

function commandDeleteCombatLoadout(input) {
  const fields = safeInputFields(input, ['loadoutId']);
  if (!fields) return invalidStage3Argument('方案参数无效');
  return stage3ModelCommand({
    key: 'deleteCombatLoadout',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.remove(
        candidate,
        fields.loadoutId
      );
    },
    successMessage: '战斗方案已删除',
    failureMessage: '删除战斗方案失败',
    data: function (domain) { return domain.result; }
  });
}

function commandSetActiveCombatLoadout(input) {
  const fields = safeInputFields(input, ['loadoutId']);
  if (!fields) return invalidStage3Argument('方案参数无效');
  return stage3ModelCommand({
    key: 'setActiveCombatLoadout',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.setActive(
        candidate,
        fields.loadoutId
      );
    },
    successMessage: '当前战斗方案已更新',
    failureMessage: '设置当前战斗方案失败',
    data: function (domain) { return domain.result; }
  });
}

function commandSetEquipment(input) {
  const fields = safeInputFields(
    input,
    ['loadoutId', 'slot', 'itemId']
  );
  if (!fields) return invalidStage3Argument('装备参数无效');
  return stage3ModelCommand({
    key: 'setEquipment',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.setEquipment(
        candidate,
        fields.loadoutId,
        fields.slot,
        fields.itemId
      );
    },
    successMessage: '战斗装备已更新',
    failureMessage: '设置战斗装备失败',
    data: function (domain) { return domain.result; }
  });
}

function equipmentCommandFailure(code, message) {
  const messages = {
    equipment_not_found: '未找到该装备',
    equipment_favorite: '收藏装备不能出售或分解',
    equipment_referenced: '装备仍被战斗方案引用',
    equipment_slot_locked: '该装备槽尚未解锁',
    equipment_type_mismatch: '装备类型不匹配',
    enhancement_max: '装备已强化至上限',
    insufficient_material: '强化或重铸材料不足',
    invalid_locked_affix: '锁定词条无效',
    invalid_equipment: '装备数据异常'
  };
  return commandResult(
    false,
    code || 'equipment_operation_failed',
    false,
    messages[code] || message || '装备操作失败',
    null
  );
}

function commandEquipEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId', 'loadoutId'],
    ['instanceId']
  );
  if (!fields ||
      typeof fields.instanceId !== 'string') {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const instance = equipmentInstance(candidate, fields.instanceId);
    const resolved = instance
      ? equipmentBootstrap.Equipment.resolve(instance)
      : null;
    const loadout = equipmentLoadout(candidate, fields.loadoutId);
    if (!resolved) return equipmentCommandFailure('equipment_not_found');
    if (!loadout) return equipmentCommandFailure('loadout_not_found');
    const domain = stage3Bootstrap.CombatLoadouts.setEquipment(
      candidate,
      loadout.id,
      resolved.slot,
      instance.instanceId
    );
    if (!domain.ok) {
      return equipmentCommandFailure(domain.code);
    }
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, '装备已穿戴', {
      instanceId: instance.instanceId,
      loadoutId: loadout.id,
      slot: resolved.slot,
      replacedInstanceId: loadout.equipment[resolved.slot] || null,
      effectiveNextBattle: !!(
        candidate.systems &&
        candidate.systems.combat &&
        candidate.systems.combat.session
      )
    });
  }, Date.now(), {
    kind: 'save',
    message: '装备结果保存失败，请重试'
  });
}

function commandUnequipEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['slot', 'loadoutId'],
    ['slot']
  );
  if (!fields ||
      equipmentBootstrap.EquipmentContent.SLOTS.indexOf(fields.slot) < 0) {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const loadout = equipmentLoadout(candidate, fields.loadoutId);
    if (!loadout) return equipmentCommandFailure('loadout_not_found');
    const previous = loadout.equipment[fields.slot];
    if (!previous) {
      return commandResult(true, 'no_change', false, null, {
        slot: fields.slot
      });
    }
    const domain = stage3Bootstrap.CombatLoadouts.setEquipment(
      candidate,
      loadout.id,
      fields.slot,
      null
    );
    if (!domain.ok) return equipmentCommandFailure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, '装备已卸下', {
      instanceId: previous,
      loadoutId: loadout.id,
      slot: fields.slot,
      effectiveNextBattle: !!(
        candidate.systems &&
        candidate.systems.combat &&
        candidate.systems.combat.session
      )
    });
  }, Date.now(), {
    kind: 'save',
    message: '卸下装备保存失败，请重试'
  });
}

function commandEnhanceEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId', 'useProtection'],
    ['instanceId']
  );
  if (!fields ||
      typeof fields.instanceId !== 'string' ||
      (
        typeof fields.useProtection !== 'undefined' &&
        typeof fields.useProtection !== 'boolean'
      )) {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const instance = equipmentInstance(candidate, fields.instanceId);
    if (!instance) return equipmentCommandFailure('equipment_not_found');
    const materialCost = Math.max(
      1,
      Math.ceil((instance.enhancementLevel + 1) / 3)
    );
    const delta = { ironOre: -materialCost };
    if (fields.useProtection === true) delta.wardTalisman = -1;
    const paid = stage2Bootstrap.Inventory.apply(
      candidate.player.inventory,
      delta
    );
    if (!paid.ok) {
      return equipmentCommandFailure('insufficient_material');
    }
    const enhanced = equipmentBootstrap.Equipment.enhance(instance, {
      materialAvailable: true,
      protectionBonus: fields.useProtection === true ? 0.1 : 0,
      rngState: candidate.rngState
    });
    if (!enhanced.ok) return equipmentCommandFailure(enhanced.code);
    const replaced = stage2Bootstrap.Inventory.replaceEquipment(
      paid.value,
      enhanced.instance
    );
    if (!replaced.ok) return equipmentCommandFailure(replaced.code);
    candidate.player.inventory = replaced.value;
    candidate.rngState = enhanced.rngState;
    return commandResult(
      true,
      'ok',
      true,
      enhanced.success ? '强化成功' : '强化失败，保底进度增加',
      {
        instanceId: instance.instanceId,
        success: enhanced.success,
        guaranteed: enhanced.guaranteed,
        level: enhanced.instance.enhancementLevel,
        pity: enhanced.instance.enhancementPity,
        materialCost: materialCost,
        effectiveNextBattle: !!(
          candidate.systems &&
          candidate.systems.combat &&
          candidate.systems.combat.session
        )
      }
    );
  }, Date.now(), {
    kind: 'save',
    message: '强化结果保存失败，请重试'
  });
}

function commandReforgeEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId', 'lockedAffixIndex'],
    ['instanceId']
  );
  if (!fields ||
      typeof fields.instanceId !== 'string') {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const instance = equipmentInstance(candidate, fields.instanceId);
    if (!instance) return equipmentCommandFailure('equipment_not_found');
    const paid = stage2Bootstrap.Inventory.apply(
      candidate.player.inventory,
      { spiritEssence: -1 }
    );
    if (!paid.ok) {
      return equipmentCommandFailure('insufficient_material');
    }
    const reforged = equipmentBootstrap.Equipment.reforge(instance, {
      lockedAffixIndex: fields.lockedAffixIndex,
      rngState: candidate.rngState
    });
    if (!reforged.ok) return equipmentCommandFailure(reforged.code);
    const replaced = stage2Bootstrap.Inventory.replaceEquipment(
      paid.value,
      reforged.instance
    );
    if (!replaced.ok) return equipmentCommandFailure(replaced.code);
    candidate.player.inventory = replaced.value;
    candidate.rngState = reforged.rngState;
    return commandResult(true, 'ok', true, '词条已重铸', {
      instanceId: instance.instanceId,
      affixes: equipmentBootstrap.Equipment.resolve(
        reforged.instance
      ).affixes,
      effectiveNextBattle: !!(
        candidate.systems &&
        candidate.systems.combat &&
        candidate.systems.combat.session
      )
    });
  }, Date.now(), {
    kind: 'save',
    message: '重铸结果保存失败，请重试'
  });
}

function commandSetEquipmentFavorite(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId', 'favorite'],
    ['instanceId', 'favorite']
  );
  if (!fields ||
      typeof fields.instanceId !== 'string' ||
      typeof fields.favorite !== 'boolean') {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const instance = equipmentInstance(candidate, fields.instanceId);
    if (!instance) return equipmentCommandFailure('equipment_not_found');
    if (instance.favorite === fields.favorite) {
      return commandResult(true, 'no_change', false, null, {
        instanceId: instance.instanceId,
        favorite: instance.favorite
      });
    }
    const changed = equipmentBootstrap.Equipment.normalizeInstance(
      Object.assign({}, instance, { favorite: fields.favorite })
    );
    const replaced = stage2Bootstrap.Inventory.replaceEquipment(
      candidate.player.inventory,
      changed
    );
    if (!replaced.ok) return equipmentCommandFailure(replaced.code);
    candidate.player.inventory = replaced.value;
    return commandResult(true, 'ok', true, fields.favorite
      ? '已收藏装备'
      : '已取消收藏', {
        instanceId: instance.instanceId,
        favorite: fields.favorite
      });
  }, Date.now(), {
    kind: 'save',
    message: '收藏状态保存失败，请重试'
  });
}

function equipmentRemovalBlock(candidate, instance) {
  if (instance.favorite) return 'equipment_favorite';
  if (equipmentReferences(candidate, instance.instanceId).length) {
    return 'equipment_referenced';
  }
  return null;
}

function commandSellEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceId'],
    ['instanceId']
  );
  if (!fields ||
      typeof fields.instanceId !== 'string') {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const instance = equipmentInstance(candidate, fields.instanceId);
    if (!instance) return equipmentCommandFailure('equipment_not_found');
    const blocked = equipmentRemovalBlock(candidate, instance);
    if (blocked) return equipmentCommandFailure(blocked);
    const resolved = equipmentBootstrap.Equipment.resolve(instance);
    const quality = equipmentBootstrap.EquipmentContent.QUALITIES[
      instance.quality
    ];
    const price = Math.max(
      1,
      (quality.order + 1) * resolved.realmOrder * 12
    );
    const removed = stage2Bootstrap.Inventory.removeEquipment(
      candidate.player.inventory,
      instance.instanceId
    );
    if (!removed.ok) return equipmentCommandFailure(removed.code);
    candidate.player.inventory = removed.value;
    candidate.player.lingshi = (Number(candidate.player.lingshi) || 0) +
      price;
    return commandResult(true, 'ok', true, '装备已出售', {
      instanceId: instance.instanceId,
      price: price
    });
  }, Date.now(), {
    kind: 'save',
    message: '出售装备保存失败，请重试'
  });
}

function commandSalvageEquipment(input) {
  const fields = safeOptionalInputFields(
    input,
    ['instanceIds'],
    ['instanceIds']
  );
  if (!fields ||
      !Array.isArray(fields.instanceIds) ||
      fields.instanceIds.length < 1) {
    return equipmentCommandFailure('invalid_equipment');
  }
  return commitModel(function (candidate) {
    const ids = Array.from(new Set(fields.instanceIds));
    const instances = ids.map(function (instanceId) {
      return equipmentInstance(candidate, instanceId);
    });
    if (instances.some(function (instance) { return !instance; })) {
      return equipmentCommandFailure('equipment_not_found');
    }
    for (let index = 0; index < instances.length; index++) {
      const blocked = equipmentRemovalBlock(candidate, instances[index]);
      if (blocked) return equipmentCommandFailure(blocked);
    }
    let inventory = candidate.player.inventory;
    let materialCount = 0;
    instances.forEach(function (instance) {
      const quality = equipmentBootstrap.EquipmentContent.QUALITIES[
        instance.quality
      ];
      materialCount += Math.max(1, quality.order + 1);
      inventory = stage2Bootstrap.Inventory.removeEquipment(
        inventory,
        instance.instanceId
      ).value;
    });
    const granted = stage2Bootstrap.Inventory.apply(
      inventory,
      { ironOre: materialCount }
    );
    if (!granted.ok) {
      return equipmentCommandFailure('inventory_full');
    }
    candidate.player.inventory = granted.value;
    return commandResult(true, 'ok', true, '装备已分解', {
      instanceIds: ids,
      materials: { ironOre: materialCount }
    });
  }, Date.now(), {
    kind: 'save',
    message: '分解装备保存失败，请重试'
  });
}

function commandSetSupply(input) {
  const fields = safeInputFields(
    input,
    ['loadoutId', 'slot', 'config']
  );
  if (!fields) return invalidStage3Argument('补给参数无效');
  return stage3ModelCommand({
    key: 'setSupply',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.setSupply(
        candidate,
        fields.loadoutId,
        fields.slot,
        fields.config
      );
    },
    successMessage: '战斗补给已更新',
    failureMessage: '设置战斗补给失败',
    data: function (domain) { return domain.result; }
  });
}

function commandSetActiveTechnique(input) {
  // 释放条件已取消：仍接受旧客户端传入的 condition，但一律写入 always。
  const fields = safeInputFields(input, [
    'loadoutId',
    'slotIndex',
    'techniqueId',
    'condition'
  ]) || safeInputFields(input, [
    'loadoutId',
    'slotIndex',
    'techniqueId'
  ]);
  if (!fields) {
    return invalidStage3Argument('主动功法参数无效');
  }
  const maxSlot = unlockedActiveSlotCount(stage2QueryModel()) - 1;
  if (!Number.isFinite(fields.slotIndex) ||
      fields.slotIndex < 0 ||
      fields.slotIndex > maxSlot) {
    return invalidStage3Argument('该功法槽位尚未解锁');
  }
  return stage3ModelCommand({
    key: 'setActiveTechnique',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.setActiveTechnique(
        candidate,
        fields.loadoutId,
        fields.slotIndex,
        fields.techniqueId,
        { type: 'always' }
      );
    },
    successMessage: '主动功法已更新',
    failureMessage: '设置主动功法失败',
    data: function (domain) { return domain.result; }
  });
}

function commandSetPassiveTechnique(input) {
  const fields = safeInputFields(input, [
    'loadoutId',
    'slotIndex',
    'techniqueId'
  ]);
  if (!fields) return invalidStage3Argument('被动功法参数无效');
  const maxSlot = unlockedPassiveSlotCount(stage2QueryModel()) - 1;
  if (!Number.isFinite(fields.slotIndex) ||
      fields.slotIndex < 0 ||
      fields.slotIndex > maxSlot) {
    return invalidStage3Argument('该被动功法槽位尚未解锁');
  }
  return stage3ModelCommand({
    key: 'setPassiveTechnique',
    operation: function (candidate) {
      return stage3Bootstrap.CombatLoadouts.setPassiveTechnique(
        candidate,
        fields.loadoutId,
        fields.slotIndex,
        fields.techniqueId
      );
    },
    successMessage: '被动功法已更新',
    failureMessage: '设置被动功法失败',
    data: function (domain) { return domain.result; }
  });
}

function commandClaimCombatLoot() {
  if (!requireStage3CombatRuntime()) return stage3CombatRuntimePendingCommand();
  return stage3ModelCommand({
    key: 'claimCombatLoot',
    operation: function (candidate) {
      return stage3Bootstrap.CombatRewards.claimPending(candidate);
    },
    successMessage: '战利品已领取',
    failureMessage: '领取战利品失败',
    data: function (domain) { return domain.result; },
    gains: function (domain) {
      const items = Object.assign({}, domain.result.items || {});
      if (domain.result.currency > 0) {
        items.lingshi = domain.result.currency;
      }
      return { items };
    }
  });
}

function commandTreatInjury() {
  if (!requireStage3CombatRuntime()) return stage3CombatRuntimePendingCommand();
  return stage3ModelCommand({
    key: 'treatInjury',
    operation: function (candidate) {
      return stage3Bootstrap.CombatProgress.treatInjury(candidate);
    },
    successMessage: '重伤已治疗',
    failureMessage: '治疗重伤失败',
    data: function (domain) { return domain.result; },
    costs: function (domain) {
      const items = {};
      items[domain.result.itemId] = domain.result.consumed;
      return { items };
    }
  });
}

function commandAttemptBreakthrough(input) {
  const fields = safeInputFields(input, ['pillItemId', 'quantity']);
  if (!fields ||
      (fields.pillItemId !== null &&
       typeof fields.pillItemId !== 'string') ||
      typeof fields.quantity !== 'number' ||
      !Number.isSafeInteger(fields.quantity) ||
      fields.quantity < 0 ||
      fields.quantity > 2) {
    return invalidStage3Argument('突破丹参数无效');
  }
  return stage3ModelCommand({
    key: 'attemptBreakthrough',
    operation: function (candidate) {
      const view = stage3Bootstrap.Breakthrough.query(candidate, []);
      if (!view.ok) {
        return {
          ok: false,
          code: view.code,
          state: candidate
        };
      }
      const expectedItemId = view.pill ? view.pill.itemId : null;
      if ((fields.quantity > 0 &&
           fields.pillItemId !== expectedItemId) ||
          (fields.quantity === 0 &&
           fields.pillItemId !== null &&
           fields.pillItemId !== expectedItemId) ||
          (!expectedItemId &&
           (fields.quantity !== 0 || fields.pillItemId !== null))) {
        return {
          ok: false,
          code: 'pill_mismatch',
          state: candidate
        };
      }
      if (view.pill && fields.quantity > view.pill.maxSelectable) {
        return {
          ok: false,
          code: 'insufficient_items',
          state: candidate
        };
      }
      const selected = [];
      for (let index = 0; index < fields.quantity; index++) {
        selected.push(expectedItemId);
      }
      return stage3Bootstrap.Breakthrough.attempt(candidate, selected);
    },
    successMessage: '突破尝试已结算',
    failureMessage: '突破条件尚未满足',
    saveFailureMessage: '突破结果保存失败，请重试',
    data: function (domain) {
      return {
        chance: domain.chance,
        roll: domain.roll,
        result: domain.code,
        gate: domain.gateId,
        consumed: domain.consumed,
        realmBefore: domain.realmBefore,
        realmAfter: domain.realmAfter
      };
    },
    costs: function (domain) {
      return { items: domain.consumed.items };
    }
  });
}
function queryCombatParty() {
  const model = stage4Model();
  if (!model || !stage4Bootstrap.CombatParty) {
    return readonlyQuery({ slots: [], eligible: [] });
  }
  return readonlyQuery(stage4Bootstrap.CombatParty.query(model));
}
function commandSetCombatCompanion(input) {
  if (!stage4Bootstrap.CombatParty) {
    return stage4Failure('interaction_locked', '人物世界尚未开放');
  }
  const fields = safeInputFields(input, ['slotIndex', 'npcId']);
  if (!fields ||
      !Number.isSafeInteger(fields.slotIndex) ||
      fields.slotIndex < 0 ||
      fields.slotIndex > 2 ||
      (fields.npcId !== null && typeof fields.npcId !== 'string')) {
    return invalidStage3Argument('队伍参数无效');
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const selected = stage4Bootstrap.CombatParty.setCompanion(
      candidate,
      fields.slotIndex,
      fields.npcId,
      now
    );
    if (!selected || !selected.ok) {
      return stage4Failure(selected && selected.code, '设置同行队伍失败');
    }
    replaceCandidateModel(candidate, selected.state);
    return commandResult(
      true,
      'ok',
      true,
      '同行队伍已更新',
      selected.result
    );
  }, now, {
    kind: 'save',
    message: '同行队伍保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}
