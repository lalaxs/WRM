# Material Manufacturing Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the latest material/manufacturing content table to the game, expose it through existing item, gathering, and production content, and deliver an art requirement table for later flat vector icon generation.

**Architecture:** Add a new `content/materials.js` catalog as the source of truth for expanded material slots, gathering extensions, production recipes, and icon art requirements. Existing `content/items.js`, `content/gathering.js`, and `content/recipes.js` merge this catalog so new content appears in inventory tooltips, gathering pages, and production pages without adding a new UI surface.

**Tech Stack:** Browser/Node UMD JavaScript content modules, current Stage 2 content registries, Node selftests, release sync script.

## Global Constraints

- Do not directly copy a competitor's full recognizable item/recipe/numeric dataset; implement an original cultivation-themed catalog with equivalent module coverage, dependency topology, and numeric field positions.
- Keep existing content files compatible with CommonJS tests and browser globals.
- New icon work is requirements-only: no generated image assets in this task.
- New art direction must target simplified flat vector icons similar to "银河奶牛放置" style.
- Work with existing dirty files; do not revert unrelated user changes.

---

### Task 1: RED Test For Material Catalog Integration

**Files:**
- Create: `selftest_material_system.js`
- Modify later: `selftest_all.js`

**Interfaces:**
- Consumes: `content/materials.js`, `content/items.js`, `content/gathering.js`, `content/recipes.js`
- Produces: selftest expectations for `MaterialContent.itemRows()`, `MaterialContent.artRequirements()`, merged item metadata, mining extensions, and production recipes.

- [ ] **Step 1: Write the failing test**

Create a Node selftest that asserts:

```javascript
const MaterialContent = require('./content/materials.js');
const Items = require('./content/items.js');
const Gathering = require('./content/gathering.js');
const Recipes = require('./content/recipes.js');

// Catalog shape
ok(MaterialContent.itemRows().length >= 100, 'expanded material catalog has at least 100 rows');
ok(MaterialContent.artRequirements().length === MaterialContent.itemRows().length,
  'every catalog item has an art requirement row');

// Game integration
ok(Items.get('bronzeBar').name === '灵铜锭', 'new bar is queryable from ItemContent');
ok(Gathering.getEntry('mining', 'coal').drops.some((drop) => drop.itemId === 'coalOre'),
  'new mining node is visible through GatheringContent');
ok(Recipes.get('forging:bronzeBar').ingredients.copperOre === 1,
  'new smelting recipe is visible through RecipeContent');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node selftest_material_system.js`

Expected: FAIL because `content/materials.js` does not exist.

### Task 2: Material Catalog Module

**Files:**
- Create: `content/materials.js`
- Test: `selftest_material_system.js`

**Interfaces:**
- Produces:
  - `MaterialContent.itemRows(): Array<ItemRow>`
  - `MaterialContent.gatheringExtensions(): Object`
  - `MaterialContent.recipeRows(): Array<RecipeRow>`
  - `MaterialContent.artRequirements(): Array<ArtRequirementRow>`

- [ ] **Step 1: Implement catalog rows**

Create UMD module with:

```javascript
return Object.freeze({
  ITEMS,
  GATHERING_EXTENSIONS,
  RECIPE_ROWS,
  ART_REQUIREMENTS,
  itemRows,
  gatheringExtensions,
  recipeRows,
  artRequirements
});
```

Catalog must include:

- Mining resources: fuel, essence, high-tier ores, high-tier gems.
- Smelting outputs: bar and ingot chain.
- Manufacturing outputs: weapon blanks, armor plates, jewelry, bags, urn-like vessels.
- Farming/herb outputs: herb seeds and herbs.
- Herblore equivalents: dan/pill/talisman skill boosters.
- Battle materials: fang, bone, claw, core, scale, blood, soul shard, void marrow, tribulation ash.

- [ ] **Step 2: Run RED test**

Run: `node selftest_material_system.js`

Expected: still FAIL because existing registries do not merge the catalog.

### Task 3: Merge Catalog Into Game Content

**Files:**
- Modify: `content/items.js`
- Modify: `content/gathering.js`
- Modify: `content/recipes.js`
- Modify: `index.html`
- Test: `selftest_material_system.js`

**Interfaces:**
- Consumes: `MaterialContent.itemRows()`, `MaterialContent.gatheringExtensions()`, `MaterialContent.recipeRows()`
- Produces: new items in `ItemContent`, new nodes in `GatheringContent`, new recipes in `RecipeContent`.

- [ ] **Step 1: Merge item rows**

`content/items.js` must load `MaterialContent` from browser global or CommonJS and append catalog rows after existing canonical IDs.

- [ ] **Step 2: Merge gathering extensions**

`content/gathering.js` must append `MaterialContent.gatheringExtensions().mining`, `.herb`, `.woodcutting`, and `.fishing` records where present.

- [ ] **Step 3: Merge recipe rows**

`content/recipes.js` must append `MaterialContent.recipeRows()` using the existing `define()` helper.

- [ ] **Step 4: Load catalog in browser**

Insert `<script src="content/materials.js"></script>` before `content/items.js` in `index.html`.

- [ ] **Step 5: Run test**

Run: `node selftest_material_system.js`

Expected: PASS.

### Task 4: Art Requirement Table

**Files:**
- Create: `docs/art/2026-07-29-material-icon-requirements.md`
- Test: `selftest_material_system.js`

**Interfaces:**
- Consumes: `MaterialContent.artRequirements()`
- Produces: a markdown table with `itemId`, `name`, `category`, `materialType`, `tier`, `visualFamily`, `flatVectorPrompt`, `priority`.

- [ ] **Step 1: Add markdown table**

Create a documented table generated from the catalog content. It must specify "简约扁平矢量、透明背景、无文字、手游背包格可读".

- [ ] **Step 2: Extend selftest**

Assert the markdown exists, references the flat vector style, and contains rows for `bronzeBar`, `spiritTopazRing`, `miningFocusPill`, and `brokenFang`.

### Task 5: Verification And Release Sync

**Files:**
- Modify: `scripts/sync-release.js`
- Modify: `selftest_all.js`
- Generated by command: `release/content/materials.js`, `release/index.html`, content release copies.

**Interfaces:**
- Consumes: source runtime files.
- Produces: release copy and selftest registration.

- [ ] **Step 1: Add runtime file to sync**

Add `content/materials.js` to `RUNTIME_FILES` before `content/items.js`.

- [ ] **Step 2: Add focused test to all suite**

Add `selftest_material_system.js` near other content tests in `selftest_all.js`.

- [ ] **Step 3: Sync release**

Run: `npm run sync-release`

- [ ] **Step 4: Run verification**

Run:

```bash
node -c content/materials.js
node -c content/items.js
node -c content/gathering.js
node -c content/recipes.js
node selftest_material_system.js
node selftest_stage2_production.js
node selftest_stage2_gathering.js
node selftest_release_sync.js
```

Expected: focused tests pass. If unrelated existing full-suite failures remain, report them separately.

