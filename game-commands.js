'use strict';

function commandRandomizeAppearance() {
  if (isPersistenceLocked()) {
    return commandResult(
      false,
      'persistence_locked',
      false,
      persistenceRecovery.message(),
      null
    );
  }
  for (const category of CATS) {
    const count = NIE[state.gender][category].length;
    state.parts[category] = count > 0
      ? Math.floor(gameRandom() * count)
      : 0;
  }
  state.dirty = true;
  return commandResult(true, 'ok', true, null, {
    indices: normalizeParts(state.parts)
  });
}

function commandStepAppearance(input) {
  if (isPersistenceLocked()) {
    return commandResult(
      false,
      'persistence_locked',
      false,
      persistenceRecovery.message(),
      null
    );
  }
  const part = input && input.part;
  const delta = input && Number(input.delta);
  if (!CATS.includes(part) || !Number.isFinite(delta) || delta === 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '无效的形象调整参数',
      null
    );
  }
  const list = NIE[state.gender][part];
  if (!Array.isArray(list) || list.length === 0) {
    return commandResult(true, 'no_change', false, null, null);
  }
  const offset = Math.trunc(delta);
  let next = (state.parts[part] + offset) % list.length;
  if (next < 0) next += list.length;
  if (next === state.parts[part]) {
    return commandResult(true, 'no_change', false, null, null);
  }
  state.parts[part] = next;
  state.dirty = true;
  return commandResult(true, 'ok', true, null, {
    part,
    index: next
  });
}

function commandConfirmCreate() {
  const result = commitModel(function (candidate) {
    candidate.created = true;
    candidate.player = defaultPlayer();
    candidate.current = null;
    return commandResult(
      true,
      'ok',
      true,
      '角色创建成功，开始修行',
      null
    );
  }, Date.now(), {
    kind: 'save',
    message: '角色创建保存失败，请重试',
    successMessage: '角色创建成功，开始修行',
    onSuccess: 'appearance'
  });
  if (result.ok) {
    state.phase = 'game';
    state.navIndex = NAV_HOME;
    state.dirty = true;
    toast(result.message);
  }
  return result;
}

function commandSaveAppearance() {
  const result = commitModel(function () {
    return commandResult(true, 'ok', true, '形象已更新', null);
  }, Date.now(), {
    kind: 'save',
    message: '形象保存失败，请重试',
    successMessage: '形象已更新',
    onSuccess: 'appearance'
  });
  if (result.ok) {
    state.phase = 'game';
    state.navIndex = NAV_HOME;
    state.dirty = true;
    toast(result.message);
  }
  return result;
}

function commandSwitchNav(input) {
  const index = input && Number(input.index);
  if (!Number.isInteger(index) || index < 0 || index >= NAV.length) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '无效的导航位置',
      null
    );
  }
  const label = NAV[index];
  if (label === '战斗' || label === '装备') {
    kickEnsureCombatRuntime();
  }
  const changed = label === '设置'
    ? state.phase !== 'edit'
    : state.navIndex !== index;
  if (label === '设置') {
    state.phase = 'edit';
    state.dirty = true;
  } else {
    state.navIndex = index;
  }
  return commandResult(
    true,
    changed ? 'ok' : 'no_change',
    changed,
    null,
    { index, label }
  );
}

function commandOpenBreak() {
  if (state.showBreak) {
    return commandResult(true, 'no_change', false, null, null);
  }
  state.showBreak = true;
  return commandResult(true, 'ok', true, null, null);
}

function commandCloseLifespanBuffer() {
  if (!state.showLifespanBuffer) {
    return commandResult(true, 'no_change', false, null, null);
  }
  state.showLifespanBuffer = false;
  return commandResult(true, 'ok', true, null, null);
}

function commandCloseBreak() {
  if (!state.showBreak) {
    return commandResult(true, 'no_change', false, null, null);
  }
  state.showBreak = false;
  return commandResult(true, 'ok', true, null, null);
}

function commandAttemptBreak() {
  if (useStage3Runtime) {
    const result = commandAttemptBreakthrough({
      pillItemId: null,
      quantity: 0
    });
    if (result.ok &&
        result.changed &&
        result.data &&
        result.data.result === 'success') {
      state.showBreak = false;
    }
    return result;
  }
  const result = commitModel(function (candidate) {
    const player = candidate.player;
    if (!candidate.created || !player) {
      return commandResult(
        false,
        'not_created',
        false,
        '尚未创建角色',
        null
      );
    }
    const stage = player.realmStage || 0;
    const currentRealm = REALM_TABLE[stage];
    if (!currentRealm || stage >= REALM_TABLE.length - 1) {
      return commandResult(
        true,
        'no_change',
        false,
        '已是最高境界',
        null
      );
    }
    if (player.xiwei < currentRealm.need) {
      return commandResult(
        false,
        'requirements_missing',
        false,
        '修为不足，需 ' + currentRealm.need,
        null
      );
    }
    if (currentRealm.dan &&
        (player.inventory.stacks[currentRealm.dan] || 0) < 1) {
      return commandResult(
        false,
        'requirements_missing',
        false,
        '需' + (DAN_NAME[currentRealm.dan] || '突破丹') + '×1',
        null
      );
    }

    let succeeded = true;
    if (currentRealm.tier === 'major') {
      const nextRandom = GameRandom.next(candidate.rngState);
      candidate.rngState = nextRandom.seed;
      succeeded = nextRandom.value < breakthroughRate(player, stage);
    }
    player.xiwei = 0;
    if (succeeded) {
      if (currentRealm.dan) player.inventory.stacks[currentRealm.dan] -= 1;
      player.realmStage = stage + 1;
      applyRealm(player);
      player.jingqi = Math.min(200, player.jingqi + 30);
    }
    return commandResult(true, 'ok', true, succeeded
      ? '突破成功 → ' + REALM_TABLE[stage + 1].name + '！'
      : '渡劫失败，修为散尽', {
        succeeded,
        realm: player.realm
      });
  }, Date.now(), {
    kind: 'save',
    message: '突破结果保存失败，请重试'
  });
  if (result.ok && result.changed) {
    state.showBreak = false;
    toast(result.message);
  }
  return result;
}

function startActionFailureMessage(code, key) {
  if (code === 'requirements_invalid' || code === 'requirements_missing') {
    if (typeof key === 'string' && key.indexOf('gather:collect:') === 0) {
      return '请先探索发现资源点，再开始采集';
    }
    if (typeof key === 'string' && key.indexOf('produce:') === 0) {
      return '制作条件未满足（技能等级或材料）';
    }
  }
  const messages = {
    invalid_action: '未知行动',
    lifespan_buffer: '寿元不足，请先完成传承或开启新身份',
    injured: '重伤恢复中，暂时无法开战',
    pending_loot_exists: '有待领取战利品，请先领取后再行动',
    realm_locked: '境界不足，尚未解锁该区域/秘境',
    required_dungeon_not_cleared: '需先通关前置秘境',
    required_item_missing: '缺少进入所需物品',
    invalid_state: '战斗数据异常，请先撤退或领取待处理战利品',
    requirements_invalid: '行动条件尚未满足',
    invalid_timestamp: '时间状态异常，请刷新后重试'
  };
  return messages[code] || '行动条件尚未满足';
}

function candidateStartAction(candidate, key, now) {
  const directHarness = typeof globalThis === 'object' &&
    globalThis !== null &&
    globalThis.__GAME_TEST_HARNESS_REQUEST__ === true;
  if ((!candidate.created && !directHarness) || !candidate.player) {
    return commandResult(
      false,
      'not_created',
      false,
      '尚未创建角色',
      null
    );
  }
  if (useStage2Runtime) {
    const started = simulationRuntime.rules.start(candidate, key, now);
    if (!started.ok) {
      const code = started.code || 'requirements_invalid';
      const invalid = code === 'invalid_action';
      return commandResult(
        false,
        invalid ? 'invalid_action' : (code || 'requirements_missing'),
        false,
        startActionFailureMessage(code, key),
        null
      );
    }
    if (started.code === 'no_change') {
      return commandResult(true, 'no_change', false, null, { key });
    }
    Object.keys(candidate).forEach(function (field) {
      delete candidate[field];
    });
    Object.keys(started.state).forEach(function (field) {
      candidate[field] = started.state[field];
    });
    return commandResult(
      true,
      'ok',
      true,
      '开始：' + actionDisplayName(key, started.state || candidate),
      { key }
    );
  }
  let nextAction;
  let label;
  if (key.indexOf('gather:') === 0) {
    const parsed = parseGatherKey(key);
    const data = GATHERING_DATA[parsed.skill];
    if (!data) {
      return commandResult(
        false,
        'invalid_action',
        false,
        '未知行动',
        null
      );
    }
    if (parsed.mode === 'explore') {
      if (!data.explore) {
        return commandResult(
          false,
          'invalid_action',
          false,
          '未知行动',
          null
        );
      }
      nextAction = finiteAction(key, 1);
      label = data.explore.name;
    } else {
      const entry = data.entries.find(function (item) {
        return item.id === parsed.entryId;
      });
      if (!entry) {
        return commandResult(
          false,
          'invalid_action',
          false,
          '未知行动',
          null
        );
      }
      const skillKey = GATHER_SKILL_KEY[parsed.skill];
      const level = (candidate.player.skills[skillKey] || { lv: 1 }).lv;
      if (entry.unlockLv > level) {
        return commandResult(
          false,
          'requirements_missing',
          false,
          '需 ' + GATHER_TITLE[parsed.skill] + ' Lv' + entry.unlockLv,
          null
        );
      }
      if (parsed.skill !== 'fishing') {
        const spot = candidate.systems.gathering.spots[parsed.skill];
        if (!spot || spot.id !== entry.id) {
          return commandResult(
            false,
            'requirements_missing',
            false,
            '请先探索 ' + entry.name,
            null
          );
        }
      }
      nextAction = repeatAction(key);
      label = entry.name;
    }
  } else {
    const action = ACTIONS[key];
    if (!action) {
      return commandResult(
        false,
        'invalid_action',
        false,
        '未知行动',
        null
      );
    }
    const skill = candidate.player.skills[action.skill] || { lv: 1 };
    if (action.needLv && skill.lv < action.needLv) {
      return commandResult(
        false,
        'requirements_missing',
        false,
        '需 ' + (SKILL_TITLE[action.skill] || action.skill) +
          ' Lv' + action.needLv + ' 解锁',
        null
      );
    }
    nextAction = repeatAction(key);
    label = action.name;
  }

  const previous = candidate.current;
  if (previous && previous.key === key &&
      previous.mode === nextAction.mode) {
    return commandResult(true, 'no_change', false, null, {
      key,
      label
    });
  }
  if (previous) {
    candidate.lastActionStop = {
      key: previous.key,
      reason: 'switched',
      atMs: now
    };
    // 修复：从战斗切换到其它行动时，必须同步清空战斗会话。
    // 否则同样会留下「悬空 session」，导致下次启动误弹离线结算弹窗。
    if (typeof previous.key === 'string' &&
        previous.key.indexOf('combat:') === 0 &&
        candidate.systems && candidate.systems.combat) {
      candidate.systems.combat.session = null;
    }
  }
  candidate.current = nextAction;
  return commandResult(true, 'ok', true, '开始：' + label, {
    key,
    label
  });
}

function commandStartAction(input) {
  const key = input && input.key;
  if (typeof key !== 'string' || key.length === 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '行动参数无效',
      null
    );
  }
  const actionKey = useStage3Runtime
    ? (stage3Bootstrap.Stage3State.normalizeActionKey(key) || key)
    : useStage2Runtime
      ? (stage2Bootstrap.Stage2State.normalizeActionKey(key) || key)
    : key;
  if (typeof actionKey === 'string' &&
      actionKey.indexOf('combat:') === 0 &&
      !requireStage3CombatRuntime()) {
    return stage3CombatRuntimePendingCommand();
  }
  const directHarness = typeof globalThis === 'object' &&
    globalThis !== null &&
    globalThis.__GAME_TEST_HARNESS_REQUEST__ === true;
  const now = Date.now();
  const result = commitModel(function (candidate) {
    return candidateStartAction(candidate, actionKey, now);
  }, now, {
    kind: actionKey.indexOf('gather:explore:') === 0 ? 'save' : 'save',
    message: '行动保存失败，请重试'
  }, {
    settleToTimestamp: !directHarness
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandStopAction() {
  const now = Date.now();
  const result = commitModel(function (candidate) {
    if (!candidate.current) {
      return commandResult(true, 'no_change', false, null, null);
    }
    candidate.lastActionStop = {
      key: candidate.current.key,
      reason: 'manual',
      atMs: now
    };
    candidate.current = null;
    // 修复：手动停止（撤离）战斗时必须同步清空战斗会话。
    // 否则会留下「悬空 session」，下次启动 normalize 命中 recovered 分支，
    // 误把上局战斗当作离线恢复、弹「离线结算」弹窗。
    if (candidate.systems && candidate.systems.combat) {
      candidate.systems.combat.session = null;
    }
    return commandResult(true, 'ok', true, '已停止当前行动', null);
  }, now, {
    kind: 'save',
    message: '停止行动保存失败，请重试'
  }, {
    settleToTimestamp: true
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function stage2UnavailableCommand() {
  return commandResult(
    false,
    'stage2_unavailable',
    false,
    '当前版本暂不支持该操作',
    null
  );
}

function stage3UnavailableCommand() {
  return commandResult(
    false,
    'stage3_unavailable',
    false,
    '当前版本暂不支持该操作',
    null
  );
}

function stage3CombatRuntimePendingCommand() {
  kickEnsureCombatRuntime();
  return commandResult(
    false,
    'combat_runtime_loading',
    false,
    '战斗模块加载中，请稍后再试',
    null
  );
}

function requireStage3CombatRuntime() {
  if (useStage3CombatRuntime) return true;
  kickEnsureCombatRuntime();
  return false;
}

function invalidStage3Argument(message) {
  return commandResult(
    false,
    'invalid_argument',
    false,
    message || '操作参数无效',
    null
  );
}

function stage3ModelCommand(options) {
  if (!useStage3Runtime) return stage3UnavailableCommand();
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const seedBefore = candidate.rngState;
    let domain;
    try {
      domain = options.operation(candidate);
    } catch (error) {
      return stage3Failure('invalid_state', options.failureMessage);
    }
    // captureRuntime 偶发未过 Loadouts 严检时，回退规范化模型再试一次。
    if ((!domain || domain.ok !== true) &&
        domain && domain.code === 'invalid_state' &&
        typeof StateModel.fromRuntime === 'function' &&
        typeof stage3Bootstrap.CombatLoadouts === 'object') {
      try {
        const normalized = StateModel.fromRuntime(
          state /* runtime */,
          Number.isFinite(candidate.processedThroughMs)
            ? candidate.processedThroughMs
            : now
        );
        domain = options.operation(normalized);
      } catch (error) {
        return stage3Failure('invalid_state', options.failureMessage);
      }
    }
    if (!domain || domain.ok !== true || !domain.state) {
      return stage3Failure(
        domain && domain.code,
        options.failureMessage
      );
    }
    replaceCandidateModel(candidate, domain.state);
    const gains = typeof options.gains === 'function'
      ? options.gains(domain, candidate)
      : null;
    const costs = typeof options.costs === 'function'
      ? options.costs(domain, candidate)
      : null;
    const report = archiveImmediateReport(
      candidate,
      options.key,
      gains,
      costs,
      seedBefore,
      now
    );
    let data = typeof options.data === 'function'
      ? options.data(domain, candidate)
      : null;
    data = data && typeof data === 'object'
      ? Object.assign({}, data)
      : {};
    data.reportId = report.id;
    return commandResult(
      true,
      'ok',
      true,
      options.successMessage || null,
      data
    );
  }, now, {
    kind: 'save',
    message: options.saveFailureMessage || '操作结果保存失败，请重试'
  });
  if (result.ok && result.changed && result.message) {
    toast(result.message);
  }
  return result;
}

function commandConsumeTechniqueBook(input) {
  const fields = safeInputFields(input, ['itemId']);
  if (!fields) return invalidStage3Argument('功法书参数无效');
  const definition = useStage3Runtime &&
    typeof fields.itemId === 'string'
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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
  if (!useEquipmentRuntime || !fields ||
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

function commandSellItem(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const itemId = input && input.itemId;
  const quantity = input && input.quantity;
  if (typeof itemId !== 'string' ||
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '出售参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    if (!candidate.player) {
      return commandResult(
        false,
        'not_created',
        false,
        '尚未创建角色',
        null
      );
    }
    if (useStage3Runtime) {
      const minimum = stage3Bootstrap.CombatLoadouts
        .minimumSellRemainder(candidate, itemId);
      const stacks = candidate.player.inventory &&
        candidate.player.inventory.stacks;
      const owned = stacks &&
        Number.isSafeInteger(stacks[itemId])
        ? stacks[itemId]
        : 0;
      if (!Number.isSafeInteger(minimum) ||
          minimum < 0 ||
          owned - quantity < minimum) {
        return commandResult(
          false,
          'item_in_combat_plan',
          false,
          '战斗方案至少需要保留一件该补给',
          null
        );
      }
    }
    const sold = stage2Bootstrap.Inventory.sell(
      candidate.player.inventory,
      itemId,
      quantity
    );
    if (!sold.ok) {
      return stage2Failure('inventory', sold.code, '出售失败');
    }
    const nextCurrency = candidate.player.lingshi + sold.currency;
    if (!Number.isSafeInteger(nextCurrency)) {
      return stage2Failure(
        'inventory',
        'invalid_inventory',
        '灵石数量异常'
      );
    }
    const seedBefore = candidate.rngState;
    candidate.player.inventory = sold.value;
    candidate.player.lingshi = nextCurrency;
    const currencyGains = { items: { lingshi: sold.currency } };
    const itemCosts = { items: {} };
    itemCosts.items[itemId] = quantity;
    const report = archiveImmediateReport(
      candidate,
      'sellItem',
      currencyGains,
      itemCosts,
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '出售成功', {
      itemId,
      quantity,
      currency: sold.currency,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '出售结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandUseItem(input) {
  const itemId = input && input.itemId;
  const quantity = (input && Number.isSafeInteger(input.quantity) && input.quantity > 0)
    ? input.quantity
    : 1;
  if (typeof itemId !== 'string' || !itemId) {
    return commandResult(false, 'invalid_argument', false, '使用参数无效', null);
  }
  const item = (stage2Bootstrap && stage2Bootstrap.ItemContent)
    ? stage2Bootstrap.ItemContent.get(itemId)
    : null;
  if (!item) {
    return commandResult(false, 'unknown_item', false, '未知物品', null);
  }
  const category = item.category;

  // 功法书：研读领悟
  if (category === 'technique') {
    if (!useStage3Runtime) {
      return commandResult(
        false,
        'unavailable',
        true,
        '功法书请在「装备」界面研读',
        null
      );
    }
    return commandConsumeTechniqueBook({ itemId: itemId });
  }

  // 消耗品：背包内直接消耗 1 个
  if (category === 'consumable') {
    if (!useStage2Runtime) {
      return commandResult(
        false,
        'unavailable',
        true,
        '当前版本暂不支持直接使用该道具',
        null
      );
    }
    const now = Date.now();
    return commitModel(function (candidate) {
      const inv = candidate.player && candidate.player.inventory;
      if (!inv) {
        return commandResult(false, 'not_created', false, '尚未创建角色', null);
      }
      const available = stage2Bootstrap.Inventory.availableQuantity(inv, itemId);
      if (available < 1) {
        return commandResult(
          false,
          'item_bound',
          false,
          '该道具已绑定，无法使用',
          null
        );
      }
      const delta = {};
      delta[itemId] = -quantity;
      const applied = stage2Bootstrap.Inventory.apply(inv, delta);
      if (!applied.ok) {
        return stage2Failure('inventory', applied.code, '使用失败');
      }
      candidate.player.inventory = applied.value;
      return commandResult(
        true,
        'ok',
        true,
        '使用了 ' + item.name + ' ×' + quantity,
        { itemId: itemId, quantity: quantity }
      );
    }, now, {
      kind: 'save',
      message: '使用结果保存失败，请重试'
    });
  }

  // 钓鱼宝匣 / 解锁物
  if (item.useAction && useStage2Runtime) {
    const FishingLootApi = (typeof FishingLoot !== 'undefined')
      ? FishingLoot
      : (stage2Bootstrap && stage2Bootstrap.FishingLoot) || null;
    if (FishingLootApi) {
      const now = Date.now();
      return commitModel(function (candidate) {
        const inv = candidate.player && candidate.player.inventory;
        if (!inv) {
          return commandResult(false, 'not_created', false, '尚未创建角色', null);
        }
        const available = stage2Bootstrap.Inventory.availableQuantity(inv, itemId);
        if (available < 1) {
          return commandResult(false, 'missing_item', false, '物品不足', null);
        }
        const consume = {};
        consume[itemId] = -1;
        const spent = stage2Bootstrap.Inventory.apply(inv, consume);
        if (!spent.ok) {
          return stage2Failure('inventory', spent.code, '使用失败');
        }
        candidate.player.inventory = spent.value;

        let lootResult = null;
        if (item.useAction === 'openSunkenCasket' &&
            typeof FishingLootApi.openSunkenCasket === 'function') {
          lootResult = FishingLootApi.openSunkenCasket(
            candidate,
            candidate.rngState || 0
          );
        } else if (item.useAction === 'openLostTackleBox' &&
            typeof FishingLootApi.openLostTackleBox === 'function') {
          lootResult = FishingLootApi.openLostTackleBox(
            candidate,
            candidate.rngState || 0
          );
        } else if (item.useAction === 'unlockSecretCove' &&
            typeof FishingLootApi.unlockSecretCove === 'function') {
          lootResult = FishingLootApi.unlockSecretCove(candidate);
        } else if (item.useAction === 'unlockBerserkShoal' &&
            typeof FishingLootApi.unlockBerserkShoal === 'function') {
          lootResult = FishingLootApi.unlockBerserkShoal(candidate);
        } else {
          return commandResult(false, 'no_use_action', false, '无法使用', null);
        }

        if (!lootResult || lootResult.ok !== true) {
          return commandResult(
            false,
            lootResult && lootResult.code ? lootResult.code : 'use_failed',
            false,
            '使用失败',
            null
          );
        }
        if (Number.isSafeInteger(lootResult.rngState)) {
          candidate.rngState = lootResult.rngState;
        }
        let message = '使用了 ' + item.name;
        if (lootResult.granted && lootResult.granted.itemId) {
          const grantedItem = stage2Bootstrap.ItemContent.get(
            lootResult.granted.itemId
          );
          message += '，获得 ' +
            (grantedItem ? grantedItem.name : lootResult.granted.itemId) +
            ' ×' + lootResult.granted.quantity;
        }
        if (lootResult.flag) {
          message += '，解锁新钓点';
        }
        return commandResult(true, 'ok', true, message, {
          itemId: itemId,
          granted: lootResult.granted || null,
          flag: lootResult.flag || null
        });
      }, now, {
        kind: 'save',
        message: '使用结果保存失败，请重试'
      });
    }
  }

  // 装备 / 材料 / 任务物品：需在特定系统中使用，背包不误删
  return commandResult(
    false,
    'no_use_action',
    true,
    item.name + ' 需在对应系统（如战斗装备 / 炼制）中使用，背包暂不支持直接使用',
    null
  );
}

function commandExpandInventory(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const fields = safeInputFields(input, ['amount', 'cost']);
  if (!fields ||
      !Number.isSafeInteger(fields.amount) ||
      fields.amount <= 0 ||
      !Number.isSafeInteger(fields.cost) ||
      fields.cost < 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '拓展参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    if (!candidate.player) {
      return commandResult(false, 'not_created', false, '尚未创建角色', null);
    }
    const inv = candidate.player.inventory;
    if (!inv) {
      return commandResult(false, 'not_created', false, '背包数据缺失', null);
    }
    const lingshi = candidate.player.lingshi || 0;
    if (lingshi < fields.cost) {
      return commandResult(
        false,
        'insufficient_lingshi',
        false,
        '灵石不足，无法拓展',
        null
      );
    }
    const granted = stage2Bootstrap.Inventory.grantCapacity(
      inv,
      fields.amount,
      'shop'
    );
    if (!granted.ok) {
      return stage2Failure('inventory', granted.code, '拓展失败');
    }
    candidate.player.inventory = granted.value;
    candidate.player.lingshi = lingshi - fields.cost;
    return commandResult(
      true,
      'ok',
      true,
      '背包已拓展 ' + fields.amount + ' 格',
      {
        amount: fields.amount,
        capacity: granted.value.capacity,
        cost: fields.cost
      }
    );
  }, now, {
    kind: 'save',
    message: '拓展结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandPlant(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const plotId = input && input.plotId;
  const cropId = input && input.cropId;
  if (typeof plotId !== 'string' || typeof cropId !== 'string') {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '播种参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const seedBefore = candidate.rngState;
    const planted = stage2Bootstrap.Farm.plant(
      candidate,
      plotId,
      cropId,
      stage2Bootstrap.Formations.effects(candidate)
    );
    if (!planted.ok) {
      return stage2Failure('farm', planted.code, '播种失败');
    }
    replaceCandidateModel(candidate, planted.state);
    const report = archiveImmediateReport(
      candidate,
      'plant',
      null,
      planted.costs,
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '播种成功', {
      plotId: planted.result.plotId,
      cropId: planted.result.cropId,
      totalSeconds: planted.result.totalSeconds,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '播种结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function queryCombatParty() {
  const model = stage4Model();
  if (!model || !stage4Bootstrap.CombatParty) {
    return readonlyQuery({ slots: [], eligible: [] });
  }
  return readonlyQuery(stage4Bootstrap.CombatParty.query(model));
}

function bulkPlantAssignments(input) {
  if (!input || typeof input !== 'object' ||
      !Array.isArray(input.assignments)) {
    return null;
  }
  const result = [];
  const seen = {};
  for (let index = 0; index < input.assignments.length; index++) {
    const assignment = input.assignments[index];
    if (!assignment || typeof assignment !== 'object' ||
        Array.isArray(assignment) ||
        typeof assignment.plotId !== 'string' ||
        typeof assignment.cropId !== 'string' ||
        seen[assignment.plotId]) {
      return null;
    }
    seen[assignment.plotId] = true;
    result.push({
      plotId: assignment.plotId,
      cropId: assignment.cropId
    });
  }
  return result;
}

function mergeItemCosts(target, costs) {
  const items = costs && costs.items;
  if (!items || typeof items !== 'object') return;
  Object.keys(items).forEach(function (itemId) {
    const quantity = items[itemId];
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    target[itemId] = (target[itemId] || 0) + quantity;
  });
}

function commandPlantAll(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const assignments = bulkPlantAssignments(input);
  if (!assignments) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '批量播种参数无效',
      null
    );
  }
  if (!assignments.length) {
    return commandResult(
      true,
      'no_change',
      false,
      '没有可播种的空田',
      { planted: 0 }
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const seedBefore = candidate.rngState;
    const combinedItems = {};
    const plantedPlots = [];
    for (let index = 0; index < assignments.length; index++) {
      const assignment = assignments[index];
      const planted = stage2Bootstrap.Farm.plant(
        candidate,
        assignment.plotId,
        assignment.cropId,
        stage2Bootstrap.Formations.effects(candidate)
      );
      if (!planted.ok) {
        return stage2Failure('farm', planted.code, '批量播种失败');
      }
      replaceCandidateModel(candidate, planted.state);
      mergeItemCosts(combinedItems, planted.costs);
      plantedPlots.push({
        plotId: planted.result.plotId,
        cropId: planted.result.cropId,
        totalSeconds: planted.result.totalSeconds
      });
    }
    const report = archiveImmediateReport(
      candidate,
      'plantAll',
      null,
      { items: combinedItems },
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '全部播种成功', {
      planted: plantedPlots.length,
      plots: plantedPlots,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '播种结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandHarvest(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const plotId = input && input.plotId;
  if (typeof plotId !== 'string') {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '采收参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const seedBefore = candidate.rngState;
    const harvested = stage2Bootstrap.Farm.harvest(
      candidate,
      plotId,
      candidate.rngState,
      {}
    );
    if (!harvested.ok) {
      const sampled = Number.isSafeInteger(harvested.rngState) &&
        harvested.rngState >= 0 &&
        harvested.rngState <= 0xFFFFFFFF &&
        harvested.rngState !== seedBefore;
      if (sampled) candidate.rngState = harvested.rngState;
      return stage2Failure(
        'farm',
        harvested.code,
        '采收失败',
        sampled
      );
    }
    replaceCandidateModel(candidate, harvested.state);
    candidate.rngState = harvested.rngState;
    const report = archiveImmediateReport(
      candidate,
      'harvest',
      harvested.gains,
      null,
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '采收成功', {
      plotId: harvested.result.plotId,
      cropId: harvested.result.cropId,
      quantity: harvested.result.quantity,
      extraYield: harvested.result.extraYield,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '采收结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function resolveFormationByItemId(itemId) {
  if (typeof itemId !== 'string' || itemId.length === 0) {
    return { ok: false, code: 'unknown_formation_item' };
  }
  const matches = Object.keys(
    stage2Bootstrap.HomesteadContent.FORMATIONS
  ).filter(function (formationId) {
    const definition =
      stage2Bootstrap.HomesteadContent.FORMATIONS[formationId];
    return definition && definition.itemId === itemId;
  });
  if (matches.length === 0) {
    return { ok: false, code: 'unknown_formation_item' };
  }
  if (matches.length !== 1) {
    return { ok: false, code: 'ambiguous_formation_item' };
  }
  return { ok: true, formationId: matches[0] };
}

function commandEquipFormation(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const slotIndex = input && input.slotIndex;
  const itemId = input && input.itemId;
  if (typeof slotIndex !== 'number' ||
      !Number.isSafeInteger(slotIndex) ||
      slotIndex < 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '阵位参数无效',
      null
    );
  }
  const resolved = resolveFormationByItemId(itemId);
  if (!resolved.ok) {
    return commandResult(
      false,
      resolved.code,
      false,
      resolved.code === 'ambiguous_formation_item'
        ? '阵法物品对应多个定义'
        : '未知阵法物品',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const seedBefore = candidate.rngState;
    const equipped = stage2Bootstrap.Formations.equip(
      candidate,
      slotIndex,
      resolved.formationId
    );
    if (!equipped.ok) {
      return stage2Failure(
        'formation',
        equipped.code,
        '装备阵法失败'
      );
    }
    replaceCandidateModel(candidate, equipped.state);
    const report = archiveImmediateReport(
      candidate,
      'equipFormation',
      null,
      null,
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '阵法已装备', {
      slotIndex,
      itemId,
      formationId: resolved.formationId,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '阵法结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandUnequipFormation(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  const slotIndex = input && input.slotIndex;
  if (typeof slotIndex !== 'number' ||
      !Number.isSafeInteger(slotIndex) ||
      slotIndex < 0) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '阵位参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const slots = candidate.systems &&
      candidate.systems.homestead &&
      candidate.systems.homestead.formations &&
      candidate.systems.homestead.formations.slots;
    const formationId = Array.isArray(slots)
      ? slots[slotIndex]
      : null;
    const seedBefore = candidate.rngState;
    const unequipped = stage2Bootstrap.Formations.unequip(
      candidate,
      slotIndex
    );
    if (!unequipped.ok) {
      return stage2Failure(
        'formation',
        unequipped.code,
        '卸下阵法失败'
      );
    }
    replaceCandidateModel(candidate, unequipped.state);
    const report = archiveImmediateReport(
      candidate,
      'unequipFormation',
      null,
      null,
      seedBefore,
      now
    );
    return commandResult(true, 'ok', true, '阵法已卸下', {
      slotIndex,
      formationId,
      reportId: report.id
    });
  }, now, {
    kind: 'save',
    message: '阵法结果保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandSetActiveBeast(input) {
  if (!useStage2Runtime) return stage2UnavailableCommand();
  if (!input || !Object.prototype.hasOwnProperty.call(input, 'beastId')) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '灵兽参数无效',
      null
    );
  }
  const beastId = input.beastId;
  if (beastId !== null && typeof beastId !== 'string') {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '灵兽参数无效',
      null
    );
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const selected = stage2Bootstrap.SpiritBeasts.setActive(
      candidate,
      beastId
    );
    if (!selected.ok) {
      return stage2Failure('beast', selected.code, '设置灵兽失败');
    }
    replaceCandidateModel(candidate, selected.state);
    return commandResult(
      true,
      'ok',
      true,
      beastId === null ? '已取消助阵灵兽' : '助阵灵兽已更新',
      { beastId }
    );
  }, now, {
    kind: 'save',
    message: '灵兽设置保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandAcknowledgeOffline(input) {
  const reportIds = input && input.reportIds;
  if (!Array.isArray(reportIds) ||
      reportIds.some(function (id) {
        return typeof id !== 'string' || id.length === 0;
      })) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '离线报告参数无效',
      null
    );
  }
  const uniqueIds = new Set(reportIds);
  const result = commitModel(function (candidate) {
    const selected = candidate.pendingOfflineReports.filter(
      function (report) {
        return uniqueIds.has(report.id);
      }
    );
    if (!selected.length) {
      return commandResult(true, 'no_change', false, null, null);
    }
    candidate.reportArchive = SimulationReport.archive(
      candidate.reportArchive,
      selected,
      50
    );
    candidate.pendingOfflineReports =
      candidate.pendingOfflineReports.filter(function (report) {
        return !uniqueIds.has(report.id);
      });
    return commandResult(true, 'ok', true, '离线收益已领取', {
      reportIds: selected.map(function (report) {
        return report.id;
      })
    });
  }, Date.now(), {
    kind: 'closeOffline',
    message: '保存失败，离线收益仍待领取',
    successMessage: '离线收益已领取'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandEnterLegacyRebirth() {
  const result = commitModel(function (candidate) {
    if (!candidate.created) {
      return commandResult(
        false,
        'not_created',
        false,
        '尚未创建角色',
        null
      );
    }
    candidate.player = defaultPlayer();
    candidate.current = null;
    candidate.lastActionStop = null;
    if (stage5Bootstrap && stage5Bootstrap.LegacyTransition &&
        typeof stage5Bootstrap.LegacyTransition.clearPreviousLifeChronicle ===
          'function') {
      stage5Bootstrap.LegacyTransition.clearPreviousLifeChronicle(candidate);
    } else if (candidate.systems && candidate.systems.world) {
      candidate.systems.world.worldEvents = [];
      candidate.systems.world.nextWorldEventId = 1;
    }
    return commandResult(
      true,
      'ok',
      true,
      '入轮回，重生于练气一层',
      null
    );
  }, Date.now(), {
    kind: 'save',
    message: '轮回结果保存失败，请重试'
  });
  if (result.ok) {
    state.showLunhui = false;
    state.navIndex = NAV_HOME;
    toast(result.message);
  }
  return result;
}

function commandTravelToRegion(input) {
  if (!useStage4Runtime || !stage4Bootstrap.WorldMonth) {
    return stage4Failure('interaction_locked', '人物世界尚未开放');
  }
  let regionId;
  try {
    regionId = input && typeof input.regionId === 'string'
      ? input.regionId
      : null;
  } catch (error) {
    return stage4Failure('interaction_locked');
  }
  if (!regionId || !stage4Region(regionId)) {
    return stage4Failure('interaction_locked', '未知地域');
  }
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const traveled = stage4Bootstrap.WorldMonth.playerTravel(
      candidate,
      regionId,
      {
        helpers: {
          random: function () {
            return stage2Bootstrap && stage2Bootstrap.Random
              ? stage2Bootstrap.Random.next(candidate)
              : Math.random();
          }
        }
      }
    );
    if (!traveled || !traveled.ok) {
      if (traveled && traveled.code === 'already_there') {
        return stage4Failure('no_change', '你已在当地');
      }
      return stage4Failure(
        traveled && traveled.code ? traveled.code : 'interaction_locked'
      );
    }
    const region = stage4Region(regionId);
    return commandResult(
      true,
      'ok',
      true,
      '已前往' + (region ? region.name : regionId),
      { regionId: regionId }
    );
  }, now, {
    kind: 'save',
    message: '行程保存失败，请重试'
  }, {
    settleToTimestamp: true
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandStartSocial(input) {
  if (!useStage4Runtime) {
    return stage4Failure('interaction_locked', '人物世界尚未开放');
  }
  let npcId;
  let interactionId;
  let itemId = null;
  try {
    npcId = input && typeof input.npcId === 'string'
      ? input.npcId
      : null;
    interactionId = input && typeof input.interactionId === 'string'
      ? input.interactionId
      : null;
    itemId = input && typeof input.itemId === 'string' &&
      input.itemId.length > 0 ? input.itemId : null;
  } catch (error) {
    return stage4Failure('person_not_found');
  }
  if (!npcId) return stage4Failure('person_not_found');
  if (!interactionId) return stage4Failure('interaction_locked');
  const key = interactionId === 'gift'
    ? 'social:' + npcId + ':gift:' + (itemId || '')
    : 'social:' + npcId + ':' + interactionId;
  const now = Date.now();
  const result = commitModel(function (candidate) {
    const started = simulationRuntime.rules.start(candidate, key, now);
    if (!started || !started.ok) {
      return stage4Failure(started && started.code);
    }
    if (started.code === 'no_change') {
      return commandResult(true, 'no_change', false, null, {
        npcId,
        interactionId
      });
    }
    replaceCandidateModel(candidate, started.state);
    const startedValue = started.value || started.result || {};
    const startText = startedValue.narrative ||
      actionDisplayName(key, candidate);
    return commandResult(true, 'ok', true, startText, {
        npcId,
        interactionId,
        actionKey: key
      });
  }, now, {
    kind: 'save',
    message: '互动保存失败，请重试'
  }, {
    settleToTimestamp: true
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandChooseEvent() {
  return commandResult(
    false,
    'pending_removed',
    false,
    '待决策已移除，请在宗门页直接加入或离开',
    null
  );
}

function stage4SectMissionDeps() {
  return {
    missions: stage4Bootstrap.SectMissionContent,
    combat: stage3Bootstrap.CombatContent
  };
}

function commandAcceptSectMission(input) {
  if (!useStage4Runtime || !stage4Bootstrap.SectMissions) {
    return stage4Failure('invalid_state');
  }
  const fields = safeInputFields(input, ['missionId']);
  if (!fields || typeof fields.missionId !== 'string') {
    return stage4Failure('unknown_mission');
  }
  const now = Date.now() / 1000;
  const result = commitModel(function (candidate) {
    const accepted = stage4Bootstrap.SectMissions.acceptMission(
      candidate,
      fields.missionId,
      { nowSeconds: function () { return now; } },
      stage4SectMissionDeps()
    );
    if (!accepted || !accepted.ok) {
      return stage4Failure(accepted && accepted.code);
    }
    replaceCandidateModel(candidate, accepted.state);
    const mission = stage4Bootstrap.SectMissionContent &&
      stage4Bootstrap.SectMissionContent.get(fields.missionId);
    return commandResult(
      true,
      'ok',
      true,
      mission ? '已接取：' + mission.name : '已接取宗门任务',
      { missionId: fields.missionId }
    );
  }, Date.now(), {
    kind: 'save',
    message: '宗门任务保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandRefreshSectMissionBoard() {
  if (!useStage4Runtime || !stage4Bootstrap.SectMissions) {
    return stage4Failure('invalid_state');
  }
  const now = Date.now() / 1000;
  return commitModel(function (candidate) {
    const refreshed = stage4Bootstrap.SectMissions.refreshMissionBoard(
      candidate,
      { nowSeconds: function () { return now; } },
      stage4SectMissionDeps()
    );
    if (!refreshed || !refreshed.ok) {
      return stage4Failure(refreshed && refreshed.code);
    }
    replaceCandidateModel(candidate, refreshed.state);
    return commandResult(true, 'ok', true, null, null);
  }, Date.now(), {
    kind: 'save',
    message: '宗门任务刷新失败，请重试'
  });
}

function commandClaimSectMission() {
  if (!useStage4Runtime || !stage4Bootstrap.SectMissions) {
    return stage4Failure('invalid_state');
  }
  const now = Date.now() / 1000;
  const result = commitModel(function (candidate) {
    const claimed = stage4Bootstrap.SectMissions.claimMission(
      candidate,
      { nowSeconds: function () { return now; } },
      stage4SectMissionDeps()
    );
    if (!claimed || !claimed.ok) {
      return stage4Failure(claimed && claimed.code);
    }
    replaceCandidateModel(candidate, claimed.state);
    return commandResult(
      true,
      'mission_complete',
      true,
      '宗门任务完成，奖励已发放',
      {
        missionId: claimed.missionId || null,
        rewards: claimed.rewards || null
      }
    );
  }, Date.now(), {
    kind: 'save',
    message: '宗门任务交付失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandAdvanceSectMission() {
  return commandClaimSectMission();
}

function stage4SectPavilionDeps() {
  return {
    pavilion: stage4Bootstrap.SectPavilionContent,
    techniques: stage3Bootstrap.TechniqueContent
  };
}

function commandExchangeSectTechnique(input) {
  if (!useStage4Runtime || !stage4Bootstrap.SectPavilion) {
    return stage4Failure('invalid_state');
  }
  const fields = safeInputFields(input, ['techniqueId']);
  if (!fields || typeof fields.techniqueId !== 'string') {
    return stage4Failure('unknown_offer');
  }
  const result = commitModel(function (candidate) {
    const exchanged = stage4Bootstrap.SectPavilion.exchangeTechnique(
      candidate,
      fields.techniqueId,
      stage4SectPavilionDeps()
    );
    if (!exchanged || !exchanged.ok) {
      return stage4Failure(exchanged && exchanged.code);
    }
    replaceCandidateModel(candidate, exchanged.state);
    const name = exchanged.name || '功法';
    return commandResult(
      true,
      'ok',
      true,
      exchanged.learned
        ? '兑换成功，已学会「' + name + '」'
        : '兑换成功：' + name,
      {
        techniqueId: exchanged.techniqueId || fields.techniqueId,
        cost: exchanged.cost || 0
      }
    );
  }, Date.now(), {
    kind: 'save',
    message: '藏宝阁兑换失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandPromoteSectDisciple() {
  if (!useStage4Runtime || !stage4Bootstrap.SectPavilion) {
    return stage4Failure('invalid_state');
  }
  const result = commitModel(function (candidate) {
    const promoted = stage4Bootstrap.SectPavilion.promoteDisciple(
      candidate,
      stage4SectPavilionDeps()
    );
    if (!promoted || !promoted.ok) {
      return stage4Failure(promoted && promoted.code);
    }
    replaceCandidateModel(candidate, promoted.state);
    return commandResult(
      true,
      'ok',
      true,
      '晋升成功：' + (promoted.rankLabel || '弟子'),
      { rankId: promoted.rankId || null }
    );
  }, Date.now(), {
    kind: 'save',
    message: '宗门晋升失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandStartSectMissionCombat() {
  if (!useStage4Runtime || !stage4Bootstrap.SectMissions) {
    return stage4Failure('invalid_state');
  }
  let actionKey = null;
  const marked = commitModel(function (candidate) {
    const result = stage4Bootstrap.SectMissions.markCombatBaseline(
      candidate,
      stage4SectMissionDeps()
    );
    if (!result || !result.ok) {
      return stage4Failure(result && result.code);
    }
    replaceCandidateModel(candidate, result.state);
    actionKey = result.actionKey;
    return commandResult(true, 'ok', true, null, {
      actionKey: result.actionKey,
      regionId: result.regionId,
      enemyId: result.enemyId
    });
  }, Date.now(), {
    kind: 'save',
    message: '宗门挑战保存失败，请重试'
  });
  if (!marked.ok || !actionKey) return marked;
  const started = commandStartAction({ key: actionKey });
  if (started && started.ok) {
    toast('已前往宗门挑战');
    goToNavigationLabel('战斗');
  }
  return started;
}

function goToNavigationLabel(label) {
  const navigation = queryNavigation();
  const index = navigation.items.findIndex(function (item) {
    return item.label === label;
  });
  if (index >= 0) commandSwitchNav({ index: index });
}

function commandChooseSect(input) {
  if (!useStage4Runtime || !stage4Bootstrap.SectSimulation) {
    return stage4Failure('invalid_state');
  }
  let sectId;
  try {
    if (input && Object.prototype.hasOwnProperty.call(input, 'sectId')) {
      sectId = input.sectId === null || input.sectId === ''
        ? null
        : String(input.sectId);
    } else {
      sectId = null;
    }
  } catch (error) {
    return stage4Failure('unknown_sect');
  }
  const now = Date.now() / 1000;
  const result = commitModel(function (candidate) {
    const chosen = stage4Bootstrap.SectSimulation.choosePlayerSect(
      candidate,
      sectId,
      { nowSeconds: function () { return now; } }
    );
    if (!chosen || !chosen.ok) {
      return stage4Failure(chosen && chosen.code);
    }
    if (chosen.code === 'no_change') {
      return commandResult(
        true,
        'no_change',
        false,
        '宗门身份未变化',
        { sectId: chosen.sectId }
      );
    }
    replaceCandidateModel(candidate, chosen.state);
    const joined = chosen.sectId
      ? stage4Sect(chosen.sectId)
      : null;
    let message = '继续以散修身份游历';
    if (joined) {
      message = '已加入' + joined.name;
    } else if (chosen.previousSectId) {
      message = '已离开宗门，恢复散修身份';
    }
    return commandResult(
      true,
      'ok',
      true,
      message,
      {
        previousSectId: chosen.previousSectId,
        sectId: chosen.sectId
      }
    );
  }, Date.now(), {
    kind: 'save',
    message: '宗门选择保存失败，请重试'
  });
  if (result.ok && result.changed) toast(result.message);
  return result;
}

function commandSetCombatCompanion(input) {
  if (!useStage4Runtime || !stage4Bootstrap.CombatParty) {
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

function commandMarkEventSectionRead(input) {
  let section;
  let ids;
  try {
    section = input && typeof input.section === 'string'
      ? input.section
      : null;
    ids = input && Array.isArray(input.ids)
      ? input.ids.filter(function (id) {
        return typeof id === 'string' && id.length > 0;
      })
      : [];
  } catch (error) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '事件分区参数无效',
      null
    );
  }
  if (!stage4ReadState[section]) {
    return commandResult(
      false,
      'invalid_argument',
      false,
      '事件分区参数无效',
      null
    );
  }
  if (ids.length === 0) {
    ids = queryEvents({ section, filter: 'all' }).items.map(function (row) {
      return row.id;
    });
  }
  let changed = false;
  ids.forEach(function (id) {
    if (!stage4ReadState[section].has(id)) {
      stage4ReadState[section].add(id);
      changed = true;
    }
  });
  return commandResult(
    true,
    changed ? 'ok' : 'no_change',
    changed,
    null,
    { section, readCount: ids.length }
  );
}

const STAGE5_MESSAGES = Object.freeze({
  unknown_partner: '未找到这位正式伴侣',
  partner_unavailable: '对方当前无法参与传承仪式',
  formal_partner_required: '只有正式伴侣可以共同筹备传承仪式',
  ritual_in_progress: '已有一场传承仪式正在筹备',
  invalid_plan: '传承方案超出当前传承殿容量',
  invalid_cause: '无法开始这次人生转换',
  lifespan_not_ready: '当前尚未进入寿元安全缓冲',
  no_pending_transition: '当前没有待确认的人生转换',
  invalid_heir: '该后代目前不能继承',
  invalid_route: '请选择后代继承或创建新身份',
  new_identity_not_selected: '请先选择创建新身份',
  invalid_draft: '新身份资料不完整',
  invalid_name: '请输入有效的新名字',
  route_required: '请先选择人生路线',
  draft_required: '请先完成新身份资料',
  transition_required: '寿元将尽时必须完成传承或轮回'
});

function stage5Failure(code) {
  return commandResult(
    false,
    code || 'stage5_failure',
    false,
    STAGE5_MESSAGES[code] || '操作未完成',
    null
  );
}

function commandProposeLineageRitual(input) {
  if (!useStage5Runtime) return stage5Failure('unknown_partner');
  const npcId = input && typeof input.partnerNpcId === 'string'
    ? input.partnerNpcId
    : null;
  if (!npcId) return stage5Failure('unknown_partner');
  const now = Date.now();
  const response = commitModel(function (candidate) {
    const domain = stage5Bootstrap.Lineage.propose(
      candidate,
      npcId,
      now / 1000
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, '开始与对方筹备传承仪式', {
      ritualId: domain.value.id,
      partnerNpcId: npcId
    });
  }, now, {
    kind: 'save',
    message: '传承仪式保存失败，请重试'
  }, {
    settleToTimestamp: true
  });
  if (response.ok && response.changed) toast(response.message);
  return response;
}

function commandSetInheritancePlan(input) {
  if (!useStage5Runtime) return stage5Failure('invalid_plan');
  const now = Date.now();
  return commitModel(function (candidate) {
    const domain = stage5Bootstrap.InheritanceHall.setPlan(
      candidate,
      input
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, '传承方案已保存', domain.value);
  }, now, {
    kind: 'save',
    message: '传承方案保存失败，请重试'
  });
}

function commandBeginLegacyTransition(input) {
  if (!useStage5Runtime) return stage5Failure('invalid_cause');
  const cause = input && typeof input.cause === 'string'
    ? input.cause
    : null;
  const now = Date.now();
  return commitModel(function (candidate) {
    const domain = stage5Bootstrap.LegacyTransition.begin(
      candidate,
      cause,
      now / 1000
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    const pending = domain.value;
    const noHeirAuto = pending &&
      pending.route === 'newIdentity' &&
      !(pending.heirNpcId);
    return commandResult(
      true,
      domain.code,
      domain.code !== 'already_pending',
      domain.code === 'already_pending'
        ? null
        : (noHeirAuto
          ? '已开始人生转换：当前无继承人，请确认新身份'
          : '已开始人生转换，请选择后代继承或创建新身份'),
      domain.value
    );
  }, now, {
    kind: 'save',
    message: '人生转换准备保存失败，请重试'
  }, {
    settleToTimestamp: true
  });
}

function commandChooseLegacyRoute(input) {
  if (!useStage5Runtime) return stage5Failure('invalid_route');
  const route = input && input.route;
  const heirNpcId = input && input.heirNpcId;
  return commitModel(function (candidate) {
    const domain = stage5Bootstrap.LegacyTransition.chooseRoute(
      candidate,
      route,
      heirNpcId
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, null, domain.value);
  }, Date.now(), {
    kind: 'save',
    message: '人生路线保存失败，请重试'
  });
}

function commandUpdateNewIdentityDraft(input) {
  if (!useStage5Runtime) return stage5Failure('invalid_draft');
  return commitModel(function (candidate) {
    const domain = stage5Bootstrap.LegacyTransition.updateDraft(
      candidate,
      input
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, null, domain.value);
  }, Date.now(), {
    kind: 'save',
    message: '新身份资料保存失败，请重试'
  });
}

function commandConfirmLegacyTransition() {
  if (!useStage5Runtime) return stage5Failure('route_required');
  const now = Date.now();
  const response = commitModel(function (candidate) {
    const domain = stage5Bootstrap.LegacyTransition.confirm(
      candidate,
      now / 1000
    );
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    // 转换完成即对齐时间水位，防止随后补算把停顿墙钟一次性砸进 NPC 生命周期。
    candidate.processedThroughMs = now;
    return commandResult(
      true,
      'ok',
      true,
      domain.value.source === 'descendant'
        ? '已由后代接续传承'
        : '已进入新的轮回',
      domain.value
    );
  }, now, {
    kind: 'save',
    message: '人生转换保存失败，请重试'
  });
  if (response.ok) {
    state.navIndex = NAV_HOME;
    state.processedThroughMs = now;
    state._last = now;
    toast(response.message);
  }
  return response;
}

function commandCancelLegacyTransition() {
  if (!useStage5Runtime) return stage5Failure('no_pending_transition');
  return commitModel(function (candidate) {
    const domain = stage5Bootstrap.LegacyTransition.cancel(candidate);
    if (!domain.ok) return stage5Failure(domain.code);
    replaceCandidateModel(candidate, domain.state);
    return commandResult(true, 'ok', true, null, null);
  }, Date.now(), {
    kind: 'save',
    message: '取消人生转换保存失败，请重试'
  });
}

function commandRetryPersistence() {
  if (!isPersistenceLocked()) {
    return commandResult(true, 'no_change', false, null, null);
  }
  if (state._persistenceIssue &&
      state._persistenceIssue.kind === 'future') {
    return commandResult(
      false,
      'persistence_locked',
      false,
      persistenceRecovery.message(),
      null
    );
  }
  let recovered = false;
  try {
    recovered = persistenceRecovery.retry() === true;
  } catch (error) {
    recovered = false;
  }
  if (!recovered || isPersistenceLocked()) {
    return commandResult(
      false,
      'save_failed',
      false,
      persistenceRecovery.message(),
      { retryable: true }
    );
  }
  return commandResult(true, 'ok', true, null, null);
}
