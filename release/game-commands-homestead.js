'use strict';

// game-commands-homestead.js — farm / formation / beasts
// Depends on: game-commands.js (stage2 helpers)
// Classic script globals; no IIFE.

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
