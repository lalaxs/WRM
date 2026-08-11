# Random Combat Equipment System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved deterministic random-affix combat equipment system, including eight-slot loadouts, shared inventory capacity, enhancement/reforge actions, combat integration, icon assets, and the portrait backpack equipment dock.

**Architecture:** Add a frozen content registry for bases, affixes, qualities, resonances, and slot metadata; add a pure equipment domain that owns deterministic instance generation and calculation; extend the existing inventory and Stage 3 loadout/state boundaries to store and reference instances. Keep UI mutations behind the existing `game.js` query/command boundary and extend the existing item tip and item-detail modal instead of creating a second UI framework.

**Tech Stack:** Native browser JavaScript (UMD modules), HTML/CSS DOM UI, existing xorshift `GameRandom`, Node self-test scripts, existing source-to-`release/` sync.

## Global Constraints

- The feature serves combat only; life equipment is out of scope.
- Equipment slots are exactly `weapon`, `head`, `robe`, `bracer`, `belt`, `boots`, `accessory`, and `artifact`.
- The portrait baseline is approximately 390×760; the equipment dock is four columns by two rows.
- The equipment dock stays fixed inside the backpack page while only the inventory area scrolls.
- Clicking equipped gear opens an anchored floating tip and must not change layout height.
- Clicking backpack gear continues to open the existing centered item-detail modal.
- Equipment instances and stack item types share the same inventory capacity.
- A full inventory permanently rejects a newly awarded equipment instance and combat continues with a warning.
- Normal equipment quality never increases.
- Enhancement failures consume materials but never downgrade, break, or destroy gear; pity guarantees eventual success.
- Reforge can lock exactly one affix and rerolls every unlocked affix.
- Equipped, favorited, and loadout-referenced instances still occupy inventory capacity.
- Existing unrelated dirty-worktree changes must be preserved. Do not commit an overlapping modified file unless its pre-existing changes can be separated safely; new-file commits may be made independently.

---

## File Structure

### New files

- `content/equipment.js` — frozen slots, qualities, bases, affixes, resonances, generation weights, enhancement tables, and legacy base aliases.
- `core/equipment.js` — pure instance normalization, deterministic generation, stat aggregation, resonance calculation, enhancement, and reforge.
- `assets/item-icons/50/equipment-*.svg` — eight small slot icon assets.
- `assets/item-icons/100/equipment-*.svg` — eight large slot icon assets.
- `selftest_equipment_content.js` — content and icon contract tests.
- `selftest_equipment_domain.js` — generation, affix, resonance, enhancement, and reforge tests.
- `selftest_equipment_inventory.js` — capacity, instance CRUD, and legacy stack migration tests.
- `selftest_equipment_combat.js` — eight-slot loadout, derived stat, and battle snapshot tests.
- `selftest_equipment_commands.js` — public query/command action tests.
- `selftest_equipment_acquisition.js` — loot, full-bag, and forging tests.
- `selftest_equipment_npc.js` — autonomous NPC equipment generation and normalization tests.
- `selftest_equipment_ui.js` — portrait dock, tips, modal, and direct-equip UI tests.

### Modified files

- `index.html` — load equipment content/domain before inventory, state, loadout, and combat consumers.
- `scripts/sync-release.js` — include new modules and assets in release synchronization.
- `selftest_all.js` — run the new suites.
- `core/stage2-state.js` — persist `inventory.equipment`.
- `core/state-model.js` — preserve the equipment state through runtime/snapshot conversion.
- `core/inventory.js` — count, query, add, replace, and remove equipment instances.
- `core/stage3-state.js` — normalize eight slots and migrate three-slot legacy loadouts.
- `core/combat-loadouts.js` — reference `instanceId` values and expose eight-slot rows.
- `core/combat-stats.js` — merge equipment base/affix/resonance modifiers.
- `core/team-combat-snapshot.js` — freeze resolved equipment and injected modifiers.
- `core/combat-rewards.js` — generate and award equipment without stopping combat on full inventory.
- `core/production.js` — produce a selected named base as a random instance.
- `core/npc-generator.js` — generate deterministic NPC combat equipment.
- `core/npc-simulation.js` — improve NPC equipment autonomously.
- `core/stage4-state.js` — normalize NPC-owned equipment outside the player inventory.
- `content/recipes.js` — expose forging recipes that select equipment bases.
- `content/combat.js` — add base-drop descriptors to enemy/first-clear rewards.
- `game.js` — expose equipment queries and atomic commands.
- `ui.js` — render the fixed portrait dock, equipment tip, and equipment modal actions.
- `styles.css` — add four-by-two dock, scroll boundary, anchored tip, and portrait modal styles.

---

### Task 1: Equipment Content Registry and Slot Icons

**Files:**
- Create: `content/equipment.js`
- Create: `assets/item-icons/50/equipment-weapon.svg`
- Create: `assets/item-icons/50/equipment-head.svg`
- Create: `assets/item-icons/50/equipment-robe.svg`
- Create: `assets/item-icons/50/equipment-bracer.svg`
- Create: `assets/item-icons/50/equipment-belt.svg`
- Create: `assets/item-icons/50/equipment-boots.svg`
- Create: `assets/item-icons/50/equipment-accessory.svg`
- Create: `assets/item-icons/50/equipment-artifact.svg`
- Create: `assets/item-icons/100/equipment-weapon.svg`
- Create: `assets/item-icons/100/equipment-head.svg`
- Create: `assets/item-icons/100/equipment-robe.svg`
- Create: `assets/item-icons/100/equipment-bracer.svg`
- Create: `assets/item-icons/100/equipment-belt.svg`
- Create: `assets/item-icons/100/equipment-boots.svg`
- Create: `assets/item-icons/100/equipment-accessory.svg`
- Create: `assets/item-icons/100/equipment-artifact.svg`
- Create: `selftest_equipment_content.js`
- Modify: `index.html`
- Modify: `scripts/sync-release.js`
- Modify: `selftest_all.js`
- Modify: `content/combat-lexicon.js`

**Interfaces:**
- Produces: `EquipmentContent.SLOTS`, `SLOT_META`, `QUALITIES`, `BASES`, `AFFIXES`, `RESONANCES`, `ENHANCEMENT_LEVELS`, `LEGACY_BASE_ALIASES`, `getBase(id)`, `getAffix(id)`, and `getResonance(id)`.
- Consumes: canonical combat stat names from `content/combat-lexicon.js`; icon files under `assets/item-icons/{50,100}`.

- [ ] **Step 1: Write the failing content contract**

```js
'use strict';
const assert = require('assert');
const E = require('./content/equipment.js');

assert.deepStrictEqual(E.SLOTS, [
  'weapon', 'head', 'robe', 'bracer',
  'belt', 'boots', 'accessory', 'artifact'
]);
assert.strictEqual(Object.keys(E.RESONANCES).length, 8);
assert.strictEqual(E.QUALITIES.legendary.affixCount, 4);
assert.strictEqual(E.QUALITIES.common.affixCount, 0);
for (const slot of E.SLOTS) {
  const bases = Object.values(E.BASES).filter((base) => base.slot === slot);
  assert(bases.length > 0, `missing base for ${slot}`);
  assert(bases.every((base) => base.iconSrc50 && base.iconSrc100));
}
console.log('equipment content self-test passed');
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `node selftest_equipment_content.js`
Expected: FAIL with `Cannot find module './content/equipment.js'`.

- [ ] **Step 3: Implement the frozen content registry**

Use the existing UMD shape and export exact immutable records:

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EquipmentContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SLOTS = Object.freeze([
    'weapon', 'head', 'robe', 'bracer',
    'belt', 'boots', 'accessory', 'artifact'
  ]);
  const QUALITIES = deepFreeze({
    common: { affixCount: 0, rareChance: 0 },
    fine: { affixCount: 1, rareChance: 0 },
    rare: { affixCount: 2, rareChance: 0 },
    epic: { affixCount: 3, rareChance: 0 },
    legendary: { affixCount: 4, rareChance: 0.25 },
    mythic: { affixCount: 4, handcrafted: true }
  });
  // Build BASES from nine realm bands × eight slots and expose legacy aliases.
  // Build numeric affixes from the combat lexicon plus explicit build/rare rules.
  return Object.freeze({ SLOTS, SLOT_META, QUALITIES, BASES, AFFIXES,
    RESONANCES, ENHANCEMENT_LEVELS, LEGACY_BASE_ALIASES,
    getBase, getAffix, getResonance });
});
```

Definitions must enforce one resonance source per base, T1–T6 value bands, maximum two build affixes, and one rare affix replacement slot.

- [ ] **Step 4: Create the eight icon silhouettes in both sizes**

Each SVG must use a transparent view box, no quality frame, no text, and keep the silhouette inside an 80% safe area. The 50 and 100 variants may share paths but must have their own files so existing `iconSrc50`/`iconSrc100` loading remains unchanged.

- [ ] **Step 5: Wire script order and release sync**

Load `content/combat-lexicon.js` before `content/equipment.js`, then load equipment before `content/items.js` consumers. Add both content modules to `RUNTIME_FILES`; assets are already covered by the recursive `assets` listing.

- [ ] **Step 6: Run content and release tests**

Run:

```bash
node selftest_equipment_content.js
node selftest_release_sync.js
```

Expected: both PASS.

- [ ] **Step 7: Checkpoint**

If only new files are staged, commit them with:

```bash
git add content/equipment.js assets/item-icons/50/equipment-*.svg \
  assets/item-icons/100/equipment-*.svg selftest_equipment_content.js
git commit -m "feat: add combat equipment content registry"
```

Leave overlapping dirty files unstaged.

### Task 2: Pure Equipment Instance Domain

**Files:**
- Create: `core/equipment.js`
- Create: `selftest_equipment_domain.js`
- Modify: `index.html`
- Modify: `scripts/sync-release.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `EquipmentContent`, `GameRandom.next(seed)`.
- Produces:
  - `normalizeInstance(value): EquipmentInstance|null`
  - `generate({baseId, quality, instanceId, source, rngState}): {ok, instance, rngState}|{ok:false, code, rngState}`
  - `resolve(instance): ResolvedEquipment|null`
  - `aggregate(instances): {flat, percent, rules, resonance}`
  - `enhance(instance, {materialAvailable, protectionBonus, rngState}): DomainResult`
  - `reforge(instance, {lockedAffixIndex, rngState}): DomainResult`
  - `legacyInstance(baseItemId, ordinal): EquipmentInstance|null`

- [ ] **Step 1: Write deterministic generation and mutation tests**

```js
const assert = require('assert');
const Equipment = require('./core/equipment.js');

const request = {
  baseId: 'qi-weapon',
  quality: 'legendary',
  instanceId: 'eq-1',
  source: { type: 'test', sourceId: 'fixture', acquiredAt: 1 },
  rngState: 123456
};
assert.deepStrictEqual(Equipment.generate(request), Equipment.generate(request));
const generated = Equipment.generate(request);
assert(generated.ok);
assert.strictEqual(generated.instance.affixes.length, 4);
assert(Equipment.resolve(generated.instance).stats.attack > 0);

const locked = Equipment.reforge(generated.instance, {
  lockedAffixIndex: 0,
  rngState: generated.rngState
});
assert(locked.ok);
assert.deepStrictEqual(
  locked.instance.affixes[0],
  generated.instance.affixes[0]
);
```

Add assertions for max two build affixes, max one rare affix, max one resonance point, +15 cap, no-downgrade failure, and pity success.

- [ ] **Step 2: Run the domain test and verify failure**

Run: `node selftest_equipment_domain.js`
Expected: FAIL because `core/equipment.js` is missing.

- [ ] **Step 3: Implement strict normalization and deterministic draws**

Every random draw must thread the returned seed:

```js
function draw(state) {
  const rolled = GameRandom.next(state.rngState);
  state.rngState = rolled.seed;
  return rolled.value;
}
```

Reject unknown bases/affixes, clamp enhancement to 0–15, freeze returned DTOs, and persist rolled numeric values rather than recalculating them.

- [ ] **Step 4: Implement resolution and resonance aggregation**

`resolve(instance)` returns base stats multiplied by `1 + level * 0.02`, ordinary flat/percent modifiers, build/rare rules, icon metadata, and at most one resonance point. `aggregate(instances)` sums eight resolved instances and activates only 2/4 resonance thresholds.

- [ ] **Step 5: Implement enhancement and reforge**

Enhancement must use the exact rate/pity table from the spec. Reforge must preserve base, quality, enhancement, source, favorite, and affix count; preserve the locked affix byte-for-byte; and reroll all other positions.

- [ ] **Step 6: Run the domain test**

Run: `node selftest_equipment_domain.js`
Expected: PASS.

- [ ] **Step 7: Checkpoint**

Commit new domain/test files when safe:

```bash
git add core/equipment.js selftest_equipment_domain.js
git commit -m "feat: add deterministic equipment instance domain"
```

### Task 3: Shared Inventory Capacity and Save Migration

**Files:**
- Create: `selftest_equipment_inventory.js`
- Modify: `core/inventory.js`
- Modify: `core/stage2-state.js`
- Modify: `core/state-model.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `Equipment.normalizeInstance`, `Equipment.legacyInstance`.
- Produces:
  - `inventory.equipment = {version: 1, nextInstanceId: 1, instances: []}`
  - `Inventory.findEquipment(inventory, instanceId)`
  - `Inventory.addEquipment(inventory, instance)`
  - `Inventory.replaceEquipment(inventory, instance)`
  - `Inventory.removeEquipment(inventory, instanceId)`
  - `Inventory.query(...).items[]` rows with `instanceId` for equipment.

- [ ] **Step 1: Write capacity and migration tests**

```js
const assert = require('assert');
const Inventory = require('./core/inventory.js');
const Stage2State = require('./core/stage2-state.js');

const bag = {
  capacity: 2,
  capacityGrants: {},
  stacks: { copperOre: 20 },
  bindings: {},
  equipment: { version: 1, nextInstanceId: 2, instances: [fixtureInstance] }
};
assert.strictEqual(Inventory.occupiedSlots(bag), 2);
assert.strictEqual(
  Inventory.addEquipment(bag, secondInstance).code,
  'inventory_full'
);

const migrated = Stage2State.normalize({
  player: {
    inventory: {
      capacity: 40,
      capacityGrants: {},
      stacks: { qiWeapon: 2 },
      bindings: {}
    }
  },
  systems: {}
});
assert.strictEqual(migrated.player.inventory.equipment.instances.length, 2);
assert.strictEqual(migrated.player.inventory.stacks.qiWeapon, undefined);
```

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_inventory.js`
Expected: FAIL because inventory has no instance APIs.

- [ ] **Step 3: Extend Stage 2 defaults and normalizer**

Add the equipment record to defaults. During normalization:

1. normalize existing instance records;
2. convert stack items whose content category is `equipment`;
3. use stable IDs `legacy-<itemId>-<ordinal>`;
4. remove migrated quantities from stacks;
5. do not reject migrated items when legacy capacity is already exceeded;
6. set `nextInstanceId` above every numeric `eq-<n>` ID.

- [ ] **Step 4: Extend inventory operations**

Count instances in `occupiedSlots`. `addEquipment` returns `inventory_full` without mutation when no slot is free. `replaceEquipment` requires an existing ID. `removeEquipment` returns the removed instance in `result`.

- [ ] **Step 5: Merge instance rows into inventory query**

Equipment rows use:

```js
{
  instanceId,
  itemId: baseId,
  category: 'equipment',
  quantity: 1,
  quality,
  slot,
  name,
  iconSrc50,
  iconSrc100,
  description,
  enhancementLevel,
  favorite
}
```

The reported `used` value must call `occupiedSlots`, not `Object.keys(stacks).length`.

- [ ] **Step 6: Preserve equipment through StateModel**

Copy `inventory.equipment` in `normalizePlayer`, runtime application, and snapshot conversion.

- [ ] **Step 7: Run inventory, state, and save tests**

Run:

```bash
node selftest_equipment_inventory.js
node selftest_stage2_inventory.js
node selftest_stage2_state.js
node selftest_foundation.js
```

Expected: all PASS.

### Task 4: Eight-Slot Loadouts, Derived Stats, and Battle Snapshots

**Files:**
- Create: `selftest_equipment_combat.js`
- Modify: `core/stage3-state.js`
- Modify: `core/combat-loadouts.js`
- Modify: `core/combat-stats.js`
- Modify: `core/team-combat-snapshot.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: inventory instance APIs and `Equipment.resolve/aggregate`.
- Produces: loadout equipment references by `instanceId`; `CombatStats.derive` with equipment modifiers; snapshot `equipment` containing detached resolved instances.

- [ ] **Step 1: Write loadout and snapshot tests**

```js
const assert = require('assert');
const Loadouts = require('./core/combat-loadouts.js');
const CombatStats = require('./core/combat-stats.js');

const changed = Loadouts.setEquipment(model, 'loadout-1', 'weapon', 'eq-1');
assert(changed.ok);
assert.strictEqual(
  changed.state.player.combat.loadouts[0].equipment.weapon,
  'eq-1'
);
assert(CombatStats.derive(changed.state, 'loadout-1').attack > baseAttack);
assert.strictEqual(
  Object.keys(changed.state.player.combat.loadouts[0].equipment).length,
  8
);
```

Add a snapshot assertion that mutating inventory after `createSession` does not change frozen combat equipment.

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_combat.js`
Expected: FAIL because loadouts still accept three stack item IDs.

- [ ] **Step 3: Migrate Stage 3 loadouts**

Normalize all eight keys. Map legacy `armor` to `robe`. Resolve legacy item IDs to the first matching migrated instance. Initialize locked future-realm slots to `null` but retain the full eight-key shape.

- [ ] **Step 4: Update CombatLoadouts**

Validate that `instanceId` exists in inventory and its resolved base slot matches the target slot. Do not bind stack quantities. Query rows must include resolved item display data and `unlocked` based on realm.

- [ ] **Step 5: Update derived stats**

Replace the old three-item static registry read with `Equipment.aggregate`. Merge all 21 combat lexicon fields, percent fields, rules, and active resonance effects while retaining current technique, formation, and beast calculation order.

- [ ] **Step 6: Freeze equipment in combat snapshots**

Snapshot the resolved eight-instance array and aggregated modifiers. Use detached JSON-safe records and never retain inventory references.

- [ ] **Step 7: Run focused and existing combat tests**

Run:

```bash
node selftest_equipment_combat.js
node selftest_stage3_loadouts.js
node selftest_stage3_stats.js
node selftest_team_combat_snapshot.js
node selftest_stage3_combat.js
```

Expected: all PASS.

### Task 5: Atomic Equipment Commands

**Files:**
- Create: `selftest_equipment_commands.js`
- Modify: `game.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces queries:
  - `equipmentInfo({instanceId, loadoutId?})`
- Produces commands:
  - `equipEquipment({instanceId, loadoutId?})`
  - `unequipEquipment({slot, loadoutId?})`
  - `enhanceEquipment({instanceId, useProtection})`
  - `reforgeEquipment({instanceId, lockedAffixIndex})`
  - `setEquipmentFavorite({instanceId, favorite})`
  - `sellEquipment({instanceId})`
  - `salvageEquipment({instanceIds})`

- [ ] **Step 1: Write public boundary tests**

Use the existing browser-like runtime fixture pattern and assert:

```js
const info = api.queries.equipmentInfo({ instanceId: 'eq-1' });
assert.strictEqual(info.instanceId, 'eq-1');
assert(Array.isArray(info.affixes));

const equipped = api.commands.equipEquipment({ instanceId: 'eq-1' });
assert(equipped.ok);
assert.strictEqual(equipped.data.slot, 'weapon');
```

Also assert favorite/reference protection, insufficient-material failure without mutation, pity persistence, locked reforge preservation, and active-battle `effectiveNextBattle: true`.

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_commands.js`
Expected: FAIL because the query and commands are absent.

- [ ] **Step 3: Add the equipment info query**

The query resolves base/affix text, comparison deltas against the requested or active loadout, resonance before/after, affected loadout names, and operation permissions.

- [ ] **Step 4: Add atomic equip and unequip commands**

`equipEquipment` derives the unique slot from the base definition and calls `CombatLoadouts.setEquipment`. `unequipEquipment` sets the target slot to `null`. Both save through `commitModel`.

- [ ] **Step 5: Add enhancement and reforge commands**

Validate and debit materials inside the same candidate mutation that updates the instance and RNG state. On any failure return an unchanged model.

- [ ] **Step 6: Add favorite, sale, and salvage commands**

Reject sale/salvage when favorite or referenced. Sale grants lingshi; salvage grants configured forging materials. Batch salvage validates the entire selection before mutating any instance.

- [ ] **Step 7: Run command and persistence tests**

Run:

```bash
node selftest_equipment_commands.js
node selftest_stage3_api.js
node selftest_ui.js
```

Expected: all PASS.

### Task 6: Combat Drops and Forging Acquisition

**Files:**
- Create: `selftest_equipment_acquisition.js`
- Modify: `content/combat.js`
- Modify: `content/recipes.js`
- Modify: `core/combat-rewards.js`
- Modify: `core/production.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `Equipment.generate`, `Inventory.addEquipment`.
- Produces reward descriptors `{kind:'equipment', baseId, qualityWeights, sourceId}` and forging output descriptors `{kind:'equipment', baseId}`.

- [ ] **Step 1: Write acquisition tests**

```js
const result = Rewards.grant(model, {
  equipment: [{ baseId: 'qi-weapon', quality: 'rare' }]
});
assert.strictEqual(
  result.value.player.inventory.equipment.instances.length,
  1
);
assert.strictEqual(result.gains.equipment.length, 1);
```

Add a full-bag assertion that `result.ok` stays true, no instance is added, RNG advances, and warnings include `equipment_lost_inventory_full`. Add a forging assertion that the selected base is fixed while quality/affixes are generated.

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_acquisition.js`
Expected: FAIL because rewards only grant stack items.

- [ ] **Step 3: Add equipment reward descriptors**

Give ordinary regions low equipment chances, elites higher quality weights, bosses distinctive base pools, and first clears deterministic base rewards. Do not add mythic random drops.

- [ ] **Step 4: Award equipment at reward settlement**

Generate the complete instance before checking capacity. If `addEquipment` returns `inventory_full`, append the warning/log entry and continue processing currency, XP, and other drops.

- [ ] **Step 5: Add forging recipes**

Recipes select a named `baseId`; production consumes existing materials and uses forging level/mastery only to modify quality/tier weights, duration, and material cost.

- [ ] **Step 6: Run reward and production tests**

Run:

```bash
node selftest_equipment_acquisition.js
node selftest_stage3_rewards.js
node selftest_stage2_production.js
node selftest_stage3_simulation.js
```

Expected: all PASS.

### Task 7: Autonomous NPC Equipment

**Files:**
- Create: `selftest_equipment_npc.js`
- Modify: `core/npc-generator.js`
- Modify: `core/npc-simulation.js`
- Modify: `core/stage4-state.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `Equipment.generate`, `Equipment.normalizeInstance`, and `Equipment.aggregate`.
- Produces: `npc.combatEquipment = {version: 1, instances: [], equipment: EightSlotMap}` stored only on the NPC profile.

- [ ] **Step 1: Write NPC generation and normalization tests**

```js
const assert = require('assert');
const NpcGenerator = require('./core/npc-generator.js');
const Stage4State = require('./core/stage4-state.js');

const first = NpcGenerator.generate({
  rngState: 12345,
  count: 1,
  usedNames: []
});
const second = NpcGenerator.generate({
  rngState: 12345,
  count: 1,
  usedNames: []
});
assert.deepStrictEqual(first, second);
assert(first.value[0].combatEquipment.instances.length > 0);
assert.strictEqual(
  first.value[0].combatEquipment.equipment.weapon !== undefined,
  true
);

const clean = Stage4State.normalize(modelWithNpcEquipment);
assert.strictEqual(
  clean.systems.npcs.roster[0].combatEquipment.version,
  1
);
```

Also assert that NPC instances never appear in `player.inventory`, unknown NPC equipment is dropped during normalization, and simulation upgrades do not mutate the player's RNG or inventory.

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_npc.js`
Expected: FAIL because NPC profiles have no combat equipment.

- [ ] **Step 3: Generate NPC equipment from realm and combat style**

Use the NPC generator's existing RNG thread. Choose unlocked slots by realm, prefer bases and affix profiles matching NPC combat tags, and store instances under the NPC profile.

- [ ] **Step 4: Normalize NPC equipment in Stage 4 state**

Keep the same eight-slot map, normalize each instance through the pure equipment domain, and clear references to missing or wrong-slot instances.

- [ ] **Step 5: Add autonomous improvement**

During NPC simulation milestones, compare resolved equipment scores for the NPC's style and replace a slot only when the candidate score is higher. This operation uses NPC simulation RNG and never touches the player bag.

- [ ] **Step 6: Run NPC and Stage 4 tests**

Run:

```bash
node selftest_equipment_npc.js
node selftest_stage4_npc_generator.js
node selftest_stage4_npc_simulation.js
node selftest_stage4_state.js
```

Expected: all PASS.

### Task 8: Portrait Backpack Equipment UI

**Files:**
- Create: `selftest_equipment_ui.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: inventory rows, combat loadout rows, `equipmentInfo`, and equipment commands from Tasks 3–5.
- Produces DOM classes:
  - `.inventory-equipment-dock`
  - `.equipment-dock-grid`
  - `.equipment-dock-slot`
  - `.equipment-equipped-tip`
  - `.equipment-detail-affixes`
  - `.equipment-action-grid`

- [ ] **Step 1: Write UI structure and interaction tests**

Extend the existing `MockEl` fixture and assert:

```js
switchToNav('背包');
assert.strictEqual(byClass(uiRoot, 'equipment-dock-slot').length, 8);
assert.strictEqual(
  firstClass(uiRoot, 'equipment-dock-grid').style.gridTemplateColumns,
  ''
);
firstClass(uiRoot, 'equipment-dock-slot').click();
assert.strictEqual(byClass(uiRoot, 'equipment-equipped-tip').length, 1);
```

Record the dock element height before and after the click and assert it is unchanged. Click an inventory equipment row and assert the existing `.modal`/item-detail surface opens with an `装备` command button.

- [ ] **Step 2: Run and verify failure**

Run: `node selftest_equipment_ui.js`
Expected: FAIL because the dock does not exist.

- [ ] **Step 3: Render the fixed equipment dock**

In `buildInventory`, create the dock before filters and `inventoryHost`. Refresh it from the active loadout on every inventory refresh. Render all eight slots even when locked or empty.

- [ ] **Step 4: Reuse and extend the existing item tip**

Create an equipped-gear variant anchored to the clicked dock slot. Position it with viewport/content-boundary clamping. Include `卸下` and `查看详情`. Do not append any detail panel inside the dock.

- [ ] **Step 5: Extend the existing item-detail modal**

When a row has `instanceId`, render resolved base stats, affixes, rare/build text, comparison deltas, resonance changes, and the action grid. Keep stack item behavior unchanged.

- [ ] **Step 6: Add portrait CSS**

Required CSS behavior:

```css
.inventory-page {
  display: flex;
  min-height: 0;
  flex-direction: column;
}
.inventory-equipment-dock { flex: 0 0 auto; }
.equipment-dock-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.inventory-scroll-region {
  min-height: 0;
  overflow-y: auto;
}
.equipment-equipped-tip {
  position: fixed;
  z-index: 140;
}
@media (max-width: 520px) {
  .equipment-action-grid { grid-template-columns: repeat(2, 1fr); }
}
```

Maintain the existing shallow purple palette, quality backgrounds, 34px bag icons, 38px dock icons, and 54px detail images.

- [ ] **Step 7: Run UI tests**

Run:

```bash
node selftest_equipment_ui.js
node selftest_item_tips.js
node selftest_ui.js
node selftest_browser_fixture.js
```

Expected: all PASS.

### Task 9: Release Sync, Full Regression, and Portrait Browser QA

**Files:**
- Modify: `release/**` only through `node scripts/sync-release.js`
- Modify: test files only if verification exposes a real regression

**Interfaces:**
- Consumes: all prior tasks.
- Produces: synchronized release bundle and verification evidence.

- [ ] **Step 1: Run focused equipment suites**

Run:

```bash
node selftest_equipment_content.js
node selftest_equipment_domain.js
node selftest_equipment_inventory.js
node selftest_equipment_combat.js
node selftest_equipment_commands.js
node selftest_equipment_acquisition.js
node selftest_equipment_npc.js
node selftest_equipment_ui.js
```

Expected: all PASS.

- [ ] **Step 2: Run the complete regression suite**

Run: `npm test`
Expected: exit code 0 and `=== 全量自测通过 ===`.

- [ ] **Step 3: Synchronize release output**

Run: `npm run sync-release`
Expected: new equipment modules/icons copied; stale release entries pruned only within generated directories.

- [ ] **Step 4: Verify release and package**

Run:

```bash
node selftest_release.js
node selftest_release_sync.js
npm run package:h5
node selftest_h5_package.js
```

Expected: all PASS.

- [ ] **Step 5: Run portrait browser QA**

Open the local game at a 390×760 viewport, create/load a character, open 背包, and verify:

1. eight dock slots render four by two;
2. the dock remains still while the bag scrolls;
3. every edge slot tip remains inside the right content region;
4. clicking backpack gear opens the existing modal;
5. the modal action grid is two columns;
6. equipping refreshes the dock and reports next-battle behavior during combat.

- [ ] **Step 6: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git diff -- content/equipment.js core/equipment.js core/inventory.js \
  core/stage2-state.js core/stage3-state.js core/combat-loadouts.js \
  core/combat-stats.js core/team-combat-snapshot.js \
  core/combat-rewards.js core/production.js content/recipes.js \
  content/combat.js game.js ui.js styles.css index.html \
  scripts/sync-release.js selftest_equipment_*.js selftest_all.js
```

Expected: no whitespace errors; no unrelated file edits introduced by this feature.

- [ ] **Step 7: Final checkpoint**

Commit only paths whose pre-existing changes are not being absorbed accidentally. If overlapping dirty files prevent a safe commit, leave implementation changes uncommitted and report the exact verification commands and results.
