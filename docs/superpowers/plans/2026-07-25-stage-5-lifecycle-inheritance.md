# Stage 5 Lifespan, Lineage, Inheritance, Reincarnation, and Ascension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` for implementation and `superpowers:requesting-code-review` after every task. Tasks are sequential; every checkbox is a separate RED/GREEN/verify action.

**Goal:** 在既有确定性人物世界中交付玩家寿元安全缓冲、NPC 低频生命周期、正式伴侣传承仪式、多名后代、洞府传承殿、成年后代传代或全新身份轮回、继承配置、前世重逢、NPC 转世与飞升赐福。

**Architecture:** Stage 5 extends schema v5 to v6 and replaces the provisional Stage 1B/4 age hooks with one lifecycle lane under `Simulation.advance`. `core/lineage.js` owns kinship and descendants, `core/inheritance-hall.js` owns saved inheritance choices, `core/legacy-transition.js` projects and atomically applies a new player life, and `core/npc-lifecycle.js` owns death/reincarnation/ascension status changes without deleting permanent records. Stage 4 events, relationships, sparse NPC records, active/background tiers, world history, and named parallel jobs remain the only world-person infrastructure.

**Tech Stack:** Native JavaScript, UMD browser globals plus CommonJS exports, existing HTML/CSS/DOM/Canvas shell, Node self-tests, no dependency, framework, map, server, or generated-text service.

## Global Constraints

- The only product authority is `docs/superpowers/specs/2026-07-24-xiuxian-idle-core-design.md`.
- Stage 1B through Stage 4 must pass their independent completion gates before Stage 5 implementation begins.
- Preserve the current top bar, scrollable left navigation, independently scrollable right content, modal root, character Canvas, and exact left-nav order.
- Do not create a map, movement system, action queue, second clock, second offline formula, or second NPC world.
- All online/offline time goes through the existing `Simulation.advance`.
- All lifecycle, ritual, child, reincarnation, blessing, and new-identity randomness uses saved `rngState`; no Stage 5 core/content file calls `Math.random()`.
- The player is always female. A formal partner of any gender may join a lineage ritual.
- Ordinary combat defeat remains severe injury only. Stage 5 death code must never run from combat HP reaching zero.
- The player never silently dies offline. At one remaining world year, the main action stops with `lifespan_buffer`; uncapped farm, world, social, NPC, and age lanes continue.
- NPCs receive no player safety buffer, but routine simulation has no per-tick random death. The first batch resolves natural lifespan death and explicitly authored lethal events only.
- Higher NPC/player realms increase maximum lifespan and never shorten already-earned remaining lifespan.
- Twelve life-skill level/XP records are copied exactly through every player-life transition.
- Selected masteries inherit completely; every unselected mastery inherits the hall-level partial cumulative-XP percentage.
- Previous player relationships are archived then removed from active edges/bonds. Reconnection occurs only through saved mementos and authored memory events.
- Blood relatives, direct in-laws, guardians, and every prior-generation formal partner remain permanently non-romanceable across all later lives.
- A previous player life is never inserted into `systems.npcs.records` and never appears in active/background NPC tiers.
- Root source is authoritative. `release/` is generated only by the verified one-way sync.
- Every task is RED → confirmed expected failure → minimal GREEN → focused/full verification → commit → fresh independent review. Fix and re-review every Serious or Important finding before continuing.

---

## 1. Locked Stage 5 Contracts

### 1.1 Migration chain

```text
v1 legacy snapshot
v2 unified simulation
v3 life skills / inventory / homestead
v4 combat / techniques / breakthrough
v5 NPC / relationship / event / sect world
v6 lifespan / lineage / inheritance / reincarnation / ascension
```

`SaveSystem.SCHEMA_VERSION` becomes exactly `6`. Loading v5 must execute an explicit `migrateV5`; loading an unknown future version must retain the existing safe-recovery behavior.

### 1.2 Time and lifespan

```js
const WORLD_YEAR_SECONDS = 12 * 60 * 60;       // 43,200 real seconds
const PLAYER_SAFETY_BUFFER_YEARS = 1;
const LINEAGE_RITUAL_SECONDS = 6 * 60 * 60;    // 6 real hours
const CHILD_ADULT_AGE_YEARS = 18;              // 9 real days from birth
const NPC_ASCENSION_STEP_SECONDS = 24 * 60 * 60;
const REINCARNATION_DELAY_SECONDS = {
  min: 7 * 24 * 60 * 60,
  max: 30 * 24 * 60 * 60
};
const BLESSING_DELAY_SECONDS = {
  min: 7 * 24 * 60 * 60,
  max: 14 * 24 * 60 * 60
};
```

An ordinary NPC's generated base lifespan is 56–112 world years. At 43,200 seconds per year, an ordinary full life lasts 4–8 real weeks. Realm multipliers are:

```js
[
  1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, // qi 1..9
  1.80, // foundation
  3.00, // gold core
  5.00, // nascent soul
  8.00, // spirit transformation
  13.00, // void refining
  21.00, // body integration
  34.00  // mahayana
]
```

The player realm maximums are:

```js
[
  120,120,120,120,120,120,120,120,120,
  240,450,800,1400,2400,4000,7000
]
```

Ascension is a transition outcome, not an infinite-lifespan active-player state.
When `systems.lineage.family.activeBonusIds` contains `longLifeSeed`, effective
player maximum lifespan is `Math.floor(realmMaximum * 1.05)`; otherwise it is
the table value. Gaining or inheriting this bonus adds only the positive
maximum difference to remaining life.

### 1.3 Persisted v6 model

Stage 5 adds or extends only these branches:

```js
model.player.identity = {
  // Preserve Stage 4 gender and appearance ownership.
  gender: 'female',
  originId: 'wanderingReborn',
  personalityId: 'steady',
  talentIds: ['plainSpirit']
};

model.player.lifecycle = {
  currentLifeId: 'life-1',
  generation: 1,
  source: 'founder' | 'descendant' | 'newIdentity',
  sourceNpcId: null,
  ageYears: 18,
  ageRemainderSeconds: 0,
  safetyBufferYears: 1,
  status: 'active' | 'safety_buffer' | 'transition_pending',
  pendingCause: null | 'lifespan' | 'voluntary' | 'ascension',
  startedAt: 0
};

// Existing `player.shouyuan` (remaining years) and `player.shouMax`
// (maximum years) remain the single authoritative lifespan values.

model.systems.lineage = {
  nextLifeId: 2,
  nextRitualId: 1,
  nextTransitionId: 1,
  family: {
    id: 'player-lineage',
    name: '无名传承',
    memberRefs: ['life:life-1'],
    unlockedBonusIds: [],
    activeBonusIds: []
  },
  lives: [],
  kinship: {
    // person refs are exactly `life:<lifeId>` or `npc:<npcId>`
    'life:life-1': { parents: [], children: [], guardians: [] }
  },
  personAliases: {
    // Descendant succession maps the new life ref to the same saved person.
    // Example: 'life:life-2': 'npc:npc-12'
  },
  descendants: {
    [npcId]: {
      npcId,
      ritualId,
      playerLifeId,
      partnerNpcId,
      bornAt,
      adultAt: null,
      bloodlineId,
      upbringing: { body: 0, mind: 0, craft: 0, social: 0 }
    }
  },
  rituals: [
    {
      id: 'ritual-1',
      playerLifeId: 'life-1',
      partnerNpcId: 'npc-7',
      startedAt: 0,
      completedAt: null,
      childNpcId: null,
      status: 'active' | 'completed' | 'cancelled'
    }
  ],
  mementos: [
    {
      id: 'memento-life-1-npc-7',
      previousLifeId: 'life-1',
      sourceSubjectRef: 'life:life-1' | 'npc:npc-12',
      npcId: 'npc-7',
      kind: 'keepsake' | 'memory',
      revealed: false,
      eventQueued: false
    }
  ],
  permanentRomanceRestrictions: {
    [npcId]: 'priorGenerationPartner'
  },
  pendingTransition: null
};

model.systems.homestead.inheritanceHall = {
  level: 1,
  upgradedAt: 0,
  plan: {
    fullMasteryIds: [],
    techniqueIds: [],
    equipmentItemIds: [],
    resourceItemIds: [],
    beastIds: [],
    formationBlueprintIds: [],
    familyBonusIds: []
  },
  upgradeHistory: []
};

model.systems.lifecycle = {
  reincarnationQueue: [
    {
      sourceNpcId,
      dueAt,
      markerIds,
      scheduledAt
    }
  ],
  blessingSchedules: {
    [ascendedNpcId]: {
      dueAt,
      sequence: 1
    }
  },
  ascensionAccumulator: 0
};
```

NPC records retain Stage 4 fields and add:

```js
npc.lifeStage = 'child' | 'adult';
npc.lifecycle = {
  baseLifespanYears: 80,
  deathAt: null,
  deathCause: null,
  reincarnatedAsId: null,
  previousNpcId: null,
  ascendedAt: null,
  hiddenMarkerIds: [],
  revealedMarkerIds: []
};
```

Allowed `npc.status` values become:

```text
living, dead, reincarnated, ascended, playerIdentity
```

Children are `status:'living', lifeStage:'child'` but are excluded from active/background tiers. Adults are tiered normally. A selected heir remains permanently saved as `status:'playerIdentity'` and is excluded from NPC simulation; the record is not deleted.

Completed player-life records are compact immutable chronicles:

```js
{
  id: 'life-1',
  generation: 1,
  source,
  sourceNpcId,
  identity: {name,gender,appearance,originId,personalityId,talentIds},
  startedAt,
  endedAt,
  outcome: 'handover' | 'reincarnated' | 'ascended',
  realm: {realmId,realmIndex,cultivation},
  skills: { [skillId]: {level,xp} },
  biography: [],
  relationshipArchive: [],
  heirNpcId: null,
  nextLifeId
}
```

Every `lives` record is retained. `biography` is capped at 100 detailed entries per person/life; older NPC entries compact into ten-world-year summaries. `relationshipArchive` keeps the top 50 connected people by stable relationship score plus aggregate counts. Rituals retain the latest 100 full rows; older rows compact into yearly counts while descendant/kinship links remain.

### 1.4 Inheritance Hall levels

| Level | Full mastery slots | Partial mastery cumulative XP | Techniques | Equipment IDs | Resource stack types | Resource quantity | Beasts | Formation blueprints | Family bonuses | Spirit-stone retention | Sect-relation retention |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 25% | 2 | 1 | 3 | 25% | 0 | 1 | 1 | 10% | 20% |
| 2 | 5 | 30% | 4 | 2 | 5 | 35% | 1 | 2 | 2 | 20% | 35% |
| 3 | 8 | 35% | 8 | 3 | 8 | 50% | 1 | 3 | 3 | 35% | 50% |
| 4 | 12 | 40% | 12 | 6 | 12 | 70% | 2 | 4 | 4 | 50% | 70% |
| 5 | 20 | 50% | 16 | 9 | 20 | 100% | 3 | 5 | 5 | 75% | 100% |

Upgrade requirements:

| To level | Realm index | Spirit stones | Materials |
|---:|---:|---:|---|
| 2 | 9 | 5,000 | `spiritWood`×20, `jadeShard`×10, `formationBase`×1 |
| 3 | 10 | 20,000 | `darkIronOre`×20, `jadeShard`×20, `formationBase`×2 |
| 4 | 12 | 80,000 | `crystalOre`×30, `darkCrystal`×5, `formationBase`×3 |
| 5 | 14 | 300,000 | `adamantOre`×40, `darkCrystal`×20, `formationBase`×5 |

An upgrade is an immediate atomic cave command. It does not replace the main action, cannot downgrade, and cannot consume anything unless every cost and requirement passes.

### 1.5 Transition reset/retention matrix

Both descendant succession and a new identity:

- copy all 12 `player.skills[*]` level and XP records exactly;
- fully copy selected mastery records;
- convert every unselected mastery to the hall-level percentage of cumulative mastery XP, then rebuild level/XP through Stage 2 `masteryXpNeed`;
- retain selected learned techniques at exact level/XP and forget unselected techniques;
- retain one unit of each selected equipment ID;
- retain the configured percentage of each selected material/consumable stack;
- never inherit quest items or technique books through resource slots;
- retain selected beasts and selected formation blueprint discoveries;
- retain selected family bonuses;
- retain `lingyu` at 100%, retain `lingshi` by the hall percentage, retain inventory capacity/capacity grants and offline-limit upgrades;
- retain `combatProgress.firstClears` and `completedGates`, reset per-life enemy/region/dungeon counters, preventing duplicate first-clear rewards;
- clear cultivation and event breakthrough buffs;
- reset battle session, severe injury, combat loadouts, equipment bindings, formation slots, active beasts, temporary social benefits, and player social parallel jobs;
- preserve farm plots, inheritance-hall level/history, world/NPC/sect/evolution state, report archive, and non-player passive jobs;
- clear current sect membership; retain contribution/reputation by the hall percentage as `legacyRecognition`, which may unlock later sect events but never auto-joins;
- archive all player edges/bonds and remove them from active relationship state;
- on the descendant route, also archive/remove every edge and bond belonging
  to the heir's former NPC identity;
- system-resolve current player-scope pending events as `life_changed`, retaining their exact snapshots in resolved history rather than deleting them;
- on the descendant route, reconcile pending events and social jobs that refer
  to the heir NPC before changing that record to `playerIdentity`;
- rebuild permanent blood/in-law/guardian/prior-partner restrictions before exposing the new identity.

Descendant route:

- candidate must be a living adult female descendant and not already `playerIdentity`;
- player name/appearance/origin/personality/talent come from the chosen NPC;
- starting realm is that descendant's current realm, clamped to no higher than the previous player's realm; cultivation becomes 0;
- the NPC record becomes `playerIdentity` and leaves active/background tiers.

New-identity route:

- uses a saved draft with female gender, name, existing avatar parts, one of 6 origins, one personality, and one talent;
- starts at age 18 and `qi-1`, cultivation 0;
- does not create a duplicate NPC record.

Every transition is one controller save transaction. Save failure keeps the old life and pending preview unchanged.

### 1.6 Event/world seams

Stage 5 adds requirement types:

```text
playerLifecycleStatus, npcLifecycleStatus, npcLifeStage,
formalPartner, descendantStage, adultHeirAvailable,
hasMemento, hallLevelAtLeast, familyBonusUnlocked
```

It adds effect types:

```text
startLineageRitual, applyUpbringing, revealMemento,
revealReincarnationMark, extendPlayerLifespan,
unlockFamilyBonus, addAscendedBlessing
```

They use the Stage 4 validated/snapshotted event DSL. Unknown effects fail closed and no event partially resolves.

Lifecycle evolution categories are:

```text
birth, adulthood, naturalDeath, eventDeath, reincarnation,
ascension, blessing, legacyTransition, memoryRecognition
```

The existing pending capacity of 20 still applies to new player decisions. Natural death, adulthood, reincarnation, ascension, and blessing continue at capacity and append world evolution. A memory opportunity blocked by capacity remains a dormant memento and is queued later. A lifespan transition is not an event-queue entry and cannot be blocked by pending capacity.

At a shared timestamp lifecycle order is:

1. player safety-buffer boundary;
2. child adulthood;
3. NPC natural death;
4. due reincarnations;
5. due blessings;
6. Stage 4 parallel/world/sect/event boundaries;
7. main-action completion.

Extend reports additively:

```js
report.lifecycle = {
  playerYears: 0,
  npcYears: 0,
  playerBufferEntered: false,
  births: [],
  adulthood: [],
  deaths: [],
  reincarnations: [],
  ascensions: [],
  blessings: [],
  legacyTransitionId: null
};
```

The offline overlay shows counts and the buffer stop reason, never every biography/event body. Full rows remain in `事件 / 世界演变` and `传承殿`.

### 1.7 Public API additions

Preserve every Stage 1B–4 method. Add:

```js
queries.inheritanceHall({section, cursor})
// section: overview | genealogy | chronicles | previousLives | plan | descendants

queries.legacyTransition()

commands.proposeLineageRitual({partnerNpcId})
commands.upgradeInheritanceHall()
commands.setInheritancePlan({
  fullMasteryIds,
  techniqueIds,
  equipmentItemIds,
  resourceItemIds,
  beastIds,
  formationBlueprintIds,
  familyBonusIds
})
commands.consumeLongevityItem({itemId})
commands.beginLegacyTransition({cause}) // lifespan | voluntary | ascension
commands.chooseLegacyRoute({route, heirNpcId}) // descendant | newIdentity
commands.updateNewIdentityDraft({
  name, appearance, originId, personalityId, talentId
})
commands.confirmLegacyTransition()
commands.cancelLegacyTransition()
```

`queries.homestead('inheritance')` delegates to `queries.inheritanceHall({section:'overview'})`. Existing event/world/relationship queries add lifecycle rows but keep their names.

No public command can kill, reincarnate, ascend, age, create a child directly, restore a relationship, mark a memento revealed, or bypass a lineage event.

---

## 2. Required First Content Batch

- 5 exact inheritance-hall levels from Section 1.4.
- 8 inheritable family bonuses:
  - `herbalLegacy`: herb/alchemy duration −3%;
  - `forgeLegacy`: forging duration −3%;
  - `fieldLegacy`: planted crop duration −3%;
  - `beastLegacy`: beast XP +5%;
  - `formationLegacy`: formation crafting duration −3%;
  - `battleLegacy`: combat max HP +3%;
  - `socialLegacy`: positive relationship gain +3%;
  - `longLifeSeed`: player maximum lifespan +5%.
- 6 new-identity origins: `wanderingReborn`, `marketArtisan`, `herbalHouse`, `minorSectDependent`, `frontierTraveler`, `hiddenLineage`.
- 8 descendant bloodlines: `verdantPulse`, `metalBone`, `riverSoul`, `flameHeart`, `thunderVein`, `beastWhisper`, `formationSight`, `longLifeSeedBlood`.
- 6 hidden NPC reincarnation marks: `rainDream`, `oldSwordHabit`, `herbalScent`, `familiarMelody`, `beastAffinityEcho`, `sectEcho`.
- 6 ascended blessing effects: resource gift, life-skill insight, technique insight, +10 lifespan years, memory revelation, and one valid +10-percentage-point **event** breakthrough buff routed through `Breakthrough.addEventBuff`.
- 3 longevity items:
  - `jadeDewLongevityPill`: +10 remaining/max years;
  - `purpleMarrowLongevityPill`: +30 years;
  - `heavenlyLongevityFruit`: +100 years.
- 24 authored lifecycle event templates with exact category counts:
  - 8 lineage/ritual/birth/upbringing/adulthood;
  - 6 memento/memory/reunion;
  - 4 death/memorial/reincarnation;
  - 6 ascension/blessing.

No family bonus, bloodline, item, NPC status, hall level, or ascended state directly changes breakthrough probability. Only the one authored blessing event may call the existing event-buff adapter.

---

## 3. File Map

| File | Responsibility |
|---|---|
| `content/lifecycle.js` | year constants, realm lifespan values, hall levels, origins, bloodlines, markers, blessings, family bonuses |
| `content/lineage-events.js` | 24 authored lifecycle event templates |
| `content/items.js` | three longevity consumables |
| `content/realms.js` | exact player lifespan maximum per realm |
| `core/stage5-state.js` | schema v6 defaults, v5 migration, normalization, compaction |
| `core/player-lifespan.js` | player aging, buffer, extension items, breakthrough extension |
| `core/npc-lifecycle.js` | NPC realm lifespan, natural death, ascension, status cleanup |
| `core/kinship.js` | parent/child/guardian graph and permanent relationship restrictions |
| `core/lineage.js` | ritual proposal/completion, deterministic child generation, adulthood/upbringing |
| `core/inheritance-hall.js` | upgrades, saved plan validation, frozen hall ViewModels |
| `core/inheritance-projector.js` | exact mastery/assets/sect/currency retention projection |
| `core/legacy-transition.js` | previews and atomic descendant/new-identity/ascension transitions |
| `core/memory-reunion.js` | relationship archive ranking, mementos, reunion events |
| `core/reincarnation.js` | delayed new NPC identity and hidden marks |
| `core/ascended-blessings.js` | blessing schedule and event-effect adapter |
| `core/stage5-rules.js` | lifecycle and lineage jobs in unified simulation |
| `game.js` | controller composition and frozen commands/queries only |
| `ui.js` / `styles.css` | inheritance hall, lifespan, descendants, transition modal |
| `selftest_stage5_*.js` | focused state/domain/simulation/API/UI/long-run suites |

---

## 4. Sequential TDD Tasks

### Task 1: Freeze lifecycle and inheritance content

**Files**

- Create `content/lifecycle.js`
- Create `selftest_stage5_content.js`
- Modify `content/items.js`
- Modify `content/realms.js`
- Modify `index.html`
- Modify `selftest_all.js`

**Interfaces**

- Produces frozen `LifecycleContent`.
- Extends `ItemContent` with three consumables.
- Extends `RealmContent` with `maxLifespanYears(realmIndex)`.

- [ ] **Step 1: Register the absent suite and verify RED**

Add `selftest_stage5_content.js` after Stage 4 content suites. Run `npm test`.

Expected: earlier suites pass; runner fails because the Stage 5 suite/module is absent.

- [ ] **Step 2: Write exact count/formula/reference tests**

```js
const L = require('./content/lifecycle.js');
const Items = require('./content/items.js');
const Realms = require('./content/realms.js');

ok(L.WORLD_YEAR_SECONDS === 43200, 'one world year is twelve real hours');
ok(L.HALL_LEVELS.length === 5, 'five inheritance hall levels');
ok(Object.keys(L.FAMILY_BONUSES).length === 8, 'eight family bonuses');
ok(Object.keys(L.ORIGINS).length === 6, 'six new-life origins');
ok(Object.keys(L.BLOODLINES).length === 8, 'eight descendant bloodlines');
ok(Object.keys(L.REINCARNATION_MARKS).length === 6, 'six hidden marks');
ok(Object.keys(L.BLESSINGS).length === 6, 'six ascended blessings');
ok(Object.keys(L.LONGEVITY_ITEMS).length === 3, 'three longevity items');
ok(Realms.maxLifespanYears(0) === 120 &&
   Realms.maxLifespanYears(15) === 7000,
  'player realm lifespan table is exact');
for (const itemId of Object.keys(L.LONGEVITY_ITEMS)) {
  ok(Items.ITEMS[itemId].category === 'consumable', 'longevity item exists: ' + itemId);
}
for (const value of Object.values(L.FAMILY_BONUSES)) {
  ok(!/break|probability|突破/i.test(JSON.stringify(value)),
    'family bonuses do not affect breakthrough');
}
```

- [ ] **Step 3: Implement the exact registries**

Use the IDs, values, costs, percentages, delays, and count tables in Sections 1–2. Every nested record is deeply frozen. Blessing `breakthroughOmen` has:

```js
{
  id: 'breakthroughOmen',
  kind: 'eventBreakthroughBuff',
  bonus: 0.10,
  uses: 1
}
```

It is data for the Stage 3 event adapter, not a direct probability field.

- [ ] **Step 4: Verify and commit**

```powershell
node --check content/lifecycle.js
node --check content/items.js
node --check content/realms.js
node selftest_stage5_content.js
npm test
git add content/lifecycle.js content/items.js content/realms.js index.html selftest_stage5_content.js selftest_all.js
git commit -m "feat: define stage 5 lifecycle content"
```

**Reviewer gate:** Recalculate all five hall rows and all lifespan tables; reject missing references, mutable nested data, forbidden probability sources, or an implicit map/world clock.

---

### Task 2: Add schema v6 and lossless v5 migration

**Files**

- Create `core/stage5-state.js`
- Create `selftest_stage5_state.js`
- Modify `core/state-model.js`
- Modify `core/save-system.js`
- Modify `game.js`
- Modify `index.html`
- Modify `selftest_all.js`
- Modify `selftest_foundation.js`

**Interfaces**

- Produces `Stage5State.defaults`, `migrateV5`, `normalize`, `validate`, `compactBiographies`.
- Sets save version to 6 and preserves v1→v2→v3→v4→v5→v6.

- [ ] **Step 1: Add state suite and explicit migration fixtures**

Test:

```js
const S = require('./core/stage5-state.js');
const L = require('./content/lifecycle.js');
const migrated = S.migrateV5(v5Fixture, 100000);
ok(migrated.player.lifecycle.currentLifeId === 'life-1', 'first life gets stable id');
ok(migrated.systems.homestead.inheritanceHall.level === 1, 'hall starts at level one');
ok(migrated.systems.lineage.kinship['life:life-1'], 'current life has kinship node');
const oldMultiplier = L.NPC_REALM_MULTIPLIERS[v5Npc.realmStage];
const expectedBase = Math.max(56, Math.min(112,
  Math.round((v5Npc.lifespanYears / oldMultiplier) * 2)));
ok(migrated.systems.npcs.records['npc-1'].lifecycle.baseLifespanYears === expectedBase &&
   migrated.systems.npcs.records['npc-1'].lifespanYears ===
     Math.max(v5Npc.ageYears + 1, Math.round(expectedBase * oldMultiplier)),
  'v5 provisional lifespan is rescaled once');
ok(migrated.systems.npcs.records['npc-1'].ageRemainderSeconds ===
   Math.floor((v5Npc.ageRemainderSeconds / 1800) * 43200),
  'fractional age survives world-year rescale');
```

Also prove v6 reopen is byte-stable; 20 pending events, ready social jobs, NPC IDs, edges, restrictions, sect state, combat session, RNG, and report archives survive; future schema rejects; corrupt Stage 5 arrays recover without deleting valid NPCs/assets.

- [ ] **Step 2: Run focused test and verify RED**

```powershell
node selftest_stage5_state.js
```

Expected: missing module/version failure.

- [ ] **Step 3: Implement deterministic v5→v6 migration**

Rules:

```js
oldMultiplier = LifecycleContent.NPC_REALM_MULTIPLIERS[realmStage];
baseLifespanYears = clamp(
  Math.round((oldLifespanYears / oldMultiplier) * 2),
  56,
  112
);
newNpcLifespan = Math.max(
  ageYears + 1,
  Math.round(baseLifespanYears * oldMultiplier)
);
newAgeRemainder = Math.floor(
  clamp(oldAgeRemainderSeconds / 1800, 0, 0.999999) * 43200
);
```

Do not consume RNG in generic normalization. Legacy player identity receives fixed `wanderingReborn / steady / plainSpirit` values. If `shouMax` or `shouyuan` is `null`, initialize from current realm maximum and age 18; otherwise preserve finite remaining years, clamped to at least the one-year buffer.

Normalize all person refs, hall plan IDs, schedules, child records, and statuses. Extend `NpcRoster.assertPartition`: only living adults must appear exactly once; living children and `playerIdentity` records appear in neither tier.

- [ ] **Step 4: Extend snapshot allowlists and migration chain**

`StateModel` explicitly extracts/applies `player.lifecycle`, `systems.lineage`, `systems.lifecycle`, and `systems.homestead.inheritanceHall`. `SaveSystem` adds only `migrateV5`; it must not relabel v5 or unknown future data.

- [ ] **Step 5: Verify JSON, old fixtures, and commit**

```powershell
node --check core/stage5-state.js
node --check core/state-model.js
node --check core/save-system.js
node selftest_stage5_state.js
node selftest_foundation.js
npm test
git add core/stage5-state.js core/state-model.js core/save-system.js game.js index.html selftest_stage5_state.js selftest_foundation.js selftest_all.js
git commit -m "feat: migrate lifecycle state to schema v6"
```

**Reviewer gate:** Load every schema fixture, migrate v5 twice, corrupt every new branch, and prove no world reroll, duplicate life, duplicate tier, lost pending event, or fractional-age drift.

---

### Task 3: Replace provisional aging with the player lifespan safety lane

**Files**

- Create `core/player-lifespan.js`
- Create `selftest_stage5_player_lifespan.js`
- Modify `core/game-rules.js`
- Modify `core/stage4-rules.js`
- Modify `core/breakthrough.js`
- Modify `core/simulation-report.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `PlayerLifespan.nextBoundary`, `elapse`, `resolve`, `canStartMainAction`, `extend`, `consumeItem`, `onBreakthrough`, `query`.
- Stage 5 removes the old Stage 1B lifespan lane from runtime composition; it does not run both.

- [ ] **Step 1: Write exact buffer and extension RED tests**

Prove:

- 2 remaining years reaches 1 after exactly 43,200 seconds;
- the main action stops with `lifespan_buffer`;
- `shouyuan` clamps at 1 and never reaches 0 offline;
- farm, parallel, NPC, and world lanes continue beyond the stop;
- no new main action starts while status is `safety_buffer`;
- a +10-year item atomically adds 10 to remaining and maximum, clears the buffer, and is consumed once;
- failed item consumption is immutable;
- realm breakthrough raises maximum to the table value and adds only the positive max difference to remaining years;
- lower/repeated realm calls never shorten lifespan;
- no lifespan call touches breakthrough chance.

- [ ] **Step 2: Run and verify expected missing-module failure**

```powershell
node selftest_stage5_player_lifespan.js
```

- [ ] **Step 3: Implement the single player age/lifespan lane**

`nextBoundary` returns seconds until `shouyuan === safetyBufferYears`, otherwise `Infinity` when already buffered. `elapse` advances `ageRemainderSeconds`, whole `ageYears`, and remaining lifespan with the same elapsed fraction. `resolve` sets:

```js
player.lifecycle.status = 'safety_buffer';
player.lifecycle.pendingCause = 'lifespan';
player.shouyuan = 1;
helpers.stopCurrent('lifespan_buffer', helpers.nowMs());
helpers.report.lifecycle.playerBufferEntered = true;
```

It never calls death or a transition.

- [ ] **Step 4: Integrate breakthrough and item consumption**

`Breakthrough.attempt` delegates successful realm lifespan changes to injected `PlayerLifespan.onBreakthrough`. `consumeItem` accepts only the three registered longevity items, uses `Inventory.apply`, and returns standard report-ready costs.

- [ ] **Step 5: Verify no duplicate age loop and commit**

```powershell
rg -n "lifespanLane|YEAR_SECONDS|shouyuan.*seconds" core game.js
node --check core/player-lifespan.js
node selftest_stage5_player_lifespan.js
node selftest_stage3_breakthrough.js
node selftest_simulation.js
npm test
git add core/player-lifespan.js core/game-rules.js core/stage4-rules.js core/breakthrough.js core/simulation-report.js selftest_stage5_player_lifespan.js selftest_all.js
git commit -m "feat: protect player lifespan with a safety buffer"
```

Expected scan: only Stage 5 lifespan ownership plus migration constants; no live Stage 1B/4 age loop.

**Reviewer gate:** Advance 48 hours in one call and irregular chunks, verify exact equality, one stop report, no auto-transition, no ordinary combat death path, and no duplicated age decrement.

---

### Task 4: Resolve normal NPC aging, natural death, and rare ascension

**Files**

- Create `core/npc-lifecycle.js`
- Create `selftest_stage5_npc_lifecycle.js`
- Modify `core/npc-generator.js`
- Modify `core/npc-simulation.js`
- Modify `core/npc-roster.js`
- Modify `core/event-engine.js`
- Modify `selftest_stage4_npc_generator.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `NpcLifecycle.nextBoundary`, `elapseAges`, `resolveBoundaries`, `onBreakthrough`, `die`, `ascend`, `reconcilePendingForPerson`.

- [ ] **Step 1: Write age/death/realm/ascension RED tests**

Prove:

- an ordinary NPC born at age 0 with lifespan 56 lives 28 real days;
- every newly generated non-descendant NPC stores `baseLifespanYears` in 56–112 and computes maximum lifespan as `round(base × realmMultiplier)`;
- higher realm multipliers are strictly increasing;
- NPC breakthrough adds the positive lifespan-max difference and never reduces remaining life;
- natural lifespan zero changes status to `dead`, records cause/time/biography, removes tier IDs, and never deletes the record;
- combat defeat cannot call `die`;
- there is no ordinary random-death roll;
- only an authored event marked `lethal:true` may use `eventDeath`;
- a highest-realm NPC receives one ascension roll per exact 86,400 seconds, not per render/frame;
- ascension marks `ascended`, preserves biography, removes the NPC from tiers, and schedules a blessing;
- pending events involving a dead/ascended person keep their original snapshot and gain one generic `收起旧事` closure option; they are not silently deleted;
- active social actions/jobs targeting an unavailable person stop/cancel with a summary and do not refund elapsed time.

- [ ] **Step 2: Run focused RED**

```powershell
node selftest_stage5_npc_lifecycle.js
```

- [ ] **Step 3: Centralize age ownership**

Remove `NpcSimulation.advanceAges` from Stage 4 runtime composition. `NpcLifecycle.elapseAges` advances all living records for full elapsed time, including children, using carried remainders. `nextBoundary` returns the smallest positive time to a player-independent death or child-adult threshold.

Update `NpcGenerator` from its Stage 4 provisional 28–56 range to 56–112. Stage 4 deterministic tests keep their ID/name/RNG assertions but replace only the superseded lifespan-range expectation. A v6 NPC's `baseLifespanYears` is immutable; breakthrough recalculates the maximum through the fixed multiplier table.

- [ ] **Step 4: Implement status transitions**

`die` and `ascend` operate on a cloned model, update the record, remove IDs from active/background arrays, reconcile actions/jobs/events, append a Stage 4 evolution entry, and call `NpcRoster.rebalance`. Natural/event death may schedule reincarnation through an injected hook; ascension never schedules reincarnation.

- [ ] **Step 5: Hook Stage 4 NPC breakthrough**

Stage 4 NPC simulation calls `NpcLifecycle.onBreakthrough(npc, oldRealm, newRealm)` after success. It must not write lifespan directly.

- [ ] **Step 6: Verify and commit**

```powershell
node --check core/npc-lifecycle.js
node --check core/npc-simulation.js
node selftest_stage5_npc_lifecycle.js
node selftest_stage4_npc_generator.js
node selftest_stage4_npc_simulation.js
npm test
git add core/npc-lifecycle.js core/npc-generator.js core/npc-simulation.js core/npc-roster.js core/event-engine.js selftest_stage4_npc_generator.js selftest_stage5_npc_lifecycle.js selftest_all.js
git commit -m "feat: resolve low-frequency character lifecycles"
```

**Reviewer gate:** Search all status changes, confirm records are permanent, no O(N²) operation appears, pending snapshots remain readable, and routine simulation has no random death.

---

### Task 5: Build permanent kinship and romance restrictions

**Files**

- Create `core/kinship.js`
- Create `selftest_stage5_kinship.js`
- Modify `core/relationships.js`
- Modify `core/stage5-state.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `Kinship.canonicalRef`, `addChild`, `addGuardian`, `ancestors`, `siblings`, `rebuildPlayerRestrictions`, `validate`.
- Extends `Relationships.canRomance` through the existing `systems.relationships.restrictions`.

- [ ] **Step 1: Write graph and multi-generation RED tests**

Prove:

- adding a child updates both parent children lists and the child parent list atomically;
- duplicate links are idempotent;
- a descendant-successor life alias resolves to its original NPC kinship node and never creates a second biological person;
- cycles, self-parenthood, more than two ritual parents, and unknown refs reject;
- blood restrictions cover parent/child, siblings, grandparents, and descendants;
- direct in-law and guardian restrictions persist;
- every formal partner archived from any previous player life enters `permanentRomanceRestrictions`;
- after three player transitions, no old formal partner becomes romanceable;
- gender is not a rejection reason;
- failed graph mutations preserve input.

- [ ] **Step 2: Run expected RED**

```powershell
node selftest_stage5_kinship.js
```

- [ ] **Step 3: Implement bounded ancestry traversal**

Use stable person refs, `personAliases`, and visited sets. `canonicalRef` follows at
most one saved life→NPC alias and rejects alias chains/cycles. `ancestors`
traverses saved parent links to depth 16, enough for the first long-run target;
validation rejects a link that would create a cycle. `rebuildPlayerRestrictions`
derives current-player pair keys without deleting unrelated Stage 4 restrictions.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/kinship.js
node selftest_stage5_kinship.js
node selftest_stage4_relationships.js
npm test
git add core/kinship.js core/relationships.js core/stage5-state.js selftest_stage5_kinship.js selftest_all.js
git commit -m "feat: preserve lineage relationship restrictions"
```

**Reviewer gate:** Audit pair-key direction/order and at least four generations; reject a gender rule, mutable derived cache, lost Stage 4 restriction, or unbounded recursion.

---

### Task 6: Run formal-partner lineage rituals and create multiple children

**Files**

- Create `core/lineage.js`
- Create `selftest_stage5_lineage.js`
- Modify `core/event-engine.js`
- Modify `core/stage4-rules.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `Lineage.proposal`, `startRitual`, `completeRitual`, `generateChild`, `queryDescendants`.
- Adds parallel job `kind:'lineageRitual'`.

- [ ] **Step 1: Write proposal/consent/busy/cooldown RED tests**

Eligibility requires:

```js
bond.stage === 'partner'
npc.status === 'living'
npc.lifeStage === 'adult'
Relationships.canRomance(model, 'player', npcId) === true
no active lineageRitual job
no ritual with the same partner completed in the previous 7 real days
```

Prove any partner gender passes. Consent is determined from saved state:

```js
consentScore =
  trust + affection + loyalty
  - resentment - jealousy
  + ({open:20,negotiable:10,monogamous:5,absoluteMonogamy:0}[principle]);
willing = consentScore >= 100;
```

`proposeLineageRitual` enqueues an authored decision snapshot; it never creates a child. A willing option starts one named parallel job `与{name}筹备传承仪式`; an unwilling event offers only a respectful close option.

- [ ] **Step 2: Write deterministic child and multiple-descendant RED tests**

Prove:

- a ritual completes at exactly 21,600 seconds online/offline;
- one completion creates exactly one new permanent NPC ID;
- player may complete later rituals and own multiple descendant records;
- child appearance selects one saved feature from each parent's snapshot in fixed field order;
- talent/personality tendencies come from parent snapshots;
- one of eight bloodlines is saved;
- child `baseLifespanYears` is an inclusive 56–112 draw and maximum lifespan uses the tier-0 multiplier;
- child is age 0, living, lifeStage child, realmStage 0, never in active/background;
- kinship and blood restrictions are installed before world queries;
- birth appends one world evolution row and one report ID;
- full pending event capacity does not prevent birth;
- same seed/model produces the same child and next RNG.

- [ ] **Step 3: Implement ritual job and deterministic generation**

RNG order:

```text
parent surname choice → first given-name component → second given-name component →
gender → appearance fields in registry order → talent tendency →
personality tendency → bloodline → inclusive base lifespan 56..112
```

The surname draw chooses the first character of the current player or partner
display name at `<0.5`; the two given-name components use the Stage 4 frozen
name arrays. Stable collision suffixing consumes no RNG. Completion writes the
NPC, descendant/ritual/kinship records, biography origin, restrictions, and
evolution in one pure transaction.

- [ ] **Step 4: Integrate parallel dispatch**

Extend the existing Stage 4 parallel lane by `job.kind`; do not create another interval. Same-timestamp completion occurs after lifecycle age resolution and before main action completion.

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/lineage.js
node selftest_stage5_lineage.js
node selftest_stage4_parallel_social.js
node selftest_simulation.js
npm test
git add core/lineage.js core/event-engine.js core/stage4-rules.js selftest_stage5_lineage.js selftest_all.js
git commit -m "feat: add formal lineage rituals and descendants"
```

**Reviewer gate:** Verify no command directly creates a child, partner autonomy is represented, children never enter romance/event candidate pools, capacity cannot lose a birth, and repeated completion is idempotent.

---

### Task 7: Mature descendants into permanent ordinary characters

**Files**

- Modify `core/lineage.js`
- Modify `core/npc-lifecycle.js`
- Modify `core/npc-roster.js`
- Create `selftest_stage5_descendants.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `Lineage.applyUpbringing`, `matureChild`, `eligibleHeirs`.

- [ ] **Step 1: Write upbringing/adulthood RED tests**

Prove:

- four exact upbringing axes are `body,mind,craft,social`, clamped 0–100;
- only snapshotted event effects call `applyUpbringing`;
- upbringing alters saved adult skill/talent weights, never breakthrough probability;
- child reaches adulthood at age 18 exactly after nine real days;
- adulthood happens once, sets `lifeStage:'adult'`, applies upbringing, appends biography/evolution/report, inserts into background, and rebalances;
- an adult descendant receives normal Stage 4 cultivation/travel/sect/relationship simulation;
- unselected adult descendants remain permanent ordinary NPCs through later player transitions;
- eligible heirs are living adult female descendants only, sorted by generation then NPC ID.

- [ ] **Step 2: Implement adulthood boundary**

`NpcLifecycle.nextBoundary` includes every living child's time to age 18. `matureChild` never changes `status`, never removes the descendant metadata, and initializes any missing adult NPC fields from Stage 4 defaults.

- [ ] **Step 3: Verify and commit**

```powershell
node selftest_stage5_descendants.js
node selftest_stage4_roster.js
node selftest_stage4_npc_simulation.js
npm test
git add core/lineage.js core/npc-lifecycle.js core/npc-roster.js selftest_stage5_descendants.js selftest_all.js
git commit -m "feat: mature descendants into the permanent world"
```

**Reviewer gate:** Compare exact boundary chunks, ensure children cannot be targeted by romance, and verify every adult not chosen as heir remains in the world.

---

### Task 8: Upgrade and query the inheritance hall

**Files**

- Create `core/inheritance-hall.js`
- Create `selftest_stage5_inheritance_hall.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `InheritanceHall.requirements`, `upgrade`, `limits`, `setPlan`, `query`.

- [ ] **Step 1: Write upgrade atomicity and level RED tests**

Test every Section 1.4 row. Prove wrong realm/missing currency/missing material fails without mutation; a success consumes exact resources/currency, appends one history row, saves one new level, and does not replace `current`. Level 5 returns `max_level`.

- [ ] **Step 2: Write plan validation RED tests**

Prove:

- full mastery IDs must exist and obey the current slot count;
- techniques must be learned;
- equipment IDs must be owned;
- resources allow only material/consumable, never quest/technique/equipment;
- beasts must be in the roster;
- formation blueprints must be discovered;
- family bonuses must be unlocked;
- duplicate IDs reject;
- shrinking assets makes query mark selections invalid but does not silently replace them;
- `setPlan` rejects an invalid candidate atomically;
- frozen query returns limits, costs, selections, availability, and inheritance estimates.

- [ ] **Step 3: Implement upgrade and saved plan**

All item costs go through one `Inventory.apply`; spirit stones are deducted only after that candidate succeeds. Plan arrays preserve stable content/player order and store IDs only.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/inheritance-hall.js
node selftest_stage5_inheritance_hall.js
npm test
git add core/inheritance-hall.js selftest_stage5_inheritance_hall.js selftest_all.js
git commit -m "feat: build the cave inheritance hall"
```

**Reviewer gate:** Recompute each limit/cost, mutate nested queries, remove selected assets, and verify no over-limit or stale plan can enter a transition.

---

### Task 9: Project exact inherited progression and assets

**Files**

- Create `core/inheritance-projector.js`
- Create `selftest_stage5_inheritance_projection.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `InheritanceProjector.validate`, `cumulativeMasteryXp`, `masteryFromCumulativeXp`, `project`, `queryPreview`.

- [ ] **Step 1: Write the complete reset/retention matrix as RED tests**

Use one fixture containing all 12 skills, 30 masteries, 16 techniques, bound equipment, 20 resources, 4 beasts, 5 formations, sect relationships, premium currency, combat progress, farm plots, and social jobs.

Assert:

```js
for (const skillId of canonicalTwelve) {
  deepEqual(next.player.skills[skillId], old.player.skills[skillId]);
}
deepEqual(next.player.mastery[selectedId], old.player.mastery[selectedId]);
ok(totalXp(next.player.mastery[unselectedId]) ===
   Math.floor(totalXp(old.player.mastery[unselectedId]) * hall.partialMasteryRate));
```

Prove every matrix bullet in Section 1.5, including no duplicate first-clear rewards, full premium-currency retention, plan-percentage spirit stones, no quest/book resource inheritance, reset bindings/loadouts/injury/social jobs, and preservation of farm/world/report history.

- [ ] **Step 2: Implement cumulative mastery conversion**

```js
function cumulativeMasteryXp(progress) {
  let total = Math.floor(progress.xp);
  for (let level = 1; level < progress.level; level++) {
    total += SkillProgression.masteryXpNeed(level);
  }
  return total;
}
```

Rebuild through the same curve, cap at 99/xp 0, and never approximate by multiplying the level number.

- [ ] **Step 3: Implement pure projection**

`project(model, plan, routeContext, deps)` returns:

```js
{
  ok, code,
  successor: {player,systemsPatch},
  retained, reset, archived,
  warnings
}
```

It does not mutate the world, save, consume RNG, archive relationships, or select an identity. It uses only an already-validated plan and route context.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/inheritance-projector.js
node selftest_stage5_inheritance_projection.js
npm test
git add core/inheritance-projector.js selftest_stage5_inheritance_projection.js selftest_all.js
git commit -m "feat: project configured inheritance exactly"
```

**Reviewer gate:** Independently calculate cumulative mastery XP at levels 1/50/99 and every hall level; audit all money/item/binding changes for duplication or silent loss not shown in preview.

---

### Task 10: Preview and atomically execute player-life transitions

**Files**

- Create `core/legacy-transition.js`
- Create `selftest_stage5_legacy_transition.js`
- Modify `core/breakthrough.js`
- Modify `core/event-engine.js`
- Modify `core/npc-roster.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `LegacyTransition.begin`, `chooseRoute`, `updateDraft`, `preview`, `confirm`, `cancel`.
- Consumes `InheritanceProjector`, `Lineage.eligibleHeirs`, `Kinship`, and an injected relationship-archive adapter.

- [ ] **Step 1: Write pending-transition and eligibility RED tests**

Saved draft:

```js
{
  id: 'transition-1',
  cause: 'lifespan' | 'voluntary' | 'ascension',
  route: null | 'descendant' | 'newIdentity',
  heirNpcId: null,
  draft: null | {
    name,
    gender: 'female',
    appearance,
    originId,
    personalityId,
    talentId
  },
  createdAt,
  previewVersion: 1
}
```

Prove:

- `lifespan` begins only when `pendingCause==='lifespan'`;
- `ascension` begins only after the final Stage 3 ascension transition;
- `voluntary` begins from an active life at any age;
- one pending transition blocks another;
- descendant selection accepts only `Lineage.eligibleHeirs`;
- new-identity draft rejects empty/over-12-character name, invalid avatar part, origin/personality/talent, or nonfemale gender;
- preview lists every retained/reset/archived value before confirm;
- only voluntary transition may cancel; lifespan/ascension remains blocking;
- input remains unchanged on all failures.

- [ ] **Step 2: Write descendant transition RED tests**

On confirm:

- call `InheritanceProjector.project` exactly once;
- append one immutable old-life chronicle with outcome `handover`;
- mark chosen NPC `playerIdentity`, remove it from active/background, and retain its record;
- add `personAliases['life:' + newLifeId] = 'npc:' + heirNpcId`, so genealogy treats the successor as one person;
- archive/remove the chosen NPC's prior edges/bonds and reconcile its
  pending events/jobs before the status change;
- set new player name/appearance/origin/personality/talent from that descendant;
- set player realm to the heir realm clamped to the prior player realm and cultivation 0;
- increment generation/life ID exactly once;
- preserve unchosen adult descendants as ordinary NPCs;
- never create an NPC record for the old player;
- rebuild kinship/restrictions before the returned candidate is visible.

- [ ] **Step 3: Write new-identity, lifespan, and ascension RED tests**

Prove:

- a new identity is female, age 18, qi-1, cultivation 0, and has no NPC duplicate;
- old-life outcome is `reincarnated` for lifespan/voluntary new identity;
- ascension cause records outcome `ascended` whether the next route is descendant or new identity;
- Stage 3 final breakthrough sets `player.lifecycle.status='transition_pending'`, `pendingCause='ascension'`, and clears the main action;
- transition resolves player-scope and selected-heir pending events to `resolvedRecent` with result `life_changed`, preserving snapshots;
- player social jobs are archived/cancelled, while farm and non-player world time remain;
- save failure leaves the old player life, NPC tiers, inventory, events, and pending draft byte-identical;
- repeated confirm by transition ID is idempotent.

- [ ] **Step 4: Implement one pure candidate transaction**

Order:

```text
validate current transition and hall plan
select route identity
project inherited progression/assets
archive old life and relationships
reconcile player-scope events/jobs
apply route identity/realm
apply world-preserving projected patch
rebuild kinship and permanent restrictions
increment IDs and clear pendingTransition
append one evolution/report record
normalize v6 candidate
```

`confirm` returns `{ok,code,state,transitionId,preview}` and never saves itself. The controller's established `commitModel` persists once, then replaces runtime state.

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/legacy-transition.js
node selftest_stage5_legacy_transition.js
node selftest_stage3_breakthrough.js
node selftest_stage4_event_engine.js
npm test
git add core/legacy-transition.js core/breakthrough.js core/event-engine.js core/npc-roster.js selftest_stage5_legacy_transition.js selftest_all.js
git commit -m "feat: execute atomic player-life transitions"
```

**Reviewer gate:** Inspect every reset/preserve branch, simulate save failure/retry, and reject a duplicate heir, old-player NPC, hidden asset deletion, relationship carryover, event loss, or partial transition.

---

### Task 11: Archive old relationships and enable memento reunions

**Files**

- Create `core/memory-reunion.js`
- Create `selftest_stage5_memory_reunion.js`
- Modify `core/legacy-transition.js`
- Modify `core/event-engine.js`
- Modify `core/relationships.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `MemoryReunion.archiveSubjectRelationships`, `archivePlayerRelationships`, `createMementos`, `tryQueue`, `resolveRecognition`, `query`.

- [ ] **Step 1: Write archive/reset RED tests**

Significance score is exact:

```js
score(edgeA, edgeB, bond) =
  sumEight(edgeA) + sumEight(edgeB)
  + ({partner:1000,lover:500,friend:100,enemy:50}[bond.stage] || 0);
```

Sort descending score, then NPC ID. Archive every formal partner plus the top
50 other connected people. Apply the same algorithm to subject `player` and to
a descendant NPC immediately before it becomes the player. Prove:

- both player-direction edges and player bonds leave active relationship state;
- all heir-NPC direction edges and bonds leave active relationship state before `status:'playerIdentity'`;
- unrelated NPC↔NPC edges/bonds remain;
- relationship archive contains frozen numeric snapshots;
- every former formal partner creates a permanent prior-generation restriction;
- memento IDs are stable and idempotent;
- no new identity starts with restored values/stage.

- [ ] **Step 2: Write capacity/reunion RED tests**

Prove:

- unrevealed mementos are omitted from ordinary relationship queries;
- at a Stage 4 event slot, one eligible memento may queue an authored memory event;
- pending capacity 20 leaves `eventQueued:false` and does not discard the memento;
- event resolution may reveal identity, set a new `acquaintance` or `friend` stage, and add at most 10 points per relationship metric;
- it never copies the archived stage/value snapshot;
- a prior formal partner remains non-romanceable after friendly reunion;
- repeated event resolution is idempotent.

- [ ] **Step 3: Implement event-only recognition**

Only `revealMemento` effects call `resolveRecognition`. Direct command/query access is absent. Existing keepsake and memory objects remain in the hall even after revelation.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/memory-reunion.js
node selftest_stage5_memory_reunion.js
node selftest_stage4_relationships.js
node selftest_stage4_event_schedule.js
npm test
git add core/memory-reunion.js core/legacy-transition.js core/event-engine.js core/relationships.js selftest_stage5_memory_reunion.js selftest_all.js
git commit -m "feat: restart relationships through memory events"
```

**Reviewer gate:** Transition through three lives, inspect all player-key edges/bonds, and prove neither high old values nor partnership returns automatically.

---

### Task 12: Reincarnate a minority of NPCs with hidden marks

**Files**

- Create `core/reincarnation.js`
- Create `selftest_stage5_reincarnation.js`
- Modify `core/npc-lifecycle.js`
- Modify `core/npc-generator.js`
- Modify `core/event-engine.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `Reincarnation.consider`, `nextBoundary`, `resolveDue`, `revealMark`, `queryRevealed`.

- [ ] **Step 1: Write chance/delay/identity RED tests**

For a non-ascended death, consume RNG in exact order:

```text
20% reincarnation chance → inclusive delay 7..30 real days →
one hidden marker → Stage 4 new-person generation draws
```

Prove:

- 0.1999 schedules and 0.20 does not;
- ascended and already-reincarnated records never schedule;
- due time is within exact bounds and survives JSON;
- resolving creates a new unique NPC ID, new name/appearance/family, living adult state, and background tier;
- old record becomes `reincarnated` and points to the new ID;
- new record points to old ID and stores one hidden mark;
- no old relationship edge, bond, sect membership, item, or visible biography is copied;
- hidden mark/tendency may influence generated talent/personality weights only;
- ordinary queries cannot reveal `previousNpcId` or hidden marks;
- authored `revealReincarnationMark` reveals one mark and queues/records a clue without restoring a relationship;
- long/chunked delay resolution is identical.

- [ ] **Step 2: Implement queue and new identity**

Use Stage 4 `NpcGenerator.generateOne`, then explicitly clear inherited social identity and assign a fresh family. Keep queue order by `dueAt`, then `sourceNpcId`. Resolution continues at pending capacity because it is world evolution.

- [ ] **Step 3: Verify and commit**

```powershell
node --check core/reincarnation.js
node selftest_stage5_reincarnation.js
node selftest_stage4_npc_generator.js
npm test
git add core/reincarnation.js core/npc-lifecycle.js core/npc-generator.js core/event-engine.js selftest_stage5_reincarnation.js selftest_all.js
git commit -m "feat: reincarnate characters with hidden echoes"
```

**Reviewer gate:** Inspect public ViewModels and saved edges, verify new identity separation, stable RNG consumption, no ascended reincarnation, and no relationship auto-restore.

---

### Task 13: Schedule ascended-character blessings

**Files**

- Create `core/ascended-blessings.js`
- Create `selftest_stage5_blessings.js`
- Modify `core/npc-lifecycle.js`
- Modify `core/event-engine.js`
- Modify `core/breakthrough.js`
- Modify `selftest_all.js`

**Interfaces**

- Produces `AscendedBlessings.schedule`, `nextBoundary`, `resolveDue`, `applyEffect`.

- [ ] **Step 1: Write schedule and six-effect RED tests**

Prove:

- one schedule is created at NPC ascension with an inclusive 7–14-day delay;
- due order is timestamp then NPC ID;
- every due blessing selects one of six effects with saved RNG, appends evolution/report, and schedules the next delay;
- resource gift adds 5,000 spirit stones;
- skill insight grants 100 XP to the lowest-level canonical life skill, stable skill order breaking ties;
- technique insight grants 200 XP to the lowest-level learned technique, stable content order breaking ties, or falls back to spirit stones when none is learned;
- longevity blessing calls `PlayerLifespan.extend(model, 10, {source:'ascendedBlessing'})`;
- memory blessing reveals/queues one memento but remains dormant if pending is full;
- omen blessing calls `Breakthrough.addEventBuff({id,bonus:0.10,usesRemaining:1})`;
- adding combat equipment, family bonuses, sect values, or relationship values does not change omen magnitude;
- blessings never reinsert the ascended NPC into active/background tiers.

- [ ] **Step 2: Implement through domain adapters**

The blessing module never writes skill/technique/breakthrough internals directly. Inject `SkillProgression`, `Techniques`, `PlayerLifespan`, `MemoryReunion`, and `Breakthrough` adapters. Each effect is one cloned transaction.

- [ ] **Step 3: Verify and commit**

```powershell
node --check core/ascended-blessings.js
node selftest_stage5_blessings.js
node selftest_stage3_breakthrough.js
npm test
git add core/ascended-blessings.js core/npc-lifecycle.js core/event-engine.js core/breakthrough.js selftest_stage5_blessings.js selftest_all.js
git commit -m "feat: let ascended characters bless the world"
```

**Reviewer gate:** Trace every breakthrough probability write, verify only the event adapter is used, and prove scheduling cannot duplicate or reactivate an ascended person.

---

### Task 14: Author and validate 24 lifecycle event templates

**Files**

- Create `content/lineage-events.js`
- Create `selftest_stage5_event_content.js`
- Modify `content/event-templates.js`
- Modify `index.html`
- Modify `selftest_all.js`

**Interfaces**

- Produces frozen `LineageEventContent.TEMPLATES`.
- Extends the Stage 4 registry without changing saved Stage 4 template instances.

- [ ] **Step 1: Register exact template/reference RED tests**

The exact IDs and purposes are:

| Category | ID | Title | Required effect/result |
|---|---|---|---|
| lineage | `lineage-ritual-willing` | 共议传承 | `startLineageRitual` |
| lineage | `lineage-ritual-respect` | 暂缓仪式 | respectful close |
| lineage | `lineage-birth-notice` | 新生入谱 | birth summary |
| lineage | `lineage-upbringing-body` | 强健根骨 | `applyUpbringing:body` |
| lineage | `lineage-upbringing-mind` | 静心启蒙 | `applyUpbringing:mind` |
| lineage | `lineage-upbringing-craft` | 授以百艺 | `applyUpbringing:craft` |
| lineage | `lineage-upbringing-social` | 识人知礼 | `applyUpbringing:social` |
| lineage | `lineage-adulthood` | 冠礼已成 | adult summary |
| memory | `memory-keepsake-found` | 旧物重见 | `revealMemento` |
| memory | `memory-familiar-dream` | 梦里故人 | `revealMemento` |
| memory | `memory-old-letter` | 墨迹依稀 | `revealMemento` |
| memory | `memory-technique-echo` | 招式似曾相识 | `revealMemento` |
| memory | `memory-reunion-choice` | 今生再会 | new acquaintance/friend only |
| memory | `memory-former-partner-boundary` | 前缘已远 | friendly reunion, romance still forbidden |
| lifecycle | `lifecycle-natural-passing` | 寿尽归尘 | memorial summary |
| lifecycle | `lifecycle-memorial-visit` | 故人碑前 | optional memory event |
| lifecycle | `lifecycle-reincarnation-omen` | 似曾相识的身影 | clue only |
| lifecycle | `lifecycle-mark-awakening` | 前尘一瞬 | `revealReincarnationMark` |
| ascension | `ascension-departure` | 羽化登临 | ascension summary |
| ascension | `blessing-resource` | 云外遗珍 | resource blessing |
| ascension | `blessing-insight` | 梦授心得 | skill/technique insight |
| ascension | `blessing-longevity` | 仙露添寿 | longevity blessing |
| ascension | `blessing-memory` | 一梦唤旧 | memory blessing |
| ascension | `blessing-breakthrough-omen` | 天光垂兆 | event breakthrough buff |

Assert category counts `8/6/4/6`, unique IDs/revisions, valid Stage 5 requirements/effects, valid content references, concrete Chinese text, and no forbidden wording.

- [ ] **Step 2: Run expected RED**

```powershell
node selftest_stage5_event_content.js
```

- [ ] **Step 3: Write all 24 complete data-only templates**

Every template has requirements, participants, title, body, at least one complete option, exact snapshottable effects, and cooldown. Conflict/memory options preview permanent prior-partner restrictions. No executable code, empty option, duplicate renamed body, generic `NPC响应`, `等待NPC`, `系统等待`, or `双修`.

Register requirements/effects through Stage 4 allowlists; resolving an old v5 pending snapshot remains independent of this registry revision.

- [ ] **Step 4: Verify and commit**

```powershell
node --check content/lineage-events.js
node selftest_stage5_event_content.js
node selftest_stage4_event_content.js
npm test
git add content/lineage-events.js content/event-templates.js index.html selftest_stage5_event_content.js selftest_all.js
git commit -m "feat: author lifecycle and lineage events"
```

**Reviewer gate:** Read every body/option/effect, verify partner consent and manageable choices, and reject direct transition/death/relationship restoration or repetitive machine-like text.

---

### Task 15: Integrate one deterministic Stage 5 lifecycle runtime

**Files**

- Create `core/stage5-rules.js`
- Create `selftest_stage5_simulation.js`
- Modify `core/stage4-rules.js`
- Modify `core/game-rules.js`
- Modify `core/simulation-report.js`
- Modify `game.js`
- Modify `index.html`
- Modify `selftest_all.js`
- Modify `selftest_foundation.js`

**Interfaces**

- Produces `Stage5Rules.create(deps) -> {rules,lanes}` by extending Stage 4.
- Exactly one lifecycle lane owns player/NPC age, death/adulthood, reincarnation, ascension, blessing, and lineage jobs.

- [ ] **Step 1: Write ordering, stop, and report RED tests**

Prove:

- a lifespan buffer at the same instant as a main action stops before that completion;
- a child's adulthood resolves before Stage 4 NPC decisions;
- natural death resolves before a dead person could finish a social action;
- reincarnation and blessing resolve before Stage 4 event selection at the same timestamp;
- lineage ritual job completes through the existing parallel dispatch;
- `lifespan_buffer` clears current but leaves farm/world/NPC/other-person parallel work;
- all lifecycle report arrays aggregate deterministically and offline overlay exposes counts only;
- starting combat/gathering/production/social while buffered returns `lifespan_buffer`;
- immediate hall/event/transition controls remain available.

- [ ] **Step 2: Implement Stage 5 lane composition**

Do not append a second age lane. Construct one frozen lane order:

```js
[
  stage5LifecycleLane,
  // every previously registered Stage 4 lane except its provisional age lane
  ...stage4NonAgeLanes
]
```

Within `stage5LifecycleLane.resolve`, use Section 1.6 ordering. Boundary discovery returns the minimum finite positive boundary among buffer, child adulthood, natural death, reincarnation, blessing, and ascension cadence.

- [ ] **Step 3: Write online/offline/save equivalence**

Compare byte-identical normalized state/RNG and aggregated reports:

```text
48h: one offline call vs 192 × 15m online
30d: one call vs 120 × 6h
player buffer exactly at main completion
child adulthood exactly at NPC active step
death exactly at social-job completion
reincarnation and blessing at same timestamp
save/reload one second before/at/after every boundary
pending events=20 for every matrix
```

Main action remains capped at the configured 12–48h; lifecycle/farm/world/NPC/parallel uses the full 30 days.

- [ ] **Step 4: Load modules and enforce pure boundaries**

Add scripts in dependency order before `game.js`. Extend static scans:

```js
for (const file of stage5PureFiles) {
  ok(!/Math\.random|Date\.now|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(source));
}
```

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/stage5-rules.js
node selftest_stage5_simulation.js
node selftest_simulation.js
node selftest_foundation.js
npm test
git add core/stage5-rules.js core/stage4-rules.js core/game-rules.js core/simulation-report.js game.js index.html selftest_stage5_simulation.js selftest_foundation.js selftest_all.js
git commit -m "feat: integrate long-term lifecycle simulation"
```

**Reviewer gate:** Search for every age/timer owner, compare all boundary permutations, and reject fixed-step offline shortcuts, duplicate reports, event-capacity pauses, or time loss after main-action stop.

---

### Task 16: Expose frozen Stage 5 commands and ViewModels

**Files**

- Create `selftest_stage5_api.js`
- Modify `game.js`
- Modify `selftest_ui.js`
- Modify `selftest_all.js`

**Interfaces**

- Adds only the methods in Section 1.7.
- Preserves the frozen `{queries,commands,render}` boundary and standard command result.

- [ ] **Step 1: Write API shape/freeze RED tests**

Assert all methods exist, nested ViewModels are deeply frozen, and no `state`, `data`, `persist`, RNG, hidden reincarnation marker, unrestricted lifecycle setter, or raw relationship archive is exposed.

- [ ] **Step 2: Write command transaction RED tests**

Prove:

- ritual proposal, hall upgrade, plan update, longevity consumption, transition begin/route/draft/confirm/cancel all use standard results;
- successful persistent commands save exactly once;
- validation/save failure saves zero times and leaves runtime unchanged;
- repeated transition confirm is idempotent;
- no command creates a child, restores a relationship, kills/ascends/reincarnates a person, or reveals hidden marks;
- Stage 4 `chooseEvent` remains the only player route for ritual acceptance/upbringing/memory effects.

- [ ] **Step 3: Implement exact ViewModels**

`queries.inheritanceHall`:

- `overview`: level, next upgrade, lifespan, buffer, adult-heir count, family bonuses;
- `genealogy`: stable tree nodes/links without coordinates;
- `chronicles`: current plus compact past-life biographies;
- `previousLives`: mementos/revealed memories and completed outcomes;
- `plan`: limits, selected/available content and exact retained/reset preview;
- `descendants`: child/adult cards, parents, age, upbringing, heir eligibility.

`queries.legacyTransition` returns cause, routes, eligible heir cards, new-identity options/draft, preview, irreversible reset copy, and confirmation availability.

Extend existing `events/world/relationship` queries with status/lineage rows. Hidden reincarnation fields remain absent until revealed.

- [ ] **Step 4: Verify and commit**

```powershell
node --check game.js
node selftest_stage5_api.js
node selftest_ui.js
npm test
git add game.js selftest_stage5_api.js selftest_ui.js selftest_all.js
git commit -m "feat: expose frozen lineage and lifecycle APIs"
```

**Reviewer gate:** Mutate every query depth, retry every command after save failure, and inspect output for hidden marks, raw archives, mutable state, or bypass commands.

---

### Task 17: Render lifespan, descendants, inheritance, and transition UI

**Files**

- Modify `ui.js`
- Modify `styles.css`
- Modify `selftest_ui.js`
- Create `selftest_stage5_ui.js`
- Modify `selftest_all.js`

**Interfaces**

- Consumes only `GameAPI.queries/commands/render`.
- Replaces the Stage 2 reserved inheritance card inside the existing cave sub-tabs; adds no left-nav item.

- [ ] **Step 1: Add shell and Stage 5 UI RED assertions**

Preserve one topbar/nav/content/modal root, exact nav order, offline-first login, all Stage 2–4 pages, combat layout, and avatar Canvas. Assert no map or replacement shell.

- [ ] **Step 2: Render player lifespan safely**

Top/home/hall show:

```text
年龄
剩余寿元 / 寿元上限
当前境界提供的寿元
距离安全缓冲的现实时间
```

At buffer, the game fires a **one-time, edge-triggered** `寿元将尽` prompt modal (title `寿元将尽`; body explains the current action has stopped and social/sect actions are locked; buttons `开始人生转换` / `稍后处理`). It opens only on the transition into `safety_buffer` and never re-opens while status is unchanged, so the old per-frame watcher is gone. Never display automatic death countdown, and never auto-begin the transition.

- [ ] **Step 3: Implement inheritance-hall sections**

Inside `洞府 / 传承殿`, render compact tabs:

```text
传承殿 / 族谱 / 历代传记 / 前世 / 传承方案 / 后代
```

Show exact level limits/upgrade costs, genealogy tree as nested cards/lines without spatial coordinates, past-life outcomes, mementos, child age/adulthood progress, formal partner/parents, upbringing, and heir eligibility.

Plan UI has ordered selectors and counters for mastery, techniques, equipment, resources, beasts, blueprints, bonuses. It displays full/partial percentages and exact preview. It never hides reset consequences.

- [ ] **Step 4: Render rituals and transition modal**

Formal-partner cards offer `共议传承仪式`, calling only `proposeLineageRitual`. Active ritual shows `与{name}筹备传承仪式` progress; no rigid response/wait copy.

The full-screen transition modal:

- displays cause `主动传代 / 寿元将尽 / 飞升`;
- offers eligible adult descendant cards and `创建全新身份`;
- reuses avatar editing for a new identity;
- shows retained/reset/archived details and permanent relationship reset;
- has one explicit in-game confirmation button calling `confirmLegacyTransition`;
- cannot close a lifespan/ascension-required flow, but voluntary flow can cancel.

- [ ] **Step 5: Extend world/event/relationship display**

Event world rows render birth, adulthood, death, reincarnation clues, ascension, blessing, and legacy transitions. Dead/ascended people retain biography pages but have no social buttons. Hidden reincarnation identity/marks do not leak. Prior-generation partner displays `前代正式伴侣：不可发展恋爱关系`.

The prior player appears only in hall chronicles, never the relationship/world active-person list.

- [ ] **Step 6: Add responsive styles and browser tests**

Add only:

```text
.lifespan-card, .buffer-warning, .inheritance-tabs, .hall-level,
.genealogy-tree, .genealogy-node, .chronicle-card, .descendant-card,
.inheritance-plan, .inheritance-counter, .legacy-route, .legacy-preview,
.memento-card, .lifecycle-status
```

At 360×800 and 420×820, no body horizontal scroll; tree/plan use internal wrapping/scroll, buttons are at least 44 CSS pixels high.

Use `game-studio:game-playtest` to verify:

1. offline overlay before lifecycle/event pages;
2. player reaches buffer with no silent death;
3. formal-partner ritual and multiple descendants;
4. child adulthood;
5. hall upgrade/plan;
6. descendant transition;
7. new-identity transition;
8. old relationship reset/memento reunion;
9. dead/ascended biography;
10. no console error or shell regression.

- [ ] **Step 7: Verify and commit**

```powershell
node --check ui.js
node selftest_stage5_ui.js
node selftest_ui.js
npm test
git add ui.js styles.css selftest_ui.js selftest_stage5_ui.js selftest_all.js
git commit -m "feat: render lineage and long-term lifecycle ui"
```

**Reviewer gate:** Compare prior shell screenshots, inspect every reset warning and status copy, and verify no former player/hidden reincarnation data appears in ordinary world UI.

---

### Task 18: Prove multi-generation determinism, safety, and bounded growth

**Files**

- Create `selftest_stage5_longrun.js`
- Modify `selftest_all.js`
- Modify Stage 5 modules only when tests expose a root cause

- [ ] **Step 1: Add deterministic long-run matrix**

Compare normalized state/RNG/report aggregation for:

```text
8 real weeks: one offline call vs 224 × 6h
8 real weeks with pending=20
three rituals with three children and exact adulthood boundaries
descendant succession through three generations
new identity after two descendant lives
ascension followed by descendant route
natural deaths, reincarnation, and blessing sharing timestamps
save/reload before and after every transition confirmation
```

Assert all 12 skills never change during transition projection, full/partial masteries match formulas, old relationships remain reset, restrictions persist, old player never enters NPC records, and unchosen descendants remain.

- [ ] **Step 2: Add performance and storage limits**

Fixtures:

- production world: 120 NPC, 40 active, 20 pending, 8 real weeks;
- stress world: 1,000 NPC, 50 active, 5,000 sparse edges, 100 descendants, 20 player lives, 1 real year;
- 100 NPCs expiring at the same boundary;
- 100 due reincarnations/blessings.

Authoritative operation bounds:

```text
lifecycle boundary scan <= total NPC records once per resolved boundary
kinship traversal <= saved links within depth 16
inheritance projection <= number of player progress/assets
no NPC×NPC matrix
```

Storage limits:

```text
events pending 20, summaries 300, evolution 500, then Stage 4 compaction
NPC biography detailed entries 100 each, then ten-year compaction
relationship archive formal partners + top 50 others per life
ritual full rows 100, then yearly count compaction
all life chronicles retained as compact records
```

Stress simulation must finish under 5 seconds on the repository Node environment; operation counters, not wall time alone, are authoritative.

- [ ] **Step 3: Run twice in fresh processes**

```powershell
node selftest_stage5_longrun.js
node selftest_stage5_longrun.js
node selftest_stage4_performance.js
node selftest_stage5_simulation.js
npm test
```

- [ ] **Step 4: Commit**

```powershell
git add selftest_stage5_longrun.js selftest_all.js core content game.js
git commit -m "test: verify deterministic multi-generation worlds"
```

**Reviewer gate:** Reproduce both runs, inspect operation counters and serialized size, and reject omitted RNG/events/relationships/kinship, loosened limits, or hardware-only timing claims.

---

### Task 19: Synchronize release and run the Stage 5 engineering gate

**Files**

- Modify `scripts/sync-release.js`
- Modify `selftest_release_sync.js`
- Modify `package.json` only if the established script name requires correction
- Generate `release/content/**`
- Generate `release/core/**`
- Generate `release/index.html`
- Generate `release/game.js`
- Generate `release/ui.js`
- Generate `release/styles.css`

- [ ] **Step 1: Add all Stage 5 runtime files to release hash checks**

Run `npm test` before synchronization.

Expected: release suite lists missing/drifted Stage 5 files.

- [ ] **Step 2: Run the established one-way sync**

Use the existing `npm run sync-release` or `npm run release:sync` name already delivered by previous stages. Do not create a competing alias, patch `release/` manually, copy release back to root, or touch `release/NIE`.

- [ ] **Step 3: Run complete syntax/test scans**

```powershell
node --check content/lifecycle.js
node --check content/lineage-events.js
node --check core/stage5-state.js
node --check core/player-lifespan.js
node --check core/npc-lifecycle.js
node --check core/kinship.js
node --check core/lineage.js
node --check core/inheritance-hall.js
node --check core/inheritance-projector.js
node --check core/legacy-transition.js
node --check core/memory-reunion.js
node --check core/reincarnation.js
node --check core/ascended-blessings.js
node --check core/stage5-rules.js
node --check game.js
node --check ui.js
npm test
```

- [ ] **Step 4: Run forbidden-boundary scans**

```powershell
rg -n "Math\.random|Date\.now|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(" core content
rg -n "GameAPI\.(state|data|persist)|\ba\.(state|data|persist)\b" ui.js
rg -n "NPC响应|等待NPC|系统等待|双修|大地图" content ui.js
rg -n "break.*(family|bloodline|hall)|probability.*(family|bloodline|hall)" core content
```

Expected: no uncontrolled simulation/UI/storage access, forbidden player copy, mutable API access, or non-event inheritance probability source.

- [ ] **Step 5: Verify release and idempotent sync**

```powershell
npm test
npm run sync-release
npm test
git diff --exit-code
```

Repeat browser smoke against the release entry.

- [ ] **Step 6: Commit**

```powershell
git add scripts/sync-release.js selftest_release_sync.js package.json release
git commit -m "build: synchronize verified stage 5 runtime"
```

**Final reviewer gate:** Use `superpowers:requesting-code-review` over the complete Stage 5 commit range. Run full tests, long-run tests, sync twice, and browser smoke. No unresolved Serious or Important issue may remain.

---

## 5. Stage 5 Completion Gate

- Schema v6 migrates explicitly from v5 and retains the complete v1→v6 chain.
- One world year is 43,200 real seconds; ordinary NPC lives span 4–8 real weeks before realm multipliers.
- Player lifespan stops at a one-year safety buffer, never silently kills/transitions offline, and blocks only new main actions.
- Breakthrough, registered longevity items, and authored blessings increase lifespan without reducing prior remaining life.
- NPCs age without player protection; natural/explicit event death is low-frequency, permanent records are never deleted, and ordinary combat defeat never kills.
- Higher NPC realms strictly extend lifespan.
- Formal partners of any gender can autonomously accept a named six-hour lineage ritual; repeated rituals can create multiple permanent descendants.
- Children are excluded from adult/romance simulation, mature exactly at age 18, then become ordinary permanent world characters.
- Blood, direct-in-law, guardian, and prior-generation-partner restrictions survive every life transition.
- The cave inheritance hall has five tested levels, exact upgrade costs, visible slots/percentages, genealogy, chronicles, previous lives, descendants, and a saved plan.
- All 12 life-skill level/XP records remain exact across every transition.
- Selected masteries inherit exactly; unselected masteries use cumulative XP at the hall percentage.
- Configured techniques, equipment, resources, beasts, blueprints, family bonuses, and sect recognition inherit within tested limits.
- Descendant and new-identity transitions are previewed and atomic; save failure/retry cannot duplicate/loss assets or identities.
- Unchosen adult descendants remain ordinary NPCs; a chosen heir becomes `playerIdentity`; the prior player is never an active NPC.
- Previous player relationships reset; only memento/memory events begin a new relationship; old values/stages do not restore.
- NPC reincarnation generates a distinct identity with hidden marks and no old relationships.
- NPC ascension removes the person from daily pools, preserves biography, and can issue six tested blessing types.
- Player lifespan, voluntary handover/rebirth, and ascension all reach the same safe transition UI.
- Pending capacity never pauses natural death, adulthood, reincarnation, ascension, blessing, or player lifespan protection.
- One unified simulation is online/offline/save-reload equivalent across 8-week and multi-generation matrices.
- Existing Stage 1B–4 gameplay/UI, offline-first flow, event page, world, relationships, sects, combat, skills, cave, and Canvas have no regression.
- Root/release hashes match, all tests pass, and independent review has no unresolved Serious or Important issue.

---

## 6. Commander Dispatch Order

Use one fresh implementer and a separate fresh reviewer for every numbered task:

```text
1  lifecycle content
2  schema v6
3  player lifespan safety
4  NPC death/ascension
5  kinship restrictions
6  rituals/child generation
7  child adulthood
8  inheritance hall
9  inheritance projection
10 player-life transition
11 relationship archive/memory reunion
12 NPC reincarnation
13 ascended blessings
14 authored lifecycle events
15 unified simulation
16 API
17 UI/playtest
18 long-run/performance
19 release/final review
```

Tasks are sequential because each freezes state or simulation interfaces used by the next. Template prose for Task 14 may be drafted by a helper only after Tasks 6/11–13 lock their effect contracts; one implementer owns validation and the commit.

---

## 7. Primary Risks and Controls

| Risk | Required control |
|---|---|
| Stage 1B and Stage 4 both age people | Task 3/4 remove provisional age lanes; source scans and exact 48h equality |
| Player silently dies offline | One-year clamp, `lifespan_buffer`, no automatic transition |
| Routine NPC death becomes noisy | Natural/explicit lethal causes only; 56–112-year base and realm multipliers |
| Child enters romance/world simulation early | `lifeStage:'child'`, tier exclusion, candidate tests |
| Prior partners become romanceable after reset | Permanent restriction set rebuilt on every life |
| Inheritance duplicates bound assets | Pure projector, one candidate transaction, binding reset, matrix review |
| Skill/mastery math loses progress | Exact 12-skill copy and cumulative mastery-XP reconstruction |
| Transition partially saves | One controller transaction; save-failure/retry/idempotency tests |
| Old player becomes duplicate NPC | Life chronicle only; explicit source scan/assertion |
| Pending events become invalid after death/life change | Preserve snapshots, lifecycle closure option, `life_changed` resolution |
| Hidden reincarnation leaks | Separate hidden/revealed fields and API tests |
| Ascended blessing bypasses breakthrough rule | Event adapter is the only allowed chance path |
| Lifecycle pauses at pending capacity | Autonomous evolution continues; dormant mementos wait safely |
| Save grows forever | Existing event compaction plus biography/relationship/ritual limits |
| Long offline simulation becomes quadratic | One boundary scan, sparse edges, bounded kinship traversal, operation counters |
| UI replaces established layout | Additive cave/modal sections and shell screenshot/DOM tests |
| Release drifts | One-way allowlist, hashes, two clean sync runs |

---

## 8. Plan Self-Review

- Spec coverage: player safety buffer, NPC aging/death/realm lifespan, formal-partner ritual, multiple descendants/adulthood, inheritance hall, both player routes, exact skill/mastery inheritance, every requested asset class, relationship reset/reunion, prior-player exclusion, NPC reincarnation marks, NPC ascension/blessings, and player ascension/rebirth entrances each map to code/tests/UI.
- Interface consistency: Stage 5 is schema v6, uses v5 NPC/relationship/event/sect/parallel state, preserves frozen GameAPI, and owns no second world or clock.
- Reset safety: every retained/reset/archived field is listed and tested; premium currency, permanent first clears, cave/world history, and unchosen descendants cannot be silently lost.
- Long-term safety: all people remain permanent records or compact life chronicles, histories are bounded where detailed text grows, and generation/reincarnation cannot restore relations automatically.
- UI continuity: `传承殿` fills its existing cave slot, transition uses the existing modal layer, and no navigation/map/framework change is authorized.
- Placeholder/signature self-check: all 19 tasks name concrete files, tests, interfaces, commands, values, verification commands, commits, and reviewer gates; no unresolved implementation placeholder remains.
