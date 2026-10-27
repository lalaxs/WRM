(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.GamePersist = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Owns durable transactions and persistence recovery.
  // All game-specific dependencies are supplied by the composition root.
  function create(deps) {
    function isPersistenceLocked() {
      return !!deps.state._persistenceIssue || !!deps.state.settlingOffline ||
        !!deps.state.catchingUp;
    }

    function getPersistenceStatus() {
      if (deps.state.catchingUp) {
        return { locked: true, kind: 'catchup', message: '正在恢复挂机进度…',
          error: null, canRetry: false };
      }
      if (deps.state.settlingOffline) {
        return {
          locked: true,
          kind: 'settle',
          message: '正在结算离线收益…',
          error: null,
          canRetry: false
        };
      }
      const issue = deps.state._persistenceIssue;
      if (!issue) {
        return {
          locked: false,
          kind: null,
          message: '',
          error: null,
          canRetry: false
        };
      }
      return {
        locked: true,
        kind: issue.kind,
        message: issue.message,
        error: issue.error || 'storage-write-failed',
        canRetry: issue.canRetry !== false,
        savedAt: issue.savedAt,
        now: issue.now
      };
    }

    function setPersistenceIssue(issue) {
      persistenceRecovery.updateIssue(issue);
      deps.toast(deps.state._persistenceIssue.message);
    }

    function clearPersistenceIssue() {
      deps.state._persistenceIssue = null;
    }

    function runtimeModelAt() {
      // 命令/自动存档热路径：只深拷贝，不在此处 Stage4 全量 normalize。
      // 完整 normalize 留给 persistModel → toSnapshotInput（存档边界）。
      return deps.StateModel.captureRuntime(
        deps.state /* runtime */,
        Number.isFinite(deps.state.processedThroughMs)
          ? deps.state.processedThroughMs
          : Date.now()
      );
    }

    const persistenceRecovery = (function () {
      let held = null;

      function summarizeCandidate(model) {
        if (!model) return null;
        return {
          processedThroughMs: model.processedThroughMs,
          rngState: model.rngState,
          pendingReportCount: Array.isArray(model.pendingOfflineReports)
            ? model.pendingOfflineReports.length
            : 0
        };
      }

      function publicIssue(descriptor) {
        return {
          kind: descriptor.kind || 'save',
          message: descriptor.message || '保存失败，请重试',
          error: descriptor.error || 'storage-write-failed',
          savedAt: descriptor.savedAt,
          now: descriptor.now,
          successMessage: descriptor.successMessage || '',
          onSuccess: descriptor.onSuccess || ''
        };
      }

      function hold(descriptor) {
        if (held) return false;
        held = {
          kind: descriptor.kind || 'save',
          message: descriptor.message || '保存失败，请重试',
          error: descriptor.error || 'storage-write-failed',
          savedAt: descriptor.savedAt,
          now: descriptor.now,
          fromMs: descriptor.fromMs,
          toMs: descriptor.toMs,
          source: descriptor.source || null,
          mainActionLimitSeconds: descriptor.mainActionLimitSeconds,
          candidate: descriptor.candidate
            ? deps.StateModel.toSnapshotInput(descriptor.candidate)
            : null,
          baseModel: descriptor.baseModel
            ? deps.StateModel.toSnapshotInput(descriptor.baseModel)
            : null,
          candidateSummary: descriptor.candidateSummary
            ? deps.cloneRuntimeState(descriptor.candidateSummary)
            : summarizeCandidate(descriptor.candidate),
          successMessage: descriptor.successMessage || '',
          onSuccess: descriptor.onSuccess || '',
          resumeStartupAt: descriptor.resumeStartupAt
        };
        deps.state._persistenceIssue = publicIssue(held);
        return true;
      }

      function updateIssue(issue) {
        if (!held) {
          hold(Object.assign({
            candidate: runtimeModelAt(),
            now: deps.state.processedThroughMs
          }, issue || {}));
          return;
        }
        const next = issue || {};
        [
          'kind',
          'message',
          'error',
          'savedAt',
          'now',
          'successMessage',
          'onSuccess'
        ].forEach(function (key) {
          if (next[key] !== undefined) held[key] = next[key];
        });
        deps.state._persistenceIssue = publicIssue(held);
      }

      function offlineCandidate(descriptor) {
        const base = deps.StateModel.normalize(
          descriptor.baseModel,
          descriptor.fromMs
        );
        const result = deps.simulateModel(
          base,
          descriptor.fromMs,
          descriptor.toMs,
          'offline',
          descriptor.mainActionLimitSeconds
        );
        result.state.pendingOfflineReports = deps.SimulationReport.addPending(
          base.pendingOfflineReports,
          result.report
        );
        return {
          model: result.state /* simulated */,
          report: result.report
        };
      }

      function retry() {
        if (!held) return true;
        const descriptor = held;
        let candidate = descriptor.candidate
          ? deps.StateModel.normalize(descriptor.candidate, descriptor.now)
          : null;
        let report = null;
        if (descriptor.kind === 'offline' && descriptor.baseModel) {
          const replay = offlineCandidate(descriptor);
          candidate = replay.model;
          report = replay.report;
        }
        if (!candidate) return false;
        const saveAt = descriptor.kind === 'repair' &&
          Number.isFinite(descriptor.savedAt)
          ? descriptor.savedAt
          : Number.isFinite(descriptor.now)
            ? descriptor.now
          : candidate.processedThroughMs;
        const saved = persistModel(candidate, saveAt);
        if (!saved) return false;

        held = null;
        clearPersistenceIssue();
        deps.applyModelToRuntime(saved, { trustedSimulation: true, inplace: true });
        deps.state._lastSimulationReport = report || deps.state._lastSimulationReport;
        deps.state._last = Date.now();
        deps.state._hiddenAt = null;

        if (descriptor.onSuccess === 'appearance') {
          deps.state.phase = 'game';
          deps.state.navIndex = deps.NAV_HOME;
          deps.state.dirty = true;
        }
        if (descriptor.kind === 'repair' &&
            Number.isFinite(descriptor.resumeStartupAt)) {
          const repairedSnapshot = deps.SaveSystem.load(
            deps.Platform,
            descriptor.resumeStartupAt
          ).snapshot;
          return deps.settleStartupOffline(
            repairedSnapshot,
            descriptor.resumeStartupAt
          ).ok;
        }
        if (descriptor.successMessage) deps.toast(descriptor.successMessage);
        return true;
      }

      function testSnapshot() {
        if (!held) return null;
        return deps.StateModel.readonly({
          kind: held.kind,
          message: held.message,
          error: held.error,
          savedAt: held.savedAt,
          now: held.now,
          fromMs: held.fromMs,
          toMs: held.toMs,
          source: held.source,
          candidateSummary: held.candidateSummary
        });
      }

      function isLocked() {
        return !!held || !!deps.state._persistenceIssue;
      }

      function message() {
        return deps.state._persistenceIssue && deps.state._persistenceIssue.message
          ? deps.state._persistenceIssue.message
          : '存档失败，请重试';
      }

      return Object.freeze({
        hold,
        updateIssue,
        retry,
        testSnapshot,
        isLocked,
        message
      });
    })();

    function persistCurrentModel(now) {
      if (isPersistenceLocked()) return false;
      const watermark = now == null
        ? Date.now()
        : Math.max(0, Math.floor(Number(now) || 0));
      const candidate = runtimeModelAt();
      // Saving cannot claim wall-clock time that the simulation has not processed.
      const saved = persistModel(candidate, watermark);
      if (saved) {
        // saved 已是 toSnapshotInput 规范化结果，写回时跳过二次 normalize。
        deps.applyModelToRuntime(saved, { trustedSimulation: true, inplace: true });
        return true;
      }
      persistenceRecovery.hold({
        kind: 'save',
        message: '保存失败，请重试',
        now: watermark,
        candidate
      });
      return false;
    }

    function persist(now) {
      return persistCurrentModel(now);
    }

    function persistModel(model, nowMs) {
      // One canonicalization owner: SaveSystem creates, persists and returns the
      // accepted snapshot. Do not normalize the same tree in both layers.
      try {
        return deps.SaveSystem.commitRuntime(deps.Platform, model, nowMs);
      } catch (error) {
        return null;
      }
    }

    function persistSafely(now) {
      try {
        return persistCurrentModel(now) === true;
      } catch (error) {
        return false;
      }
    }

    function commitModel(mutator, nowMs, recovery, options) {
      if (persistenceRecovery.isLocked()) {
        return deps.commandResult(
          false,
          'persistence_locked',
          false,
          persistenceRecovery.message(),
          null
        );
      }
      const now = Number.isFinite(Number(nowMs))
        ? Math.max(0, Math.floor(Number(nowMs)))
        : Date.now();
      const rawThrough = Number.isFinite(deps.state.processedThroughMs)
        ? deps.state.processedThroughMs
        : now;
      // 与离线启动同一套消毒：水位线 0/损坏/过旧时，禁止在线 settle 从纪元初扣光寿元。
      const settleFrom = deps.sanitizeTimeCursorMs(rawThrough, now, now);
      if (rawThrough !== settleFrom) {
        deps.state.processedThroughMs = settleFrom;
      }
      // 成熟闲置热路径：命令只深拷贝 runtime，不在点击时 Stage4 全量 normalize。
      const base = deps.StateModel.captureRuntime(deps.state, settleFrom);
      base.processedThroughMs = settleFrom;
      let candidate = base;
      let settledToTimestamp = false;
      if (options &&
          options.settleToTimestamp === true &&
          now > settleFrom) {
        candidate = deps.simulateModel(
          base,
          settleFrom,
          now,
          'online',
          null
        ).state;
        settledToTimestamp = true;
      }
      const result = typeof mutator === 'function'
        ? mutator(candidate)
        : null;
      // 未发生补算时，失败命令直接返回；若已 settle，必须落盘补算结果，不能丢弃时间推进。
      if (result &&
          result.ok === false &&
          result.changed === false &&
          !settledToTimestamp) {
        return result;
      }
      if (result && result.changed === false && !settledToTimestamp) {
        return result;
      }

      const saved = persistModel(candidate, now);
      if (!saved) {
        const descriptor = recovery || {};
        persistenceRecovery.hold({
          kind: descriptor.kind || 'save',
          message: descriptor.message || '存档失败，请重试',
          successMessage: descriptor.successMessage || '',
          onSuccess: descriptor.onSuccess || '',
          candidate,
          now,
          success: result && result.data || null
        });
        return deps.commandResult(false, 'save_failed', false, '存档失败，请重试', {
          retryable: true
        });
      }
      deps.applyModelToRuntime(saved, { trustedSimulation: true, inplace: true });
      const newStatus = saved.player && saved.player.lifecycle
        ? saved.player.lifecycle.status
        : null;
      if (settledToTimestamp &&
          newStatus === 'safety_buffer' &&
          !deps.state.showLifespanBuffer) {
        deps.state.showLifespanBuffer = true;
      }
      if (result && result.ok === false) return result;
      if (result && result.changed === false) return result;
      return deps.commandResult(
        true,
        'ok',
        true,
        result && result.message || null,
        result && result.data || null
      );
    }

    function acknowledgeOffline(reportIds) {
      if (isPersistenceLocked()) {
        return deps.commandResult(false, 'persistence_locked', false, null, null);
      }
      const model = deps.StateModel.captureRuntime(deps.state, deps.state.processedThroughMs);
      const ids = new Set(reportIds || []);
      const selected = model.pendingOfflineReports.filter(function (report) {
        return ids.has(report.id);
      });
      if (!selected.length) {
        return deps.commandResult(true, 'no_change', false, null, null);
      }

      // 不在领取时额外 Stage4.normalize；落盘 toSnapshotInput 会做边界规范化。
      const candidate = model;
      candidate.reportArchive = deps.SimulationReport.archive(
        model.reportArchive,
        selected,
        50
      );
      candidate.pendingOfflineReports = model.pendingOfflineReports.filter(
        function (report) {
          return !ids.has(report.id);
        }
      );
      const saveAt = candidate.processedThroughMs;
      const saved = persistModel(candidate, saveAt);
      if (!saved) {
        persistenceRecovery.hold({
          kind: 'closeOffline',
          message: '保存失败，离线收益仍待领取',
          successMessage: '离线收益已领取',
          now: saveAt,
          candidate
        });
        return deps.commandResult(false, 'save_failed', false, null, null);
      }
      deps.applyModelToRuntime(saved, { trustedSimulation: true, inplace: true });
      return deps.commandResult(true, 'acknowledged', true, null, {
        reportIds: selected.map(function (report) { return report.id; })
      });
    }

    function closeOffline() {
      const model = deps.StateModel.captureRuntime(deps.state, deps.state.processedThroughMs);
      return acknowledgeOffline(
        model.pendingOfflineReports.map(function (report) { return report.id; })
      ).ok;
    }

    function retryPersistence() {
      if (deps.state._persistenceIssue &&
          deps.state._persistenceIssue.kind === 'future') {
        return false;
      }
      return persistenceRecovery.retry();
    }

    return Object.freeze({ isPersistenceLocked, getPersistenceStatus, setPersistenceIssue, persistenceRecovery, persistCurrentModel, persist, persistModel, persistSafely, commitModel, acknowledgeOffline, closeOffline, retryPersistence });
  }

  return Object.freeze({ create: create });
});
