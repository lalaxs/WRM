const assert = require('assert');

global.MaterialContent = require('../content/materials.js');
global.FishingParityContent = require('../content/fishing-parity.js');
const Items = require('../content/items.js');
const Recipes = require('../content/recipes.js');

const legacyItemIds = [
  'healingPill', 'qiGatheringPill', 'foundationPill', 'goldCorePill',
  'nascentSoulPill', 'spiritTransformationPill', 'voidRefiningPill',
  'bodyIntegrationPill', 'mahayanaPill',
  'shrimpSoup',
  'talismanPaper', 'gatheringTalisman', 'hasteTalisman',
  'wardTalisman', 'healingTalisman', 'beastLureTalisman'
];

const legacyRecipeIds = [
  'alchemy:healingPill', 'alchemy:qiGatheringPill',
  'alchemy:foundationPill', 'alchemy:goldCorePill',
  'alchemy:nascentSoulPill', 'alchemy:spiritTransformationPill',
  'alchemy:voidRefiningPill', 'alchemy:bodyIntegrationPill',
  'alchemy:mahayanaPill',
  'cooking:shrimpSoup',
  'talisman:talismanPaper', 'talisman:gatheringTalisman',
  'talisman:hasteTalisman', 'talisman:wardTalisman',
  'talisman:healingTalisman', 'talisman:beastLureTalisman'
];

legacyItemIds.forEach((itemId) => {
  const item = Items.get(itemId);
  assert(item, 'legacy item remains loadable for old saves: ' + itemId);
  assert.strictEqual(item.legacyDesign, true, 'legacy item is marked: ' + itemId);
});

legacyRecipeIds.forEach((recipeId) => {
  const recipe = Recipes.get(recipeId);
  assert(recipe, 'legacy recipe remains loadable for old actions: ' + recipeId);
  assert.strictEqual(
    recipe.legacyDesign,
    true,
    'legacy recipe is marked: ' + recipeId
  );
});

Recipes.list().forEach((recipe) => {
  if (legacyRecipeIds.indexOf(recipe.id) >= 0) {
    assert.fail('default recipe list hides legacy recipe: ' + recipe.id);
  }
});

legacyRecipeIds.forEach((recipeId) => {
  const found = Recipes.list(null, { includeLegacy: true })
    .some((recipe) => recipe.id === recipeId);
  assert.strictEqual(
    found,
    true,
    'explicit legacy recipe list includes legacy recipe: ' + recipeId
  );
});

assert(Items.get('grilledCarp') && Items.get('grilledCarp').legacyDesign !== true,
  'parity cooking food is not legacy');
assert(Recipes.get('cooking:grilledCarp') &&
  Recipes.get('cooking:grilledCarp').legacyDesign !== true,
  'parity cooking recipe is not legacy');
assert(Items.get('sunkenCasket'), 'fishing special casket is registered');
assert(Recipes.list('cooking').length >= 35, 'cooking list exposes parity recipes');

console.log('legacy content cleanup selftest passed');
