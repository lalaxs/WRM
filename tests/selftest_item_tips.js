'use strict';

const assert = require('assert');
const fs = require('fs');

const game = ['game.js', 'game-queries.js', 'game-queries-social.js', 'game-queries-combat.js', 'game-commands.js', 'game-api.js']
  .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const ui = require('./ui_scripts').readUiSource();
const css = fs.readFileSync('styles.css', 'utf8');
const all = fs.readFileSync(require('path').join(__dirname, 'selftest_all.js'), 'utf8');
const Items = require('../content/items.js');
const Inventory = require('../core/inventory.js');

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
ok(/queryItemInfo[\s\S]*return readonlyQuery\(null\)/.test(game),
  'unknown itemInfo returns null');

ok(/function resolveItemTipData\(itemLike\)/.test(ui),
  'UI resolves partial item tip data');
ok(/function showItemTip\(itemLike,\s*anchorElement\)/.test(ui),
  'UI can show item tips near an anchor');
ok(/function hideItemTip\(\)/.test(ui), 'UI can hide item tips');
ok(/function attachItemTipTrigger\(element,\s*itemLike\)/.test(ui),
  'UI defines shared item tip trigger helper');
ok(/document\.addEventListener\('click'/.test(ui),
  'outside tap hides item tips');
ok(/item-tip-quality/.test(ui), 'tip renders quality');
ok(/item-tip-meta/.test(ui), 'tip renders item counts and category');
ok(/openInventoryItemAction\(item\)/.test(ui),
  'inventory action helper exists');
ok(/openInventoryItemAction\(item\)[\s\S]*openItemDetail\(item\)/.test(ui),
  'inventory action helper delegates to item detail dialog');
ok(/slot\.addEventListener\('click'[\s\S]*openInventoryItemAction\(item\)/.test(ui),
  'inventory slots use action helper');
ok(!/inv-slot[\s\S]{0,240}attachItemTipTrigger/.test(ui),
  'inventory slots do not use read-only item tips');

[
  [/renderItemLine\(\s*row,\s*cost,/, 'production cost rows use item lines'],
  [/renderItemLine\(\s*ref\.outputEl,\s*recipe\.output,/, 'production output rows use item lines'],
  [/renderItemLine\(\s*ref\.dropRows\[index\],\s*drop,/, 'gathering drop rows use item lines'],
  [/renderItemLine\(\s*ref\.stockRows\[index\],\s*Object\.assign\(\{\s*itemId:\s*species\.speciesId\s*\},\s*species\)/, 'fishing stock rows use item lines'],
  [/className\s*=\s*'item-tip-quality q-'\s*\+\s*quality/, 'tip quality class is updated'],
  [/attachItemTipTrigger\(owned,\s*\{\s*itemId:\s*formation\.itemId/, 'formation cards expose item tips'],
  [/renderItemLine\(\s*tameMeta,\s*tameItem,/, 'beast tame material exposes item tips'],
  [/renderItemLine\(\s*trainingMeta,\s*trainingItem,/, 'beast training material exposes item tips'],
  [/attachItemTipTrigger\(cell,\s*tipData\)/, 'battle supplies expose item tips'],
  [/itemId:\s*item\.itemId\s*\|\|\s*itemId/, 'loot merge preserves itemId'],
  [/iconSrc:\s*item\.iconSrc\s*\|\|\s*''/, 'loot merge preserves image icon source'],
  [/iconSrc50:\s*item\.iconSrc50\s*\|\|\s*''/, 'loot merge preserves 50px image icon source'],
  [/iconSrc100:\s*item\.iconSrc100\s*\|\|\s*''/, 'loot merge preserves 100px image icon source'],
  [/attachItemTipTrigger\(cell,\s*data\)/, 'loot cells expose item tips'],
  [/renderItemLine\(\s*line,\s*Object\.assign\(\{\s*itemId:\s*row\.itemId\s*\|\|\s*row\.id\s*\},\s*row\)/, 'pending loot rows expose item tips']
].forEach(function (entry) {
  ok(entry[0].test(ui), entry[1]);
});

ok(/icon:\s*item\s*&&\s*item\.icon/.test(game),
  'combat loot view passes item icons');
ok(/quality:\s*item\s*&&\s*item\.quality/.test(game),
  'combat loot view passes item quality');
ok(/\.item-tip/.test(css), 'CSS defines mobile item tip styles');
ok(/position:\s*fixed/.test(css) && /z-index:\s*140/.test(css),
  'tip is a fixed overlay above game UI');
ok(/\.item-tip-trigger/.test(css), 'CSS defines tap trigger affordance');
ok(all.includes("'selftest_item_tips.js'"),
  'full selftest includes item tips suite');

console.log('Item tips self-test passed:', passed);
