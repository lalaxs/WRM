'use strict';

// game-commands-sect.js — sect missions / pavilion
// Depends on: game-commands.js (goToNavigationLabel / commandStartAction)
// Classic script globals; no IIFE.

function stage4SectMissionDeps() {
  return {
    missions: stage4Bootstrap.SectMissionContent,
    combat: stage3Bootstrap.CombatContent
  };
}

function commandAcceptSectMission(input) {
  if (!stage4Bootstrap.SectMissions) {
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
  if (!stage4Bootstrap.SectMissions) {
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
  if (!stage4Bootstrap.SectMissions) {
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
  if (!stage4Bootstrap.SectPavilion) {
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
  if (!stage4Bootstrap.SectPavilion) {
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
  if (!stage4Bootstrap.SectMissions) {
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
