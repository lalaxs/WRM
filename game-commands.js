'use strict';

// game-commands.js — command 基座（appearance / action / inventory / shared helpers）
// Domain files load after this: combat / homestead / social / sect / legacy


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
    const list = NIE[state.gender][category];
    const count = Array.isArray(list) ? list.length : 0;
    state.parts[category] = count > 0
      ? Math.floor(gameRandom() * count)
      : 0;
  }
  if (HairRules && typeof HairRules.randomHairParts === 'function') {
    const styled = HairRules.randomHairParts(
      state.gender,
      state.parts,
      (NIE[state.gender].hair_hou || []).length,
      (NIE[state.gender].hair_qian || []).length,
      Math.floor(gameRandom() * 1e9)
    );
    state.parts.hair_hou = styled.hair_hou;
    state.parts.hair_qian = styled.hair_qian;
  }
  state.dirty = true;
  return commandResult(true, 'ok', true, null, {
    indices: appearanceIndices()
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
  if ((part === 'hair_hou' || part === 'hair_qian') && HairRules &&
      typeof HairRules.stepHairPart === 'function') {
    const beforeHou = state.parts.hair_hou;
    const beforeQian = state.parts.hair_qian;
    const nextParts = HairRules.stepHairPart(
      state.gender,
      state.parts,
      part,
      offset,
      list.length
    );
    if (nextParts.hair_hou === beforeHou &&
        nextParts.hair_qian === beforeQian) {
      return commandResult(true, 'no_change', false, null, null);
    }
    state.parts.hair_hou = nextParts.hair_hou;
    state.parts.hair_qian = nextParts.hair_qian;
    state.dirty = true;
    return commandResult(true, 'ok', true, null, {
      part: part,
      index: nextParts[part],
      hair_hou: nextParts.hair_hou,
      hair_qian: nextParts.hair_qian
    });
  }
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


function goToNavigationLabel(label) {
  const navigation = queryNavigation();
  const index = navigation.items.findIndex(function (item) {
    return item.label === label;
  });
  if (index >= 0) commandSwitchNav({ index: index });
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
