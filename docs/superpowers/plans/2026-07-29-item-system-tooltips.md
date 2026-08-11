# Item System Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first item information tips system while keeping inventory item taps as action dialogs.

**Architecture:** `content/items.js` remains the item metadata source. `game.js` exposes a frozen read-only `queries.itemInfo` boundary for item IDs outside inventory rows. `ui.js` owns one global tap tip and a shared trigger helper, then reuses it across read-only item surfaces.

**Tech Stack:** Plain browser JavaScript, Node selftests, existing `GameAPI` query/command boundary, existing CSS.

## Global Constraints

- Inventory filled slots keep the existing action-oriented item detail dialog.
- Non-inventory item appearances use read-only tap tips, not modals.
- Tips are mobile-first: tap to open, tap elsewhere to close, no hover-only behavior.
- All item metadata resolves from existing `ItemContent`.
- Do not rewrite inventory storage or item registry structure.
- Only touch files directly related to item metadata, UI rendering, tips styling, and selftests.

---

## File Structure

- Modify `game.js`: add `queryItemInfo(input)` near existing query helpers and expose it through `queries.itemInfo`.
- Modify `ui.js`: add global item tip helpers near item detail helpers; replace direct read-only item text/icon surfaces with helper-triggered nodes.
- Modify `styles.css`: add `.item-tip` styles and small trigger affordances for mobile tap targets.
- Create `selftest_item_tips.js`: focused static and API boundary checks for item tips.
- Modify `selftest_all.js`: include `selftest_item_tips.js` in the full selftest suite.

---

### Task 1: Item Metadata Query

**Files:**
- Modify: `game.js`
- Create: `selftest_item_tips.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes: `stage2Bootstrap.ItemContent.get(itemId)`
- Produces: `GameAPI.queries.itemInfo({ itemId })`, returning a frozen item metadata object or `null`

- [ ] **Step 1: Write the failing API/static test**

Create `selftest_item_tips.js` with:

```js
'use strict';

const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('game.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const all = fs.readFileSync('selftest_all.js', 'utf8');
const Items = require('./content/items.js');
const Inventory = require('./core/inventory.js');

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed++;
}

const healing = Items.get('healingPill');
ok(
  healing &&
    healing.name === '疗伤丹' &&
    healing.category === 'consumable' &&
    healing.icon === '💊' &&
    healing.quality === 'green' &&
    /疗伤/.test(healing.description),
  'item registry exposes icon, category, quality, and description'
);

const inventoryRows = Inventory.query({
  capacity: 4,
  stacks: { healingPill: 2 },
  bindings: { healingPill: { equipment: 0, task: 1, formation: 0 } }
}, { category: 'all' }).items;
ok(
  inventoryRows.length === 1 &&
    inventoryRows[0].icon === '💊' &&
    inventoryRows[0].quality === 'green' &&
    inventoryRows[0].available === 1,
  'inventory rows include display metadata and availability'
);

ok(/function queryItemInfo\(input\)/.test(game), 'game exposes queryItemInfo');
ok(/itemInfo:\s*queryItemInfo/.test(game), 'GameAPI queries include itemInfo');
ok(/return readonlyQuery\(null\)/.test(game), 'unknown itemInfo returns null');
ok(/attachItemTipTrigger/.test(ui), 'UI defines shared item tip trigger helper');
ok(/\.item-tip/.test(css), 'CSS defines mobile item tip styles');
ok(all.includes("'selftest_item_tips.js'"), 'full selftest includes item tips suite');

console.log('Item tips self-test passed:', passed);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node selftest_item_tips.js`

Expected: FAIL because `selftest_item_tips.js` does not exist or `queryItemInfo`, `attachItemTipTrigger`, `.item-tip`, and suite registration are missing.

- [ ] **Step 3: Implement `queryItemInfo` minimally**

Add near existing query helpers in `game.js`:

```js
function queryItemInfo(input) {
  const itemId = input && typeof input.itemId === 'string'
    ? input.itemId
    : '';
  if (!stage2Bootstrap || !stage2Bootstrap.ItemContent || !itemId) {
    return readonlyQuery(null);
  }
  const item = stage2Bootstrap.ItemContent.get(itemId);
  if (!item) return readonlyQuery(null);
  return readonlyQuery({
    itemId: item.id || itemId,
    name: item.name || itemId,
    category: item.category || 'material',
    icon: item.icon || '📦',
    description: item.description || '暂无说明。',
    quality: item.quality || 'white',
    sellValue: Number.isSafeInteger(item.sellValue) ? item.sellValue : 0
  });
}
```

Expose it in `queries`:

```js
itemInfo: queryItemInfo,
```

Add `'selftest_item_tips.js'` to `selftest_all.js`.

- [ ] **Step 4: Run the focused test**

Run: `node selftest_item_tips.js`

Expected: still FAIL until Task 2 adds UI helper and CSS.

- [ ] **Step 5: Commit the query and test scaffold**

```bash
git add game.js selftest_item_tips.js selftest_all.js
git commit -m "feat: expose item metadata query"
```

---

### Task 2: Shared Mobile Item Tip Helper

**Files:**
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_item_tips.js`

**Interfaces:**
- Consumes: `api().queries.itemInfo({ itemId })`
- Produces: `attachItemTipTrigger(element, itemLike)`, `showItemTip(itemLike, anchorElement)`, `hideItemTip()`, `resolveItemTipData(itemLike)`

- [ ] **Step 1: Extend the failing static test**

Add checks to `selftest_item_tips.js`:

```js
ok(/function resolveItemTipData\(itemLike\)/.test(ui), 'UI resolves partial item tip data');
ok(/function showItemTip\(itemLike,\s*anchorElement\)/.test(ui), 'UI can show item tips near an anchor');
ok(/function hideItemTip\(\)/.test(ui), 'UI can hide item tips');
ok(/document\.addEventListener\('click'/.test(ui), 'outside tap hides item tips');
ok(/item-tip-quality/.test(ui), 'tip renders quality');
ok(/item-tip-meta/.test(ui), 'tip renders item counts and category');
ok(/position:\s*fixed/.test(css) && /z-index:\s*140/.test(css), 'tip is a fixed overlay above game UI');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node selftest_item_tips.js`

Expected: FAIL because shared helpers and CSS are not implemented.

- [ ] **Step 3: Add the shared helper in `ui.js`**

Add state near existing module state:

```js
let itemTip = { built: false, root: null, refs: null, open: false };
```

Add helpers before `buildItemDetail`:

```js
function resolveItemTipData(itemLike) {
  const source = itemLike && typeof itemLike === 'object' ? itemLike : {};
  const itemId = typeof source.itemId === 'string' ? source.itemId : '';
  const meta = itemId
    ? safeQuery('itemInfo', { itemId: itemId }, null)
    : null;
  const merged = Object.assign({
    itemId: itemId,
    name: itemId || '未知物品',
    category: 'material',
    icon: '📦',
    description: '暂无说明。',
    quality: 'white',
    sellValue: 0
  }, meta || {}, source);
  if (!merged.name) merged.name = itemId || '未知物品';
  if (!merged.icon) merged.icon = '📦';
  if (!merged.description) merged.description = '暂无说明。';
  if (!merged.quality) merged.quality = 'white';
  return merged;
}

function ensureItemTip() {
  if (itemTip.built) return itemTip;
  const rootEl = el('div', 'item-tip', root || document.body);
  rootEl.style.display = 'none';
  const head = el('div', 'item-tip-head', rootEl);
  const icon = el('div', 'item-tip-icon', head);
  const title = el('div', 'item-tip-title', head);
  const name = el('div', 'item-tip-name', title);
  const quality = el('div', 'item-tip-quality', title);
  const meta = el('div', 'item-tip-meta', rootEl);
  const desc = el('div', 'item-tip-desc', rootEl);
  itemTip = {
    built: true,
    root: rootEl,
    refs: { icon: icon, name: name, quality: quality, meta: meta, desc: desc },
    open: false
  };
  document.addEventListener('click', function (event) {
    if (!itemTip.open) return;
    const target = event.target;
    if (itemTip.root && itemTip.root.contains &&
        itemTip.root.contains(target)) return;
    if (target && target.closest &&
        target.closest('[data-item-tip-trigger="1"]')) return;
    hideItemTip();
  });
  return itemTip;
}

function itemTipMetaText(item) {
  const parts = [CATEGORY_LABELS[item.category] || item.category || '物品'];
  if (Number.isSafeInteger(item.quantity)) parts.push('数量 ' + item.quantity);
  if (Number.isSafeInteger(item.count)) parts.push('数量 ' + item.count);
  if (Number.isSafeInteger(item.required)) parts.push('需要 ' + item.required);
  if (Number.isSafeInteger(item.owned)) parts.push('持有 ' + item.owned);
  if (Number.isSafeInteger(item.available)) parts.push('可用 ' + item.available);
  return parts.join(' · ');
}

function positionItemTip(tipRoot, anchorElement) {
  const rect = anchorElement && anchorElement.getBoundingClientRect
    ? anchorElement.getBoundingClientRect()
    : { left: 12, right: 12, top: 120, bottom: 120, width: 0, height: 0 };
  const margin = 10;
  const width = Math.min(260, Math.max(210, window.innerWidth - 24));
  tipRoot.style.maxWidth = width + 'px';
  tipRoot.style.left = Math.max(12, Math.min(
    window.innerWidth - width - 12,
    rect.left + (rect.width / 2) - (width / 2)
  )) + 'px';
  const below = rect.bottom + margin;
  const useBelow = below + 160 < window.innerHeight || rect.top < 180;
  tipRoot.style.top = (useBelow
    ? below
    : Math.max(12, rect.top - 170 - margin)) + 'px';
}

function showItemTip(itemLike, anchorElement) {
  const data = resolveItemTipData(itemLike);
  if (!data.itemId && !data.name) return;
  const tip = ensureItemTip();
  tip.refs.icon.textContent = data.icon || '📦';
  tip.refs.name.textContent = data.name || data.itemId || '未知物品';
  const quality = data.quality || 'white';
  tip.refs.quality.textContent = QUALITY_LABELS[quality] || '普通';
  tip.refs.quality.className = 'item-tip-quality q-' + quality;
  tip.refs.meta.textContent = itemTipMetaText(data);
  tip.refs.desc.textContent = data.description || '暂无说明。';
  tip.root.style.display = 'block';
  tip.open = true;
  positionItemTip(tip.root, anchorElement);
}

function hideItemTip() {
  if (!itemTip || !itemTip.root) return;
  itemTip.root.style.display = 'none';
  itemTip.open = false;
}

function attachItemTipTrigger(element, itemLike) {
  if (!element || !itemLike || !itemLike.itemId) return;
  element.dataset.itemTipTrigger = '1';
  element.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    showItemTip(itemLike, element);
  });
}
```

- [ ] **Step 4: Add mobile tip CSS**

Add to `styles.css` near item detail styles:

```css
.item-tip {
  position: fixed;
  z-index: 140;
  padding: 10px 12px;
  border: 1px solid rgba(92,78,124,0.22);
  border-radius: 10px;
  background: rgba(255,252,255,0.98);
  box-shadow: 0 8px 24px rgba(74,64,99,0.22);
  color: var(--text);
  pointer-events: auto;
}
.item-tip-head { display: flex; align-items: center; gap: 9px; }
.item-tip-icon {
  width: 36px; height: 36px; flex: none; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--mist); font-size: 22px;
}
.item-tip-title { min-width: 0; flex: 1; }
.item-tip-name {
  font-size: 14px; font-weight: 600; color: var(--text);
  overflow-wrap: anywhere;
}
.item-tip-quality {
  display: inline-block; margin-top: 4px; padding: 1px 7px;
  border-radius: 999px; font-size: 10px;
}
.item-tip-meta {
  margin-top: 7px; font-size: 12px; color: var(--text-sub);
  line-height: 1.4;
}
.item-tip-desc {
  margin-top: 7px; padding-top: 7px; border-top: 1px solid var(--line);
  font-size: 12px; line-height: 1.5; color: var(--text);
}
.item-tip-trigger { cursor: pointer; }
```

- [ ] **Step 5: Run the focused test**

Run: `node selftest_item_tips.js`

Expected: PASS.

- [ ] **Step 6: Commit the helper**

```bash
git add ui.js styles.css selftest_item_tips.js
git commit -m "feat: add mobile item tips"
```

---

### Task 3: Connect Read-Only Item Surfaces

**Files:**
- Modify: `game.js`
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_item_tips.js`

**Interfaces:**
- Consumes: shared `attachItemTipTrigger(element, itemLike)`
- Produces: read-only tips on combat loot, battle supplies, production rows, gathering rows, homestead material rows, and pending loot rows

- [ ] **Step 1: Write failing coverage checks**

Extend `selftest_item_tips.js` with:

```js
[
  'battle-supply',
  'loot-cell',
  'cost-row',
  'action-out',
  'drop-row',
  'formation-card',
  'beast-card',
  'pending-loot-list'
].forEach(function (className) {
  ok(
    ui.includes(className) &&
      new RegExp('attachItemTipTrigger[\\s\\S]*' + className + '|' +
        className + '[\\s\\S]*attachItemTipTrigger').test(ui),
    className + ' is wired to item tips'
  );
});
ok(/icon:\s*item\s*&&\s*item\.icon/.test(game), 'combat loot view passes item icons');
ok(/quality:\s*item\s*&&\s*item\.quality/.test(game), 'combat loot view passes item quality');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node selftest_item_tips.js`

Expected: FAIL because most read-only surfaces are not wired.

- [ ] **Step 3: Enrich production and gathering query rows in `game.js`**

Update `stage2ItemRow`, `stage2RecipeCards.output`, and `stage2DropRows` to include:

```js
icon: item && item.icon ? item.icon : '📦',
category: item && item.category ? item.category : 'material',
quality: item && item.quality ? item.quality : 'white',
description: item && item.description ? item.description : ''
```

- [ ] **Step 4: Wire production rows in `ui.js`**

Replace plain cost rows with generated row contents:

```js
function renderItemLine(rowEl, item, text) {
  rowEl.innerHTML = '';
  rowEl.classList.add('item-tip-trigger');
  el('span', 'item-line-icon', rowEl, item.icon || '📦');
  el('span', 'item-line-text', rowEl, text);
  attachItemTipTrigger(rowEl, item);
}
```

Use `renderItemLine(row, cost, cost.name + ' ' + cost.owned + '/' + cost.required)` for costs and choices.

For output, use:

```js
renderItemLine(
  ref.outputEl,
  Object.assign({}, recipe.output, { quantity: recipe.output.quantity }),
  '产出 ' + recipe.output.name + ' ×' + recipe.output.quantity
);
```

- [ ] **Step 5: Wire gathering and homestead rows**

Use `renderItemLine` for resource drop rows and fishing species rows when they have `itemId` or `speciesId` that maps to an item ID. For beast tame/training material text, create a `div` with `itemId`, resolve via `attachItemTipTrigger`, and display the item name when available. For formation cards, attach the tip to the card or owned row using `formation.itemId`.

- [ ] **Step 6: Wire combat loot and battle supplies**

In `renderBattleSupplies`, use `row.icon` if present or query `itemInfo`, render the icon, and call:

```js
attachItemTipTrigger(cell, {
  itemId: row.itemId,
  name: row.name,
  owned: row.owned
});
```

In `buildLootCell`, require `data.itemId` for non-currency cells and call:

```js
attachItemTipTrigger(cell, data);
```

When building `merged`, keep `itemId`:

```js
itemId: item.itemId || itemId,
```

- [ ] **Step 7: Wire pending loot rows**

Render pending rows as a list of item lines instead of a single text node. Attach tips to each row using `row.itemId`, `row.name`, and `row.count`. Keep the claim button behavior unchanged.

- [ ] **Step 8: Run the focused test**

Run: `node selftest_item_tips.js`

Expected: PASS.

- [ ] **Step 9: Commit the integrations**

```bash
git add game.js ui.js styles.css selftest_item_tips.js
git commit -m "feat: show item tips on read-only item surfaces"
```

---

### Task 4: Preserve Inventory Action Dialog And Verify

**Files:**
- Modify: `selftest_item_tips.js`
- Modify: `ui.js` only if the test exposes a regression

**Interfaces:**
- Consumes: existing `openItemDetail(item)` inventory action dialog
- Produces: inventory slots still open `openItemDetail`, not `showItemTip`

- [ ] **Step 1: Add regression checks**

Extend `selftest_item_tips.js` with:

```js
ok(/openInventoryItemAction\(item\)/.test(ui), 'inventory action helper exists');
ok(/openInventoryItemAction\(item\)/.test(ui) && /openItemDetail\(item\)/.test(ui), 'inventory action helper delegates to item detail dialog');
ok(/slot\.addEventListener\('click'[\s\S]*openInventoryItemAction\(item\)/.test(ui), 'inventory slots use action helper');
ok(!/inv-slot[\s\S]{0,240}attachItemTipTrigger/.test(ui), 'inventory slots do not use read-only item tips');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node selftest_item_tips.js`

Expected: FAIL until `openInventoryItemAction` exists and inventory slots use it.

- [ ] **Step 3: Add the action helper and preserve inventory behavior**

Add:

```js
function openInventoryItemAction(item) {
  hideItemTip();
  openItemDetail(item);
}
```

Change inventory slot click from:

```js
openItemDetail(item);
```

to:

```js
openInventoryItemAction(item);
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node selftest_item_tips.js
node selftest_stage2_inventory.js
node selftest_ui.js
```

Expected: all PASS.

- [ ] **Step 5: Run full selftest**

Run: `npm test`

Expected: all selftest suites PASS.

- [ ] **Step 6: Commit the regression guard**

```bash
git add ui.js selftest_item_tips.js
git commit -m "test: preserve inventory item actions"
```

---

## Self-Review

- Spec coverage: item categories, inventory action dialog behavior, read-only tips, shared helper, data source, and testing are covered by Tasks 1-4.
- Placeholder scan: no placeholders or deferred implementation steps remain.
- Type consistency: `itemId`, `quantity`, `count`, `required`, `owned`, `available`, `quality`, `category`, `icon`, and `description` are consistently named across query rows, tip data, and UI helpers.
- Scope check: the plan is one focused UI/data feature and does not alter inventory persistence or item registry shape.

