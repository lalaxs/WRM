'use strict';

const fs = require('fs');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  x FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function frozenTree(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) &&
    Object.keys(value).every((key) => frozenTree(value[key], seen));
}

const MaterialContent = require('../content/materials.js');
const Items = require('../content/items.js');
const Gathering = require('../content/gathering.js');
const Recipes = require('../content/recipes.js');

const itemRows = MaterialContent.itemRows();
const artRows = MaterialContent.artRequirements();

ok(Object.isFrozen(MaterialContent), 'material catalog API is frozen');
ok(Array.isArray(MaterialContent.ITEMS) && !Object.isFrozen(MaterialContent.ITEMS),
  'material item array stays mutable for late herblore absorb');
ok(MaterialContent.ITEMS.length === 0 || Object.isFrozen(MaterialContent.ITEMS[0]),
  'material item rows are frozen');
ok(frozenTree(MaterialContent.ITEMS[0]), 'material item row objects are deeply frozen');
ok(itemRows.length >= 100, 'expanded material catalog has at least 100 rows');
ok(artRows.length === itemRows.length,
  'every catalog item has an art requirement row');

const rowIds = new Set(itemRows.map((row) => row.id));
const artIds = new Set(artRows.map((row) => row.itemId));
exact([...artIds].filter((id) => !rowIds.has(id)), [],
  'art requirement rows only reference catalog items');

[
  ['bronzeBar', '灵铜锭', 'material', 'bar', 1],
  ['spiritTopazRing', '黄玉灵戒', 'equipment', 'jewelry', 1],
  ['birdNestPotionI', '巢羽丹·一阶', 'consumable', 'potion', 1],
  ['brokenFang', '断裂兽牙', 'material', 'battle_drop', 1]
].forEach(([itemId, name, category, materialType, tier]) => {
  const item = Items.get(itemId);
  ok(item && item.name === name, 'new item is queryable: ' + itemId);
  ok(item && item.category === category, 'new item category is exact: ' + itemId);
  ok(item && item.materialType === materialType,
    'new item material type is exact: ' + itemId);
  ok(item && item.tier === tier, 'new item tier is exact: ' + itemId);
  ok(item && typeof item.iconPromptKey === 'string' &&
    item.iconPromptKey.length > 0, 'new item has icon prompt key: ' + itemId);
});

const coalNode = Gathering.getEntry('mining', 'coal');
ok(coalNode && coalNode.name === '灵炭矿脉',
  'new mining node is visible through GatheringContent');
ok(coalNode && coalNode.drops.some((drop) => drop.itemId === 'coalOre'),
  'new mining node drops coalOre');

const runeNode = Gathering.getEntry('mining', 'rune');
ok(runeNode && runeNode.unlockLevel === 80,
  'high-tier rune mining node keeps its unlock level');

const bronzeRecipe = Recipes.get('forging:bronzeBar');
ok(bronzeRecipe && bronzeRecipe.name === '熔炼灵铜锭',
  'new smelting recipe is visible through RecipeContent');
exact(bronzeRecipe && bronzeRecipe.ingredients,
  { copperOre: 1, tinOre: 1 },
  'bronze bar recipe keeps its material topology');

const ringRecipe = Recipes.get('forging:spiritTopazRing');
exact(ringRecipe && ringRecipe.ingredients,
  { silverBar: 1, topaz: 1 },
  'jewelry recipe links metal bar and gem');

const pillRecipe = Recipes.get('alchemy:birdNestPotionI');
exact(pillRecipe && pillRecipe.ingredients,
  { garumHerb: 1, potatoSeeds: 2 },
  'Herblore parity potion recipe links herb and secondary');
ok(pillRecipe && pillRecipe.baseSeconds === 2 && pillRecipe.skillXp === 5,
  'Herblore parity potion keeps exact action time and XP');

const artPath = 'docs/art/2026-07-30-item-icon-art-standard.md';
ok(fs.existsSync(artPath), 'art requirement markdown exists');
if (fs.existsSync(artPath)) {
  const artDoc = fs.readFileSync(artPath, 'utf8');
  ok(artDoc.includes('简约扁平矢量'), 'art doc states flat vector style');
}
['bronzeBar', 'spiritTopazRing', 'birdNestPotionI', 'brokenFang']
  .forEach((itemId) => {
    ok(artIds.has(itemId), 'art requirements include catalog row for ' + itemId);
  });

if (fail) {
  console.error(`Material system self-test failed: ${pass} passed / ${fail} failed`);
  process.exitCode = 1;
} else {
  console.log(`Material system self-test passed: ${pass}`);
}
