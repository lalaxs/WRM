'use strict';

// game-commands-social.js — offline / travel / social / sect choose / events
// Depends on: game-commands.js
// Classic script globals; no IIFE.

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
  if (!stage4Bootstrap.WorldMonth) {
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
function commandChooseSect(input) {
  if (!stage4Bootstrap.SectSimulation) {
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
