(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.GameRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Owns simulation scheduling, offline settlement and page lifecycle.
  // All game-specific dependencies are supplied by the composition root.
  function create(deps) {
    function simulateModel(
      model,
      fromMs,
      toMs,
      source,
      mainActionLimitSeconds,
      options
    ) {
      const elapsedSeconds = Math.max(0, (toMs - fromMs) / 1000);
      const monthCap = deps.stage4Bootstrap &&
        deps.stage4Bootstrap.WorldMonth &&
        Number.isFinite(deps.stage4Bootstrap.WorldMonth.OFFLINE_MONTH_CAP)
        ? deps.stage4Bootstrap.WorldMonth.OFFLINE_MONTH_CAP
        : 48;
      const extra = options && typeof options === 'object' ? options : {};
      const result = deps.Simulation.advance(model, elapsedSeconds, {
        source,
        fromMs,
        mainActionLimitSeconds,
        offlineMonthCap: source === 'offline'
          ? (Number.isFinite(extra.offlineMonthCap) ? extra.offlineMonthCap : monthCap)
          : null,
        timeBudgetMs: extra.timeBudgetMs,
        mutateInPlace: extra.mutateInPlace === true,
        rules: deps.simulationRuntime.rules,
        lanes: deps.simulationRuntime.lanes
      });
      const advancedTo = result.done
        ? toMs
        : (
          result.report && Number.isFinite(result.report.toMs)
            ? result.report.toMs
            : fromMs
        );
      result.state.processedThroughMs = advancedTo;
      return result;
    }

    const PerfStats = (function () {
      let enabled = false;
      try {
        enabled = typeof location !== 'undefined' &&
          /(?:\?|&)perf=1(?:&|$)/.test(String(location.search || ''));
      } catch (error) {
        enabled = false;
      }
      const buckets = {
        advance: [],
        ui: [],
        frame: []
      };
      function sample(name, ms) {
        if (!enabled) return;
        const list = buckets[name];
        if (!list) return;
        const value = Number(ms);
        if (!Number.isFinite(value) || value < 0) return;
        list.push(value);
        if (list.length > 180) list.shift();
      }
      function avg(list) {
        if (!list.length) return 0;
        let sum = 0;
        for (let i = 0; i < list.length; i++) sum += list[i];
        return sum / list.length;
      }
      function report() {
        return {
          advanceMs: Math.round(avg(buckets.advance) * 10) / 10,
          uiMs: Math.round(avg(buckets.ui) * 10) / 10,
          frameMs: Math.round(avg(buckets.frame) * 10) / 10,
          samples: {
            advance: buckets.advance.length,
            ui: buckets.ui.length,
            frame: buckets.frame.length
          }
        };
      }
      if (enabled && typeof setInterval === 'function') {
        setInterval(function () {
          console.log('[perf]', report());
        }, 5000);
      }
      return {
        enabled: enabled,
        sample: sample,
        report: report
      };
    })();

    function recoverRuntimeFromLastSave(nowMs) {
      try {
        if (typeof deps.SaveSystem === 'undefined' ||
            !deps.SaveSystem ||
            typeof deps.SaveSystem.load !== 'function') {
          return false;
        }
        const now = Number.isFinite(nowMs) ? Math.max(0, Math.floor(nowMs)) : Date.now();
        const loaded = deps.SaveSystem.load(deps.Platform, now);
        const snapshot = loaded && loaded.snapshot;
        if (!snapshot) return false;
        const model = deps.StateModel.normalize(snapshot, now);
        if (!model || !model.player) return false;
        deps.applyModelToRuntime(model);
        deps.state._last = now;
        return true;
      } catch (error) {
        console.error(
          '[recoverRuntimeFromLastSave]',
          error && error.stack ? error.stack : error
        );
        return false;
      }
    }

    function advanceRuntime(fromMs, toMs, source, mainActionLimitSeconds) {
      if (!Number.isFinite(fromMs) ||
          !Number.isFinite(toMs)) {
        return null;
      }
      const prevStatus = deps.state.player && deps.state.player.lifecycle
        ? deps.state.player.lifecycle.status
        : null;
      // 在线热路径：queryView（共享嵌套引用）+ Simulation mutateInPlace + apply inplace。
      // 离线/重载仍走 fromRuntime，保证落盘边界干净。
      const onlineInPlace = source === 'online' &&
        typeof deps.StateModel.queryView === 'function';
      const model = onlineInPlace
        ? deps.StateModel.queryView(deps.state /* runtime */, fromMs)
        : deps.StateModel.fromRuntime(deps.state /* runtime */, fromMs);
      let result = null;
      const advanceStarted = PerfStats.enabled ? Date.now() : 0;
      try {
        result = simulateModel(
          model,
          fromMs,
          toMs,
          source,
          mainActionLimitSeconds,
          onlineInPlace ? { mutateInPlace: true } : null
        );
      } catch (error) {
        console.error(
          '[advanceRuntime]',
          error && error.stack ? error.stack : error
        );
        // 原地推进失败后 runtime 可能半脏：尽量从最近成功存档回滚。
        if (onlineInPlace) {
          const recovered = recoverRuntimeFromLastSave(toMs);
          if (!recovered && typeof deps.setPersistenceIssue === 'function') {
            deps.setPersistenceIssue({
              kind: 'repair',
              message: '模拟异常，请重试存档或刷新页面',
              now: toMs
            });
          }
        }
        if (PerfStats.enabled) {
          PerfStats.sample('advance', Date.now() - advanceStarted);
        }
        return null;
      }
      // 在线：信任 Simulation 输出，跳过 apply 时的 Stage4 全量 normalize。
      // 离线结算仍走完整 normalize，保证落盘前形态干净。
      if (typeof deps.StateModel.applyToRuntime === 'function') {
        deps.StateModel.applyToRuntime(
          deps.state /* runtime */,
          result.state,
          onlineInPlace
            ? { trustedSimulation: true, inplace: true }
            : (source === 'online' ? { trustedSimulation: true } : null)
        );
      } else {
        deps.StateModel.applyToRuntime(deps.state /* runtime */, result.state);
      }
      deps.invalidateQueryModelCache();
      deps.state._lastSimulationReport = result.report;
      // 边缘触发：生命周期状态「进入安全缓冲」时弹一次提示（不每帧弹）
      const newStatus = deps.state.player && deps.state.player.lifecycle
        ? deps.state.player.lifecycle.status
        : null;
      if (prevStatus !== 'safety_buffer' &&
          newStatus === 'safety_buffer' &&
          !deps.state.showLifespanBuffer) {
        deps.state.showLifespanBuffer = true;
      }
      if (PerfStats.enabled) {
        PerfStats.sample('advance', Date.now() - advanceStarted);
      }
      return result.report;
    }

    function getLastSimulationReport() {
      return deps.state._lastSimulationReport;
    }

    function advanceGameplay(fromMs, toMs, source, mainActionLimitSeconds) {
      if (deps.isPersistenceLocked()) return null;
      const now = Number.isFinite(toMs) ? toMs : Date.now();
      const rawHighWater = Number.isFinite(deps.state.processedThroughMs)
        ? deps.state.processedThroughMs
        : fromMs;
      // 在线帧推进同样消毒坏水位线，避免 _last 正常但 processedThroughMs=0 时被 max 拉回纪元初。
      const highWater = sanitizeTimeCursorMs(rawHighWater, now, now);
      if (rawHighWater !== highWater) {
        deps.state.processedThroughMs = highWater;
      }
      const effectiveFrom = Math.max(
        sanitizeTimeCursorMs(fromMs, now, highWater),
        highWater
      );
      if (toMs <= effectiveFrom) return null;
      const exploring = !!(
        deps.state.current &&
        deps.state.current.key.indexOf('gather:explore:') === 0
      );
      const pendingExplore = exploring
        ? deps.cloneRuntimeState(deps.state.current)
        : null;
      const report = advanceRuntime(
        effectiveFrom,
        toMs,
        source,
        mainActionLimitSeconds
      );
      if (exploring &&
          report &&
          report.action.completed > 0 &&
          !deps.persistSafely(toMs)) {
        if (deps.state.current === null && pendingExplore) {
          pendingExplore.done = Math.max(
            1,
            Number(pendingExplore.done) || 0,
            Number(pendingExplore.count) || 1
          );
          pendingExplore.count = Math.max(
            1,
            Number(pendingExplore.count) || pendingExplore.done
          );
          pendingExplore.elapsed = 0;
          pendingExplore.stalled = true;
          deps.state.current = pendingExplore;
        } else if (deps.state.current) {
          deps.state.current.stalled = true;
        }
        deps.setPersistenceIssue({
          kind: 'explore',
          message: '探索结果保存失败，请重试',
          successMessage: '探索结果已保存'
        });
      }
      if (report) deps.publishGainTipsFromReport(report);
      return report;
    }

    function normalizeStartupModel(snapshot, now) {
      const model = deps.StateModel.normalize(snapshot, now);
      if (!model.player) return model;
      const player = deps.cloneRuntimeState(model.player);
      const rawPlayer = snapshot && snapshot.player;
      if (rawPlayer &&
          !Object.prototype.hasOwnProperty.call(rawPlayer, 'shouyuan')) {
        delete player.shouyuan;
      }
      if (rawPlayer &&
          !Object.prototype.hasOwnProperty.call(rawPlayer, 'shouMax')) {
        delete player.shouMax;
      }
      model.player = deps.ensurePlayer(player);
      return model;
    }

    const MIN_OFFLINE_SETTLE_MS = 60000;

    const MAX_OFFLINE_LOOKBACK_MS = 172800 * 1000;

    function sanitizeTimeCursorMs(rawFromMs, nowMs, fallbackMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      const fallback = Number.isFinite(fallbackMs) && fallbackMs > 0
        ? fallbackMs
        : now;
      let from = Number.isFinite(rawFromMs) ? rawFromMs : fallback;
      // 0 / 负数视为未初始化水位线，绝不能当「从 1970 年起算」去扣寿元。
      if (!Number.isFinite(from) || from <= 0) {
        from = fallback > 0 ? fallback : now;
      }
      from = Math.min(from, now);
      const earliest = Math.max(0, now - MAX_OFFLINE_LOOKBACK_MS);
      if (from < earliest) from = earliest;
      return from;
    }

    function sanitizeOfflineFromMs(model, now) {
      const savedAt = Number.isFinite(model && model.savedAt)
        ? model.savedAt
        : now;
      return sanitizeTimeCursorMs(
        model && model.processedThroughMs,
        now,
        savedAt
      );
    }

    function kickEnsureCombatRuntime() {
      if (typeof deps.LazyContent !== 'undefined' &&
          deps.LazyContent &&
          typeof deps.LazyContent.ensureCombatRuntime === 'function') {
        return deps.LazyContent.ensureCombatRuntime();
      }
      if (typeof deps.refreshStage3CombatRuntime === 'function') {
        deps.refreshStage3CombatRuntime();
      }
      return Promise.resolve(deps.useStage3CombatRuntime);
    }

    function modelNeedsCombatRuntime(model) {
      if (!model || typeof model !== 'object') return false;
      const key = model.current && typeof model.current.key === 'string'
        ? model.current.key
        : '';
      if (key.indexOf('combat:') === 0) return true;
      const combat = model.systems && model.systems.combat;
      if (!combat || typeof combat !== 'object') return false;
      if (combat.session) return true;
      if (combat.injury) return true;
      const pending = combat.pendingRewards;
      if (pending && typeof pending === 'object') {
        if (Array.isArray(pending) && pending.length > 0) return true;
        if (!Array.isArray(pending) && Object.keys(pending).length > 0) return true;
      }
      return false;
    }

    function snapshotNeedsCombatRuntime(snapshot) {
      return modelNeedsCombatRuntime(snapshot);
    }

    function settleStartupOffline(snapshot, nowMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      const model = normalizeStartupModel(snapshot, now);
      // 仅真实存档故障才跳过；settlingOffline 锁不能挡住本函数本身。
      if (deps.state._persistenceIssue) {
        return {
          ok: false,
          snapshot: deps.cloneRuntimeState(snapshot),
          state: model,
          report: null,
          newReports: []
        };
      }
      const rawThrough = Number.isFinite(model.processedThroughMs)
        ? model.processedThroughMs
        : 0;
      const clockRollback = rawThrough > now;
      const from = sanitizeOfflineFromMs(model, now);
      // 水位线曾损坏时写回合理值，避免下次启动再次从 0 结算
      if (!clockRollback && rawThrough !== from) {
        model.processedThroughMs = from;
      }
      const newReports = [];
      let candidate = model;
      let report = null;
      let didPersist = false;

      if (clockRollback) {
        report = deps.SimulationReport.create({
          source: 'offline',
          fromMs: now,
          toMs: now,
          requestedSeconds: 0,
          actionKey: model.current ? model.current.key : null,
          seedBefore: model.rngState
        });
        report.warnings.push('clock_rollback');
        candidate = deps.StateModel.normalize(model, now);
        candidate.processedThroughMs = model.processedThroughMs;
        if (deps.SimulationReport.isMeaningfulOfflineReport(report)) {
          candidate.pendingOfflineReports = deps.SimulationReport.addPending(
            model.pendingOfflineReports,
            report
          );
          newReports.push(report);
        } else {
          candidate.pendingOfflineReports = model.pendingOfflineReports || [];
        }
        const savedRollback = deps.persistModel(candidate, now);
        if (!savedRollback) {
          deps.applyModelToRuntime(model);
          deps.persistenceRecovery.hold({
            kind: 'offline',
            message: '离线收益保存失败，请重试',
            savedAt: now,
            now,
            fromMs: now,
            toMs: now,
            source: 'clock_rollback',
            candidate
          });
          deps.toast('离线收益保存失败，请重试');
          return {
            ok: false,
            snapshot: deps.cloneRuntimeState(snapshot),
            state: model,
            report,
            newReports: []
          };
        }
        candidate = savedRollback;
        didPersist = true;
      } else if (now - from >= MIN_OFFLINE_SETTLE_MS) {
        const limit = model.systems &&
          Number.isFinite(model.systems.offlineLimitSeconds)
          ? model.systems.offlineLimitSeconds
          : (model.offlineLimitSeconds || 43200);
        const result = simulateModel(model, from, now, 'offline', limit);
        report = result.report;
        candidate = result.state;
        if (deps.SimulationReport.isMeaningfulOfflineReport(report)) {
          candidate.pendingOfflineReports = deps.SimulationReport.addPending(
            model.pendingOfflineReports,
            report
          );
          newReports.push(report);
        } else {
          candidate.pendingOfflineReports = model.pendingOfflineReports || [];
        }
        const savedOffline = deps.persistModel(candidate, now);
        if (!savedOffline) {
          deps.applyModelToRuntime(model);
          deps.persistenceRecovery.hold({
            kind: 'offline',
            message: '离线收益保存失败，请重试',
            savedAt: from,
            now,
            fromMs: from,
            toMs: now,
            source: 'offline',
            mainActionLimitSeconds: limit,
            baseModel: model,
            candidateSummary: {
              processedThroughMs: result.state.processedThroughMs,
              rngState: result.state.rngState,
              pendingReportCount: (
                result.state.pendingOfflineReports || []
              ).length
            }
          });
          deps.toast('离线收益保存失败，请重试');
          return {
            ok: false,
            snapshot: deps.cloneRuntimeState(snapshot),
            state: model,
            report,
            newReports: []
          };
        }
        candidate = savedOffline;
        didPersist = true;
      }

      deps.applyModelToRuntime(
        candidate,
        didPersist ? { trustedSimulation: true } : null
      );
      deps.state._lastSimulationReport = report;
      deps.state._offlineSec = Math.max(0, (now - from) / 1000);
      deps.state._offlineSettleProgress = null;
      if (didPersist) {
        const savedSnapshot = deps.SaveSystem.load(deps.Platform, now).snapshot;
        return {
          ok: true,
          snapshot: savedSnapshot,
          state: deps.StateModel.normalize(savedSnapshot, now),
          report,
          newReports
        };
      }
      const savedSnapshot = deps.SaveSystem.createSnapshot(
        deps.StateModel.toSnapshotInput(candidate), now
      );
      return {
        ok: true, snapshot: savedSnapshot,
        state: deps.StateModel.normalize(savedSnapshot, now), report, newReports
      };
    }

    function offlineLimitFromModel(model) {
      if (model && model.systems &&
          Number.isFinite(model.systems.offlineLimitSeconds)) {
        return model.systems.offlineLimitSeconds;
      }
      return model && Number.isFinite(model.offlineLimitSeconds)
        ? model.offlineLimitSeconds
        : 43200;
    }

    function formatOfflineSettleProgress(progress) {
      if (!progress) return '正在结算离线收益，请稍候…';
      const from = Number(progress.fromMs) || 0;
      const to = Number(progress.toMs) || 0;
      const current = Number(progress.currentMs) || from;
      const total = Math.max(0, to - from);
      if (!(total > 0)) return '正在结算离线收益，请稍候…';
      const done = Math.max(0, Math.min(total, current - from));
      const pct = Math.max(0, Math.min(100, Math.floor((done / total) * 100)));
      return '正在结算离线收益… ' + pct + '%';
    }

    function finishChunkedOfflineSettle(job) {
      const now = job.now;
      const from = job.from;
      let candidate = job.model;
      const reports = Array.isArray(job.reports) ? job.reports : [];
      const meaningful = reports.filter(deps.SimulationReport.isMeaningfulOfflineReport);
      const report = meaningful.length
        ? meaningful[meaningful.length - 1]
        : (reports.length ? reports[reports.length - 1] : null);
      if (meaningful.length) {
        let pending = job.basePending || [];
        meaningful.forEach(function (item) {
          pending = deps.SimulationReport.addPending(pending, item);
        });
        candidate.pendingOfflineReports = pending;
      } else {
        candidate.pendingOfflineReports = job.basePending || [];
      }
      const savedOffline = deps.persistModel(candidate, now);
      if (!savedOffline) {
        deps.applyModelToRuntime(job.baseModel);
        deps.persistenceRecovery.hold({
          kind: 'offline',
          message: '离线收益保存失败，请重试',
          savedAt: from,
          now,
          fromMs: from,
          toMs: now,
          source: 'offline',
          mainActionLimitSeconds: job.limit,
          baseModel: job.baseModel,
          candidateSummary: {
            processedThroughMs: candidate.processedThroughMs,
            rngState: candidate.rngState,
            pendingReportCount: (candidate.pendingOfflineReports || []).length
          }
        });
        deps.toast('离线收益保存失败，请重试');
        deps.state._offlineSettleJob = null;
        deps.state._offlineSettleProgress = null;
        return false;
      }
      deps.applyModelToRuntime(savedOffline, { trustedSimulation: true, inplace: true });
      deps.state._lastSimulationReport = report;
      deps.state._offlineSec = Math.max(0, (now - from) / 1000);
      deps.state._offlineSettleJob = null;
      deps.state._offlineSettleProgress = null;
      return true;
    }

    function abortChunkedOfflineSettle(job, error) {
      console.error(
        '[offlineSettle]',
        error && error.stack ? error.stack : error
      );
      try {
        if (job && job.baseModel) {
          deps.applyModelToRuntime(job.baseModel);
        }
      } catch (restoreError) {
        console.error(
          '[offlineSettle] restore failed',
          restoreError && restoreError.stack ? restoreError.stack : restoreError
        );
      }
      deps.state._offlineSettleJob = null;
      deps.state._offlineSettleProgress = null;
      deps.state.settlingOffline = false;
      if (typeof deps.toast === 'function') {
        deps.toast('离线结算失败，已恢复结算前状态');
      }
      return true;
    }

    function stepChunkedOfflineSettle() {
      const job = deps.state._offlineSettleJob;
      if (!job) return true;
      const cursor = job.cursorMs;
      const now = job.now;
      if (!(cursor < now)) {
        return finishChunkedOfflineSettle(job);
      }
      // 每片最多推进一段游戏时间，并用墙钟预算打断，保证结算中弹窗可刷新。
      const CHUNK_GAME_MS = 10 * 60 * 1000;
      const TIME_BUDGET_MS = 32;
      const sliceEnd = Math.min(now, cursor + CHUNK_GAME_MS);
      let result = null;
      try {
        result = simulateModel(
          job.model,
          cursor,
          sliceEnd,
          'offline',
          job.mainLimitLeft,
          // job.model 已是独立工作副本；片间原地推进，避免每片双倍整树拷贝。
          { timeBudgetMs: TIME_BUDGET_MS, mutateInPlace: true,
            offlineMonthCap: job.monthBudgetLeft }
        );
      } catch (error) {
        return abortChunkedOfflineSettle(job, error);
      }
      job.model = result.state;
      job.monthBudgetLeft = result.offlineMonthBudgetRemaining;
      let advancedTo = Number.isFinite(result.state.processedThroughMs)
        ? result.state.processedThroughMs
        : cursor;
      // 单片零推进（极端卡顿）：去掉时间片预算强制跑完本片，避免跳过游戏逻辑。
      if (advancedTo <= cursor && sliceEnd > cursor) {
        let forced = null;
        try {
          forced = simulateModel(
            job.model,
            cursor,
            sliceEnd,
            'offline',
            job.mainLimitLeft,
            { mutateInPlace: true, offlineMonthCap: job.monthBudgetLeft }
          );
        } catch (error) {
          return abortChunkedOfflineSettle(job, error);
        }
        job.model = forced.state;
        job.monthBudgetLeft = forced.offlineMonthBudgetRemaining;
        advancedTo = Number.isFinite(forced.state.processedThroughMs)
          ? forced.state.processedThroughMs
          : sliceEnd;
        if (forced.report) {
          job.reports.push(forced.report);
          const used = Number(forced.report.mainActionSeconds) || 0;
          job.mainLimitLeft = Math.max(0, job.mainLimitLeft - used);
        }
      } else if (result.report) {
        job.reports.push(result.report);
        const used = Number(result.report.mainActionSeconds) || 0;
        job.mainLimitLeft = Math.max(0, job.mainLimitLeft - used);
      }
      job.cursorMs = Math.max(cursor, advancedTo);
      deps.state._offlineSettleProgress = {
        fromMs: job.from,
        currentMs: job.cursorMs,
        toMs: job.now
      };
      // 结算中不必每片触发玩家立绘重合成。
      if (job.cursorMs >= job.now) {
        return finishChunkedOfflineSettle(job);
      }
      return false;
    }

    function startupNeedsOfflineSettle(snapshot, nowMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (deps.state._persistenceIssue) return false;
      const model = normalizeStartupModel(snapshot, now);
      if (!model.player) return false;
      const rawThrough = Number.isFinite(model.processedThroughMs)
        ? model.processedThroughMs
        : 0;
      if (rawThrough > now) return true;
      const from = sanitizeOfflineFromMs(model, now);
      return now - from >= MIN_OFFLINE_SETTLE_MS;
    }

    function scheduleStartupOfflineSettle(snapshot, nowMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      const harness = !!(deps.runtimeRoot &&
        deps.runtimeRoot.__GAME_TEST_HARNESS_REQUEST__ === true);
      // 测试桩常把 rAF/setTimeout 做成空函数；若仍走延迟路径，settlingOffline 会永久卡死。
      if (harness || !startupNeedsOfflineSettle(snapshot, now)) {
        settleStartupOffline(snapshot, now);
        return;
      }
      const model = normalizeStartupModel(snapshot, now);
      if (deps.state._persistenceIssue || !model.player) {
        settleStartupOffline(snapshot, now);
        return;
      }
      const rawThrough = Number.isFinite(model.processedThroughMs)
        ? model.processedThroughMs
        : 0;
      if (rawThrough > now) {
        // 时钟回拨路径短且需立刻落盘，仍同步处理。
        settleStartupOffline(snapshot, now);
        return;
      }
      const from = sanitizeOfflineFromMs(model, now);
      if (rawThrough !== from) {
        model.processedThroughMs = from;
      }
      const limit = offlineLimitFromModel(model);
      deps.state.settlingOffline = true;
      deps.state._offlineSettleProgress = {
        fromMs: from,
        currentMs: from,
        toMs: now
      };
      deps.state._offlineSettleJob = {
        model: model,
        baseModel: deps.cloneRuntimeState(model),
        basePending: model.pendingOfflineReports || [],
        from: from,
        now: now,
        cursorMs: from,
        limit: limit,
        mainLimitLeft: limit,
        monthBudgetLeft: deps.stage4Bootstrap && deps.stage4Bootstrap.WorldMonth
          ? deps.stage4Bootstrap.WorldMonth.OFFLINE_MONTH_CAP : 48,
        reports: []
      };
      deps.state.dirty = true;

      function runSettleSlice() {
        try {
          const done = stepChunkedOfflineSettle();
          if (!done) {
            if (typeof setTimeout === 'function') {
              setTimeout(runSettleSlice, 0);
            } else {
              while (!stepChunkedOfflineSettle()) { /* sync fallback */ }
              deps.state.settlingOffline = false;
              deps.state.dirty = true;
            }
            return;
          }
        } catch (error) {
          abortChunkedOfflineSettle(deps.state._offlineSettleJob, error);
        } finally {
          if (!deps.state._offlineSettleJob) {
            deps.state.settlingOffline = false;
            deps.state.dirty = true;
          }
        }
      }

      function afterPaint() {
        if (typeof setTimeout === 'function') {
          setTimeout(runSettleSlice, 0);
        } else {
          runSettleSlice();
        }
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          requestAnimationFrame(afterPaint);
        });
      } else {
        afterPaint();
      }
    }

    function onlineAdvanceMinMs() {
      // 在线推进已走 mutateInPlace；仍不必跟 rAF 60Hz 对齐。
      // 战斗稍密，其余约 12Hz 足够。
      const key = deps.state.current && deps.state.current.key;
      if (typeof key === 'string' && key.indexOf('combat:') === 0) return 33;
      return 80;
    }

    const MAX_SYNC_GAP_MS = 1500;
    let catchupJob = null;

    function stepCatchup() {
      const job = catchupJob;
      if (!job) return true;
      try {
        const result = simulateModel(job.model, job.cursor,
          Math.min(job.target, job.cursor + 60000), 'online', null,
          { mutateInPlace: true, timeBudgetMs: 8 });
        job.model = result.state;
        job.cursor = result.state.processedThroughMs;
        job.lastReport = result.report;
        if (job.cursor < job.target) {
          setTimeout(stepCatchup, 0);
          return false;
        }
        const saved = deps.persistModel(job.model, job.target);
        if (!saved) {
          deps.persistenceRecovery.hold({ kind: 'save', now: job.target,
            candidate: job.model, message: '挂机进度保存失败，请重试' });
        } else {
          deps.applyModelToRuntime(saved, { trustedSimulation: true, inplace: true });
          deps.state._lastSimulationReport = job.lastReport;
        }
        deps.state._last = job.target;
        deps.state._nextAutosaveAt = Date.now() + 30000;
      } catch (error) {
        // Work on an isolated transaction: a failed slice leaves live progress
        // at its original checkpoint and can be safely reloaded.
        deps.setPersistenceIssue({ kind: 'repair', now: deps.state.processedThroughMs,
          message: '恢复挂机进度失败，请重试或刷新页面' });
        console.error('[catchup]', error);
      }
      catchupJob = null;
      deps.state.catchingUp = false;
      if (deps.state._hiddenAt != null) startHiddenTicker();
      return true;
    }

    function scheduleCatchup(now) {
      if (catchupJob) return false;
      const from = sanitizeTimeCursorMs(deps.state.processedThroughMs, now, now);
      if (from >= now) return true;
      catchupJob = { model: deps.StateModel.captureRuntime(deps.state, from),
        cursor: from, target: now, lastReport: null };
      deps.state.catchingUp = true;
      setTimeout(stepCatchup, 0);
      return true;
    }

    function advanceVisibleTo(nowMs) {
      if (deps.isPersistenceLocked() || deps.state._hiddenAt != null) return false;
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (deps.state._last == null) deps.state._last = now;
      if (now < deps.state._last) {
        deps.state._last = now;
        return true;
      }
      if (now - deps.state._last < onlineAdvanceMinMs()) return true;
      if (now - deps.state._last > MAX_SYNC_GAP_MS) {
        scheduleCatchup(now);
        return false;
      }
      advanceGameplay(deps.state._last, now, 'online', null);
      deps.state._last = now;
      return true;
    }

    function runRuntimeFrame(nowMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (!advanceVisibleTo(now)) return false;
      if (now >= deps.state._nextAutosaveAt) {
        deps.state._nextAutosaveAt = now + 30000;
        if (!deps.persistCurrentModel(now)) return false;
      }
      return true;
    }

    let hiddenTicker = null;

    function startHiddenTicker() {
      if (hiddenTicker != null) return;
      if (typeof setInterval !== 'function') return;
      hiddenTicker = setInterval(function () { advanceHidden(Date.now()); }, 1000);
    }

    function stopHiddenTicker() {
      if (hiddenTicker != null) {
        if (typeof clearInterval === 'function') clearInterval(hiddenTicker);
        hiddenTicker = null;
      }
    }

    function advanceHidden(nowMs) {
      if (deps.isPersistenceLocked() || deps.state._hiddenAt == null) return;
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (deps.state._last == null) deps.state._last = now;
      if (now > deps.state._last) {
        if (now - deps.state._last > MAX_SYNC_GAP_MS) {
          scheduleCatchup(now);
          return;
        }
        advanceGameplay(deps.state._last, now, 'online', null);
        deps.state._last = now;
      }
      if (now >= deps.state._nextAutosaveAt) {
        deps.state._nextAutosaveAt = now + 30000;
        deps.persistCurrentModel(now);
      }
    }

    function handleVisibilityChange(hidden, nowMs) {
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (catchupJob) {
        deps.state._hiddenAt = hidden ? now : null;
        return true;
      }
      if (deps.isPersistenceLocked()) return false;
      if (hidden) {
        if (deps.state._hiddenAt != null) return true;
        if (!advanceVisibleTo(now)) {
          if (catchupJob) {
            deps.state._hiddenAt = now;
            startHiddenTicker();
            return true;
          }
          return false;
        }
        deps.state._hiddenAt = now;
        deps.state._last = now;
        if (!deps.persistCurrentModel(now)) return false;
        startHiddenTicker();
        return true;
      }

      // 由后台回到前台：停止后台定时器；若后台定时器被系统杀掉，补算隐藏期间，
      // 再把运行交还给 rAF 主循环（用同一套水位线消毒，避免一次扣光寿元）。
      stopHiddenTicker();
      deps.state._hiddenAt = null;
      const through = Number.isFinite(deps.state.processedThroughMs)
        ? deps.state.processedThroughMs
        : now;
      if (now > through) {
        if (now - through > MAX_SYNC_GAP_MS) {
          scheduleCatchup(now);
          return true;
        }
        advanceGameplay(through, now, 'online', null);
      }
      deps.state._last = now;
      deps.state._nextAutosaveAt = now + 30000;
      return true;
    }

    function flushLifecycle(nowMs) {
      if (deps.isPersistenceLocked()) return false;
      if (deps.state._hiddenAt != null) return true;
      const now = Math.max(0, Math.floor(Number(nowMs) || 0));
      if (!advanceVisibleTo(now)) return false;
      return deps.persistCurrentModel(now);
    }

    return Object.freeze({ simulateModel, PerfStats, advanceRuntime, getLastSimulationReport, advanceGameplay, normalizeStartupModel, sanitizeTimeCursorMs, kickEnsureCombatRuntime, snapshotNeedsCombatRuntime, settleStartupOffline, formatOfflineSettleProgress, scheduleStartupOfflineSettle, runRuntimeFrame, stepCatchup, advanceHidden, handleVisibilityChange, flushLifecycle });
  }

  return Object.freeze({ create: create });
});
