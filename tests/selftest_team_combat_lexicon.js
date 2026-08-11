'use strict';

const CombatLexicon = require('../content/combat-lexicon.js');
const CombatContent = require('../content/combat.js');
const TechniqueContent = require('../content/techniques.js');

let pass = 0;
function ok(value, message) {
  if (!value) throw new Error(message);
  pass++;
}

[
  'damage', 'heal', 'shield', 'control', 'buff', 'debuff',
  'cleanse', 'qiRestore', 'summon', 'protect', 'threat', 'ailment'
].forEach(function (tag) {
  ok(CombatLexicon.isFunctionTag(tag), 'function tag exists: ' + tag);
});

[
  'sword', 'body', 'dan', 'talisman', 'array', 'beast', 'soul',
  'thunder', 'fire', 'ice', 'poison', 'wood', 'water', 'earth', 'metal'
].forEach(function (tag) {
  ok(CombatLexicon.isStyleTag(tag), 'style tag exists: ' + tag);
});

[
  'self', 'randomEnemy', 'highestThreatEnemy', 'lowestHpEnemy',
  'allEnemies', 'randomAlly', 'lowestHpAlly', 'allAllies',
  'protectedAlly', 'summonFirst', 'bossFirst'
].forEach(function (rule) {
  ok(CombatLexicon.isTargetRule(rule), 'target rule exists: ' + rule);
});

[
  'stun', 'slow', 'silence', 'root', 'poison', 'burn', 'bleed',
  'armorBreak', 'weakness', 'vulnerable', 'healBlock',
  'guard', 'haste', 'focus', 'regen', 'taunt', 'intercept'
].forEach(function (statusId) {
  const status = CombatLexicon.getStatus(statusId);
  ok(status && status.id === statusId, 'status is registered: ' + statusId);
  ok(['control', 'ailment', 'debuff', 'buff', 'protect'].indexOf(status.kind) >= 0,
    'status kind is valid: ' + statusId);
});

Object.keys(CombatContent.REGIONS).forEach(function (regionId) {
  const region = CombatContent.getRegion(regionId);
  ok(CombatLexicon.getDangerLevel(region.dangerLevel),
    'region has valid danger level: ' + regionId);
});

Object.keys(CombatContent.DUNGEONS).forEach(function (dungeonId) {
  const dungeon = CombatContent.getDungeon(dungeonId);
  ok(CombatLexicon.getDangerLevel(dungeon.dangerLevel),
    'dungeon has valid danger level: ' + dungeonId);
});

TechniqueContent.list().forEach(function (technique) {
  ok(Array.isArray(technique.functionTags) && technique.functionTags.length > 0,
    'technique has function tags: ' + technique.id);
  ok(Array.isArray(technique.styleTags), 'technique has style tags: ' + technique.id);
  technique.functionTags.forEach(function (tag) {
    ok(CombatLexicon.isFunctionTag(tag), 'valid function tag: ' + technique.id + ':' + tag);
  });
  technique.styleTags.forEach(function (tag) {
    ok(CombatLexicon.isStyleTag(tag), 'valid style tag: ' + technique.id + ':' + tag);
  });
  ok(CombatLexicon.isTargetRule(technique.targetRule),
    'technique has valid target rule: ' + technique.id);
});

console.log('team combat lexicon selftest passed: ' + pass);
