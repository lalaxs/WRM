'use strict';

const assert = require('assert');

const HerbloreParity = require('../content/herblore-parity.js');
global.MaterialContent = require('../content/materials.js');
const Items = require('../content/items.js');
const Recipes = require('../content/recipes.js');

const runeCharmIds = [
  'airCharm', 'waterCharm', 'earthCharm', 'fireCharm',
  'mindCharm', 'bodyCharm', 'cosmicCharm', 'chaosCharm',
  'natureCharm', 'lawCharm', 'deathCharm', 'bloodCharm', 'soulCharm',
  'mistCharm', 'mudCharm', 'dustCharm', 'lavaCharm', 'smokeCharm', 'steamCharm'
];

const potionIds = HerbloreParity.POTION_ITEMS.map((row) => row.id);
const removedPrototypeIds = [
  'miningFocusPill', 'smithingFocusPill', 'woodcuttingFocusPill',
  'alchemyFocusPill', 'talismanFocusPill', 'combatGuardPill',
  'gemSeekerPill', 'harvestDoublingPill', 'materialSaverPill',
  'runeSaverPill', 'battleFuryPill', 'spiritShieldPill',
  'soulSightPill', 'voidPiercingPill', 'voidStabilizerPill',
  'tribulationGuardPill',
  'craftingFocusTalisman', 'farmingFocusDew', 'fishingFocusTalisman',
  'soulBindingTalisman'
];

const materialRows = global.MaterialContent.itemRows();
const rowsById = new Map(materialRows.map((row) => [row.id, row]));
const artIds = new Set(global.MaterialContent.artRequirements().map((row) => row.itemId));

runeCharmIds.forEach((itemId) => {
  const row = rowsById.get(itemId);
  assert(row, 'rune charm exists in MaterialContent: ' + itemId);
  assert.strictEqual(row.category, 'material', 'rune charm is a material: ' + itemId);
  assert.strictEqual(
    row.materialType,
    'rune_charm',
    'rune charm material type is exact: ' + itemId
  );
  assert(
    row.sourceTags.includes('production:talisman'),
    'rune charm is produced by talisman skill: ' + itemId
  );
  assert(
    row.useTags.includes('rune_combat'),
    'rune charm is marked for rune combat consumption: ' + itemId
  );
  assert(artIds.has(itemId), 'rune charm gets art requirement: ' + itemId);

  const item = Items.get(itemId);
  assert(item && item.name === row.name, 'rune charm is queryable via Items: ' + itemId);

  const recipe = Recipes.get('talisman:' + itemId);
  assert(recipe, 'rune charm has a talisman recipe: ' + itemId);
  assert(
    Recipes.list('talisman').some((entry) => entry.id === recipe.id),
    'rune charm recipe is visible by default: ' + itemId
  );
});

assert.strictEqual(potionIds.length, 288, 'Herblore parity exposes 288 potion items');

potionIds.forEach((itemId) => {
  const row = rowsById.get(itemId);
  assert(row, 'potion exists in MaterialContent: ' + itemId);
  assert.strictEqual(row.category, 'consumable', 'potion is consumable: ' + itemId);
  assert.strictEqual(row.materialType, 'potion', 'potion material type is exact: ' + itemId);
  assert(
    row.sourceTags.includes('production:alchemy'),
    'potion is produced by alchemy skill: ' + itemId
  );
  assert(row.useTags.includes('potion'), 'potion is marked as potion: ' + itemId);
  assert(artIds.has(itemId), 'potion gets art requirement: ' + itemId);

  const recipe = Recipes.get('alchemy:' + itemId);
  assert(recipe, 'potion has an alchemy recipe: ' + itemId);
  assert.strictEqual(recipe.baseSeconds, 2, 'potion recipe keeps 2s base time: ' + itemId);
  assert(recipe.melvor && recipe.melvor.charges === row.charges,
    'potion recipe carries source charges: ' + itemId);
  assert(
    Recipes.list('alchemy').some((entry) => entry.id === recipe.id),
    'potion recipe is visible by default: ' + itemId
  );
});

removedPrototypeIds.forEach((itemId) => {
  assert(!rowsById.has(itemId), 'removed prototype item is absent: ' + itemId);
  assert(!Items.get(itemId), 'removed prototype item is not queryable: ' + itemId);
  assert(!Recipes.get('alchemy:' + itemId), 'removed prototype alchemy recipe is absent: ' + itemId);
  assert(!Recipes.get('talisman:' + itemId), 'removed prototype talisman recipe is absent: ' + itemId);
});

const legacyIds = new Set(Items.LEGACY_PROTOTYPE_IDS || []);
global.MaterialContent.recipeRows().forEach((recipe) => {
  const output = rowsById.get(recipe.outputId);
  assert(output, 'official material recipe output exists: ' + recipe.outputId);
  assert(
    output.sourceTags.includes('production:' + recipe.skillId),
    'official material recipe source tag matches skill: ' + recipe.skillId +
      ' -> ' + recipe.outputId
  );
  assert(
    !legacyIds.has(recipe.outputId),
    'official material recipe does not output legacy prototype: ' + recipe.outputId
  );
  Object.keys(recipe.ingredients).forEach((itemId) => {
    assert(
      !legacyIds.has(itemId),
      'official material recipe does not consume legacy prototype: ' +
        recipe.outputId + ' <- ' + itemId
    );
  });
});

console.log('rune and potion content selftest passed');
