# Team Combat Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first testable 4-person team-combat foundation: NPC fixed combat profiles, party selection, team snapshots, deterministic 4v1-4 combat, danger-level lifespan consequences, relationship cooperation effects, and vertical battle UI data.

**Architecture:** Add team combat beside the existing Stage 3 single-combat modules first, then route combat sessions through the team shape once pure tests pass. Core modules remain pure CommonJS/UMD units; `game.js` only wires commands and query view models; `ui.js` renders the already-shaped view. NPCs use fixed combat profiles on their records, not real inventories.

**Tech Stack:** Native JavaScript, existing UMD browser globals and CommonJS Node selftests, existing DOM/CSS UI, no new dependencies, existing `npm test` and focused `node selftest_*.js` scripts.

## Global Constraints

- Root source is authoritative; `release/` is generated only by `npm run sync-release`.
- Core modules under `core/` and content modules under `content/` must not access DOM, Canvas, `Platform`, `SaveSystem`, localStorage, toast, timers, or `Math.random()`.
- Online and offline combat must use the same deterministic simulation path and saved `rngState`.
- NPCs have no real inventory. NPC equipment, techniques, and supply strategy are fixed NPC configuration data, generated or updated by events.
- The player cannot directly edit NPC equipment, techniques, or supplies.
- There is no career or fixed-role field. Output, healing, protection, and support tendencies are inferred from technique function tags.
- High-risk areas do not ask for confirmation and do not block entry. They may create unwillingness or anxiety reactions that reduce affection or related relationship metrics.
- Affection and relationship quality may affect team cooperation efficiency.
- Lifespan loss applies only to fallen participants according to danger level.
- Existing breakthrough chance boundaries stay unchanged: equipment, techniques, relationships, sects, and team cooperation must not directly modify breakthrough probability.

---

## File Structure

Create:

- `content/combat-lexicon.js` - canonical combat tags, status definitions, target rules, stat keys, and danger levels.
- `core/npc-combat-config.js` - normalize and mutate NPC fixed combat profiles without inventories.
- `core/combat-party.js` - manage selected companion IDs, invitation eligibility, cooperation multipliers, and high-risk reactions.
- `core/team-combat-snapshot.js` - build immutable team combat sessions from player loadout, NPC fixed profiles, enemies, and party state.
- `core/team-combat-engine.js` - deterministic 4v1-4 tick engine with unit action bars, targeting, threat, statuses, falling, and revive-like rescue.
- `core/team-combat-consequences.js` - danger-level consequences, lifespan loss, injury/fatigue records, and relationship reaction deltas.
- `selftest_team_combat_lexicon.js`
- `selftest_npc_combat_config.js`
- `selftest_combat_party.js`
- `selftest_team_combat_snapshot.js`
- `selftest_team_combat_engine.js`
- `selftest_team_combat_integration.js`
- `selftest_team_combat_ui.js`

Modify:

- `content/combat.js` - add `dangerLevel` and enemy formation metadata while preserving existing region/dungeon IDs.
- `content/techniques.js` - add dual tags and target rule metadata while preserving existing `tags`, `effect`, and book IDs.
- `core/stage4-state.js` - normalize `systems.teamCombat` and NPC `combatProfile`.
- `core/stage3-rules.js` - route combat sessions through the team-combat engine once sessions are in `teams` shape.
- `core/combat-progress.js` - handle team victory, team defeat, multi-enemy waves, and danger-level results.
- `game.js` - load new modules, add party commands/queries, and shape active battle view data.
- `ui.js` - render vertical enemy-over-ally battle layout from query data.
- `styles.css` - add vertical team battle styles.
- `selftest_all.js` - include the new focused selftests.

---

### Task 1: Combat Lexicon And Content Metadata

**Files:**
- Create: `content/combat-lexicon.js`
- Modify: `content/combat.js`
- Modify: `content/techniques.js`
- Test: `selftest_team_combat_lexicon.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces: `CombatLexicon.getStatus(statusId) -> object|null`
- Produces: `CombatLexicon.getDangerLevel(levelId) -> object|null`
- Produces: `CombatLexicon.isFunctionTag(tag) -> boolean`
- Produces: `CombatLexicon.isStyleTag(tag) -> boolean`
- Produces: `CombatLexicon.isTargetRule(ruleId) -> boolean`
- Produces: `CombatContent.getRegion(id).dangerLevel`
- Produces: `CombatContent.getDungeon(id).dangerLevel`
- Produces: each technique row has `functionTags: string[]`, `styleTags: string[]`, and `targetRule: string`

- [ ] **Step 1: Write the failing lexicon/content test**

Add `selftest_team_combat_lexicon.js`:

```js
'use strict';

const CombatLexicon = require('./content/combat-lexicon.js');
const CombatContent = require('./content/combat.js');
const TechniqueContent = require('./content/techniques.js');

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
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_team_combat_lexicon.js`

Expected: FAIL with `Cannot find module './content/combat-lexicon.js'`.

- [ ] **Step 3: Add the lexicon module**

Create `content/combat-lexicon.js` with this public shape:

```js
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
```

- [ ] **Step 4: Annotate combat and technique content**

Modify `content/combat.js`:

```js
regions[seed.region.id] = {
  id: seed.region.id,
  name: seed.region.name,
  tier: seed.tier,
  dangerLevel: seed.tier <= 2 ? 'safe' : (seed.tier <= 6 ? 'perilous' : 'deathTrial'),
  requiredRealmIndex: seed.requiredRealmIndex,
  enemyIds: seed.normalEnemyIds.slice(),
  formations: seed.normalEnemyIds.map(function (enemyId) {
    return { enemyIds: [enemyId] };
  })
};
```

Modify the dungeon row in `content/combat.js`:

```js
dungeons[seed.dungeon.id] = {
  id: seed.dungeon.id,
  name: seed.dungeon.name,
  tier: seed.tier,
  dangerLevel: seed.tier <= 1 ? 'safe' : (seed.tier <= 7 ? 'perilous' : 'deathTrial'),
  regionId: seed.region.id,
  requiredRealmIndex: seed.requiredRealmIndex,
  requiredDungeonId: seed.requiredDungeonId,
  waves: [
    { enemyIds: [seed.normalEnemyIds[0]], enemyId: seed.normalEnemyIds[0], count: 2 },
    { enemyIds: [seed.normalEnemyIds[1]], enemyId: seed.normalEnemyIds[1], count: 2 },
    { enemyIds: [seed.eliteId], enemyId: seed.eliteId, count: 1 },
    { enemyIds: [seed.bossId], enemyId: seed.bossId, count: 1 }
  ],
  firstClearRewards: { items: firstClearItems },
  repeatLootTableId: 'boss:' + seed.tier
};
```

Modify each `define()` call in `content/techniques.js` by extending `define` to accept function/style tags and target rule while preserving the old `tags` field:

```js
function define(records, id, name, kind, tier, tags, requiredRealmIndex,
  qiCost, cooldownTicks, effect, runeCost, functionTags, styleTags, targetRule) {
  records[id] = {
    id: id,
    name: name,
    kind: kind,
    tier: tier,
    tags: tags,
    functionTags: functionTags || legacyFunctionTags(effect),
    styleTags: styleTags || legacyStyleTags(tags),
    targetRule: targetRule || legacyTargetRule(effect),
    requiredRealmIndex: requiredRealmIndex,
    bookItemId: 'techniqueBook:' + id,
    qiCost: qiCost,
    cooldownTicks: cooldownTicks,
    effect: effect
  };
  if (runeCost && typeof runeCost === 'object') records[id].runeCost = runeCost;
}
```

Add helpers in the same file:

```js
function legacyFunctionTags(effect) {
  if (!effect || typeof effect !== 'object') return ['buff'];
  if (effect.type === 'heal') return ['heal'];
  if (effect.type === 'restoreQi') return ['qiRestore'];
  if (effect.supplyHealingBonus) return ['buff', 'heal'];
  if (effect.activeBeastEffectBonus) return ['buff'];
  if (effect.defensePercent || effect.maxQiPercent || effect.attackIntervalReduction) return ['buff'];
  if (effect.type === 'attack' && effect.status) return ['damage', 'control'];
  if (effect.type === 'attack') return ['damage'];
  return ['buff'];
}

function legacyStyleTags(tags) {
  const mapping = {
    fist: 'body',
    spirit: 'soul',
    healing: 'dan',
    qi: 'dan',
    movement: 'body',
    pill: 'dan'
  };
  return (Array.isArray(tags) ? tags : []).map(function (tag) {
    return mapping[tag] || tag;
  }).filter(function (tag, index, list) {
    return list.indexOf(tag) === index;
  });
}

function legacyTargetRule(effect) {
  if (!effect || effect.type === 'heal' || effect.type === 'restoreQi') return 'self';
  return effect.type === 'attack' ? 'highestThreatEnemy' : 'self';
}
```

- [ ] **Step 5: Run focused test and update aggregate test list**

Run: `node selftest_team_combat_lexicon.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_team_combat_lexicon.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content/combat-lexicon.js content/combat.js content/techniques.js selftest_team_combat_lexicon.js selftest_all.js
git commit -m "feat: add team combat lexicon"
```

---

### Task 2: NPC Fixed Combat Profiles In State

**Files:**
- Modify: `core/stage4-state.js`
- Create: `selftest_npc_combat_config.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces on every NPC record: `combatProfile`
- `combatProfile.preferenceTags: string[]`
- `combatProfile.equipment: {weapon:null|object, armor:null|object, accessory:null|object}`
- `combatProfile.activeTechniques: Array<{techniqueId:string, level:number, condition:{type:string}}>`
- `combatProfile.passiveTechniques: Array<{techniqueId:string, level:number}>`
- `combatProfile.supplies: {food:null|object, pill:null|object, talisman:null|object}`
- `combatProfile.sourceEvents: string[]`

- [ ] **Step 1: Write the failing state normalization test**

Create `selftest_npc_combat_config.js`:

```js
'use strict';

const Stage4State = require('./core/stage4-state.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const model = Stage4State.normalize({
  player: {},
  systems: {
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '青岚' },
          realmStage: 4,
          techniques: ['cloudPiercingSword'],
          combatProfile: {
            preferenceTags: ['heal', 'wood', 'constructor'],
            equipment: {
              weapon: { id: 'npc-weapon-1', name: '青木短剑', tags: ['wood'], stats: { attack: 7 } }
            },
            activeTechniques: [
              { techniqueId: 'clearHeartArt', level: 3, condition: { type: 'allyHpBelow', threshold: 0.55 } }
            ],
            passiveTechniques: [
              { techniqueId: 'steadyBreath', level: 2 }
            ],
            supplies: {
              food: { id: 'npc-food-1', label: '随身灵膳', heal: 20, triggerRatio: 0.5 }
            },
            sourceEvents: ['event-a', 'event-a', '__proto__']
          }
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    }
  }
}, { preserveLegacyFields: true });

const npc = model.systems.npcs.records['npc-1'];
ok(npc.combatProfile, 'npc combat profile is normalized');
ok(npc.combatProfile.preferenceTags.indexOf('heal') >= 0, 'valid preference tag retained');
ok(npc.combatProfile.preferenceTags.indexOf('constructor') < 0, 'unsafe preference tag removed');
ok(npc.combatProfile.equipment.weapon.id === 'npc-weapon-1', 'weapon profile retained');
ok(npc.combatProfile.equipment.armor === null, 'missing armor becomes null');
ok(npc.combatProfile.activeTechniques[0].techniqueId === 'clearHeartArt', 'active technique retained');
ok(npc.combatProfile.activeTechniques[0].condition.type === 'allyHpBelow', 'npc condition retained');
ok(npc.combatProfile.passiveTechniques[0].level === 2, 'passive level retained');
ok(npc.combatProfile.supplies.food.triggerRatio === 0.5, 'fixed supply strategy retained');
ok(npc.combatProfile.sourceEvents.length === 1, 'source events deduplicate unsafe ids');

const fallback = Stage4State.normalize({
  systems: {
    npcs: {
      records: { 'npc-2': { identity: { name: '无配置' } } },
      activeIds: ['npc-2'],
      backgroundIds: []
    }
  }
}, { preserveLegacyFields: true }).systems.npcs.records['npc-2'];

ok(Array.isArray(fallback.combatProfile.preferenceTags), 'fallback profile exists');
ok(fallback.combatProfile.equipment.weapon === null, 'fallback weapon null');
ok(fallback.combatProfile.activeTechniques.length === 0, 'fallback has no fake active technique');

console.log('npc combat profile normalization selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_npc_combat_config.js`

Expected: FAIL with `npc combat profile is normalized`.

- [ ] **Step 3: Add combat profile normalization to `core/stage4-state.js`**

Add constants near existing ID lists:

```js
const NPC_COMBAT_TAGS = Object.freeze([
  'damage', 'heal', 'shield', 'control', 'buff', 'debuff',
  'cleanse', 'qiRestore', 'summon', 'protect', 'threat', 'ailment',
  'sword', 'body', 'dan', 'talisman', 'array', 'beast', 'soul',
  'thunder', 'fire', 'ice', 'poison', 'wood', 'water', 'earth', 'metal'
]);
const NPC_CONDITION_TYPES = Object.freeze([
  'always', 'selfHpBelow', 'selfQiAbove', 'allyHpBelow',
  'enemyHpBelow', 'enemyHasStatus', 'selfMissingBuff'
]);
```

Add helpers before `normalizeNpc`:

```js
function safePublicId(value, fallback) {
  return typeof value === 'string' &&
    /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : fallback;
}

function normalizeNpcStats(value) {
  const result = {};
  const source = isRecord(value) ? value : {};
  [
    'maxHp', 'maxQi', 'attack', 'defense', 'accuracy', 'evasion',
    'critChance', 'critDamage', 'actionIntervalTicks',
    'damageReduction', 'healingPower', 'healingTaken', 'shieldPower',
    'qiRegen', 'controlAccuracy', 'controlResistance', 'ailmentPower',
    'ailmentResistance', 'cleansePower', 'threatGain', 'protectionWeight'
  ].forEach(function (key) {
    const amount = dataValue(source, key);
    if (Number.isFinite(amount)) define(result, key, amount);
  });
  return result;
}

function normalizeNpcEquipmentSlot(value) {
  if (!isRecord(value)) return null;
  return {
    id: safePublicId(dataValue(value, 'id'), 'npc-gear'),
    name: cleanString(dataValue(value, 'name'), '随身法器'),
    tags: sortedUniqueStrings(dataValue(value, 'tags')).filter(function (tag) {
      return NPC_COMBAT_TAGS.indexOf(tag) >= 0;
    }),
    stats: normalizeNpcStats(dataValue(value, 'stats'))
  };
}

function normalizeNpcCondition(value) {
  const source = isRecord(value) ? value : {};
  const type = NPC_CONDITION_TYPES.indexOf(dataValue(source, 'type')) >= 0
    ? dataValue(source, 'type')
    : 'always';
  if (type === 'selfHpBelow' || type === 'selfQiAbove' ||
      type === 'allyHpBelow' || type === 'enemyHpBelow') {
    return {
      type: type,
      threshold: finiteNumber(dataValue(source, 'threshold'), 0.5, 0.01, 1)
    };
  }
  if (type === 'enemyHasStatus') {
    return { type: type, statusId: safePublicId(dataValue(source, 'statusId'), 'stun') };
  }
  if (type === 'selfMissingBuff') {
    return { type: type, buffId: safePublicId(dataValue(source, 'buffId'), 'guard') };
  }
  return { type: 'always' };
}

function normalizeNpcTechniqueSlot(value) {
  if (!isRecord(value)) return null;
  const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
  if (!techniqueId) return null;
  return {
    techniqueId: techniqueId,
    level: finiteInteger(dataValue(value, 'level'), 1, 1, 20),
    condition: normalizeNpcCondition(dataValue(value, 'condition'))
  };
}

function normalizeNpcPassiveSlot(value) {
  if (!isRecord(value)) return null;
  const techniqueId = safePublicId(dataValue(value, 'techniqueId'), null);
  if (!techniqueId) return null;
  return {
    techniqueId: techniqueId,
    level: finiteInteger(dataValue(value, 'level'), 1, 1, 20)
  };
}

function normalizeNpcSupply(value) {
  if (!isRecord(value)) return null;
  return {
    id: safePublicId(dataValue(value, 'id'), 'npc-supply'),
    label: cleanString(dataValue(value, 'label'), '随身补给'),
    heal: finiteNumber(dataValue(value, 'heal'), 0, 0),
    restoreQi: finiteNumber(dataValue(value, 'restoreQi'), 0, 0),
    shieldMaxHpRatio: finiteNumber(dataValue(value, 'shieldMaxHpRatio'), 0, 0, 1),
    triggerRatio: finiteNumber(dataValue(value, 'triggerRatio'), 0.5, 0.05, 0.95)
  };
}

function normalizeNpcCombatProfile(value) {
  const source = isRecord(value) ? value : {};
  const preferenceTags = sortedUniqueStrings(dataValue(source, 'preferenceTags'))
    .filter(function (tag) { return NPC_COMBAT_TAGS.indexOf(tag) >= 0; });
  return {
    preferenceTags: preferenceTags,
    equipment: {
      weapon: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'weapon')),
      armor: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'armor')),
      accessory: normalizeNpcEquipmentSlot(dataValue(dataValue(source, 'equipment'), 'accessory'))
    },
    activeTechniques: jsonArray(dataValue(source, 'activeTechniques'))
      .map(normalizeNpcTechniqueSlot).filter(Boolean).slice(0, 4),
    passiveTechniques: jsonArray(dataValue(source, 'passiveTechniques'))
      .map(normalizeNpcPassiveSlot).filter(Boolean).slice(0, 3),
    supplies: {
      food: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'food')),
      pill: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'pill')),
      talisman: normalizeNpcSupply(dataValue(dataValue(source, 'supplies'), 'talisman'))
    },
    sourceEvents: sortedUniqueStrings(dataValue(source, 'sourceEvents'))
      .filter(function (id) { return safePublicId(id, null) === id; })
      .slice(0, 20)
  };
}
```

Add to the returned NPC record inside `normalizeNpc`:

```js
combatProfile: normalizeNpcCombatProfile(dataValue(source, 'combatProfile')),
```

- [ ] **Step 4: Run focused and aggregate tests**

Run: `node selftest_npc_combat_config.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_npc_combat_config.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/stage4-state.js selftest_npc_combat_config.js selftest_all.js
git commit -m "feat: persist npc combat profiles"
```

---

### Task 3: NPC Profile Events And Party Selection

**Files:**
- Create: `core/npc-combat-config.js`
- Create: `core/combat-party.js`
- Modify: `core/stage4-state.js`
- Modify: `game.js`
- Test: `selftest_combat_party.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces: `NpcCombatConfig.applyConfigEvent(model, npcId, event) -> {ok, code, state, result}`
- Produces: `NpcCombatConfig.defaultProfileForNpc(npc) -> combatProfile`
- Produces: `CombatParty.query(model) -> {slots, eligible}`
- Produces: `CombatParty.setCompanion(model, slotIndex, npcId|null, atMs) -> {ok, code, state, result}`
- Produces: `CombatParty.cooperationFor(model, npcId) -> number`
- Produces: `CombatParty.highRiskReaction(model, npcId, dangerLevel, atMs, rngState) -> {ok, code, state, rngState, result}`
- Modifies state: `systems.teamCombat = { companionIds:[null,null,null], reactionLog:[] }`
- Adds commands: `setCombatCompanion({slotIndex, npcId})`
- Adds query: `combatParty()`

- [ ] **Step 1: Write the failing party/config test**

Create `selftest_combat_party.js`:

```js
'use strict';

const Stage4State = require('./core/stage4-state.js');
const Relationships = require('./core/relationships.js');
const NpcCombatConfig = require('./core/npc-combat-config.js');
const CombatParty = require('./core/combat-party.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

function baseModel() {
  const model = Stage4State.normalize({
    player: {},
    systems: {
      npcs: {
        nextId: 3,
        records: {
          'npc-1': { identity: { name: '青岚' }, status: 'living', lifeStage: 'adult', realmStage: 4 },
          'npc-2': { identity: { name: '远客' }, status: 'living', lifeStage: 'adult', realmStage: 4 }
        },
        activeIds: ['npc-1', 'npc-2'],
        backgroundIds: []
      },
      relationships: {
        edges: {
          'player>npc-1': { affection: 72, trust: 60, romanticAttachment: 20, desire: 0, dependence: 0, loyalty: 10, jealousy: 0, resentment: 0, lastChangedAt: 0 },
          'npc-1>player': { affection: 68, trust: 55, romanticAttachment: 15, desire: 0, dependence: 0, loyalty: 10, jealousy: 0, resentment: 0, lastChangedAt: 0 }
        },
        bonds: { 'npc-1|player': { stage: 'friend', changedAt: 0, changedByEventId: 'seed' } },
        restrictions: {}
      }
    }
  }, { preserveLegacyFields: true });
  return model;
}

let model = baseModel();
ok(model.systems.teamCombat, 'team combat state exists');
ok(model.systems.teamCombat.companionIds.length === 3, 'three companion slots exist');

const query = CombatParty.query(model);
ok(query.eligible.some(function (row) { return row.npcId === 'npc-1'; }), 'friend is eligible');
ok(!query.eligible.some(function (row) { return row.npcId === 'npc-2'; }), 'stranger is not eligible');

const selected = CombatParty.setCompanion(model, 0, 'npc-1', 1000);
ok(selected.ok && selected.state.systems.teamCombat.companionIds[0] === 'npc-1',
  'eligible companion can be selected');

const rejected = CombatParty.setCompanion(model, 1, 'npc-2', 1000);
ok(!rejected.ok && rejected.code === 'not_eligible', 'ineligible companion rejected');

const event = NpcCombatConfig.applyConfigEvent(selected.state, 'npc-1', {
  id: 'gift-event-1',
  type: 'adoptTechnique',
  techniqueId: 'clearHeartArt',
  level: 2,
  preferenceTags: ['heal', 'wood']
});
ok(event.ok, 'config event accepted');
ok(event.state.systems.npcs.records['npc-1'].combatProfile.activeTechniques
  .some(function (slot) { return slot.techniqueId === 'clearHeartArt'; }),
  'event adds fixed npc technique');
ok(event.state.systems.npcs.records['npc-1'].combatProfile.sourceEvents
  .indexOf('gift-event-1') >= 0, 'event source is recorded');

const reaction = CombatParty.highRiskReaction(event.state, 'npc-1', 'deathTrial', 2000, 7);
ok(reaction.ok, 'high risk reaction returns ok');
ok(reaction.state.systems.teamCombat.reactionLog.length === 1, 'reaction is logged');
ok(reaction.result.metricDeltas.affection <= 0, 'high risk reaction does not increase affection');
ok(CombatParty.cooperationFor(reaction.state, 'npc-1') > 0, 'cooperation multiplier is calculable');

console.log('combat party selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_combat_party.js`

Expected: FAIL with `Cannot find module './core/npc-combat-config.js'`.

- [ ] **Step 3: Normalize `systems.teamCombat`**

Modify `core/stage4-state.js` defaults under `systems`:

```js
teamCombat: {
  companionIds: [null, null, null],
  reactionLog: []
},
```

Add normalizer:

```js
function normalizeTeamCombat(value, npcs) {
  const source = isRecord(value) ? value : {};
  const rawIds = Array.isArray(dataValue(source, 'companionIds'))
    ? dataValue(source, 'companionIds')
    : [];
  const companionIds = [0, 1, 2].map(function (index) {
    const id = rawIds[index];
    return typeof id === 'string' &&
      own(npcs.records, id) &&
      npcs.records[id].status === 'living'
      ? id
      : null;
  });
  const reactionLog = jsonArray(dataValue(source, 'reactionLog')).map(function (entry, index) {
    const npcId = cleanString(dataValue(entry, 'npcId'), null);
    return {
      id: cleanString(dataValue(entry, 'id'), 'team-reaction-' + (index + 1)),
      npcId: npcId && own(npcs.records, npcId) ? npcId : null,
      dangerLevel: cleanString(dataValue(entry, 'dangerLevel'), 'safe'),
      atMs: finiteNumber(dataValue(entry, 'atMs'), 0, 0),
      affectionDelta: finiteInteger(dataValue(entry, 'affectionDelta'), 0, -100, 100),
      trustDelta: finiteInteger(dataValue(entry, 'trustDelta'), 0, -100, 100)
    };
  }).filter(function (entry) {
    return entry.npcId !== null;
  }).slice(-50);
  return { companionIds: companionIds, reactionLog: reactionLog };
}
```

Call it after NPC normalization in `normalize()`:

```js
clean.systems.teamCombat = normalizeTeamCombat(
  dataValue(rawSystems, 'teamCombat'),
  npcs
);
```

- [ ] **Step 4: Implement `NpcCombatConfig`**

Create `core/npc-combat-config.js`:

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NpcCombatConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function profileOf(state, npcId) {
    const npc = state && state.systems && state.systems.npcs &&
      state.systems.npcs.records && state.systems.npcs.records[npcId];
    return npc && npc.combatProfile ? { npc: npc, profile: npc.combatProfile } : null;
  }
  function failure(code, model) {
    return { ok: false, code: code, state: model, result: null };
  }
  function success(state, result) {
    return { ok: true, code: 'ok', state: state, result: result };
  }
  function safeId(value) {
    return typeof value === 'string' &&
      /^(?!__proto__$)(?!prototype$)(?!constructor$)[A-Za-z0-9._:-]{1,128}$/.test(value)
      ? value
      : null;
  }
  function uniquePush(list, value, limit) {
    if (list.indexOf(value) < 0) list.push(value);
    while (list.length > limit) list.shift();
  }
  function defaultProfileForNpc(npc) {
    const tags = [];
    if (npc && npc.sectId === 'baicao-valley') tags.push('heal', 'dan', 'wood');
    if (npc && npc.sectId === 'taixuan-sword') tags.push('damage', 'sword');
    return {
      preferenceTags: tags,
      equipment: { weapon: null, armor: null, accessory: null },
      activeTechniques: [],
      passiveTechniques: [],
      supplies: { food: null, pill: null, talisman: null },
      sourceEvents: []
    };
  }
  function applyConfigEvent(model, npcId, event) {
    const id = safeId(npcId);
    const eventId = event && safeId(event.id);
    if (!id || !eventId || !event || typeof event !== 'object') {
      return failure('invalid_event', model);
    }
    const state = clone(model);
    const parts = profileOf(state, id);
    if (!parts) return failure('unknown_npc', model);
    const profile = parts.profile;
    if (event.type === 'adoptTechnique') {
      const techniqueId = safeId(event.techniqueId);
      if (!techniqueId) return failure('invalid_technique', model);
      const slot = {
        techniqueId: techniqueId,
        level: Math.max(1, Math.min(20, Math.floor(Number(event.level) || 1))),
        condition: { type: 'always' }
      };
      profile.activeTechniques = profile.activeTechniques.filter(function (entry) {
        return entry.techniqueId !== techniqueId;
      });
      profile.activeTechniques.unshift(slot);
      profile.activeTechniques = profile.activeTechniques.slice(0, 4);
    } else if (event.type === 'adoptEquipment') {
      const slotName = ['weapon', 'armor', 'accessory'].indexOf(event.slot) >= 0 ? event.slot : null;
      if (!slotName || !event.item || typeof event.item !== 'object') {
        return failure('invalid_equipment', model);
      }
      profile.equipment[slotName] = clone(event.item);
    } else if (event.type === 'adoptSupply') {
      const supplySlot = ['food', 'pill', 'talisman'].indexOf(event.slot) >= 0 ? event.slot : null;
      if (!supplySlot || !event.supply || typeof event.supply !== 'object') {
        return failure('invalid_supply', model);
      }
      profile.supplies[supplySlot] = clone(event.supply);
    } else {
      return failure('unknown_event_type', model);
    }
    (Array.isArray(event.preferenceTags) ? event.preferenceTags : []).forEach(function (tag) {
      if (typeof tag === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(tag)) {
        uniquePush(profile.preferenceTags, tag, 12);
      }
    });
    uniquePush(profile.sourceEvents, eventId, 20);
    return success(state, { npcId: id, sourceEventId: eventId });
  }
  return Object.freeze({
    defaultProfileForNpc: defaultProfileForNpc,
    applyConfigEvent: applyConfigEvent
  });
});
```

- [ ] **Step 5: Implement `CombatParty`**

Create `core/combat-party.js`:

```js
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./relationships.js'), require('./random.js'))
    : factory(root && root.Relationships, root && root.GameRandom);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.CombatParty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Relationships, GameRandom) {
  'use strict';

  const ELIGIBLE_STAGES = ['friend', 'lover', 'partner'];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function npc(model, npcId) {
    return model && model.systems && model.systems.npcs &&
      model.systems.npcs.records && model.systems.npcs.records[npcId] || null;
  }
  function bond(model, npcId) {
    const pair = Relationships && Relationships.queryPair
      ? Relationships.queryPair(model, 'player', npcId)
      : null;
    return pair && pair.bond ? pair.bond : null;
  }
  function edge(model, npcId) {
    const pair = Relationships && Relationships.queryPair
      ? Relationships.queryPair(model, 'player', npcId)
      : null;
    return pair && pair.firstToSecond ? pair.firstToSecond : null;
  }
  function eligible(model, npcId) {
    const person = npc(model, npcId);
    const relation = bond(model, npcId);
    return !!person && person.status === 'living' && person.lifeStage !== 'child' &&
      relation && ELIGIBLE_STAGES.indexOf(relation.stage) >= 0;
  }
  function query(model) {
    const team = model.systems.teamCombat || { companionIds: [null, null, null] };
    const ids = Object.keys(model.systems.npcs.records);
    return {
      slots: team.companionIds.map(function (npcId, slotIndex) {
        const person = npcId ? npc(model, npcId) : null;
        return { slotIndex: slotIndex, npcId: npcId, name: person ? person.identity.name : null };
      }),
      eligible: ids.filter(function (npcId) { return eligible(model, npcId); })
        .map(function (npcId) {
          const person = npc(model, npcId);
          const metrics = edge(model, npcId) || {};
          return {
            npcId: npcId,
            name: person.identity.name,
            affection: metrics.affection || 0,
            trust: metrics.trust || 0,
            stage: bond(model, npcId).stage
          };
        })
    };
  }
  function failure(code, model) {
    return { ok: false, code: code, state: model, result: null };
  }
  function setCompanion(model, slotIndex, npcId, atMs) {
    if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) {
      return failure('invalid_slot', model);
    }
    if (npcId !== null && !eligible(model, npcId)) return failure('not_eligible', model);
    const state = clone(model);
    state.systems.teamCombat.companionIds[slotIndex] = npcId;
    state.systems.teamCombat.changedAt = Number.isFinite(atMs) ? atMs : 0;
    return { ok: true, code: 'ok', state: state, result: { slotIndex: slotIndex, npcId: npcId } };
  }
  function cooperationFor(model, npcId) {
    const metrics = edge(model, npcId) || {};
    const affection = Math.max(0, Math.min(100, Number(metrics.affection) || 0));
    const trust = Math.max(0, Math.min(100, Number(metrics.trust) || 0));
    return Math.round((0.9 + (affection + trust) / 1000) * 10000) / 10000;
  }
  function highRiskReaction(model, npcId, dangerLevel, atMs, rngState) {
    if (!eligible(model, npcId)) return failure('not_eligible', model);
    const order = { safe: 0, perilous: 1, deathTrial: 2, desperate: 3 }[dangerLevel];
    if (!Number.isSafeInteger(order)) return failure('invalid_danger', model);
    const rolled = GameRandom && GameRandom.next ? GameRandom.next(rngState >>> 0) : { seed: rngState >>> 0, value: 0 };
    const metrics = edge(model, npcId) || {};
    const comfort = ((metrics.affection || 0) + (metrics.trust || 0)) / 2;
    const chance = Math.max(0, Math.min(0.95, order * 0.18 - comfort * 0.003));
    const state = clone(model);
    const triggered = order > 0 && rolled.value < chance;
    const deltas = triggered ? { affection: -2 * order, trust: -order } : { affection: 0, trust: 0 };
    state.systems.teamCombat.reactionLog.push({
      id: 'team-risk-' + (state.systems.teamCombat.reactionLog.length + 1),
      npcId: npcId,
      dangerLevel: dangerLevel,
      atMs: Number.isFinite(atMs) ? atMs : 0,
      affectionDelta: deltas.affection,
      trustDelta: deltas.trust
    });
    while (state.systems.teamCombat.reactionLog.length > 50) {
      state.systems.teamCombat.reactionLog.shift();
    }
    return {
      ok: true,
      code: triggered ? 'reaction' : 'no_change',
      state: state,
      rngState: rolled.seed,
      result: { npcId: npcId, triggered: triggered, metricDeltas: deltas }
    };
  }
  return Object.freeze({
    query: query,
    setCompanion: setCompanion,
    cooperationFor: cooperationFor,
    highRiskReaction: highRiskReaction
  });
});
```

- [ ] **Step 6: Wire query and command in `game.js`**

Add modules to the Stage 4 bootstrap section:

```js
NpcCombatConfig: require('./core/npc-combat-config.js'),
CombatParty: require('./core/combat-party.js'),
```

Add query:

```js
function queryCombatParty() {
  const model = stage4Model();
  if (!model || !stage4Bootstrap.CombatParty) {
    return readonlyQuery({ slots: [], eligible: [] });
  }
  return readonlyQuery(stage4Bootstrap.CombatParty.query(model));
}
```

Add command:

```js
function commandSetCombatCompanion(input) {
  const fields = safeInputFields(input, ['slotIndex', 'npcId']);
  if (!fields ||
      !Number.isSafeInteger(fields.slotIndex) ||
      fields.slotIndex < 0 ||
      fields.slotIndex > 2 ||
      (fields.npcId !== null && typeof fields.npcId !== 'string')) {
    return invalidStage3Argument('队伍参数无效');
  }
  return commitStage3Domain({
    domain: function (state) {
      return stage4Bootstrap.CombatParty.setCompanion(
        state,
        fields.slotIndex,
        fields.npcId,
        Date.now()
      );
    },
    successMessage: '同行队伍已更新',
    failureMessage: '设置同行队伍失败',
    saveFailureMessage: '同行队伍保存失败，请重试'
  });
}
```

Register the query and command:

```js
combatParty: queryCombatParty,
setCombatCompanion: commandSetCombatCompanion,
```

- [ ] **Step 7: Run focused and aggregate tests**

Run: `node selftest_combat_party.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_combat_party.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add core/npc-combat-config.js core/combat-party.js core/stage4-state.js game.js selftest_combat_party.js selftest_all.js
git commit -m "feat: add combat party and npc config events"
```

---

### Task 4: Team Combat Snapshot

**Files:**
- Create: `core/team-combat-snapshot.js`
- Modify: `game.js`
- Test: `selftest_team_combat_snapshot.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces: `TeamCombatSnapshot.createSession(model, options) -> session|null`
- Session shape: `{mode, actionKey, dangerLevel, teams:{allies:CombatUnit[], enemies:CombatUnit[]}, waveIndex, waveDefeated, elapsedTicks, tickRemainderSeconds, rngStateAtStart}`
- `CombatUnit`: `{id, side, sourceType, sourceId, name, hp, maxHp, qi, maxQi, attack, defense, accuracy, evasion, critChance, critDamage, actionIntervalTicks, cooldownTicks, statuses, cooldowns, threat, fallen, techniques, supplies, cooperation}`
- Consumes: `CombatParty.cooperationFor(model, npcId) -> number`
- Consumes: `CombatContent.getEnemy(enemyId)`
- Consumes: `CombatStats.derive(model, loadoutId)` for player stats

- [ ] **Step 1: Write the failing snapshot test**

Create `selftest_team_combat_snapshot.js`:

```js
'use strict';

const Stage4State = require('./core/stage4-state.js');
const TeamCombatSnapshot = require('./core/team-combat-snapshot.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const model = Stage4State.normalize({
  player: {
    breakthrough: { realmId: 'qi-1', cultivation: 0, eventBuffs: [] },
    combat: {
      activeLoadoutId: 'loadout-1',
      nextLoadoutId: 2,
      injury: null,
      loadouts: [{
        id: 'loadout-1',
        name: '方案一',
        equipment: { weapon: null, armor: null, accessory: null },
        activeTechniques: [
          { techniqueId: null, condition: { type: 'always' } },
          { techniqueId: null, condition: { type: 'always' } },
          { techniqueId: null, condition: { type: 'always' } }
        ],
        passiveTechniques: [null, null, null],
        supplies: {
          food: { itemId: null, triggerRatio: 0.5, stopWhenEmpty: false },
          pill: { itemId: null, triggerRatio: 0.3, stopWhenEmpty: false },
          talisman: { itemId: null, useAt: 'enemy_start', stopWhenEmpty: false }
        }
      }]
    },
    techniques: { known: {} }
  },
  systems: {
    teamCombat: { companionIds: ['npc-1', null, null], reactionLog: [] },
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '青岚' },
          status: 'living',
          lifeStage: 'adult',
          realmStage: 3,
          combatProfile: {
            preferenceTags: ['heal', 'wood'],
            equipment: { weapon: null, armor: null, accessory: null },
            activeTechniques: [{ techniqueId: 'clearHeartArt', level: 2, condition: { type: 'allyHpBelow', threshold: 0.6 } }],
            passiveTechniques: [],
            supplies: { food: null, pill: null, talisman: null },
            sourceEvents: ['seed']
          }
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    },
    relationships: {
      edges: {
        'player>npc-1': { affection: 80, trust: 70, romanticAttachment: 10, desire: 0, dependence: 0, loyalty: 10, jealousy: 0, resentment: 0, lastChangedAt: 0 },
        'npc-1>player': { affection: 70, trust: 65, romanticAttachment: 8, desire: 0, dependence: 0, loyalty: 10, jealousy: 0, resentment: 0, lastChangedAt: 0 }
      },
      bonds: { 'npc-1|player': { stage: 'friend', changedAt: 0, changedByEventId: 'seed' } },
      restrictions: {}
    }
  }
}, { preserveLegacyFields: true });

const session = TeamCombatSnapshot.createSession(model, {
  mode: 'region',
  regionId: 'qingyunOutskirts',
  enemyIds: ['thornHare', 'grayWolf'],
  loadoutId: 'loadout-1',
  rngState: 7
});

ok(session, 'team session is created');
ok(session.teams.allies.length === 2, 'player plus one companion in allies');
ok(session.teams.enemies.length === 2, 'two enemies in enemies');
ok(session.teams.allies[0].sourceType === 'player', 'first ally is player');
ok(session.teams.allies[1].sourceType === 'npc', 'second ally is npc');
ok(session.teams.allies[1].techniques[0].techniqueId === 'clearHeartArt', 'npc fixed technique copied');
ok(session.teams.allies[1].cooperation > 1, 'npc cooperation included');
ok(session.teams.enemies.every(function (unit) { return unit.side === 'enemy' && unit.hp > 0; }), 'enemy units are valid');
ok(session.dangerLevel === 'safe', 'region danger copied');

model.systems.npcs.records['npc-1'].combatProfile.activeTechniques[0].level = 20;
ok(session.teams.allies[1].techniques[0].level === 2, 'session snapshots npc profile');

console.log('team combat snapshot selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_team_combat_snapshot.js`

Expected: FAIL with `Cannot find module './core/team-combat-snapshot.js'`.

- [ ] **Step 3: Implement snapshot creation**

Create `core/team-combat-snapshot.js` with these public functions:

```js
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/combat.js'),
      require('../content/techniques.js'),
      require('./combat-stats.js'),
      require('./combat-party.js')
    )
    : factory(root.CombatContent, root.TechniqueContent, root.CombatStats, root.CombatParty);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  CombatContent,
  TechniqueContent,
  CombatStats,
  CombatParty
) {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read(obj, key) { return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined; }
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  function baseNpcStats(realmStage) {
    const index = Math.max(0, Math.floor(Number(realmStage) || 0));
    return {
      maxHp: 95 + index * 38,
      maxQi: 90 + index * 10,
      attack: 10 + index * 5,
      defense: 4 + index * 3,
      accuracy: 70 + index * 2,
      evasion: 4 + index,
      critChance: Math.min(0.25, 0.04 + index * 0.005),
      critDamage: 1.5,
      actionIntervalTicks: Math.max(4, 8 - Math.floor(index / 4)),
      damageReduction: 0,
      healingPower: 0,
      healingTaken: 0,
      shieldPower: 0,
      qiRegen: 0,
      controlAccuracy: 0,
      controlResistance: 0,
      ailmentPower: 0,
      ailmentResistance: 0,
      cleansePower: 0,
      threatGain: 1,
      protectionWeight: 1
    };
  }
  function mergeStats(stats, additions) {
    Object.keys(additions || {}).forEach(function (key) {
      if (Number.isFinite(additions[key]) && Object.prototype.hasOwnProperty.call(stats, key)) {
        stats[key] += additions[key];
      }
    });
  }
  function unitFromStats(id, side, sourceType, sourceId, name, stats, techniques, supplies, cooperation) {
    return {
      id: id,
      side: side,
      sourceType: sourceType,
      sourceId: sourceId,
      name: name,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      qi: stats.maxQi,
      maxQi: stats.maxQi,
      attack: stats.attack,
      defense: stats.defense,
      accuracy: stats.accuracy,
      evasion: stats.evasion,
      critChance: stats.critChance,
      critDamage: stats.critDamage || 1.5,
      actionIntervalTicks: stats.actionIntervalTicks,
      cooldownTicks: 0,
      statuses: {},
      cooldowns: {},
      shield: 0,
      threat: 1,
      fallen: false,
      techniques: clone(techniques || []),
      supplies: clone(supplies || {}),
      cooperation: cooperation || 1
    };
  }
  function playerUnit(model, loadoutId) {
    const stats = clone(CombatStats.derive(model, loadoutId));
    stats.critDamage = stats.critDamage || 1.5;
    const loadout = model.player.combat.loadouts.filter(function (row) {
      return row.id === loadoutId;
    })[0];
    const levels = model.player.techniques && model.player.techniques.known || {};
    const techniques = (loadout.activeTechniques || []).filter(function (slot) {
      return slot.techniqueId;
    }).map(function (slot) {
      const record = levels[slot.techniqueId] || { level: 1 };
      const definition = TechniqueContent.get(slot.techniqueId);
      return {
        techniqueId: slot.techniqueId,
        level: record.level,
        condition: clone(slot.condition),
        targetRule: definition && definition.targetRule || 'highestThreatEnemy'
      };
    });
    return unitFromStats('ally-player', 'ally', 'player', 'player', '你', stats, techniques, loadout.supplies, 1);
  }
  function npcUnit(model, npcId, index) {
    const npc = model.systems.npcs.records[npcId];
    const profile = npc.combatProfile || {};
    const stats = baseNpcStats(npc.realmStage);
    Object.keys(profile.equipment || {}).forEach(function (slot) {
      if (profile.equipment[slot]) mergeStats(stats, profile.equipment[slot].stats || {});
    });
    const techniques = (profile.activeTechniques || []).map(function (slot) {
      const definition = TechniqueContent.get(slot.techniqueId);
      return {
        techniqueId: slot.techniqueId,
        level: slot.level,
        condition: clone(slot.condition),
        targetRule: definition && definition.targetRule || 'highestThreatEnemy'
      };
    });
    return unitFromStats(
      'ally-npc-' + (index + 1),
      'ally',
      'npc',
      npcId,
      npc.identity.name,
      stats,
      techniques,
      profile.supplies || {},
      CombatParty.cooperationFor(model, npcId)
    );
  }
  function enemyUnit(enemyId, index) {
    const enemy = CombatContent.getEnemy(enemyId);
    if (!enemy) return null;
    const stats = enemy.stats;
    return unitFromStats(
      'enemy-' + (index + 1),
      'enemy',
      'enemy',
      enemyId,
      enemy.name,
      {
        maxHp: stats.hp,
        maxQi: 0,
        attack: stats.attack,
        defense: stats.defense,
        accuracy: stats.accuracy,
        evasion: stats.evasion,
        critChance: stats.critChance || 0.05,
        critDamage: 1.5,
        actionIntervalTicks: stats.attackIntervalTicks
      },
      [],
      {},
      1
    );
  }
  function dangerFor(options) {
    if (options.mode === 'dungeon') {
      const dungeon = CombatContent.getDungeon(options.dungeonId);
      return dungeon && dungeon.dangerLevel || 'safe';
    }
    const region = CombatContent.getRegion(options.regionId);
    return region && region.dangerLevel || 'safe';
  }
  function createSession(model, options) {
    if (!model || !options || !Array.isArray(options.enemyIds) || options.enemyIds.length < 1 || options.enemyIds.length > 4) {
      return null;
    }
    const loadoutId = options.loadoutId || model.player.combat.activeLoadoutId;
    const allies = [playerUnit(model, loadoutId)];
    const companionIds = model.systems.teamCombat && model.systems.teamCombat.companionIds || [];
    companionIds.forEach(function (npcId, index) {
      if (npcId && model.systems.npcs.records[npcId]) allies.push(npcUnit(model, npcId, index));
    });
    const enemies = options.enemyIds.map(enemyUnit).filter(Boolean);
    if (enemies.length !== options.enemyIds.length) return null;
    return Object.freeze({
      mode: options.mode,
      actionKey: options.actionKey || (options.mode === 'dungeon'
        ? 'combat:dungeon:' + options.dungeonId
        : 'combat:region:' + options.regionId + ':' + options.enemyIds[0]),
      regionId: options.regionId || null,
      dungeonId: options.dungeonId || null,
      dangerLevel: dangerFor(options),
      waveIndex: Math.max(0, Math.floor(Number(options.waveIndex) || 0)),
      waveDefeated: Math.max(0, Math.floor(Number(options.waveDefeated) || 0)),
      elapsedTicks: 0,
      tickRemainderSeconds: 0,
      rngStateAtStart: options.rngState >>> 0,
      teams: { allies: allies, enemies: enemies }
    });
  }
  return Object.freeze({ createSession: createSession });
});
```

- [ ] **Step 4: Load module in `game.js` bootstrap**

Add `TeamCombatSnapshot` to the Stage 3/4 bootstrap object:

```js
TeamCombatSnapshot: require('./core/team-combat-snapshot.js'),
```

For browser load order, add `core/team-combat-snapshot.js` after `core/combat-party.js` and before `core/stage3-rules.js` in `index.html` if scripts are listed there.

- [ ] **Step 5: Run focused and aggregate tests**

Run: `node selftest_team_combat_snapshot.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_team_combat_snapshot.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add core/team-combat-snapshot.js game.js index.html selftest_team_combat_snapshot.js selftest_all.js
git commit -m "feat: build team combat snapshots"
```

---

### Task 5: Pure Team Combat Engine

**Files:**
- Create: `core/team-combat-engine.js`
- Test: `selftest_team_combat_engine.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces: `TeamCombatEngine.advanceTick(session, context) -> {ok, session, rngState, outcome, events, metrics}`
- Produces: `TeamCombatEngine.selectTarget(session, actor, targetRule, rngState) -> {targetId, rngState}`
- Produces outcomes: `continue`, `allies_defeated`, `enemies_defeated`
- Consumes session shape from Task 4.
- Does not mutate the input session or context.

- [ ] **Step 1: Write the failing engine test**

Create `selftest_team_combat_engine.js`:

```js
'use strict';

const TeamCombatEngine = require('./core/team-combat-engine.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const session = {
  mode: 'region',
  actionKey: 'combat:region:test:enemy-a',
  dangerLevel: 'safe',
  waveIndex: 0,
  waveDefeated: 0,
  elapsedTicks: 0,
  tickRemainderSeconds: 0,
  teams: {
    allies: [
      {
        id: 'ally-player', side: 'ally', sourceType: 'player', sourceId: 'player', name: '你',
        hp: 100, maxHp: 100, qi: 50, maxQi: 50, attack: 40, defense: 5,
        accuracy: 100, evasion: 0, critChance: 0, critDamage: 1.5,
        actionIntervalTicks: 2, cooldownTicks: 0, statuses: {}, cooldowns: {},
        shield: 0, threat: 1, fallen: false,
        techniques: [], supplies: {}, cooperation: 1
      },
      {
        id: 'ally-npc-1', side: 'ally', sourceType: 'npc', sourceId: 'npc-1', name: '青岚',
        hp: 80, maxHp: 80, qi: 40, maxQi: 40, attack: 10, defense: 4,
        accuracy: 100, evasion: 0, critChance: 0, critDamage: 1.5,
        actionIntervalTicks: 2, cooldownTicks: 0, statuses: {}, cooldowns: {},
        shield: 0, threat: 1, fallen: false,
        techniques: [{ techniqueId: 'npcHeal', level: 1, targetRule: 'lowestHpAlly',
          effect: { type: 'heal', amount: 20 }, condition: { type: 'allyHpBelow', threshold: 0.8 } }],
        supplies: {}, cooperation: 1.1
      }
    ],
    enemies: [
      {
        id: 'enemy-1', side: 'enemy', sourceType: 'enemy', sourceId: 'enemy-a', name: '甲',
        hp: 30, maxHp: 30, qi: 0, maxQi: 0, attack: 1, defense: 0,
        accuracy: 100, evasion: 0, critChance: 0, critDamage: 1.5,
        actionIntervalTicks: 3, cooldownTicks: 0, statuses: {}, cooldowns: {},
        shield: 0, threat: 1, fallen: false, techniques: [], supplies: {}, cooperation: 1
      },
      {
        id: 'enemy-2', side: 'enemy', sourceType: 'enemy', sourceId: 'enemy-b', name: '乙',
        hp: 60, maxHp: 60, qi: 0, maxQi: 0, attack: 1, defense: 0,
        accuracy: 100, evasion: 0, critChance: 0, critDamage: 1.5,
        actionIntervalTicks: 3, cooldownTicks: 0, statuses: {}, cooldowns: {},
        shield: 0, threat: 1, fallen: false, techniques: [], supplies: {}, cooperation: 1
      }
    ]
  }
};

const first = TeamCombatEngine.advanceTick(session, { rngState: 1 });
ok(first.ok, 'tick succeeds');
ok(first.session !== session, 'tick returns cloned session');
ok(first.session.elapsedTicks === 1, 'elapsed ticks increments');
ok(first.events.some(function (event) { return event.type === 'damage'; }), 'damage event emitted');
ok(first.session.teams.enemies.some(function (unit) { return unit.hp < unit.maxHp; }), 'enemy took damage');

let current = first;
for (let index = 0; index < 20 && current.outcome === 'continue'; index++) {
  current = TeamCombatEngine.advanceTick(current.session, { rngState: current.rngState });
}
ok(current.outcome === 'enemies_defeated', 'all enemies can be defeated');
ok(current.session.teams.enemies.every(function (unit) { return unit.fallen === true; }), 'defeated enemies are fallen');

const targeted = TeamCombatEngine.selectTarget(first.session, first.session.teams.allies[0], 'lowestHpEnemy', 5);
ok(targeted.targetId === 'enemy-1', 'lowest hp target selected deterministically');

console.log('team combat engine selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_team_combat_engine.js`

Expected: FAIL with `Cannot find module './core/team-combat-engine.js'`.

- [ ] **Step 3: Implement deterministic tick engine**

Create `core/team-combat-engine.js`:

```js
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./random.js'))
    : factory(root.GameRandom);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (GameRandom) {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function alive(unit) { return unit && unit.fallen !== true && unit.hp > 0; }
  function opponents(session, actor) {
    return actor.side === 'ally' ? session.teams.enemies : session.teams.allies;
  }
  function allies(session, actor) {
    return actor.side === 'ally' ? session.teams.allies : session.teams.enemies;
  }
  function draw(rngState) {
    if (GameRandom && GameRandom.next) return GameRandom.next(rngState >>> 0);
    return { seed: (rngState + 1) >>> 0, value: 0 };
  }
  function selectTarget(session, actor, targetRule, rngState) {
    const enemies = opponents(session, actor).filter(alive);
    const friends = allies(session, actor).filter(alive);
    let candidates = enemies;
    if (targetRule === 'self') return { targetId: actor.id, rngState: rngState >>> 0 };
    if (targetRule === 'lowestHpAlly') {
      candidates = friends.slice().sort(function (a, b) {
        return (a.hp / a.maxHp) - (b.hp / b.maxHp) || a.id.localeCompare(b.id);
      });
      return { targetId: candidates[0] ? candidates[0].id : null, rngState: rngState >>> 0 };
    }
    if (targetRule === 'lowestHpEnemy') {
      candidates = enemies.slice().sort(function (a, b) {
        return (a.hp / a.maxHp) - (b.hp / b.maxHp) || a.id.localeCompare(b.id);
      });
      return { targetId: candidates[0] ? candidates[0].id : null, rngState: rngState >>> 0 };
    }
    if (targetRule === 'randomEnemy') {
      const rolled = draw(rngState);
      return {
        targetId: enemies.length ? enemies[Math.floor(rolled.value * enemies.length)].id : null,
        rngState: rolled.seed
      };
    }
    candidates = enemies.slice().sort(function (a, b) {
      return b.threat - a.threat || a.id.localeCompare(b.id);
    });
    return { targetId: candidates[0] ? candidates[0].id : null, rngState: rngState >>> 0 };
  }
  function findUnit(session, id) {
    return session.teams.allies.concat(session.teams.enemies).filter(function (unit) {
      return unit.id === id;
    })[0] || null;
  }
  function applyDamage(target, amount) {
    const before = target.hp;
    let remaining = Math.max(0, Math.floor(amount));
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
    }
    target.hp = Math.max(0, target.hp - remaining);
    if (target.hp === 0) target.fallen = true;
    return before - target.hp;
  }
  function normalAttack(session, actor, state, events, metrics) {
    const selected = selectTarget(session, actor, 'highestThreatEnemy', state.rngState);
    state.rngState = selected.rngState;
    const target = findUnit(session, selected.targetId);
    if (!target) return;
    const hitRoll = draw(state.rngState); state.rngState = hitRoll.seed;
    const hitChance = Math.max(0.2, Math.min(0.98, 0.75 + (actor.accuracy - target.evasion) * 0.005));
    if (hitRoll.value >= hitChance) {
      events.push({ type: 'damage', sourceId: actor.id, targetId: target.id, amount: 0, critical: false, techniqueId: null });
      actor.cooldownTicks = actor.actionIntervalTicks;
      return;
    }
    const critRoll = draw(state.rngState); state.rngState = critRoll.seed;
    const critical = critRoll.value < actor.critChance;
    const base = Math.max(1, Math.floor(actor.attack - target.defense * 0.5));
    const amount = critical ? Math.floor(base * actor.critDamage) : base;
    const applied = applyDamage(target, amount);
    target.threat += applied * (actor.threatGain || 1);
    if (actor.side === 'ally') metrics.damageDealt += applied;
    else metrics.damageTaken += applied;
    events.push({ type: 'damage', sourceId: actor.id, targetId: target.id, amount: applied, critical: critical, techniqueId: null });
    actor.cooldownTicks = actor.actionIntervalTicks;
  }
  function conditionMet(session, actor, technique) {
    const condition = technique.condition || { type: 'always' };
    if (condition.type === 'allyHpBelow') {
      return allies(session, actor).some(function (unit) {
        return alive(unit) && unit.hp / unit.maxHp < condition.threshold;
      });
    }
    return true;
  }
  function executeTechnique(session, actor, technique, state, events, metrics) {
    const effect = technique.effect;
    if (!effect || effect.type !== 'heal') return false;
    const selected = selectTarget(session, actor, technique.targetRule || 'lowestHpAlly', state.rngState);
    const target = findUnit(session, selected.targetId);
    if (!target) return false;
    const before = target.hp;
    const amount = Math.round((effect.amount || 0) * (actor.cooperation || 1));
    target.hp = Math.min(target.maxHp, target.hp + amount);
    target.fallen = target.hp <= 0;
    const healed = target.hp - before;
    actor.threat += healed * 0.6;
    metrics.healingDone += healed;
    events.push({ type: 'heal', sourceId: actor.id, targetId: target.id, amount: healed, critical: false, techniqueId: technique.techniqueId });
    actor.cooldownTicks = actor.actionIntervalTicks;
    return true;
  }
  function act(session, actor, state, events, metrics) {
    if (!alive(actor) || actor.cooldownTicks > 0) return;
    const technique = (actor.techniques || []).filter(function (entry) {
      return conditionMet(session, actor, entry);
    })[0];
    if (technique && executeTechnique(session, actor, technique, state, events, metrics)) return;
    normalAttack(session, actor, state, events, metrics);
  }
  function advanceTick(session, context) {
    const next = clone(session);
    const state = { rngState: context.rngState >>> 0 };
    const events = [];
    const metrics = { damageDealt: 0, damageTaken: 0, healingDone: 0 };
    next.teams.allies.concat(next.teams.enemies).forEach(function (unit) {
      if (unit.cooldownTicks > 0) unit.cooldownTicks--;
    });
    next.teams.allies.concat(next.teams.enemies).forEach(function (unit) {
      act(next, unit, state, events, metrics);
    });
    next.elapsedTicks++;
    const alliesAlive = next.teams.allies.some(alive);
    const enemiesAlive = next.teams.enemies.some(alive);
    const outcome = enemiesAlive ? (alliesAlive ? 'continue' : 'allies_defeated') : 'enemies_defeated';
    return { ok: true, session: next, rngState: state.rngState, outcome: outcome, events: events, metrics: metrics };
  }
  return Object.freeze({
    selectTarget: selectTarget,
    advanceTick: advanceTick
  });
});
```

- [ ] **Step 4: Run focused and aggregate tests**

Run: `node selftest_team_combat_engine.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_team_combat_engine.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/team-combat-engine.js selftest_team_combat_engine.js selftest_all.js
git commit -m "feat: add deterministic team combat engine"
```

---

### Task 6: Stage Rules, Progress, Danger Consequences

**Files:**
- Create: `core/team-combat-consequences.js`
- Modify: `core/stage3-rules.js`
- Modify: `core/combat-progress.js`
- Modify: `game.js`
- Test: `selftest_team_combat_integration.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces: `TeamCombatConsequences.apply(model, session, outcome, atMs) -> {ok, code, state, result}`
- `result.lifespanLosses: Array<{personId:string, sourceType:string, amountYears:number}>`
- `result.relationshipReactions: Array<{npcId:string, affectionDelta:number, trustDelta:number}>`
- Stage combat sessions now allow `session.teams`.
- Existing single-combat queries keep returning data during migration by deriving player/enemy compatibility from `teams`.

- [ ] **Step 1: Write the failing integration test**

Create `selftest_team_combat_integration.js`:

```js
'use strict';

const Stage4State = require('./core/stage4-state.js');
const TeamCombatConsequences = require('./core/team-combat-consequences.js');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const model = Stage4State.normalize({
  player: { shouyuan: 80, combat: { injury: null } },
  systems: {
    teamCombat: { companionIds: ['npc-1', null, null], reactionLog: [] },
    npcs: {
      nextId: 2,
      records: {
        'npc-1': {
          identity: { name: '青岚' },
          status: 'living',
          lifeStage: 'adult',
          lifespanYears: 90,
          ageYears: 30,
          combatProfile: {}
        }
      },
      activeIds: ['npc-1'],
      backgroundIds: []
    },
    relationships: {
      edges: {
        'player>npc-1': { affection: 80, trust: 70, romanticAttachment: 20, desire: 0, dependence: 0, loyalty: 0, jealousy: 0, resentment: 0, lastChangedAt: 0 },
        'npc-1>player': { affection: 80, trust: 70, romanticAttachment: 20, desire: 0, dependence: 0, loyalty: 0, jealousy: 0, resentment: 0, lastChangedAt: 0 }
      },
      bonds: { 'npc-1|player': { stage: 'friend', changedAt: 0, changedByEventId: 'seed' } },
      restrictions: {}
    }
  }
}, { preserveLegacyFields: true });

const session = {
  dangerLevel: 'deathTrial',
  teams: {
    allies: [
      { id: 'ally-player', sourceType: 'player', sourceId: 'player', fallen: false },
      { id: 'ally-npc-1', sourceType: 'npc', sourceId: 'npc-1', fallen: true }
    ],
    enemies: []
  }
};

const result = TeamCombatConsequences.apply(model, session, 'allies_defeated', 12345);
ok(result.ok, 'death-trial consequence applies');
ok(result.result.lifespanLosses.length === 1, 'only fallen participant loses lifespan');
ok(result.result.lifespanLosses[0].personId === 'npc-1', 'fallen npc loses lifespan');
ok(result.state.systems.npcs.records['npc-1'].lifespanYears === 89, 'npc lifespan reduced');
ok(result.state.systems.teamCombat.reactionLog.length === 1, 'relationship risk reaction logged');

const safe = TeamCombatConsequences.apply(model, Object.assign({}, session, { dangerLevel: 'safe' }), 'allies_defeated', 12345);
ok(safe.ok && safe.result.lifespanLosses.length === 0, 'safe combat has no lifespan loss');

console.log('team combat integration selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_team_combat_integration.js`

Expected: FAIL with `Cannot find module './core/team-combat-consequences.js'`.

- [ ] **Step 3: Implement danger consequences**

Create `core/team-combat-consequences.js`:

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatConsequences = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function fallenAllies(session) {
    return (session.teams && session.teams.allies || []).filter(function (unit) {
      return unit && unit.fallen === true;
    });
  }
  function lossAmount(dangerLevel, outcome) {
    if (dangerLevel === 'safe') return 0;
    if (dangerLevel === 'perilous') return outcome === 'allies_defeated' ? 1 : 0;
    if (dangerLevel === 'deathTrial') return outcome === 'allies_defeated' ? 2 : 1;
    if (dangerLevel === 'desperate') return outcome === 'allies_defeated' ? 4 : 2;
    return 0;
  }
  function apply(model, session, outcome, atMs) {
    const state = clone(model);
    const amount = lossAmount(session.dangerLevel, outcome);
    const losses = [];
    const reactions = [];
    if (amount > 0) {
      fallenAllies(session).forEach(function (unit) {
        if (unit.sourceType === 'player') {
          state.player.shouyuan = Math.max(0, (Number(state.player.shouyuan) || 0) - amount);
          losses.push({ personId: 'player', sourceType: 'player', amountYears: amount });
        } else if (unit.sourceType === 'npc' && state.systems.npcs.records[unit.sourceId]) {
          const npc = state.systems.npcs.records[unit.sourceId];
          npc.lifespanYears = Math.max(0, (Number(npc.lifespanYears) || 0) - amount);
          losses.push({ personId: unit.sourceId, sourceType: 'npc', amountYears: amount });
          reactions.push({ npcId: unit.sourceId, affectionDelta: -amount * 2, trustDelta: -amount });
        }
      });
    }
    if (reactions.length) {
      if (!state.systems.teamCombat) state.systems.teamCombat = { companionIds: [null, null, null], reactionLog: [] };
      reactions.forEach(function (reaction, index) {
        state.systems.teamCombat.reactionLog.push({
          id: 'team-consequence-' + (state.systems.teamCombat.reactionLog.length + index + 1),
          npcId: reaction.npcId,
          dangerLevel: session.dangerLevel,
          atMs: Number.isFinite(atMs) ? atMs : 0,
          affectionDelta: reaction.affectionDelta,
          trustDelta: reaction.trustDelta
        });
      });
    }
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: { lifespanLosses: losses, relationshipReactions: reactions }
    };
  }
  return Object.freeze({ apply: apply });
});
```

- [ ] **Step 4: Route team sessions in Stage 3 rules**

Modify `core/stage3-rules.js` complete flow:

```js
function isTeamSession(session) {
  return session && session.teams &&
    Array.isArray(session.teams.allies) &&
    Array.isArray(session.teams.enemies);
}
```

Inside `completeCombat`, before the existing single-session tick path:

```js
if (isTeamSession(session)) {
  const tick = TeamCombatEngine.advanceTick(session, { rngState: state.rngState });
  if (!tick || tick.ok !== true) {
    clearSession(state);
    return { stopReason: 'requirements_invalid' };
  }
  finishCombatDuration(state);
  state.systems.combat.session = tick.session;
  state.rngState = tick.rngState;
  report.combat.ticks++;
  report.combat.damageDealt += tick.metrics.damageDealt || 0;
  report.combat.damageTaken += tick.metrics.damageTaken || 0;
  if (tick.outcome === 'continue') return { stopReason: null };
  const consequence = TeamCombatConsequences.apply(
    state,
    tick.session,
    tick.outcome,
    helpers.nowMs()
  );
  if (!consequence || consequence.ok !== true) {
    clearSession(state);
    return { stopReason: 'requirements_invalid' };
  }
  replaceRecord(state, consequence.state);
  if (tick.outcome === 'allies_defeated') {
    clearSession(state);
    return { stopReason: 'team_defeated' };
  }
  return { stopReason: null };
}
```

Add `TeamCombatEngine` and `TeamCombatConsequences` as trusted dependencies in `Stage3Rules.create(deps)`.

- [ ] **Step 5: Start team sessions from combat progress**

Modify `core/combat-progress.js` `startRegion()` and `startDungeon()`:

```js
const useTeamCombat = typeof teamCreateSession === 'function';
session = useTeamCombat
  ? teamCreateSession(parts.state, {
    mode: 'region',
    regionId: regionId,
    enemyIds: [enemyId],
    loadoutId: parts.state.player.combat.activeLoadoutId,
    rngState: parts.state.rngState
  })
  : engineCreateSession(parts.state, {
    mode: 'region',
    regionId: regionId,
    enemyId: enemyId
  });
```

For dungeon waves, use `wave.enemyIds || [wave.enemyId]`.

- [ ] **Step 6: Load modules in `game.js` deps**

Add to bootstrap/dependency construction:

```js
TeamCombatEngine: require('./core/team-combat-engine.js'),
TeamCombatSnapshot: require('./core/team-combat-snapshot.js'),
TeamCombatConsequences: require('./core/team-combat-consequences.js'),
```

Pass those dependencies into `Stage3Rules.create(...)` and `CombatProgress` factory if the factory signature is extended.

- [ ] **Step 7: Run focused and aggregate tests**

Run: `node selftest_team_combat_integration.js`

Expected: PASS.

Run existing focused combat regressions:

```bash
node selftest_stage3_combat.js
node selftest_stage3_dungeons.js
node selftest_combat_stuck.js
```

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_team_combat_integration.js',
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add core/team-combat-consequences.js core/stage3-rules.js core/combat-progress.js game.js selftest_team_combat_integration.js selftest_all.js
git commit -m "feat: integrate team combat consequences"
```

---

### Task 7: Combat Queries And Vertical UI View Model

**Files:**
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Test: `selftest_team_combat_ui.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces in `api.queries.combat({tab})`: `active.layout === 'vertical-team'`
- Produces: `active.allies: Array<UnitView>`
- Produces: `active.enemies: Array<UnitView>`
- `UnitView`: `{id,name,sourceType,sourceId,hp,maxHp,qi,maxQi,fallen,shield,cooldownTicks,actionIntervalTicks,statusEffects,threat,cooperation}`
- UI renders enemies above allies and does not assume `active.player` or `active.enemy` exists for team sessions.

- [ ] **Step 1: Write the failing UI query test**

Create `selftest_team_combat_ui.js`:

```js
'use strict';

const fs = require('fs');
const vm = require('vm');

function ok(value, message) {
  if (!value) throw new Error(message);
}

const source = fs.readFileSync('./game.js', 'utf8');
const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  setTimeout() { return 0; },
  clearTimeout() {},
  Date,
  require,
  module: {},
  exports: {}
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });

const api = sandbox.window.GameAPI;
ok(api && api.queries && api.queries.combat, 'combat query exists');

const state = api._debug && api._debug.getState ? api._debug.getState() : null;
ok(state && state.systems && state.systems.combat, 'debug state available');
state.systems.combat.session = {
  mode: 'region',
  actionKey: 'combat:region:qingyunOutskirts:thornHare',
  dangerLevel: 'safe',
  waveIndex: 0,
  waveDefeated: 0,
  elapsedTicks: 1,
  tickRemainderSeconds: 0,
  teams: {
    allies: [
      { id: 'ally-player', name: '你', sourceType: 'player', sourceId: 'player', hp: 90, maxHp: 100, qi: 20, maxQi: 30, fallen: false, shield: 0, cooldownTicks: 1, actionIntervalTicks: 4, statuses: {}, threat: 10, cooperation: 1 }
    ],
    enemies: [
      { id: 'enemy-1', name: '棘刺兔', sourceType: 'enemy', sourceId: 'thornHare', hp: 20, maxHp: 45, qi: 0, maxQi: 0, fallen: false, shield: 0, cooldownTicks: 2, actionIntervalTicks: 8, statuses: {}, threat: 1, cooperation: 1 }
    ]
  }
};

const view = api.queries.combat({ tab: 'regions' });
ok(view.active && view.active.layout === 'vertical-team', 'team layout is exposed');
ok(view.active.allies.length === 1, 'allies view exposed');
ok(view.active.enemies.length === 1, 'enemies view exposed');
ok(view.active.allies[0].name === '你', 'ally name preserved');
ok(view.active.enemies[0].name === '棘刺兔', 'enemy name preserved');

console.log('team combat ui selftest passed');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node selftest_team_combat_ui.js`

Expected: FAIL with `team layout is exposed`.

- [ ] **Step 3: Shape team active view in `game.js`**

Modify `combatActiveView(model)`:

```js
function combatUnitView(unit) {
  return {
    id: unit.id,
    name: unit.name,
    sourceType: unit.sourceType,
    sourceId: unit.sourceId,
    hp: unit.hp,
    maxHp: unit.maxHp,
    qi: unit.qi,
    maxQi: unit.maxQi,
    fallen: unit.fallen === true,
    shield: Number.isFinite(unit.shield) ? unit.shield : 0,
    cooldownTicks: unit.cooldownTicks,
    actionIntervalTicks: unit.actionIntervalTicks,
    statusEffects: combatStatusEffectRows(unit.statuses),
    threat: Number.isFinite(unit.threat) ? unit.threat : 0,
    cooperation: Number.isFinite(unit.cooperation) ? unit.cooperation : 1
  };
}

if (session.teams && Array.isArray(session.teams.allies) &&
    Array.isArray(session.teams.enemies)) {
  return {
    layout: 'vertical-team',
    mode: session.mode,
    actionKey: session.actionKey,
    title: combatBattleTitle(session),
    dangerLevel: session.dangerLevel || 'safe',
    allies: session.teams.allies.map(combatUnitView),
    enemies: session.teams.enemies.map(combatUnitView),
    wave: {
      index: session.waveIndex,
      number: session.waveIndex + 1,
      defeated: session.waveDefeated,
      intermissionTicks: session.intermissionTicks || 0
    },
    lootLog: combatLootLogView(model)
  };
}
```

Extract existing loot log mapping into `combatLootLogView(model)` so both single and team views share it.

- [ ] **Step 4: Render vertical layout in `ui.js`**

Add branch in combat active renderer:

```js
if (active && active.layout === 'vertical-team') {
  return `
    <section class="battle-screen team-battle-screen">
      <div class="battle-head">
        <div class="battle-head-main">
          <div class="battle-title">${escapeHtml(active.title || '战斗')}</div>
          <div class="battle-wave-text">${escapeHtml(active.dangerLevel || 'safe')}</div>
        </div>
        <button class="battle-retreat" data-action="stop">撤离</button>
      </div>
      <div class="team-battle-row team-battle-enemies">
        ${active.enemies.map(renderTeamCombatUnit).join('')}
      </div>
      <div class="team-battle-log">${renderBattleLog(active)}</div>
      <div class="team-battle-row team-battle-allies">
        ${active.allies.map(renderTeamCombatUnit).join('')}
      </div>
    </section>
  `;
}
```

Add helper:

```js
function renderTeamCombatUnit(unit) {
  const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100)) : 0;
  const qiPercent = unit.maxQi > 0 ? Math.max(0, Math.min(100, unit.qi / unit.maxQi * 100)) : 0;
  return `
    <article class="team-unit ${unit.fallen ? 'fallen' : ''}">
      <div class="team-unit-name">${escapeHtml(unit.name)}</div>
      <div class="team-unit-bars">
        <div class="team-unit-bar hp"><span style="width:${hpPercent}%"></span></div>
        <div class="team-unit-bar qi"><span style="width:${qiPercent}%"></span></div>
      </div>
      <div class="team-unit-meta">
        <span>${Math.round(unit.hp)}/${Math.round(unit.maxHp)}</span>
        <span>威胁 ${Math.round(unit.threat)}</span>
      </div>
    </article>
  `;
}
```

- [ ] **Step 5: Add vertical team CSS**

Add to `styles.css`:

```css
.team-battle-screen {
  display: grid;
  grid-template-rows: auto minmax(120px, auto) minmax(80px, auto) minmax(140px, auto);
  gap: 10px;
}
.team-battle-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.team-unit {
  min-height: 96px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 8px;
}
.team-unit.fallen {
  opacity: 0.58;
}
.team-unit-name {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.team-unit-bars {
  display: grid;
  gap: 5px;
  margin-top: 8px;
}
.team-unit-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--track);
  overflow: hidden;
}
.team-unit-bar span {
  display: block;
  height: 100%;
}
.team-unit-bar.hp span {
  background: var(--danger);
}
.team-unit-bar.qi span {
  background: var(--primary);
}
.team-unit-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 12px;
}
```

- [ ] **Step 6: Run focused and aggregate tests**

Run: `node selftest_team_combat_ui.js`

Expected: PASS.

Add to `selftest_all.js`:

```js
'selftest_team_combat_ui.js',
```

Run:

```bash
npm test
node selftest_ui.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add game.js ui.js styles.css selftest_team_combat_ui.js selftest_all.js
git commit -m "feat: render vertical team combat"
```

---

### Task 8: Release Sync And Final Verification

**Files:**
- Modify: `scripts/sync-release.js` if new source files are not copied.
- Verify: `release/` generated files.
- Test: existing release selftests.

**Interfaces:**
- `release/content/combat-lexicon.js`, `release/core/npc-combat-config.js`, `release/core/combat-party.js`, `release/core/team-combat-snapshot.js`, `release/core/team-combat-engine.js`, and `release/core/team-combat-consequences.js` are synchronized from root source.

- [ ] **Step 1: Run release sync check**

Run:

```bash
npm run sync-release
```

Expected: exits 0 and copies the new content/core files.

- [ ] **Step 2: If sync omitted new files, update sync script**

Modify `scripts/sync-release.js` source file list by adding:

```js
'content/combat-lexicon.js',
'core/npc-combat-config.js',
'core/combat-party.js',
'core/team-combat-snapshot.js',
'core/team-combat-engine.js',
'core/team-combat-consequences.js',
```

Run:

```bash
npm run sync-release
```

Expected: exits 0 and creates the corresponding `release/` files.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
node selftest_release_sync.js
node selftest_release.js
```

Expected: all pass.

- [ ] **Step 4: Commit release synchronization**

```bash
git add scripts/sync-release.js release/content/combat-lexicon.js release/core/npc-combat-config.js release/core/combat-party.js release/core/team-combat-snapshot.js release/core/team-combat-engine.js release/core/team-combat-consequences.js release/game.js release/ui.js release/styles.css release/index.html
git commit -m "build: sync team combat release"
```

---

## Self-Review Notes

Spec coverage:

- 4-person ally team and 1-4 enemies are covered by Tasks 4, 5, 6, and 7.
- NPC fixed configuration without real inventory is covered by Tasks 2 and 3.
- No fixed career field is enforced by Task 1 dual tags and Task 4 snapshot inference.
- Independent action bars are covered by Task 5.
- Target rules and threat are introduced by Tasks 1 and 5.
- Danger-level lifespan consequences are covered by Task 6.
- High-risk no-confirmation relationship reaction is covered by Tasks 3 and 6.
- Vertical enemy-over-ally UI is covered by Task 7.
- Release sync is covered by Task 8.

Type consistency:

- `combatProfile` is normalized in Task 2 and consumed by Tasks 3 and 4.
- `systems.teamCombat.companionIds` is normalized in Task 3 and consumed by Task 4.
- Team session `teams.allies[]` and `teams.enemies[]` are produced by Task 4, consumed by Tasks 5, 6, and 7.
- `dangerLevel` is produced by Task 1 content and consumed by Tasks 4 and 6.
