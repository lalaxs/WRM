'use strict';

const fs = require('fs');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function noThrow(run, message) {
  try {
    run();
    ok(true, message);
  } catch (error) {
    ok(false, message + ' (' + error.message + ')');
  }
}

const beforeGlobal = globalThis.SkillProgression;
const P = require('../core/skill-progression.js');

ok(globalThis.SkillProgression === beforeGlobal,
  'CommonJS loading does not attach a browser global');
ok(Object.isFrozen(P), 'CommonJS API is frozen');
exact(Object.keys(P).sort(), [
  'addMasteryXp',
  'addSkillXp',
  'charmBenefits',
  'effectiveDuration',
  'gainCharmXp',
  'masterySpeedBonus',
  'masteryXpNeed',
  'masteryYieldOrRetentionChance',
  'skillSpeedBonus',
  'skillXpNeed'
], 'CommonJS API exposes the shared progression boundary');

const curveCases = [
  [1, 50, 50],
  [9, 2610, 124],
  [10, 3155, 139],
  [19, 10017, 384],
  [20, 10986, 431],
  [89, 161388, 1071904],
  [90, 164667, 1200533],
  [98, 191945, 2972475],
  [99, 0, 0]
];
curveCases.forEach(([level, skillNeed, masteryNeed]) => {
  ok(P.skillXpNeed(level) === skillNeed,
    'skill XP curve is exact at level ' + level);
  ok(P.masteryXpNeed(level) === masteryNeed,
    'mastery XP curve is exact at level ' + level);
});

ok(P.skillXpNeed(98.9) === 191945,
  'skill XP curve floors a fractional level');
ok(P.masteryXpNeed(98.9) === 2972475,
  'mastery XP curve floors a fractional level');
for (const invalid of [NaN, -1, -Infinity, Infinity, '10', null, undefined]) {
  ok(P.skillXpNeed(invalid) === 50,
    'invalid skill level safely normalizes to level 1: ' + String(invalid));
  ok(P.masteryXpNeed(invalid) === 50,
    'invalid mastery level safely normalizes to level 1: ' + String(invalid));
}
ok(P.skillXpNeed(Number.MAX_VALUE) === 0
  && P.masteryXpNeed(Number.MAX_VALUE) === 0,
'extreme finite levels safely cap at level 99');

exact(P.addSkillXp({ level: 1, xp: 0 }, 49.999), {
  value: { level: 1, xp: 49 },
  levelsGained: [],
  capped: false
}, 'incoming skill XP is rounded down');
exact(P.addSkillXp({ level: 1, xp: 0 }, 50), {
  value: { level: 2, xp: 0 },
  levelsGained: [2],
  capped: false
}, 'skill XP crosses an exact threshold');
exact(P.addSkillXp({ level: 1, xp: 49 }, 1), {
  value: { level: 2, xp: 0 },
  levelsGained: [2],
  capped: false
}, 'existing skill XP participates in threshold crossing');
exact(P.addSkillXp({ level: 1, xp: 0 }, 2114), {
  value: { level: 6, xp: 17 },
  levelsGained: [2, 3, 4, 5, 6],
  capped: false
}, 'skill XP carries through multiple levels with a literal remainder');
exact(P.addSkillXp({ level: 98, xp: 0 }, 191944), {
  value: { level: 98, xp: 191944 },
  levelsGained: [],
  capped: false
}, 'skill level 98 remains below its exact cap threshold');
exact(P.addSkillXp({ level: 98, xp: 0 }, 191945), {
  value: { level: 99, xp: 0 },
  levelsGained: [99],
  capped: true
}, 'skill level 98 reaches a clean level-99 cap');
exact(P.addSkillXp({ level: 99, xp: 999 }, 50), {
  value: { level: 99, xp: 0 },
  levelsGained: [],
  capped: true
}, 'already capped skill progress always has zero XP');

exact(P.addMasteryXp({ level: 1, xp: 0 }, 49.999), {
  value: { level: 1, xp: 49 },
  levelsGained: [],
  capped: false
}, 'incoming mastery XP is rounded down');
exact(P.addMasteryXp({ level: 1, xp: 0 }, 50), {
  value: { level: 2, xp: 0 },
  levelsGained: [2],
  capped: false
}, 'mastery XP crosses an exact threshold');
exact(P.addMasteryXp({ level: 1, xp: 0 }, 335), {
  value: { level: 6, xp: 17 },
  levelsGained: [2, 3, 4, 5, 6],
  capped: false
}, 'mastery XP carries through multiple levels with a literal remainder');
exact(P.addMasteryXp({ level: 98, xp: 0 }, 2972474), {
  value: { level: 98, xp: 2972474 },
  levelsGained: [],
  capped: false
}, 'mastery level 98 remains below its exact cap threshold');
exact(P.addMasteryXp({ level: 98, xp: 0 }, 2972475), {
  value: { level: 99, xp: 0 },
  levelsGained: [99],
  capped: true
}, 'mastery level 98 reaches a clean level-99 cap');

for (const addXp of [P.addSkillXp, P.addMasteryXp]) {
  const label = addXp === P.addSkillXp ? 'skill' : 'mastery';
  for (const invalid of [NaN, -1, -Infinity, Infinity, '50', null, undefined]) {
    exact(addXp({ level: 2, xp: 7 }, invalid), {
      value: { level: 2, xp: 7 },
      levelsGained: [],
      capped: false
    }, label + ' rejects invalid XP safely: ' + String(invalid));
  }
  exact(addXp({ level: NaN, xp: NaN }, 0), {
    value: { level: 1, xp: 0 },
    levelsGained: [],
    capped: false
  }, label + ' sanitizes invalid progress');
  const extreme = addXp({ level: 1, xp: 0 }, Number.MAX_VALUE);
  ok(extreme.value.level === 99
    && extreme.value.xp === 0
    && extreme.levelsGained.length === 98
    && extreme.capped === true,
  label + ' handles extreme finite XP without an unbounded loop');
}

const frozenSkillInput = Object.freeze({
  level: 1,
  xp: 10,
  nested: Object.freeze({ keep: true })
});
const frozenSkillBefore = JSON.stringify(frozenSkillInput);
const firstSkillGain = P.addSkillXp(frozenSkillInput, 40);
const secondSkillGain = P.addSkillXp(frozenSkillInput, 40);
ok(JSON.stringify(frozenSkillInput) === frozenSkillBefore,
  'skill gain deeply preserves its frozen input');
ok(firstSkillGain !== secondSkillGain
  && firstSkillGain.value !== secondSkillGain.value
  && firstSkillGain.levelsGained !== secondSkillGain.levelsGained,
'skill gain returns a fresh result tree each time');
const frozenMasteryInput = Object.freeze({
  level: 2,
  xp: 3,
  nested: Object.freeze({ keep: true })
});
const frozenMasteryBefore = JSON.stringify(frozenMasteryInput);
P.addMasteryXp(frozenMasteryInput, 7);
ok(JSON.stringify(frozenMasteryInput) === frozenMasteryBefore,
  'mastery gain deeply preserves its frozen input');
noThrow(() => P.addSkillXp(Object.freeze({ level: 1, xp: 0 }), 1),
  'skill gain accepts a frozen progress record');
noThrow(() => P.addMasteryXp(Object.freeze({ level: 1, xp: 0 }), 1),
  'mastery gain accepts a frozen progress record');

const bonusCases = [
  [1, 0, 0, 0],
  [9, 0, 0, 0.01],
  [10, 0.01, 0.02, 0.02],
  [19, 0.01, 0.02, 0.03],
  [20, 0.02, 0.04, 0.04],
  [89, 0.08, 0.16, 0.17],
  [90, 0.09, 0.18, 0.18],
  [98, 0.09, 0.18, 0.19],
  [99, 0.09, 0.18, 0.19]
];
bonusCases.forEach(([level, skillSpeed, masterySpeed, yieldChance]) => {
  ok(P.skillSpeedBonus(level) === skillSpeed,
    'skill speed step is exact at level ' + level);
  ok(P.masterySpeedBonus(level) === masterySpeed,
    'mastery speed step is exact at level ' + level);
  ok(P.masteryYieldOrRetentionChance(level) === yieldChance,
    'mastery yield/retention step is exact at level ' + level);
});
ok(P.skillSpeedBonus(Number.MAX_VALUE) === 0.09
  && P.masterySpeedBonus(Number.MAX_VALUE) === 0.18
  && P.masteryYieldOrRetentionChance(Number.MAX_VALUE) === 0.19,
'progression bonuses cap for extreme finite levels');
ok(P.skillSpeedBonus(NaN) === 0
  && P.masterySpeedBonus(-20) === 0
  && P.masteryYieldOrRetentionChance('99') === 0,
'progression bonuses safely normalize invalid levels');

ok(P.effectiveDuration(10, 1, 1) === 10,
  'level 1 has no speed bonus');
ok(P.effectiveDuration(10, 99, 99) === 7.462,
  'combined speed formula is rounded to exactly three decimals');
ok(P.effectiveDuration(0.4, 99, 99) === 0.5,
  'effective duration has a 0.5-second lower bound');
ok(P.effectiveDuration(-10, 99, 99) === 0.5,
  'negative base duration safely uses the lower bound');
ok(P.effectiveDuration(NaN, 99, 99) === 0.5
  && P.effectiveDuration(Infinity, 99, 99) === 0.5,
'non-finite base duration safely uses the lower bound');
ok(Number.isFinite(P.effectiveDuration(Number.MAX_VALUE, 99, 99))
  && P.effectiveDuration(Number.MAX_VALUE, 99, 99) >= 0.5,
'extreme finite base duration remains finite');
ok(P.effectiveDuration(10, NaN, -1) === 10,
  'invalid progression levels contribute no duration bonus');
ok(P.effectiveDuration(1.23456, 1, 1) === 1.235,
  'effective duration uses stable three-decimal rounding');

const rejectedSources = [
  undefined,
  null,
  {},
  { source: 'gathering' },
  { source: 'Social' },
  { source: ' social ' },
  { source: new String('social') },
  Object.create({ source: 'social' })
];
rejectedSources.forEach((context, index) => {
  const rejected = P.gainCharmXp({ level: 1, xp: 0 }, 50, context);
  exact(rejected, {
    ok: false,
    code: 'charm_social_only',
    value: { level: 1, xp: 0 },
    levelsGained: [],
    capped: false
  }, 'charm rejects non-explicit social source #' + index);
});
const throwingSource = {};
Object.defineProperty(throwingSource, 'source', {
  enumerable: true,
  get() {
    throw new Error('must not invoke');
  }
});
noThrow(() => {
  const rejected = P.gainCharmXp(
    { level: 1, xp: 0 },
    50,
    throwingSource
  );
  ok(rejected.ok === false && rejected.code === 'charm_social_only',
    'charm rejects an accessor-based source');
}, 'charm source validation does not invoke an adversarial accessor');

const accepted = P.gainCharmXp(
  Object.freeze({ level: 1, xp: 0 }),
  50,
  Object.freeze({ source: 'social' })
);
exact(accepted, {
  ok: true,
  code: 'ok',
  value: { level: 2, xp: 0 },
  levelsGained: [2],
  capped: false
}, 'social charm XP is accepted through the shared skill curve');
ok(!Object.prototype.hasOwnProperty.call(accepted.value, 'mastery'),
  'charm progress never creates mastery');
exact(P.gainCharmXp({ level: 2, xp: 7 }, -1, { source: 'social' }), {
  ok: true,
  code: 'ok',
  value: { level: 2, xp: 7 },
  levelsGained: [],
  capped: false
}, 'social charm gain safely rejects negative XP without progress');
const cappedCharm = P.gainCharmXp(
  { level: 98, xp: 0 },
  Number.MAX_VALUE,
  { source: 'social', unrelated: { keep: true } }
);
ok(cappedCharm.ok
  && cappedCharm.value.level === 99
  && cappedCharm.value.xp === 0
  && cappedCharm.capped,
'social charm XP safely handles an extreme finite amount');

const charmCases = [
  [1, 1, 0],
  [9, 1.04, 0.024],
  [10, 1.045, 0.027],
  [19, 1.09, 0.054],
  [20, 1.095, 0.057],
  [89, 1.44, 0.264],
  [90, 1.445, 0.267],
  [98, 1.485, 0.291],
  [99, 1.49, 0.294]
];
charmCases.forEach(([level, positive, reduction]) => {
  exact(P.charmBenefits(level), {
    positiveRelationMultiplier: positive,
    misunderstandingReduction: reduction
  }, 'charm benefits are exact at level ' + level);
});
exact(P.charmBenefits(Number.MAX_VALUE), {
  positiveRelationMultiplier: 1.49,
  misunderstandingReduction: 0.294
}, 'charm benefits cap at level 99 for extreme finite levels');
exact(P.charmBenefits(NaN), {
  positiveRelationMultiplier: 1,
  misunderstandingReduction: 0
}, 'invalid charm level safely normalizes to level 1');
const benefitsA = P.charmBenefits(20);
const benefitsB = P.charmBenefits(20);
ok(benefitsA !== benefitsB,
  'charm benefits return a fresh record on each call');

const sourceCode = fs.readFileSync('core/skill-progression.js', 'utf8');
const forbiddenProductionPatterns = [
  [/\bMath\.random\s*\(/, 'Math.random'],
  [/\bdocument\b/, 'DOM document'],
  [/\bCanvas\b|getContext\s*\(/, 'Canvas'],
  [/\blocalStorage\b|\bSaveSystem\b/, 'save side effect'],
  [/\bset(?:Timeout|Interval)\s*\(/, 'timer side effect']
];
for (const [pattern, label] of forbiddenProductionPatterns) {
  ok(!pattern.test(sourceCode),
    'progression module has no ' + label + ' dependency');
}

const browserSandbox = {};
browserSandbox.globalThis = browserSandbox;
vm.createContext(browserSandbox);
vm.runInContext(sourceCode, browserSandbox, {
  filename: 'core/skill-progression.js'
});
ok(typeof browserSandbox.SkillProgression === 'object',
  'UMD module exposes the browser SkillProgression global');
ok(Object.isFrozen(browserSandbox.SkillProgression),
  'browser SkillProgression API is frozen');
exact(Object.keys(browserSandbox).sort(), [
  'SkillProgression',
  'globalThis'
], 'browser UMD does not leak implementation helpers');
exact(Object.keys(browserSandbox.SkillProgression).sort(),
  Object.keys(P).sort(),
  'browser and CommonJS expose the same progression functions');
ok(browserSandbox.SkillProgression.effectiveDuration(10, 99, 99) === 7.462,
  'browser UMD executes the same stable duration rule');

const pureInput = { level: 5, xp: 11, nested: { keep: true } };
const pureBefore = JSON.stringify(pureInput);
const pureOne = P.addSkillXp(pureInput, 100);
const pureTwo = P.addSkillXp(pureInput, 100);
exact(pureOne, pureTwo, 'same progression input produces the same output');
ok(JSON.stringify(pureInput) === pureBefore,
  'same progression input remains unchanged after repeated calls');

console.log('\n=== Stage 2 技能成长自测：' +
  pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
