# Stage 2 Life Skills, Resource Network, Inventory, and Homestead Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Stage 2 systems boundary: the canonical twelve life skills, a closed gathering/production resource network, a slot-based inventory, and the farmland/formation/spirit-beast foundations inside the five-module homestead, all driven by the Stage 1B pure simulation.

**Architecture:** Static content lives under `content/`; pure progression and economy rules live under `core/`; `core/stage2-rules.js` adapts those rules to Stage 1B `Simulation.advance`. Persisted state remains JSON-only and is normalized by `StateModel`; UI reads frozen ViewModels and sends commands through the frozen `GameAPI`. Existing top bar, left navigation, right content area, full-screen modal direction, DOM UI, and character Canvas composition remain unchanged.

**Tech Stack:** Native JavaScript, UMD browser globals plus CommonJS exports for Node self-tests, existing HTML/CSS/Canvas/DOM runtime, no new dependencies or bundler.

## Global Constraints

- The canonical design is `docs/superpowers/specs/2026-07-24-xiuxian-idle-core-design.md`; no removed design document may be treated as authoritative.
- Preserve the current top status bar, scrollable left navigation, independently scrollable right content area, full-screen overlays, CSS tone, and character Canvas composition.
- Do not introduce a framework, engine, package dependency, map, map grid, free movement, action queue, or second timer loop.
- Root files are authoritative. `release/` is generated from the verified root source; never patch `release/` by hand.
- The only life skills are `herb`, `mining`, `woodcutting`, `fishing`, `alchemy`, `forging`, `cooking`, `talisman`, `charm`, `beastTaming`, `farming`, and `formation`; every skill is level 1–99.
- Charm has levels but no mastery. Charm XP can only be granted by a source explicitly marked `social`; Stage 2 does not invent temporary NPC interactions.
- Every repeatable concrete resource, fish species, recipe, crop, spirit-beast species, and formation project except charm has its own level 1–99 mastery.
- One main action slot remains the only active lane for gathering, fishing, production, formation crafting, taming, and active beast training.
- Farmland growth and fish-stock recovery advance in the passive lane and use full real elapsed time. They do not consume the main action slot and are not capped by the offline main-action limit.
- Online and offline progression must both call `Simulation.advance`; no Stage 2 module may read DOM/Canvas, show a toast, write a save, or call `Math.random()`.
- All randomness consumes and returns the serialized `rngState` through Stage 1B rules.
- Do not implement Stage 3 combat, dungeons, techniques, or breakthrough tasks, and do not implement Stage 4 NPCs, relationships, events, sect simulation, or world-person simulation.
- Formations may improve gathering, production, farming, fishing, or spirit-beast systems but must never alter breakthrough probability.
- All new production code must follow RED → verified failure → minimal GREEN → full regression. Each task is reviewed before the next task begins.
- `npm test` remains the full-suite command.

## Stage 1B Contract Used by This Plan

Stage 2 starts only after Stage 1B has provided these exact public boundaries:

```js
StateModel.normalize(raw, nowMs)
StateModel.fromRuntime(runtime, nowMs)
StateModel.applyToRuntime(runtime, model)
StateModel.toSnapshotInput(model)
StateModel.readonly(value)

Simulation.advance(model, elapsedSeconds, {
  source: 'online' | 'offline',
  fromMs,
  mainActionLimitSeconds: null | number,
  rules,
  lanes
}) // => { state, report }
```

`Simulation.advance` must not mutate its input. Its report remains:

```js
{
  id, source, fromMs, toMs, requestedSeconds, mainActionSeconds, cappedSeconds,
  action: { key, completed, stopReason, stopAtMs },
  gains: { items, skillXp, masteryXp, cultivation },
  costs: { items, supplies },
  levels, unlocks,
  passive: { fishRecovered, farmCompleted, parallelCompleted },
  world: { ticks, events },
  warnings
}
```

Stage 2 may use only Stage 1B stop reasons. Inventory-full termination uses `requirements_invalid` plus warning code `inventory_full`; it does not add a new stop-reason enum. `offline_cap` remains report-only and never clears the main action.

The public boundary remains:

```js
window.GameAPI = Object.freeze({ queries, commands, render });
// Every command returns:
{ ok: boolean, code: string, changed: boolean, message: string | null, data: object | null }
```

Stage 2 preserves the Stage 1B queries and commands and adds only the explicitly named command/query methods in Tasks 10–11.

## File Map

| File | Responsibility |
|---|---|
| `content/items.js` | Frozen item registry, categories, sale values, display data |
| `content/life-skills.js` | The exact twelve skills and page placement |
| `content/gathering.js` | Four gathering families, resource entries, fish spots/species |
| `content/recipes.js` | Alchemy, forging, cooking, talisman, and formation recipes |
| `content/homestead.js` | Crop, formation-effect, and spirit-beast definitions |
| `core/skill-progression.js` | Level/mastery curves and bonuses; charm exception |
| `core/inventory.js` | Stack slots, atomic deltas, bindings, filtering, and sale |
| `core/gathering.js` | Exploration, finite resource points, collection, fishing stocks |
| `core/production.js` | Recipe validation and one-completion production transactions |
| `core/farm.js` | Plant, passive real-time growth, mature retention, harvest |
| `core/formations.js` | Formation slot configuration and non-breakthrough effects |
| `core/spirit-beasts.js` | Encounters, taming, training, traits, growth, assistants |
| `core/stage2-state.js` | Stage 2 defaults, validation, and legacy migration |
| `core/stage2-rules.js` | Stage 1B action-rule and passive-lane adapter |
| `game.js` | Composition root only: inject content/rules, expose commands/queries |
| `ui.js` | Existing DOM shell rendering of Stage 2 ViewModels |
| `styles.css` | Additive styles for filters, homestead sub-tabs, plots, slots, beasts |
| `index.html` | Script order only |
| `selftest_stage2_*.js` | Focused Node behavior tests |

## Persisted Stage 2 Data Model

All quantities are finite non-negative integers. Unknown keys are ignored during normalization but copied into `legacyProgress` when they contain old player progress.

```js
model.player.skills = {
  herb:        { level: 1, xp: 0 },
  mining:      { level: 1, xp: 0 },
  woodcutting: { level: 1, xp: 0 },
  fishing:     { level: 1, xp: 0 },
  alchemy:     { level: 1, xp: 0 },
  forging:     { level: 1, xp: 0 },
  cooking:     { level: 1, xp: 0 },
  talisman:    { level: 1, xp: 0 },
  charm:       { level: 1, xp: 0 },
  beastTaming: { level: 1, xp: 0 },
  farming:     { level: 1, xp: 0 },
  formation:   { level: 1, xp: 0 }
};

model.player.mastery = {
  // charm is deliberately absent
  [skillId]: {
    [contentId]: { level: 1, xp: 0 }
  }
};

model.player.inventory = {
  capacity: 40,
  capacityGrants: { shop: 0, achievement: 0, task: 0 },
  stacks: { [itemId]: quantity },
  bindings: {
    [itemId]: { equipment: 0, task: 0, formation: 0 }
  }
};

model.systems.gathering = {
  nextSpotId: 1,
  spots: { herb: null, mining: null, woodcutting: null },
  fishStocks: { [speciesId]: 20 },
  fishRecoverAcc: 0
};

model.systems.homestead = {
  farm: {
    unlockedPlots: 3,
    plots: [
      { id: 'plot-1', cropId: null, remainingSeconds: 0, totalSeconds: 0, ready: false },
      { id: 'plot-2', cropId: null, remainingSeconds: 0, totalSeconds: 0, ready: false },
      { id: 'plot-3', cropId: null, remainingSeconds: 0, totalSeconds: 0, ready: false }
    ]
  },
  formations: {
    slots: [null],
    owned: []
  },
  beasts: {
    nextId: 1,
    roster: [],
    encounters: [],
    activeIds: []
  }
};

model.systems.parallel = { jobs: [] };
model.systems.world = { tickAccumulator: 0 };
```

Resource points are saved as:

```js
{
  instanceId: 'spot-17',
  skillId: 'mining',
  entryId: 'iron',
  quality: 'common' | 'fine' | 'rare',
  capacity: 24,
  remaining: 24
}
```

Spirit beasts are saved as:

```js
{
  id: 'beast-3',
  speciesId: 'rockshell',
  level: 1,
  xp: 0,
  traitId: 'diligent',
  growthId: 'steady'
}
```

## Progression and Effect Rules

These formulas are fixed for Stage 2 and must be shared by UI and simulation:

```js
skillXpNeed(level) {
  return level >= 99 ? 0 : Math.round(50 * Math.pow(level, 1.8));
}

masteryXpNeed(level) {
  return level >= 99 ? 0 : Math.round(50 * Math.pow(1.12, level - 1));
}

skillSpeedBonus(level) {
  return Math.min(0.09, Math.floor(level / 10) * 0.01);
}

masterySpeedBonus(level) {
  return Math.min(0.18, Math.floor(level / 10) * 0.02);
}

masteryYieldOrRetentionChance(level) {
  return Math.min(0.19, Math.floor(level / 5) * 0.01);
}

effectiveDuration(baseSeconds, skillLevel, masteryLevel) {
  return Math.max(0.5, baseSeconds
    * (1 - skillSpeedBonus(skillLevel))
    * (1 - masterySpeedBonus(masteryLevel)));
}
```

- XP carries through multiple levels and stops at level 99 with `xp = 0`.
- Exploration is a finite setup action with mastery IDs `explore:herb`, `explore:mining`, and `explore:woodcutting`; it gives skill XP, exploration mastery XP, and cultivation.
- Gathering/fishing mastery gives speed plus an independent chance for one extra unit of the rolled item.
- Production/formation mastery gives speed plus an independent material-retention chance. Retention returns the entire ingredient set for that completion; output is still produced.
- Crop mastery snapshots its speed reduction when planted and gives an independent chance for one extra harvest batch.
- Beast-species mastery applies to training duration and gives an independent chance for one extra beast-XP batch.
- Every completed main action declares a finite `cultivation` reward in content data. Passive crop maturity gives no cultivation; harvesting gives farming XP/mastery but no cultivation because harvest is an immediate command, not a timed main action.
- Charm has no mastery. `gainCharmXp` accepts only `{source:'social'}`. Its Stage 4-facing benefits are:

```js
positiveRelationMultiplier(level) {
  return Math.min(1.49, 1 + (level - 1) * 0.005);
}

misunderstandingReduction(level) {
  return Math.min(0.30, (level - 1) * 0.003);
}
```

## Required First Content Batch

The first Stage 2 batch is intentionally broad enough to exercise the full network without implementing Stage 3 or Stage 4:

- Gathering: preserve and normalize the current 10 mining entries, 10 woodcutting entries, 11 herb entries, and 10 fishing spots from `game.js`; preserve their IDs, names, unlock levels, base times, XP, capacity bounds, and drop weights.
- Fish species: exactly `spiritCarp`, `spiritShrimp`, `silverTrout`, `greenBass`, `darkCatfish`, `sunsetSalmon`, `thunderEel`, `spiritLobster`, `swordfish`, `dragonFish`; stock is per species, not per fishing spot.
- Resource quality: `common` 70% / capacity ×1.00 / bonus-drop chance 0%; `fine` 25% / capacity ×1.25 / bonus-drop chance 15%; `rare` 5% / capacity ×1.50 / bonus-drop chance 30%.
- Crops: 6 definitions—`spiritRice`, `qiGatheringGrass`, `heartClearGrass`, `moonSpiritGrass`, `bloodSpiritGrass`, `goldenLingzhi`.
- Spirit beasts: 4 definitions—`spiritFox` from herb gathering, `rockshell` from mining, `azureCrane` from woodcutting, `waterTurtle` from fishing.
- Formation projects: 5 definitions—`gatheringFormation`, `farmlandFormation`, `fishingFormation`, `craftingFormation`, `beastFormation`.
- Production recipes: 9 alchemy, 6 forging, 7 cooking, 6 talisman, and 5 formation recipes; total 33.

The recipe output and dependency graph is fixed:

| Skill | Recipe outputs |
|---|---|
| Alchemy | `healingPill`, `qiGatheringPill`, `foundationPill`, `goldCorePill`, `nascentSoulPill`, `spiritTransformationPill`, `voidRefiningPill`, `bodyIntegrationPill`, `mahayanaPill` |
| Forging | `copperSword`, `ironSword`, `silverArmor`, `spiritStaff`, `darkIronBlade`, `formationBase` |
| Cooking | `grilledCarp`, `shrimpSoup`, `spiritRiceMeal`, `troutFeast`, `lobsterBanquet`, `dragonFishBanquet`, `beastFeed` |
| Talisman | `talismanPaper`, `gatheringTalisman`, `hasteTalisman`, `wardTalisman`, `healingTalisman`, `beastLureTalisman` |
| Formation | `gatheringFormation`, `farmlandFormation`, `fishingFormation`, `craftingFormation`, `beastFormation` |

New display names are fixed:

```js
{
  healingPill: '疗伤丹',
  qiGatheringPill: '聚气丹',
  foundationPill: '筑基丹',
  goldCorePill: '结金丹',
  nascentSoulPill: '化婴丹',
  spiritTransformationPill: '化神丹',
  voidRefiningPill: '炼虚丹',
  bodyIntegrationPill: '合体丹',
  mahayanaPill: '大乘丹',
  copperSword: '赤铜剑',
  ironSword: '玄铁剑',
  silverArmor: '银鳞甲',
  spiritStaff: '灵木杖',
  darkIronBlade: '玄铁刃',
  formationBase: '阵基',
  grilledCarp: '烤灵鲤',
  shrimpSoup: '灵虾汤',
  spiritRiceMeal: '灵米饭',
  troutFeast: '银鳟宴',
  lobsterBanquet: '灵龙虾宴',
  dragonFishBanquet: '龙鱼宴',
  beastFeed: '灵兽口粮',
  talismanPaper: '空白符纸',
  gatheringTalisman: '采灵符',
  hasteTalisman: '疾行符',
  wardTalisman: '护身符',
  healingTalisman: '回春符',
  beastLureTalisman: '引兽符',
  gatheringFormation: '聚材阵',
  farmlandFormation: '丰壤阵',
  fishingFormation: '回澜阵',
  craftingFormation: '百工阵',
  beastFormation: '御灵阵',
  herbBundle: '散装药材',
  oreBundle: '散装灵矿',
  woodBundle: '散装木料',
  foodBundle: '散装食材'
}
```

Stage 2 sale values are deliberately simple and deterministic: material `1`, consumable `5`, equipment `10`; bound items cannot be sold. Later balancing may change values through content only, without changing inventory rules.

The content tables must use these exact key dependencies:

| Output | Unlock | Time | Ingredients |
|---|---:|---:|---|
| `healingPill` | 1 | 8s | `lingzhi`×2 |
| `qiGatheringPill` | 5 | 10s | `qiGatheringGrass`×2, `spiritHoney`×1 |
| `foundationPill` | 15 | 16s | `ironhideGrass`×3, `skySilk`×1, `spiritHoney`×1 |
| `goldCorePill` | 35 | 24s | `dragonSalivaGrass`×3, `moonSpiritGrass`×2, `goldOre`×1 |
| `nascentSoulPill` | 50 | 36s | `starGrass`×3, `goldenLingzhi`×1, `jadeShard`×1 |
| `spiritTransformationPill` | 65 | 50s | `thunderSpiritGrass`×3, `goldenLingzhi`×2, `crystalOre`×1 |
| `voidRefiningPill` | 75 | 64s | `bloodSpiritGrass`×3, `millenniumVine`×1, `darkCrystal`×1 |
| `bodyIntegrationPill` | 85 | 80s | `goldenLingzhi`×3, `dragonFish`×1, `adamantOre`×2 |
| `mahayanaPill` | 95 | 100s | `goldenLingzhi`×5, `dragonFish`×2, `darkCrystal`×2 |
| `copperSword` | 1 | 10s | `copperOre`×3, `willowWood`×1 |
| `ironSword` | 10 | 16s | `ironOre`×5, `pineWood`×2 |
| `silverArmor` | 20 | 24s | `silverOre`×8, `beastHide`×2 |
| `spiritStaff` | 35 | 32s | `spiritWood`×5, `jadeShard`×2 |
| `darkIronBlade` | 55 | 45s | `darkIronOre`×8, `thunderWood`×2 |
| `formationBase` | 20 | 20s | `jadeShard`×3, `spiritWood`×3 |
| `grilledCarp` | 1 | 6s | `spiritCarp`×2 |
| `shrimpSoup` | 5 | 8s | `spiritShrimp`×2, `spiritMushroom`×1 |
| `spiritRiceMeal` | 10 | 10s | `spiritRice`×3, `spiritHoney`×1 |
| `troutFeast` | 20 | 14s | `silverTrout`×2, `lingzhi`×1 |
| `lobsterBanquet` | 40 | 22s | `spiritLobster`×2, `spiritFruit`×1 |
| `dragonFishBanquet` | 70 | 36s | `dragonFish`×1, `bloodGinsengFruit`×1, `goldenLingzhi`×1 |
| `beastFeed`×2 | 12 | 10s | `spiritRice`×2, any fish species×1 |
| `talismanPaper`×4 | 1 | 8s | `willowWood`×2 |
| `gatheringTalisman` | 5 | 10s | `talismanPaper`×1, `lingzhi`×1 |
| `hasteTalisman` | 20 | 16s | `talismanPaper`×1, `thunderHerb`×1 |
| `wardTalisman` | 15 | 14s | `talismanPaper`×1, `ironOre`×1 |
| `healingTalisman` | 25 | 18s | `talismanPaper`×1, `heartClearGrass`×1 |
| `beastLureTalisman` | 30 | 22s | `talismanPaper`×1, `spiritFruit`×1 |
| `gatheringFormation` | 20 | 40s | `formationBase`×1, `spiritWood`×3, `qiGatheringGrass`×2 |
| `farmlandFormation` | 25 | 45s | `formationBase`×1, `spiritRice`×5, `moonSpiritGrass`×2 |
| `fishingFormation` | 30 | 50s | `formationBase`×1, `jadeShard`×2, `spiritCarp`×5 |
| `craftingFormation` | 40 | 60s | `formationBase`×1, `darkIronOre`×2, `starGrass`×2 |
| `beastFormation` | 45 | 70s | `formationBase`×1, `beastHide`×2, `spiritEgg`×2 |

`beastFeed` uses an ingredient-choice group containing the ten canonical fish species; the transaction consumes exactly one available species in stable content order unless the command supplies a valid preferred species.

Crop rules are fixed:

| Crop | Farming level | Seed cost | Real growth | Base harvest |
|---|---:|---|---:|---|
| `spiritRice` | 1 | `commonSeed`×1 | 5m | 4 |
| `qiGatheringGrass` | 3 | `commonSeed`×1 | 10m | 3 |
| `heartClearGrass` | 8 | `commonSeed`×1 | 15m | 3 |
| `moonSpiritGrass` | 20 | `fineSeed`×1 | 30m | 3 |
| `bloodSpiritGrass` | 35 | `fineSeed`×1 | 45m | 2 |
| `goldenLingzhi` | 50 | `rareSeed`×1 | 90m | 1 |

Formation effects are fixed and additive only once per equipped slot:

| Formation | Effect |
|---|---|
| `gatheringFormation` | +5 percentage points to gathering/fishing extra-yield chance |
| `farmlandFormation` | −10% to growth time of crops planted while equipped |
| `fishingFormation` | −10% to the 60-second fish recovery interval |
| `craftingFormation` | −5% to alchemy/forging/cooking/talisman/formation action duration |
| `beastFormation` | +10% beast XP from active training |

Spirit-beast base assistance is fixed:

| Species | Encounter source | Assistance |
|---|---|---|
| `spiritFox` | herb collection | herb extra-yield chance +5 points |
| `rockshell` | mining collection | mining extra-yield chance +5 points |
| `azureCrane` | woodcutting collection | woodcutting duration −5% |
| `waterTurtle` | fishing | fish recovery interval −10% |

Display names are `spiritFox: 灵狐`, `rockshell: 岩甲兽`, `azureCrane: 青羽鹤`, `waterTurtle: 水灵龟`; traits are `keenNose: 灵嗅`, `diligent: 勤勉`, `deftPaws: 巧爪`, `friendly: 亲和`; growth tendencies are `steady: 稳健`, `swift: 敏捷`, `spiritual: 灵慧`.

An eligible completion has a 1% encounter chance when that species is neither already pending nor at the pending encounter cap of 3. Taming takes 60 seconds, consumes one `beastLureTalisman` at completion, grants 30 `beastTaming` XP, 15 species mastery XP, and 5 cultivation, and always succeeds if the requirement is still valid. Taming rolls one trait from `keenNose`, `diligent`, `deftPaws`, `friendly` and one growth from `steady`, `swift`, `spiritual` using saved RNG. Active training repeats every 30 seconds, consumes one `beastFeed`, grants 10 beast XP, 10 `beastTaming` XP, 5 species mastery XP, and 2 cultivation. A new player has one assistant slot.

---

### Task 1: Frozen Stage 2 content registries

**Files:**
- Create: `content/items.js`
- Create: `content/life-skills.js`
- Create: `content/gathering.js`
- Create: `content/recipes.js`
- Create: `content/homestead.js`
- Create: `selftest_stage2_content.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces browser globals and CommonJS exports `ItemContent`, `LifeSkillContent`, `GatheringContent`, `RecipeContent`, and `HomesteadContent`.
- Every content module returns frozen plain data and lookup functions; no module owns mutable player state.
- Stable action/content IDs are the public persistence boundary.

- [ ] **Step 1: Register a missing focused suite and verify RED**

Add `selftest_stage2_content.js` to `selftest_all.js` immediately after `selftest_foundation.js`, before creating the file.

Run: `npm test`

Expected: FAIL only because `selftest_stage2_content.js` is missing; all existing suites still report their prior passing counts.

- [ ] **Step 2: Write content-shape and referential-integrity tests**

Create `selftest_stage2_content.js` with the existing `ok(condition, message)` harness and these exact checks:

```js
'use strict';

const Items = require('./content/items.js');
const Skills = require('./content/life-skills.js');
const Gathering = require('./content/gathering.js');
const Recipes = require('./content/recipes.js');
const Homestead = require('./content/homestead.js');

const skillIds = [
  'herb', 'mining', 'woodcutting', 'fishing',
  'alchemy', 'forging', 'cooking', 'talisman',
  'charm', 'beastTaming', 'farming', 'formation'
];

ok(Object.keys(Skills.SKILLS).join(',') === skillIds.join(','),
  'life-skill registry contains the canonical twelve in stable order');
ok(Skills.SKILLS.charm.hasMastery === false, 'charm has no mastery');
for (const id of skillIds.filter(id => id !== 'charm')) {
  ok(Skills.SKILLS[id].hasMastery === true, id + ' has mastery');
}

ok(Gathering.GATHERING.mining.entries.length === 10, 'mining keeps 10 entries');
ok(Gathering.GATHERING.woodcutting.entries.length === 10, 'woodcutting keeps 10 entries');
ok(Gathering.GATHERING.herb.entries.length === 11, 'herb keeps 11 entries');
ok(Gathering.GATHERING.fishing.spots.length === 10, 'fishing keeps 10 spots');
ok(Object.keys(Gathering.FISH_SPECIES).length === 10, 'fishing has 10 shared species stocks');
ok(Object.keys(Recipes.RECIPES).length === 33, 'production has 33 first-batch recipes');
ok(Object.keys(Homestead.CROPS).length === 6, 'farmland has 6 crops');
ok(Object.keys(Homestead.FORMATIONS).length === 5, 'homestead has 5 formations');
ok(Object.keys(Homestead.BEASTS).length === 4, 'homestead has 4 spirit-beast species');

const referencedItems = new Set();
Gathering.eachDrop(drop => referencedItems.add(drop.itemId));
Recipes.eachRecipe(recipe => {
  for (const itemId of Object.keys(recipe.ingredients || {})) referencedItems.add(itemId);
  for (const group of recipe.ingredientChoices || []) {
    for (const itemId of group.itemIds) referencedItems.add(itemId);
  }
  referencedItems.add(recipe.output.itemId);
});
for (const crop of Object.values(Homestead.CROPS)) {
  referencedItems.add(crop.seed.itemId);
  referencedItems.add(crop.output.itemId);
}
for (const itemId of referencedItems) ok(!!Items.ITEMS[itemId], 'item exists: ' + itemId);

for (const module of [Items, Skills, Gathering, Recipes, Homestead]) {
  ok(Object.isFrozen(module), 'module API is frozen');
}
```

Run: `node selftest_stage2_content.js`

Expected: FAIL with `Cannot find module './content/items.js'`.

- [ ] **Step 3: Implement the twelve-skill and item registries**

Implement all content modules with the repository’s existing UMD/CommonJS wrapper. `content/life-skills.js` must preserve this insertion order and placement:

```js
{
  herb:        { label: '采药', page: 'standalone', hasMastery: true },
  mining:      { label: '采矿', page: 'standalone', hasMastery: true },
  woodcutting: { label: '伐木', page: 'standalone', hasMastery: true },
  fishing:     { label: '钓鱼', page: 'standalone', hasMastery: true },
  alchemy:     { label: '炼丹', page: 'standalone', hasMastery: true },
  forging:     { label: '炼器', page: 'standalone', hasMastery: true },
  cooking:     { label: '烹饪', page: 'standalone', hasMastery: true },
  talisman:    { label: '符箓', page: 'standalone', hasMastery: true },
  charm:       { label: '魅力', page: 'relationship', hasMastery: false },
  beastTaming: { label: '御兽', page: 'homestead', hasMastery: true },
  farming:     { label: '种植', page: 'homestead', hasMastery: true },
  formation:   { label: '阵法', page: 'homestead', hasMastery: true }
}
```

`content/items.js` must:

- Convert every current `ITEM_NAMES` entry into `{id,name,category,sellValue,stackable:true}`.
- Add every recipe output and crop/formation/beast requirement listed in this plan.
- Use only canonical categories `material`, `equipment`, `consumable`, `technique`, and `quest`.
- Mark `formationBase` as `material`; formation outputs as `equipment`; pills, foods, and talismans as `consumable`.
- Give all saleable items a positive integer `sellValue`; do not create task items or technique books in this stage.
- Export `ITEMS`, `CATEGORIES`, `get(itemId)`, and `list(category)`.

- [ ] **Step 4: Normalize existing gathering data without reducing content**

Move the current static collection content out of `game.js` into `content/gathering.js`:

- Preserve the exact 10/10/11 mining/woodcutting/herb entries and their current IDs, names, unlock levels, times, XP, capacities, and weighted drops.
- Rename drop field `item` to `itemId`.
- Split fishing into 10 fixed `spots` and 10 shared `FISH_SPECIES` records. A spot retains its weighted species list; stock belongs to the species.
- Give the three exploration definitions stable mastery IDs `explore:herb`, `explore:mining`, and `explore:woodcutting`.
- Export the quality table from this plan as `RESOURCE_QUALITIES`.
- Export `GATHERING`, `FISH_SPECIES`, `eachDrop(visitor)`, `getEntry(skillId, entryId)`, and `getFishingSpot(spotId)`.

The module must freeze nested arrays/records before export. Use a local `deepFreeze` helper; do not import UI or simulation code.

- [ ] **Step 5: Implement exact recipe and homestead registries**

Encode all 33 recipe rows, 6 crop rows, 5 formation rows, and 4 beast rows from “Required First Content Batch.” Every recipe record has:

```js
{
  id: 'alchemy:healingPill',
  skillId: 'alchemy',
  masteryId: 'alchemy:healingPill',
  name: '疗伤丹',
  unlockLevel: 1,
  baseSeconds: 8,
  skillXp: 12,
  masteryXp: 6,
  cultivation: 2,
  ingredients: { lingzhi: 2 },
  ingredientChoices: [],
  output: { itemId: 'healingPill', quantity: 1 }
}
```

All other recipes follow the same shape. `beastFeed` is the only recipe with `ingredientChoices`:

```js
ingredientChoices: [{
  quantity: 1,
  itemIds: [
    'spiritCarp', 'spiritShrimp', 'silverTrout', 'greenBass', 'darkCatfish',
    'sunsetSalmon', 'thunderEel', 'spiritLobster', 'swordfish', 'dragonFish'
  ]
}]
```

Use base skill/mastery XP equal to `Math.max(1, Math.round(baseSeconds * 1.5))` and `Math.max(1, Math.round(skillXp * 0.5))` for rows where the example does not show a literal. This is content generation at module initialization, not runtime randomness.

- [ ] **Step 6: Verify focused and full suites**

Run:

```powershell
node --check content/items.js
node --check content/life-skills.js
node --check content/gathering.js
node --check content/recipes.js
node --check content/homestead.js
node selftest_stage2_content.js
npm test
```

Expected: all syntax checks PASS, Stage 2 content assertions PASS, and all earlier suites remain green.

- [ ] **Step 7: Commit**

```powershell
git add content selftest_stage2_content.js selftest_all.js
git commit -m "feat: define canonical stage 2 content"
```

### Task 2: Stage 2 state defaults and lossless legacy migration

**Files:**
- Create: `core/stage2-state.js`
- Create: `selftest_stage2_state.js`
- Modify: `core/state-model.js`
- Modify: `core/save-system.js`
- Modify: `selftest_all.js`
- Modify: `selftest_foundation.js`

**Interfaces:**
- Consumes: Stage 1B `StateModel`, content registries, legacy player fields from Stage 1A snapshots.
- Produces: `Stage2State.createDefaults()`, `normalize(model)`, `migrateLegacyPlayer(player, systems)`, `normalizeActionKey(key)`, and `occupiedSlots(inventory)`.
- Stage 2 fields are written through the versioned single snapshot; there are no new storage keys.
- Stage 1B schema version is exactly 2. Stage 2 changes the persisted shape and therefore upgrades to schema version 3 with an explicit `v2 -> v3` migration.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_state.js` after the content suite, run `npm test`, and confirm failure only because the new suite does not exist.

- [ ] **Step 2: Write default-state and legacy-migration tests**

Create `selftest_stage2_state.js` and assert:

```js
const Stage2State = require('./core/stage2-state.js');

const defaults = Stage2State.createDefaults();
ok(Object.keys(defaults.player.skills).length === 12, 'new player has twelve skills');
ok(!('charm' in defaults.player.mastery), 'charm mastery is absent');
ok(defaults.player.inventory.capacity === 40, 'new inventory starts at 40 slots');
ok(defaults.systems.homestead.farm.unlockedPlots === 3, 'new homestead starts with three plots');
ok(defaults.systems.homestead.formations.slots.length === 1, 'one formation slot starts unlocked');
ok(defaults.systems.homestead.beasts.activeIds.length === 0, 'no beast starts active');
ok(Object.keys(defaults.systems.gathering.fishStocks).length === 10, 'ten fish stocks exist');

const migrated = Stage2State.migrateLegacyPlayer({
  skills: {
    caiyao: { lv: 21, xp: 7 },
    caiju: { lv: 12, xp: 8 },
    qinqishuhua: { lv: 9, xp: 10 }
  },
  items: { yaocai: 4, lingkuang: 5, muliao: 6, shicai: 7 },
  dan: { tupo: 2, heal: 3 },
  bag: { copperOre: 9, spiritCarp: 1 },
  mastery: {
    herb: { pool: 25, entries: { lingzhiGrove: { lv: 8, xp: 4 } } }
  },
  spots: { herb: { id: 'lingzhiGrove', cap: 20, left: 11 } },
  fishing: { pond: 7 }
});

ok(migrated.player.skills.herb.level === 21 && migrated.player.skills.mining.level === 12,
  'legacy canonical skills keep level and XP');
ok(migrated.player.inventory.stacks.herbBundle === 4, 'legacy generic herbs are retained');
ok(migrated.player.inventory.stacks.foundationPill === 2, 'legacy breakthrough pills are retained');
ok(migrated.player.inventory.stacks.copperOre === 9, 'legacy detailed bag items are retained');
ok(migrated.player.mastery.herb.lingzhiGrove.level === 8, 'legacy gathering mastery is retained');
ok(migrated.player.legacyProgress.skills.qinqishuhua.level === 9,
  'noncanonical legacy skill is archived');
ok(migrated.player.legacyProgress.masteryPools.herb === 25, 'old mastery pool is archived');
ok(migrated.systems.gathering.spots.herb.entryId === 'lingzhiGrove',
  'legacy resource point is retained');
ok(migrated.systems.gathering.fishStocks.spiritCarp === 5,
  'legacy pond stock is proportionally migrated to shared species stock');

ok(Stage2State.normalizeActionKey('gather:mining:copper') === 'gather:collect:mining:copper',
  'legacy gather action key migrates');
ok(Stage2State.normalizeActionKey('gather:fishing:pond') === 'fish:pond',
  'legacy fishing action key migrates');
ok(Stage2State.normalizeActionKey('liandan_tupo') === 'produce:alchemy:foundationPill',
  'legacy production key migrates');
```

Add a real JSON snapshot round-trip to `selftest_foundation.js` that saves and reloads a model containing a planted crop, a formation binding, a resource point, the shared fish recovery accumulator, and one beast. Assert deep equality of those fields after `SaveSystem.load`.

Run: `node selftest_stage2_state.js`

Expected: FAIL because `core/stage2-state.js` is missing.

- [ ] **Step 3: Implement Stage 2 defaults and normalization**

Implement the exact persisted model in this plan. Normalization rules:

- Clamp every skill/mastery level to integer 1–99 and XP to a finite non-negative integer; level 99 always has XP 0.
- Remove any `mastery.charm`.
- Initialize missing mastery records from content IDs without deleting valid saved records for still-known IDs.
- Clamp inventory quantities/bindings to non-negative integers and remove zero stacks/bindings.
- Normalize `capacityGrants` to non-negative integers for `shop`, `achievement`, and `task`; ignore all other sources.
- Set capacity to `max(40, occupiedSlotCount)` during legacy migration so migration never drops items or creates an over-capacity save. New saves start at 40.
- Clamp each `systems.gathering.fishStocks[speciesId]` to 0–20 and the shared `fishRecoverAcc` to `[0, recoveryInterval)`.
- Preserve a mature crop with `ready:true` and `remainingSeconds:0`; never auto-harvest.
- Remove invalid formation/beast slot references but never delete a valid roster beast.
- Preserve unknown legacy skill records and old mastery pools under `legacyProgress`; they are not active Stage 2 skills.

Add compatibility items `herbBundle`, `oreBundle`, `woodBundle`, and `foodBundle` to `content/items.js`. They remain saleable materials and are used only to retain old aggregate resources. Map old `items.yaocai/lingkuang/muliao/shicai` to them. Map old `dan` keys:

```js
{
  heal: 'healingPill',
  tupo: 'foundationPill',
  jindan: 'goldCorePill',
  yuanying: 'nascentSoulPill',
  huashen: 'spiritTransformationPill',
  lianxu: 'voidRefiningPill',
  heti: 'bodyIntegrationPill',
  dasheng: 'mahayanaPill'
}
```

The explicit `v2 -> v3` migration must also:

- Rename v2 inventory stack keys `yaocai`, `lingkuang`, `muliao`, and `shicai` to the four compatibility bundle IDs and merge quantities if the destination already exists.
- Rename v2 pill stack keys using the table above.
- Convert each old finite spot `{id,cap,left}` to a v3 common-quality point with a newly allocated stable `instanceId`, `capacity:cap`, and `remaining:left`.
- Convert old per-spot fishing stock to per-species stock without multiplying supply: for each species, average `oldSpotStock / 30` across old spots containing that species, multiply by 20, round to the nearest integer, and clamp 0–20. A species with no old spot value starts at 20.
- Carry the old global fish recovery accumulator into `systems.gathering.fishRecoverAcc`, clamped to the effective base interval.
- Initialize farm, formations, and beasts only when their v2 containers are absent; never overwrite already-normalized v2 content.

- [ ] **Step 4: Implement stable legacy action aliases**

`normalizeActionKey` must cover:

```js
{
  caiyao: 'gather:explore:herb',
  caijing: 'gather:explore:mining',
  famu: 'gather:explore:woodcutting',
  diaoyu: 'fish:pond',
  liandan_tupo: 'produce:alchemy:foundationPill',
  liandan_heal: 'produce:alchemy:healingPill',
  liandan_jindan: 'produce:alchemy:goldCorePill',
  liandan_yuanying: 'produce:alchemy:nascentSoulPill',
  liandan_huashen: 'produce:alchemy:spiritTransformationPill',
  lianqi_jian: 'produce:forging:ironSword',
  lianqi_jia: 'produce:forging:silverArmor',
  chuyi: 'produce:cooking:spiritRiceMeal',
  fulu: 'produce:talisman:wardTalisman'
}
```

Unknown or removed prototype actions normalize to `null`; StateModel then clears them and appends warning `legacy_action_removed` to the next pending report rather than silently running a different action.

- [ ] **Step 5: Connect normalization to the versioned snapshot**

Update `StateModel.normalize` to run `Stage2State.normalize` after the Stage 1B base shape is normalized. Update `fromRuntime`, `applyToRuntime`, and `toSnapshotInput` so `player.inventory/skills/mastery`, `systems.gathering`, and `systems.homestead` survive the single snapshot and no runtime cache enters persistence.

Do not create a second save key. Set `SaveSystem.SCHEMA_VERSION` to exactly `3`, preserve the existing explicit `v1 -> v2` migration, and add an explicit `v2 -> v3` migration. A loaded Stage 1A/1B snapshot is normalized once and immediately saved in the v3 shape by the existing startup repair path.

- [ ] **Step 6: Verify migration, JSON safety, and full regression**

Run:

```powershell
node --check core/stage2-state.js
node --check core/state-model.js
node --check core/save-system.js
node selftest_stage2_state.js
node selftest_foundation.js
npm test
```

Expected: all PASS; the foundation suite proves JSON round-trip of every Stage 2 state branch.

- [ ] **Step 7: Commit**

```powershell
git add core/stage2-state.js core/state-model.js core/save-system.js content/items.js selftest_stage2_state.js selftest_foundation.js selftest_all.js
git commit -m "feat: add stage 2 state and legacy migration"
```

### Task 3: Shared skill and mastery progression

**Files:**
- Create: `core/skill-progression.js`
- Create: `selftest_stage2_progression.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `SkillProgression.skillXpNeed`, `masteryXpNeed`, `addSkillXp`, `addMasteryXp`, `effectiveDuration`, `masteryYieldOrRetentionChance`, `gainCharmXp`, and `charmBenefits`.
- Every function is pure and returns a new record; inputs are never mutated.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_progression.js`, run `npm test`, and confirm the expected missing-file failure.

- [ ] **Step 2: Write exact curve, cap, carry, and charm tests**

Create tests for:

```js
const P = require('./core/skill-progression.js');

ok(P.skillXpNeed(1) === 50, 'skill level 1 needs 50 XP');
ok(P.masteryXpNeed(1) === 50, 'mastery level 1 needs 50 XP');
ok(P.skillXpNeed(99) === 0 && P.masteryXpNeed(99) === 0, 'level 99 is capped');

const crossed = P.addSkillXp({ level: 1, xp: 0 }, 5000);
ok(crossed.level > 2 && crossed.xp >= 0, 'skill XP carries across levels');

const capped = P.addMasteryXp({ level: 98, xp: 0 }, 999999);
ok(capped.level === 99 && capped.xp === 0, 'mastery caps cleanly at 99');

ok(P.effectiveDuration(10, 1, 1) === 10, 'level 1 has no speed bonus');
ok(P.effectiveDuration(10, 99, 99) === 7.462, 'combined speed formula is exact');
ok(P.masteryYieldOrRetentionChance(99) === 0.19, 'mastery chance caps at 19%');

const rejected = P.gainCharmXp({ level: 1, xp: 0 }, 50, { source: 'gathering' });
ok(rejected.ok === false && rejected.code === 'charm_social_only', 'non-social charm XP is rejected');
const accepted = P.gainCharmXp({ level: 1, xp: 0 }, 50, { source: 'social' });
ok(accepted.ok && accepted.value.level === 2, 'social charm XP is accepted');
ok(!('mastery' in accepted.value), 'charm never creates mastery');

const charm99 = P.charmBenefits(99);
ok(charm99.positiveRelationMultiplier === 1.49, 'charm relation multiplier caps at 1.49');
ok(charm99.misunderstandingReduction === 0.294, 'charm misunderstanding reduction is exact');
```

Run: `node selftest_stage2_progression.js`

Expected: FAIL because `core/skill-progression.js` is missing.

- [ ] **Step 3: Implement the pure progression module**

Implement the formulas exactly as written in “Progression and Effect Rules.” Return values have this shape:

```js
addSkillXp(progress, amount) // => { value:{level,xp}, levelsGained:[2,3], capped:boolean }
addMasteryXp(progress, amount) // same shape
gainCharmXp(progress, amount, context)
// => {ok,code,value:{level,xp},levelsGained}
```

Round incoming XP down to integers and reject non-finite/negative amounts. Round `effectiveDuration` to three decimals so online/offline comparisons use the same stable value.

- [ ] **Step 4: Verify focused and full tests**

Run:

```powershell
node --check core/skill-progression.js
node selftest_stage2_progression.js
npm test
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```powershell
git add core/skill-progression.js selftest_stage2_progression.js selftest_all.js
git commit -m "feat: add life-skill progression rules"
```

### Task 4: Slot-based inventory and atomic item transactions

**Files:**
- Create: `core/inventory.js`
- Create: `selftest_stage2_inventory.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: normalized `player.inventory` and `ItemContent`.
- Produces pure `Inventory.occupiedSlots`, `availableQuantity`, `canApply`, `apply`, `bind`, `unbind`, `sell`, `grantCapacity`, and `query`.
- `apply` is the only primitive allowed to change item stacks in later Stage 2 tasks.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_inventory.js`, run `npm test`, and confirm only the missing suite fails.

- [ ] **Step 2: Write stack, capacity, binding, transaction, filter, and sale tests**

Use a three-slot inventory:

```js
const I = require('./core/inventory.js');

let bag = { capacity: 3, stacks: {}, bindings: {} };
let result = I.apply(bag, { copperOre: 2 });
ok(result.ok && I.occupiedSlots(result.value) === 1, 'first stack uses one slot');
bag = result.value;
result = I.apply(bag, { copperOre: 3 });
ok(result.ok && I.occupiedSlots(result.value) === 1, 'same item stacks in the same slot');
bag = result.value;
bag = I.apply(bag, { tinOre: 1, ironOre: 1 }).value;
ok(I.occupiedSlots(bag) === 3, 'different items use separate slots');

const beforeFull = JSON.stringify(bag);
result = I.apply(bag, { silverOre: 1 });
ok(!result.ok && result.code === 'inventory_full', 'new item is rejected when full');
ok(JSON.stringify(bag) === beforeFull, 'failed transaction is atomic and does not mutate input');

result = I.apply(bag, { copperOre: -5, silverOre: 1 });
ok(result.ok && result.value.stacks.copperOre == null && result.value.stacks.silverOre === 1,
  'a transaction may consume a stack and reuse its freed slot');

bag = I.bind(bag, 'tinOre', 1, 'task').value;
ok(I.availableQuantity(bag, 'tinOre') === 0, 'bound quantity is unavailable');
ok(I.sell(bag, 'tinOre', 1).code === 'item_bound', 'bound item cannot be sold');
bag = I.unbind(bag, 'tinOre', 1, 'task').value;
const sold = I.sell(bag, 'tinOre', 1);
ok(sold.ok && sold.currency > 0, 'unbound item can be sold');

const materialView = I.query(bag, { category: 'material', search: '矿' });
ok(Object.isFrozen(materialView) && Object.isFrozen(materialView.items),
  'inventory query returns a frozen ViewModel');

const expanded = I.grantCapacity(bag, 5, 'achievement');
ok(expanded.ok && expanded.value.capacity === 8, 'achievement can grant permanent slots');
ok(expanded.value.capacityGrants.achievement === 5, 'capacity source is recorded');
ok(I.grantCapacity(bag, 5, 'unknown').code === 'invalid_capacity_source',
  'only shop, achievement, and task sources can grant slots');
```

Run: `node selftest_stage2_inventory.js`

Expected: FAIL because `core/inventory.js` is missing.

- [ ] **Step 3: Implement atomic deltas and slot accounting**

`Inventory.apply(inventory, delta)` must:

1. Clone and normalize the input.
2. Validate that every negative delta is affordable from unbound quantity.
3. Apply all negative and positive deltas to a temporary map.
4. Remove zero stacks.
5. Count positive item IDs; reject the entire transaction if count exceeds capacity.
6. Return `{ok:true,code:'ok',value}` or `{ok:false,code:'inventory_full'|'insufficient_items'|'item_bound',value:original}`.

Never partially consume costs when output has no slot.

- [ ] **Step 4: Implement bindings, sale, and frozen inventory query**

Bindings use only reasons `equipment`, `task`, and `formation`. `bind` rejects a quantity larger than the currently unbound amount. `unbind` rejects underflow. `sell`:

- Rejects unknown, unsaleable, bound, zero, and excessive quantities.
- Removes items through `apply`.
- Returns `{ok:true,code:'ok',value,currency:item.sellValue * quantity}`; the Stage 2 command adapter adds currency to the player wallet.

`query` returns:

```js
{
  capacity, used, free,
  categories: ['all','material','equipment','consumable','technique','quest'],
  selectedCategory,
  search,
  items: [{ itemId, name, category, quantity, bound, available, sellValue }]
}
```

Sort category first, then item registry insertion order; never sort with locale-dependent comparison.

`grantCapacity(inventory, amount, source)` accepts only positive integer amounts and sources `shop`, `achievement`, or `task`. It records the source and increases capacity atomically. Stage 2 exposes the pure capability but does not fabricate shop/achievement/task rewards before those systems exist.

- [ ] **Step 5: Verify focused and full tests**

Run:

```powershell
node --check core/inventory.js
node selftest_stage2_inventory.js
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add core/inventory.js selftest_stage2_inventory.js selftest_all.js
git commit -m "feat: add slot-based inventory"
```

### Task 5: Exploration and finite gathering points

**Files:**
- Create: `core/gathering.js`
- Create: `selftest_stage2_gathering.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `GatheringContent`, `Inventory`, `SkillProgression`, and injected `GameRandom`.
- Produces `Gathering.create(deps)` with `explore`, `collect`, `fish`, and `advanceFishStocks`.
- Every method accepts/returns the normalized model, because inventory belongs to `player` while resource timers belong to `systems.gathering`; inputs are never mutated.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_gathering.js`, run `npm test`, and confirm only the missing suite fails.

- [ ] **Step 2: Write deterministic exploration tests**

Create a deterministic random stub:

```js
function sequenceRandom(values) {
  return {
    next(seed) {
      const index = seed >>> 0;
      return { seed: index + 1, value: values[index] == null ? 0 : values[index] };
    }
  };
}
```

Construct `Gathering.create` with real content/progression/inventory and the stub, then assert:

```js
let model = Stage2State.createDefaults();
model.player.skills.mining = { level: 1, xp: 0 };

const explored = rules.explore(model, 'mining', 0);
ok(explored.ok, 'mining exploration succeeds');
ok(explored.state !== model, 'exploration does not mutate input');
ok(explored.state.systems.gathering.spots.mining.entryId === 'copper',
  'deterministic roll selects copper');
ok(explored.state.systems.gathering.spots.mining.quality === 'common',
  'quality threshold selects common');
ok(explored.state.systems.gathering.spots.mining.capacity > 0,
  'finite capacity is created');
ok(explored.rngState > 0, 'RNG state advances');
```

Use additional fixed sequences to hit `fine` and `rare`; verify `Math.ceil(baseCapacity * 1.25)` and `Math.ceil(baseCapacity * 1.50)`. Verify an existing point is replaced only when a new exploration completes, and the old point is not recoverable.

Run: `node selftest_stage2_gathering.js`

Expected: FAIL because `core/gathering.js` is missing.

- [ ] **Step 3: Implement exploration**

`explore(model, skillId, rngState)` supports only `herb`, `mining`, and `woodcutting`.

1. Build the pool where `entry.unlockLevel <= player.skills[skillId].level`.
2. Use one random draw to select uniformly by array index.
3. Use one draw for quality: `<0.70 common`, `<0.95 fine`, otherwise rare.
4. Use one draw for an inclusive integer base capacity `[capMin, capMax]`.
5. Multiply capacity by quality and round up.
6. Allocate `instanceId = 'spot-' + nextSpotId`, increment `nextSpotId`, and replace only that skill’s current point.
7. Grant the exploration definition’s skill XP, exploration mastery XP, and declared cultivation reward.

Return:

```js
{
  ok: true,
  code: 'ok',
  state,
  rngState,
  result: { spot },
  gains: {
    items: {},
    skillXp: { [skillId]: skillXp },
    masteryXp: { ['explore:' + skillId]: masteryXp },
    cultivation
  }
}
```

- [ ] **Step 4: Write one-completion collection tests**

Add tests that start from a known point and deterministic drops:

- One collection decrements remaining capacity by exactly 1.
- Weighted drop selection produces the expected item.
- Skill XP and entry mastery XP are granted.
- A quality/mastery extra-yield hit adds one extra output unit.
- When `remaining` reaches zero, the point becomes `null` and result code is `resource_depleted_after_completion`.
- Collecting a missing/wrong point returns `resource_depleted` without mutation.
- If output would add a new stack to a full inventory, return `inventory_full`, do not decrement capacity, do not grant XP/mastery/cultivation, and do not partially add items.
- Input player and inventory are unchanged in every failure.

- [ ] **Step 5: Implement collection transactions and bonuses**

`collect(model, skillId, entryId, rngState, bonuses)`:

- Rejects fishing; fishing uses `fish`.
- Resolves the weighted drop with injected random.
- Calculates extra-yield chance as:

```js
Math.min(0.75,
  resourceQuality.extraYieldChance
  + SkillProgression.masteryYieldOrRetentionChance(masteryLevel)
  + (bonuses.extraYieldChance || 0)
)
```

- Uses a second draw for the extra-yield check.
- Calls `Inventory.apply` before decrementing the resource point.
- Grants entry XP, entry mastery, and `Math.max(1, Math.round(entry.xp / 10))` cultivation only after the inventory transaction succeeds.
- Returns report-ready item/XP/mastery/cultivation deltas.

- [ ] **Step 6: Verify focused and full tests**

Run:

```powershell
node --check core/gathering.js
node selftest_stage2_gathering.js
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add core/gathering.js selftest_stage2_gathering.js selftest_all.js
git commit -m "feat: add exploration and finite gathering"
```

### Task 6: Shared fish-species stocks and recovery

**Files:**
- Modify: `core/gathering.js`
- Create: `selftest_stage2_fishing.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `fish(model, spotId, rngState, bonuses)` and `advanceFishStocks(model, elapsedSeconds, bonuses)`.
- Fish stocks are keyed by species and shared by every spot.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_fishing.js`, run `npm test`, and confirm the expected missing-suite failure.

- [ ] **Step 2: Write shared-stock and weighted-selection tests**

Use real fishing content and deterministic random:

```js
const before = Stage2State.createDefaults();
for (const speciesId of Object.keys(before.systems.gathering.fishStocks)) {
  before.systems.gathering.fishStocks[speciesId] = 0;
}
before.systems.gathering.fishStocks.spiritCarp = 1;

const caught = rules.fish(before, 'pond', 0, {});
ok(caught.ok && caught.result.speciesId === 'spiritCarp', 'available species is caught');
ok(caught.state.systems.gathering.fishStocks.spiritCarp === 0, 'species stock decrements');

const sameSpeciesAtOtherSpot = rules.fish(caught.state, 'shallow', caught.rngState, {});
ok(!sameSpeciesAtOtherSpot.ok && sameSpeciesAtOtherSpot.code === 'fish_stock_empty',
  'stock is shared across spots, not duplicated per spot');
```

Also verify:

- Locked spots reject with `skill_locked`.
- Weighted selection excludes species whose stock is zero and re-normalizes remaining weights.
- Fishing mastery is keyed by species, so the same fish caught at two spots advances one mastery record.
- Full inventory returns `inventory_full` without decrementing stock or granting progression.
- A successful catch may create a `fishBox` at the existing 8% chance only if the combined inventory transaction fits.

- [ ] **Step 3: Implement fishing completion**

`fish`:

1. Validates the spot unlock level.
2. Filters the spot’s weighted species list to stocks with `current > 0`.
3. If none remain, returns `{ok:false,code:'fish_stock_empty',retryAfterSeconds}`. It does not clear the main action; Task 10 uses `retryAfterSeconds`.
4. Rolls one species from the filtered weights, one extra-yield check, and one fish-box check.
5. Applies the combined output atomically.
6. Decrements only the caught species by 1.
7. Grants fishing skill XP, mastery for the caught species, and `Math.max(1, Math.round(spot.xp / 10))` cultivation.

`retryAfterSeconds` is the minimum positive time until any species available at that spot recovers.

- [ ] **Step 4: Write recovery tests for arbitrary chunks**

Add:

```js
let model = Stage2State.createDefaults();
for (const speciesId of Object.keys(model.systems.gathering.fishStocks)) {
  model.systems.gathering.fishStocks[speciesId] = 20;
}
model.systems.gathering.fishStocks.spiritCarp = 0;
model.systems.gathering.fishRecoverAcc = 0;

const once = rules.advanceFishStocks(model, 60, {});
const chunks = rules.advanceFishStocks(
  rules.advanceFishStocks(model, 17, {}).state,
  43,
  {}
);
ok(once.state.systems.gathering.fishStocks.spiritCarp === 1, '60 seconds recovers one stock');
ok(JSON.stringify(once.state.systems.gathering) === JSON.stringify(chunks.state.systems.gathering),
  'recovery is chunk-invariant');
ok(once.recovered.spiritCarp === 1, 'recovery delta is reportable');

const capped = rules.advanceFishStocks(once.state, 60 * 100, {});
ok(capped.state.systems.gathering.fishStocks.spiritCarp === 20, 'stock recovery caps at max');
```

Verify formation and water-turtle reductions combine additively and cap at 40%, so the recovery interval never drops below 36 seconds.

- [ ] **Step 5: Implement passive recovery**

Base recovery interval is 60 seconds per species. Effective interval:

```js
60 * (1 - Math.min(0.40,
  (bonuses.fishRecoveryReduction || 0)
  + (bonuses.beastFishRecoveryReduction || 0)
))
```

Add elapsed seconds to the shared `systems.gathering.fishRecoverAcc`. For each completed interval, add one unit to every species below 20, then keep the shared remainder. If all ten species are full, set the accumulator to 0 to prevent banked instant recovery after fishing.

- [ ] **Step 6: Verify focused and full tests**

Run:

```powershell
node --check core/gathering.js
node selftest_stage2_fishing.js
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add core/gathering.js selftest_stage2_fishing.js selftest_all.js
git commit -m "feat: add shared fish stock recovery"
```

### Task 7: Five-skill production transactions

**Files:**
- Create: `core/production.js`
- Create: `selftest_stage2_production.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `RecipeContent`, `Inventory`, `SkillProgression`, and injected random.
- Produces `Production.create(deps).complete(player, recipeId, rngState, options)`.
- Covers alchemy, forging, cooking, talisman, and formation crafting; it does not configure formation slots.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_production.js`, run `npm test`, and confirm only the missing suite fails.

- [ ] **Step 2: Write unlock, cost, output, choice, retention, and full-bag tests**

Tests must prove:

- A level-1 player can produce `alchemy:healingPill` when holding two `lingzhi`.
- A locked recipe returns `skill_locked` without consuming anything.
- Missing materials return `materials_exhausted`.
- A successful production consumes exact ingredients and creates the output stack.
- Repeated production stacks outputs in one slot.
- `cooking:beastFeed` consumes a supplied valid preferred fish; without preference it chooses the first available canonical fish in content order.
- A retention hit produces output but keeps the entire ingredient set.
- Output-full failure returns `inventory_full` and keeps all ingredients.
- Skill/mastery/cultivation deltas match the recipe.
- `complete` does not mutate input.

Run: `node selftest_stage2_production.js`

Expected: FAIL because `core/production.js` is missing.

- [ ] **Step 3: Implement recipe validation and duration lookup**

Export:

```js
getDuration(player, recipeId, bonuses)
// effectiveDuration(baseSeconds, skillLevel, masteryLevel)
// then apply craftingFormation: duration *= (1 - bonuses.craftingDurationReduction)
// round to three decimals, floor at 0.5
```

`complete` validates recipe, skill level, fixed ingredients, and ingredient-choice groups before consuming RNG. It resolves choice groups in stable item order unless `options.preferredIngredients` supplies a valid affordable item.

- [ ] **Step 4: Implement the atomic completion**

Use one retention draw against:

```js
Math.min(0.50,
  SkillProgression.masteryYieldOrRetentionChance(masteryLevel)
  + (options.materialRetentionChance || 0)
)
```

Build one inventory delta containing costs and output. On retention, omit costs. Call `Inventory.apply` exactly once. Return:

```js
{
  ok, code, player, rngState,
  retained: boolean,
  gains: { items, skillXp, masteryXp, cultivation },
  costs: { items }
}
```

There is no production success/failure roll and no production queue.

- [ ] **Step 5: Verify focused and full tests**

Run:

```powershell
node --check core/production.js
node selftest_stage2_production.js
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add core/production.js selftest_stage2_production.js selftest_all.js
git commit -m "feat: add life-skill production rules"
```

### Task 8: Real-time farmland lane

**Files:**
- Create: `core/farm.js`
- Create: `selftest_stage2_farm.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `HomesteadContent.CROPS`, `Inventory`, and `SkillProgression`.
- Produces pure `Farm.plant`, `advance`, `harvest`, and `query`.
- Farming is a passive lane; plant/harvest are immediate commands and never replace `mainAction`.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_farm.js`, run `npm test`, and confirm the expected missing-suite failure.

- [ ] **Step 2: Write independent-plot and real-time growth tests**

Tests must cover:

```js
let model = Stage2State.createDefaults();
model.player.inventory.stacks.commonSeed = 2;
model.mainAction = {
  key: 'gather:collect:mining:copper',
  mode: 'repeat',
  count: 0,
  done: 0,
  elapsed: 0,
  stalled: false
};
const planted = Farm.plant(model, 'plot-1', 'spiritRice', {});
ok(planted.ok && planted.state.mainAction === model.mainAction,
  'planting does not replace the main action');
ok(planted.state.systems.homestead.farm.plots[0].remainingSeconds === 300,
  'spirit rice stores five minutes');

const split = Farm.advance(Farm.advance(planted.state, 123).state, 177);
const once = Farm.advance(planted.state, 300);
ok(JSON.stringify(split.state.systems.homestead.farm) === JSON.stringify(once.state.systems.homestead.farm),
  'farm advancement is chunk-invariant');
ok(once.state.systems.homestead.farm.plots[0].ready, 'crop becomes mature at zero');

const longOffline = Farm.advance(planted.state, 48 * 3600);
ok(longOffline.state.systems.homestead.farm.plots[0].ready, 'full real offline time matures crops');
ok(longOffline.state.systems.homestead.farm.plots[0].cropId === 'spiritRice',
  'mature crop never rots or disappears');
```

Also prove three plots can hold different crops, a locked crop is rejected, planting consumes one tier seed, an occupied plot rejects, and input state is unchanged.

- [ ] **Step 3: Implement planting and passive advance**

`plant(model, plotId, cropId, bonuses)`:

- Validates plot, unlocked count, empty state, farming level, and seed.
- Consumes the seed atomically.
- Computes stored `totalSeconds` and `remainingSeconds` once at planting:

```js
baseGrowthSeconds
  * (1 - SkillProgression.skillSpeedBonus(farmingLevel))
  * (1 - SkillProgression.masterySpeedBonus(cropMasteryLevel))
  * (1 - Math.min(0.40, bonuses.farmGrowthReduction || 0))
```

- Rounds to a positive integer second.

`advance(model, elapsedSeconds)` subtracts full elapsed real seconds from every non-ready plot independently. It returns `{state, completed:[{plotId,cropId}]}` and never harvests.

- [ ] **Step 4: Write harvest atomicity and mastery tests**

Prove:

- Harvest before ready returns `crop_not_ready`.
- Successful harvest adds the base batch, clears only that plot, and grants farming XP/mastery.
- A deterministic mastery extra-yield hit adds one extra base batch.
- Full inventory returns `inventory_full`; the crop remains mature and the plot is not cleared.
- Harvest has zero cultivation and does not touch `mainAction`.

- [ ] **Step 5: Implement harvest and frozen query**

`harvest(model, plotId, rngState, bonuses)` rolls:

```js
Math.min(0.75,
  SkillProgression.masteryYieldOrRetentionChance(cropMasteryLevel)
  + (bonuses.farmExtraYieldChance || 0)
)
```

Apply output first; only then clear the plot and grant progression. `query(model)` returns frozen plot cards with crop name, remaining/total seconds, ready state, current progress, seed availability, unlock requirements, and plantable crop list.

- [ ] **Step 6: Verify focused and full tests**

Run:

```powershell
node --check core/farm.js
node selftest_stage2_farm.js
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add core/farm.js selftest_stage2_farm.js selftest_all.js
git commit -m "feat: add real-time farmland"
```

### Task 9: Formation crafting ownership, slots, and effects

**Files:**
- Create: `core/formations.js`
- Create: `selftest_stage2_formations.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `systems.homestead.formations`, formation items in `player.inventory`, `Inventory`, and `HomesteadContent.FORMATIONS`.
- Produces pure `Formations.recordCrafted`, `equip`, `unequip`, `effects`, and `query`.
- `effects` never returns a breakthrough-related property.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_formations.js`, run `npm test`, and confirm the missing-suite failure.

- [ ] **Step 2: Write ownership, equip, replace, binding, and effect tests**

Tests must prove:

- `recordCrafted(model, 'gatheringFormation')` appends the item ID to `systems.homestead.formations.owned` once; repeated crafting does not duplicate discovery.
- Equipping requires an unlocked slot and one formation item in inventory.
- Equipping binds one item with reason `formation`, so it cannot be sold.
- Replacing a slot unbinds the old item and binds the new item in one atomic operation.
- Unequipping removes the slot reference and unbinds exactly one item.
- Invalid item, locked slot, unavailable quantity, and duplicate equip all fail without mutation.
- `effects` returns the five exact effects from this plan and does not contain keys matching `/break|突破|probability/i`.
- One formation item cannot occupy two slots unless inventory has two unbound copies.

Run: `node selftest_stage2_formations.js`

Expected: FAIL because `core/formations.js` is missing.

- [ ] **Step 3: Implement formation ownership and slot transactions**

Use `systems.homestead.formations = {slots:[null],owned:[]}`. `owned` is a discovery collection, not the authoritative quantity; item quantity and equipped binding remain in inventory.

`equip(model, slotIndex, itemId)` must:

1. Clone the model.
2. Validate `slotIndex`, formation definition, and inventory availability.
3. If replacing, unbind one old item from `formation`.
4. Bind one new item to `formation`.
5. Set the slot only after both binding operations succeed.

Return the standard `{ok,code,state}` shape.

- [ ] **Step 4: Implement effect aggregation and frozen query**

`effects(model)` adds effects across equipped slots and caps:

- extra-yield chance at 25 percentage points,
- farm growth reduction at 40%,
- fish recovery reduction at 40%,
- crafting duration reduction at 25%,
- beast training XP bonus at 50%.

Return:

```js
{
  gatheringExtraYieldChance,
  farmGrowthReduction,
  fishRecoveryReduction,
  craftingDurationReduction,
  beastTrainingXpBonus
}
```

`query(model)` returns frozen slot cards, discovered formation IDs, owned/unbound counts, effect text, and equip eligibility.

- [ ] **Step 5: Verify focused and full tests**

Run:

```powershell
node --check core/formations.js
node selftest_stage2_formations.js
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add core/formations.js selftest_stage2_formations.js selftest_all.js
git commit -m "feat: add formation slots and effects"
```

### Task 10: Spirit-beast encounters, taming, training, and assistance

**Files:**
- Create: `core/spirit-beasts.js`
- Create: `selftest_stage2_beasts.js`
- Modify: `content/homestead.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `systems.homestead.beasts`, `Inventory`, `SkillProgression`, injected random, and `HomesteadContent.BEASTS`.
- Produces pure `SpiritBeasts.tryEncounter`, `completeTame`, `completeTraining`, `setActive`, `effects`, and `query`.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_beasts.js`, run `npm test`, and confirm the expected missing-suite failure.

- [ ] **Step 2: Write deterministic encounter and cap tests**

Tests must prove:

- A 0.0099 roll after herb collection creates one pending `spiritFox` encounter.
- A 0.01 roll does not create it; the threshold is strictly `< 0.01`.
- A species already pending or owned does not create a duplicate encounter.
- Three pending encounters prevent a fourth.
- Mining, woodcutting, and fishing map to the other three exact species.
- Failed rolls only advance RNG and never mutate unrelated state.

Run: `node selftest_stage2_beasts.js`

Expected: FAIL because `core/spirit-beasts.js` is missing.

- [ ] **Step 3: Implement encounter generation**

`tryEncounter(model, sourceSkillId, rngState)` is called only after a successful eligible gathering/fishing completion. It consumes exactly one draw when eligible. A new encounter is:

```js
{
  id: 'encounter-' + nextId,
  speciesId,
  sourceSkillId
}
```

Increment `nextId` for both encounter and eventual beast IDs so IDs remain unique across save/reload.

- [ ] **Step 4: Write taming, trait, growth, training, and active-assistant tests**

Prove:

- Taming requires the referenced pending encounter and one `beastLureTalisman`.
- Successful taming consumes the talisman, removes only that encounter, and adds one level-1 beast.
- Successful taming grants exactly 30 `beastTaming` XP, 15 species mastery XP, and 5 cultivation.
- Fixed RNG produces the expected trait and growth; both persist through JSON round-trip.
- Missing lure returns `materials_exhausted`; the encounter remains.
- Training requires an owned beast and one `beastFeed`.
- One training consumes feed, grants base beast/skill/mastery/cultivation XP, and levels the beast across thresholds.
- Species mastery is shared by all beasts of the same species.
- At most one `activeIds` entry is allowed in Stage 2; changing active beast does not consume the main action slot.
- Only the active beast contributes assistance.

- [ ] **Step 5: Implement beast XP and growth rules**

Use:

```js
beastXpNeed(level, growthId) {
  const multiplier = growthId === 'swift' ? 0.90 : growthId === 'spiritual' ? 1.10 : 1;
  return level >= 99 ? 0 : Math.round(30 * Math.pow(level, 1.5) * multiplier);
}
```

Trait effects:

```js
keenNose: { gatheringExtraYieldChance: 0.02 }
diligent: { beastTrainingXpBonus: 0.10 }
deftPaws: { materialRetentionChance: 0.02 }
friendly: { socialPositiveGainBonus: 0.05 } // stored now, consumed only by Stage 4
```

Active species assistance is multiplied by `Math.min(1.50, 1 + (beast.level - 1) * 0.005)`, so beast level has a visible purpose. `spiritual` growth then multiplies that species assistance by 1.10; `steady` and `swift` use 1.00. Trait and species effects are additive after those multipliers, then callers apply the caps defined in their systems.

- [ ] **Step 6: Implement completion and active-assistant effects**

`completeTame(model, encounterId, rngState)` consumes two RNG draws after requirements pass: trait index, then growth index. It always succeeds.

`completeTraining(model, beastId, rngState, bonuses)`:

- Uses one mastery extra-batch draw.
- Base beast XP is `10 * (1 + formationBonus + diligentBonus)`, rounded down.
- An extra-batch hit adds another base 10 beast XP, not another item cost.
- Grants 10 `beastTaming` skill XP, 5 species mastery XP, and 2 cultivation exactly once.

`setActive(model, beastIdOrNull)` replaces the one-element `activeIds` list. `effects(model)` returns gathering, fishing, production, beast-training, and reserved social bonuses; it never changes breakthrough probability.

- [ ] **Step 7: Verify focused and full tests**

Run:

```powershell
node --check core/spirit-beasts.js
node selftest_stage2_beasts.js
npm test
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```powershell
git add core/spirit-beasts.js content/homestead.js selftest_stage2_beasts.js selftest_all.js
git commit -m "feat: add spirit-beast foundations"
```

### Task 11: Register Stage 2 actions and passive lanes with pure simulation

**Files:**
- Create: `core/stage2-rules.js`
- Create: `selftest_stage2_simulation.js`
- Modify: `core/game-rules.js`
- Modify: `core/simulation.js`
- Modify: `game.js`
- Modify: `index.html`
- Modify: `selftest_all.js`
- Modify: `selftest_foundation.js`

**Interfaces:**
- Consumes: Stage 1B `GameRules.create(config)` and `Simulation.advance`.
- Produces `Stage2Rules.create(deps) -> {rules,lanes}`; both values are frozen.
- Each passive lane has the Stage 1B interface `{id,nextBoundary(state),elapse(state,seconds,helpers),resolve(state,helpers)}`.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_simulation.js`, run `npm test`, and confirm the missing-suite failure.

- [ ] **Step 2: Write action-key, mode, switch, and stop tests**

Build a normalized Stage 2 model and real `Simulation`. Assert:

- `gather:explore:mining` is finite and completes once.
- `gather:collect:mining:copper`, `fish:pond`, `produce:alchemy:healingPill`, and `beast:train:beast-1` are repeat actions.
- `beast:tame:encounter-1` is finite.
- Starting a new action replaces the old action; no queue/background copy remains.
- Resource depletion stops with `resource_depleted`.
- Missing production/feed/lure stops with `materials_exhausted`.
- Inventory-full stops with `requirements_invalid` and adds warning `{code:'inventory_full'}`.
- Invalid/locked action starts are rejected before replacing the current action.
- Every successful completion reports skill XP, mastery XP where applicable, and cultivation.

- [ ] **Step 3: Implement stable action parsing and rule adapters**

Supported action keys are exactly:

```text
gather:explore:<herb|mining|woodcutting>
gather:collect:<herb|mining|woodcutting>:<entryId>
fish:<spotId>
produce:<recipeId>
beast:tame:<encounterId>
beast:train:<beastId>
```

`Stage2Rules.create` composes the pure modules. It must:

- Resolve effective duration from the current skill/mastery plus formation/beast effects.
- Delegate one completion to the domain module.
- Copy returned state, RNG, gains, costs, levels, unlocks, and warnings into the Stage 1B report helpers.
- Call `SpiritBeasts.tryEncounter` only after successful gather/fish completion.
- Call `Formations.recordCrafted` only after a formation recipe successfully produces output.
- Never call DOM, `Platform`, `SaveSystem`, toast, or global random.

- [ ] **Step 4: Implement chronological passive lanes**

Register exactly two Stage 2 lanes:

1. `stage2-fish-recovery`
   - `nextBoundary` returns seconds until the shared fish recovery interval, or `Infinity` when all stocks are full.
   - `elapse` advances the shared accumulator.
   - `resolve` adds stock and writes `report.passive.fishRecovered`.
2. `stage2-farm-growth`
   - `nextBoundary` returns the smallest positive crop remaining time, or `Infinity`.
   - `elapse` subtracts elapsed real time from growing plots.
   - `resolve` marks all plots reaching zero as mature and increments `report.passive.farmCompleted`.

When a fishing action has no stock, its handler supplies the minimum retry boundary instead of stopping/clearing the action. The simulation advances passive lanes to that boundary and then retries. Add a guard test for the all-full/all-empty edge so the loop cannot spin at zero seconds.

- [ ] **Step 5: Write online/offline equivalence and uncapped-passive tests**

For a saved seed and identical starting model:

```js
function advanceInChunks(initial, totalSeconds, chunkSeconds, baseOptions) {
  let state = initial;
  let fromMs = baseOptions.fromMs;
  let remaining = totalSeconds;
  while (remaining > 0) {
    const seconds = Math.min(chunkSeconds, remaining);
    const step = Simulation.advance(state, seconds, {
      source: baseOptions.source,
      fromMs,
      mainActionLimitSeconds: null,
      rules,
      lanes
    });
    state = step.state;
    fromMs += seconds * 1000;
    remaining -= seconds;
  }
  return { state };
}

const online = advanceInChunks(model, 6 * 3600, 17.25, { source:'online', fromMs:1000 });
const offline = Simulation.advance(model, 6 * 3600, {
  source: 'offline',
  fromMs: 1000,
  mainActionLimitSeconds: 12 * 3600,
  rules,
  lanes
});
ok(JSON.stringify(online.state) === JSON.stringify(offline.state),
  'online chunks and offline batch end identically');
```

Also compare 120 seconds advanced in real 0.25-second online chunks against one 120-second batch. Normalize report IDs/timestamps before comparing report totals. Then test 48 hours offline with a 12-hour main-action cap:

- main action advances 12 hours,
- crop/fish passive lanes advance all 48 hours,
- `report.cappedSeconds === 36 * 3600`,
- main action remains selected at the cap.

Test save/reload at an arbitrary mid-action/mid-crop/fish-recovery point and confirm continuing produces the same final state as uninterrupted simulation.

- [ ] **Step 6: Load modules and replace old Stage 2 loops**

Add content/core scripts to `index.html` in dependency order before `game.js`. In `game.js`:

- Construct one frozen `{rules,lanes}` from `Stage2Rules.create`.
- Remove old `tickCurrent`, `offlineSettle`, fish recovery loop, gathering mutations, production mutations, and scattered Stage 2 `Math.random` calls.
- Drive online time through `Simulation.advance` only.
- Drive startup elapsed time through the same function with the offline main-action limit.
- Apply the returned state and enqueue/archive the report through `SimulationReport`.
- Keep appearance composition and `render.drawCharacter` unchanged.

Add static assertions to `selftest_foundation.js` that Stage 2 rule modules contain no `document`, `window`, `Platform`, `SaveSystem`, `localStorage`, `canvas`, `toast(`, or `Math.random`.

- [ ] **Step 7: Verify syntax, focused parity, and full regression**

Run:

```powershell
node --check core/stage2-rules.js
node --check core/game-rules.js
node --check core/simulation.js
node --check game.js
node selftest_stage2_simulation.js
node selftest_foundation.js
npm test
```

Expected: all PASS, including exact online/offline state equality.

- [ ] **Step 8: Commit**

```powershell
git add core/stage2-rules.js core/game-rules.js core/simulation.js game.js index.html selftest_stage2_simulation.js selftest_foundation.js selftest_all.js
git commit -m "feat: integrate stage 2 with pure simulation"
```

### Task 12: Frozen command/query API for Stage 2

**Files:**
- Create: `selftest_stage2_api.js`
- Modify: `game.js`
- Modify: `selftest_all.js`
- Modify: `selftest_ui.js`

**Interfaces:**
- Preserves Stage 1B `window.GameAPI = Object.freeze({queries,commands,render})`.
- Adds the exact methods below; every query returns a deep-copied frozen ViewModel and every command returns the standard command-result shape.

- [ ] **Step 1: Add the missing suite and verify RED**

Register `selftest_stage2_api.js`, run `npm test`, and confirm the missing-suite failure.

- [ ] **Step 2: Write command-boundary tests**

Assert the existence and behavior of:

```js
commands.startAction({ key })
commands.stopAction()
commands.sellItem({ itemId, quantity })
commands.plant({ plotId, cropId })
commands.harvest({ plotId })
commands.equipFormation({ slotIndex, itemId })
commands.unequipFormation({ slotIndex })
commands.setActiveBeast({ beastId }) // null clears
```

Tests must prove:

- No command exposes the mutable model.
- Start/stop uses the single main-action slot.
- Plant/harvest/equip/unequip/setActive do not replace the current main action.
- Failure commands return `changed:false` and do not persist a changed model.
- Success commands return `changed:true`, persist once through the Stage 1B controller, and expose only frozen result data.
- `sellItem` adds returned currency to player `lingshi`.
- `Object.isFrozen(GameAPI)`, `queries`, `commands`, and `render` are all true.

- [ ] **Step 3: Write frozen ViewModel tests**

Preserve all Stage 1B queries and extend:

```js
queries.inventory({ category:'all', search:'' })
queries.skillPage(navName)
queries.gatherPage(navName)
queries.homestead(moduleId) // 'farm'|'formations'|'beasts'|'meetingHall'|'inheritance'
queries.charm()
```

Expected ViewModels:

- `inventory`: capacity/used/free/filter metadata/item rows from `Inventory.query`.
- `skillPage`: skill level/XP/next threshold, current bonuses, unlocked/locked recipe cards, cost availability, active progress.
- `gatherPage`: skill progression, explore card/resource quality/capacity, or fishing spot cards with per-species shared stocks.
- `homestead('farm')`: `Farm.query`.
- `homestead('formations')`: `Formations.query`.
- `homestead('beasts')`: encounter/roster/assistant/training cards from `SpiritBeasts.query`.
- `homestead('meetingHall')` and `homestead('inheritance')`: frozen `{implemented:false}` cards only; no fake Stage 4/5 data.
- `charm`: level/XP/benefits plus fixed text `通过社交互动自然提升`; no action button.

Mutating any nested query result must either throw in strict mode or leave the next query unchanged.

- [ ] **Step 4: Implement command composition and report-safe persistence**

Commands operate on the controller’s current model, call one pure domain operation, and replace the model only on `ok`. Immediate commands create one zero-duration report entry with gains/costs when they change inventory/progression; they do not fabricate main-action time.

Map domain failure codes to short Chinese messages in the controller, not in pure modules. Do not expose raw content registries or model/state references.

- [ ] **Step 5: Remove legacy mutable API access**

Update `selftest_ui.js` and `game.js` so there is no public `GameAPI.state`, `GameAPI.data`, or `GameAPI.persist`. Add text scans:

```js
ok(!/\bGameAPI\.state\b|\ba\.state\b/.test(uiSource), 'UI does not access mutable state');
ok(!/\bGameAPI\.data\b|\ba\.data\b/.test(uiSource), 'UI does not access raw data');
ok(!/\bGameAPI\.persist\b|\ba\.persist\b/.test(uiSource), 'UI does not write saves');
```

- [ ] **Step 6: Verify focused and full tests**

Run:

```powershell
node --check game.js
node selftest_stage2_api.js
node selftest_ui.js
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add game.js selftest_stage2_api.js selftest_ui.js selftest_all.js
git commit -m "refactor: expose stage 2 commands and queries"
```

### Task 13: Render Stage 2 inside the existing UI skeleton

**Files:**
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_ui.js`

**Interfaces:**
- Consumes only `GameAPI.queries`, `GameAPI.commands`, and `GameAPI.render`.
- Preserves the current shell; no new root layout, framework, canvas UI, or map.

- [ ] **Step 1: Add failing navigation and skeleton assertions**

Extend `selftest_ui.js` to assert the exact left-navigation order:

```js
[
  '洞府','背包','商城','事件','探索','战斗','功法','宗门','天下','关系','设置',
  '采药','采矿','伐木','钓鱼','炼丹','炼器','烹饪','符箓'
]
```

Assert:

- The shell still has one `.topbar`, one `.nav`, and one `.content`.
- There is no `排行` label; `天下` is present.
- Standalone pages exist for all eight standalone skills.
- Cave navigation exposes exactly `灵田`, `阵法`, `灵兽`, `会客厅`, `传承殿`.
- Relationship page displays charm level but no charm action button.
- Existing creation/avatar/offline/breakthrough overlays still render.

Run: `node selftest_ui.js`

Expected: FAIL because navigation/pages are not yet present.

- [ ] **Step 2: Update navigation without replacing the shell**

Keep `buildShell`, topbar, left nav container, right content container, modal root, and toast root. Change only the query-driven nav items and page builders.

- `战斗` and `功法` show reserved noninteractive cards for Stage 3.
- `事件`, `宗门`, `天下`, and the full relationship system show reserved noninteractive cards for Stage 4.
- `商城`, `探索`, and `设置` preserve current scope/behavior.
- Do not label the starting character as already belonging to a sect.
- Change creator confirmation copy from `确认创建 · 进入云隐宗` to `确认创建 · 开始修行`.

- [ ] **Step 3: Render gathering and five production skill pages**

Gathering cards show:

- skill level/XP,
- explore action or fixed fishing spots,
- discovered resource name/quality/remaining capacity,
- effective duration,
- possible drops,
- shared species stock for fishing,
- active/stalled progress.

Production cards show:

- unlock level,
- effective duration,
- exact ingredients with owned counts,
- output,
- mastery level/effect,
- active/stalled progress.

Clicking an inactive card calls only `commands.startAction({key})`. The active card shows `停止当前行动`, which calls `commands.stopAction()`. Starting one visually replaces the prior active card; no page creates a queue.

- [ ] **Step 4: Render slot-based backpack**

Add capacity text `已用 X / Y`, category chips, search input, item grid, bound quantity, and a one-unit sale button for saleable/unbound items. Filters call `queries.inventory` and never mutate item arrays.

When a sale command fails, use its message in the existing toast. Do not add drag/drop or equipment configuration in Stage 2.

- [ ] **Step 5: Render the five-module homestead**

Inside the current right content area, add a horizontal/compact sub-tab row:

1. `灵田`: three plot cards, crop selector, seed count, real-time progress, plant/harvest buttons.
2. `阵法`: one equipped slot, owned formation list, effect text, equip/replace/close controls.
3. `灵兽`: pending encounters, roster, level/trait/growth, tame/train/assistant controls.
4. `会客厅`: reserved card `将在人物与事件阶段开放`.
5. `传承殿`: reserved card `将在传承阶段开放`.

Tame/train buttons call `commands.startAction` with their action key. Plant/harvest/equip/assistant controls call immediate commands and must not visually interrupt the main action.

- [ ] **Step 6: Render charm summary without implementing NPCs**

On `关系`, render a charm summary card above the reserved Stage 4 card:

- level and XP,
- current positive-relation multiplier,
- current misunderstanding reduction,
- text `魅力通过社交互动自然提升`.

Do not add generic “刷魅力,” fake NPC, relationship number, waiting job, or romance event.

- [ ] **Step 7: Add only additive responsive styles**

Reuse existing color variables/classes where possible. Add styles for:

- `.subtabs`, `.subtab`,
- `.capacity`, `.filters`, `.filter-chip`,
- `.plot-card`, `.formation-slot`, `.beast-card`,
- `.quality-common`, `.quality-fine`, `.quality-rare`.

At 360 CSS pixels wide, left navigation remains scrollable and the right content remains independently scrollable; no horizontal body scroll is allowed.

- [ ] **Step 8: Verify UI and full regression**

Run:

```powershell
node --check ui.js
node selftest_ui.js
npm test
```

Expected: all PASS; UI assertions increase but the existing shell/avatar/modal assertions remain green.

- [ ] **Step 9: Commit**

```powershell
git add ui.js styles.css selftest_ui.js
git commit -m "feat: render stage 2 in existing UI shell"
```

### Task 14: Stage 2 release synchronization and engineering gate

**Files:**
- Create: `scripts/sync-release.js`
- Create: `selftest_release_sync.js`
- Modify: `package.json`
- Modify: `selftest_all.js`
- Generate: `release/core/**`
- Generate: `release/content/**`
- Generate: `release/index.html`
- Generate: `release/platform.js`
- Generate: `release/game.js`
- Generate: `release/ui.js`
- Generate: `release/styles.css`
- Generate: `release/nie-manifest.js`

**Interfaces:**
- Produces `npm run sync-release` and a verified release mirror of runtime source.
- The script copies an explicit allowlist and never independently edits gameplay.

- [ ] **Step 1: Add a failing release-sync test**

Create `selftest_release_sync.js` that recursively hashes these source/runtime pairs:

```js
[
  'index.html', 'platform.js', 'game.js', 'ui.js', 'styles.css', 'nie-manifest.js',
  'core', 'content'
]
```

For files, compare root to `release/<file>`. For directories, compare relative file lists and SHA-256 hashes. Ignore docs/tests/scripts and do not recopy `NIE`; existing root and release asset trees are separately checked by relative file list.

Register the suite and run `npm test`.

Expected: FAIL because release lacks the new `core/` and `content/` runtime modules.

- [ ] **Step 2: Implement explicit release synchronization**

Create `scripts/sync-release.js` using only Node built-ins. It must:

- Resolve source root from `__dirname`.
- Refuse to operate if the destination is not exactly `<sourceRoot>/release`.
- Copy the explicit runtime allowlist above.
- Create missing directories.
- Overwrite only allowlisted generated runtime files.
- Leave NIE assets and any non-allowlisted release metadata untouched.
- Exit nonzero on any copy failure.

Add:

```json
"sync-release": "node scripts/sync-release.js"
```

- [ ] **Step 3: Generate release and run the complete engineering gate**

Run:

```powershell
npm run sync-release
node --check game.js
node --check ui.js
node --check core/simulation.js
node --check core/stage2-rules.js
npm test
```

Expected: all commands exit 0, all suites report zero failures, and release hashes match.

- [ ] **Step 4: Run browser smoke QA without a playability gate**

Serve the root source and check at 360×800 and 420×820:

- character creation works and does not auto-join a sect,
- top/left/right UI skeleton is unchanged,
- one gather action advances and survives a page switch,
- switching to production replaces it,
- crop growth does not replace it,
- inventory capacity/filter/sale work,
- formation equip binds the item,
- beast assistant selection does not interrupt the action,
- offline details still open first when pending,
- browser console has no uncaught error.

This is an engineering regression check only; do not ask whether the design is “fun.”

- [ ] **Step 5: Run forbidden-scope and architecture scans**

Run:

```powershell
rg -n "Math\.random|localStorage|Platform\.save|document\.|window\.|canvas|toast\(" core content
rg -n "排行榜|进入云隐宗|双修" index.html game.js ui.js styles.css core content
rg -n "GameAPI\.(state|data|persist)|\ba\.(state|data|persist)\b" ui.js
```

Expected:

- First command has no match outside the allowed UMD wrapper’s `globalThis`/module export lines; there is no gameplay random/storage/DOM/UI call.
- Second command has no player-facing forbidden copy.
- Third command has no match.

- [ ] **Step 6: Commit**

```powershell
git add scripts/sync-release.js package.json selftest_release_sync.js selftest_all.js release
git commit -m "build: synchronize verified stage 2 release"
```

## Stage 2 Completion Gate

- The exact twelve canonical life skills exist at levels 1–99; charm has no mastery and cannot gain XP outside social sources.
- All 41 gathering locations/spots, 10 fish species, 33 recipes, 6 crops, 5 formations, and 4 beasts pass referential-integrity tests.
- Resource points have random type/quality/finite capacity; depletion stops the current action.
- Fish stock is per species, shared across spots, passively recovered, and chunk-invariant.
- Production consumes exact materials atomically, has no queue, and stops on material exhaustion.
- Inventory stacks identical items, enforces 40 initial slots, filters categories, protects bindings, and never loses costs/output on a failed transaction.
- Three farm plots advance for full real elapsed time, mature offline, and never rot.
- Formation crafting occupies the main slot; equipped formations persist and never alter breakthrough probability.
- Taming/training occupies the main slot; beasts persist with level/species mastery/trait/growth; one assistant applies the tested bonus.
- Online chunked simulation and offline batch simulation end in identical state for the same seed and elapsed time.
- Passive lanes advance beyond the offline main-action cap; the main action remains selected at `offline_cap`.
- A Stage 2 v3 snapshot migrates explicitly from Stage 1B v2 and survives JSON round-trip.
- The UI retains the existing top/left/right skeleton and shows all Stage 2 surfaces without exposing mutable state.
- Stage 3 combat/techniques/breakthrough tasks and Stage 4 NPC/relationship/event/world systems remain explicitly out of scope and expose only noninteractive reserved cards.
- All focused suites and `npm test` pass; browser smoke has no uncaught error; verified root runtime is synchronized to `release/`.

## Required Task Order and Review Gates

Execute in this dependency order:

1. Content registries
2. State/migration
3. Progression
4. Inventory
5. Exploration/gathering
6. Fishing
7. Production
8. Farmland
9. Formations
10. Spirit beasts
11. Simulation integration
12. Command/query API
13. UI
14. Release/final gate

Use a fresh implementer for each task. After each commit, dispatch a fresh reviewer against that task’s brief and commit range. Fix every Serious or Important finding and re-review before advancing. Minor findings are recorded for the final Stage 2 review. The main agent independently runs the Stage 2 completion gate before starting Stage 3.
