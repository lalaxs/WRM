(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.CombatLexicon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return value;
  }

  const FUNCTION_TAGS = deepFreeze([
    'damage', 'heal', 'shield', 'control', 'buff', 'debuff',
    'cleanse', 'qiRestore', 'summon', 'protect', 'threat', 'ailment'
  ]);

  const STYLE_TAGS = deepFreeze([
    'sword', 'body', 'dan', 'talisman', 'array', 'beast', 'soul',
    'thunder', 'fire', 'ice', 'poison', 'wood', 'water', 'earth', 'metal'
  ]);

  const TARGET_RULES = deepFreeze([
    'self', 'randomEnemy', 'highestThreatEnemy', 'lowestHpEnemy',
    'allEnemies', 'randomAlly', 'lowestHpAlly', 'allAllies',
    'protectedAlly', 'summonFirst', 'bossFirst'
  ]);

  const DANGER_LEVELS = deepFreeze({
    safe: { id: 'safe', order: 0, lifespanOnDown: false, lifespanOnDefeat: false },
    perilous: { id: 'perilous', order: 1, lifespanOnDown: false, lifespanOnDefeat: true },
    deathTrial: { id: 'deathTrial', order: 2, lifespanOnDown: true, lifespanOnDefeat: true },
    desperate: { id: 'desperate', order: 3, lifespanOnDown: true, lifespanOnDefeat: true }
  });

  const STAT_KEYS = deepFreeze([
    'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
    'critChance', 'critDamage', 'actionIntervalTicks',
    'damageReduction', 'healingPower', 'healingTaken', 'shieldPower',
    'qiRegen', 'controlAccuracy', 'controlResistance', 'ailmentPower',
    'ailmentResistance', 'cleansePower', 'threatGain', 'protectionWeight'
  ]);

  const STATUS_DEFINITIONS = deepFreeze({
    stun: { id: 'stun', kind: 'control', stack: 'refresh' },
    slow: { id: 'slow', kind: 'control', stack: 'refresh' },
    silence: { id: 'silence', kind: 'control', stack: 'refresh' },
    root: { id: 'root', kind: 'control', stack: 'refresh' },
    poison: { id: 'poison', kind: 'ailment', stack: 'intensity' },
    burn: { id: 'burn', kind: 'ailment', stack: 'intensity' },
    bleed: { id: 'bleed', kind: 'ailment', stack: 'intensity' },
    armorBreak: { id: 'armorBreak', kind: 'debuff', stack: 'refresh' },
    weakness: { id: 'weakness', kind: 'debuff', stack: 'refresh' },
    vulnerable: { id: 'vulnerable', kind: 'debuff', stack: 'refresh' },
    healBlock: { id: 'healBlock', kind: 'debuff', stack: 'refresh' },
    guard: { id: 'guard', kind: 'buff', stack: 'refresh' },
    haste: { id: 'haste', kind: 'buff', stack: 'refresh' },
    focus: { id: 'focus', kind: 'buff', stack: 'refresh' },
    regen: { id: 'regen', kind: 'buff', stack: 'refresh' },
    taunt: { id: 'taunt', kind: 'protect', stack: 'refresh' },
    intercept: { id: 'intercept', kind: 'protect', stack: 'refresh' }
  });

  function has(list, value) { return list.indexOf(value) >= 0; }

  return Object.freeze({
    FUNCTION_TAGS: FUNCTION_TAGS,
    STYLE_TAGS: STYLE_TAGS,
    TARGET_RULES: TARGET_RULES,
    DANGER_LEVELS: DANGER_LEVELS,
    STAT_KEYS: STAT_KEYS,
    STATUS_DEFINITIONS: STATUS_DEFINITIONS,
    isFunctionTag: function (tag) { return has(FUNCTION_TAGS, tag); },
    isStyleTag: function (tag) { return has(STYLE_TAGS, tag); },
    isTargetRule: function (rule) { return has(TARGET_RULES, rule); },
    getDangerLevel: function (id) { return DANGER_LEVELS[id] || null; },
    getStatus: function (id) { return STATUS_DEFINITIONS[id] || null; }
  });
});
