'use strict';

// game-commands-legacy.js — lineage / inheritance / legacy transition
// Depends on: game-commands.js
// Classic script globals; no IIFE.

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
