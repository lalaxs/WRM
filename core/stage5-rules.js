(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./stage4-rules.js'),
      require('./lineage.js'),
      require('./npc-roster.js'),
      require('../content/lifecycle.js')
    )
    : factory(
      root && root.Stage4Rules,
      root && root.Lineage,
      root && root.NpcRoster,
      root && root.LifecycleContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Stage5Rules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultStage4Rules,
  Lineage,
  NpcRoster,
  LifecycleContent
) {
  'use strict';

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function replace(target, source) {
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.keys(source).forEach(function (key) { target[key] = source[key]; });
  }

  function ritualJobs(state) {
    const jobs = state && state.systems &&
      state.systems.parallel &&
      state.systems.parallel.jobs;
    return Array.isArray(jobs)
      ? jobs.filter(function (job) {
        return job && job.kind === 'lineageRitual';
      })
      : [];
  }

  function childBoundary(state) {
    const lineage = state && state.systems && state.systems.lineage;
    const records = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records;
    if (!lineage || !records || !lineage.descendants) return Infinity;
    let next = Infinity;
    Object.keys(lineage.descendants).forEach(function (npcId) {
      const person = records[npcId];
      if (!person ||
          person.status !== 'living' ||
          person.lifeStage !== 'child') return;
      const remainingYears = Math.max(
        0,
        LifecycleContent.CHILD_ADULT_AGE_YEARS -
          finite(person.ageYears, 0)
      );
      const seconds = Math.max(
        0,
        remainingYears * LifecycleContent.WORLD_YEAR_SECONDS -
          finite(person.ageRemainderSeconds, 0)
      );
      if (seconds < next) next = seconds;
    });
    return next;
  }

  function create(deps) {
    const source = deps && typeof deps === 'object' ? deps : {};
    const Stage4Rules = source.Stage4Rules || DefaultStage4Rules;
    if (!Stage4Rules || typeof Stage4Rules.create !== 'function') {
      throw new TypeError('Stage4Rules.create is required');
    }
    const base = Stage4Rules.create(deps);
    const lineageLane = Object.freeze({
      id: 'stage5-lineage',
      nextBoundary: function (state) {
        let next = childBoundary(state);
        ritualJobs(state).forEach(function (job) {
          next = Math.min(
            next,
            Math.max(0, finite(job.remainingSeconds, 0))
          );
        });
        return next;
      },
      elapse: function (state, seconds) {
        ritualJobs(state).forEach(function (job) {
          job.remainingSeconds = Math.max(
            0,
            finite(job.remainingSeconds, 0) - seconds
          );
        });
      },
      resolve: function (state, helpers) {
        const due = ritualJobs(state).filter(function (job) {
          return finite(job.remainingSeconds, 0) <= 0;
        }).sort(function (left, right) {
          return left.id.localeCompare(right.id);
        });
        due.forEach(function (job) {
          const completed = Lineage.completeRitual(
            state,
            job.ritualId,
            helpers.nowMs() / 1000
          );
          if (!completed || !completed.ok) return;
          replace(state, completed.state);
          state.systems.parallel.jobs =
            state.systems.parallel.jobs.filter(function (candidate) {
              return !candidate || candidate.id !== job.id;
            });
          if (completed.value && completed.value.child) {
            helpers.report.passive.parallelCompleted.push({
              id: job.id,
              npcId: completed.value.child.id,
              label: job.label
            });
            helpers.report.lifecycle.births.push({
              npcId: completed.value.child.id,
              ritualId: job.ritualId
            });
          }
        });
        const matured = Lineage.markAdultDescendants(
          state,
          helpers.nowMs() / 1000
        );
        if (matured && matured.ok && matured.code === 'ok') {
          replace(state, matured.state);
          helpers.report.lifecycle.adulthood.push.apply(
            helpers.report.lifecycle.adulthood,
            matured.value
          );
          const balanced = NpcRoster.rebalance(state, {
            target: state.systems.npcs.activeTarget
          });
          if (balanced) replace(state, balanced);
        }
      }
    });
    return Object.freeze({
      rules: base.rules,
      lanes: Object.freeze(base.lanes.concat([lineageLane]))
    });
  }

  return Object.freeze({ create: create });
});
