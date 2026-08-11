'use strict';

const assert = require('assert');

const Herblore = require('../content/herblore-parity.js');

assert.strictEqual(Herblore.BASE_SECONDS, 2, 'Herblore base action time is 2s');
assert.deepStrictEqual(Herblore.TIER_MASTERY, {
  I: { masteryLevel: 1, xpToTier: 0, numericTier: 1 },
  II: { masteryLevel: 20, xpToTier: 4470, numericTier: 2 },
  III: { masteryLevel: 50, xpToTier: 101333, numericTier: 3 },
  IV: { masteryLevel: 90, xpToTier: 5346332, numericTier: 4 }
}, 'potion tier mastery gates match the source table');

assert.strictEqual(Herblore.SERIES.length, 72, '72 potion series are mapped');
assert.strictEqual(Herblore.POTION_ITEMS.length, 288, '72 series x 4 tiers are itemized');
assert.strictEqual(Herblore.RECIPE_ROWS.length, 288, '72 series x 4 tiers are craftable');
assert.strictEqual(Herblore.INGREDIENTS.length, 91, 'all unique Herblore ingredients are mapped');

const byName = new Map(Herblore.SERIES.map((row) => [row.melvorName, row]));
const byItem = new Map(Herblore.POTION_ITEMS.map((row) => [row.id, row]));
const byRecipe = new Map(Herblore.RECIPE_ROWS.map((row) => [
  row.skillId + ':' + row.outputId,
  row
]));
const byIngredient = new Map(Herblore.INGREDIENTS.map((row) => [row.id, row]));

function series(name) {
  const row = byName.get(name);
  assert(row, 'series exists: ' + name);
  assert.strictEqual(row.tiers.length, 4, 'series has four tiers: ' + name);
  return row;
}

const birdNest = series('Bird Nest Potion');
assert.strictEqual(birdNest.localName, '巢羽丹', 'Bird Nest local name is mapped');
assert.strictEqual(birdNest.unlockLevel, 1, 'Bird Nest unlock level matches');
assert.strictEqual(birdNest.xp, 5, 'Bird Nest XP matches');
assert.deepStrictEqual(birdNest.herb, {
  itemId: 'garumHerb',
  melvorName: 'Garum Herb',
  localName: '嘉露草',
  quantity: 1
}, 'Bird Nest herb ingredient matches');
assert.deepStrictEqual(birdNest.secondary, {
  itemId: 'potatoSeeds',
  melvorName: 'Potato Seeds',
  localName: '土豆种子',
  quantity: 2
}, 'Bird Nest secondary ingredient matches');
assert.deepStrictEqual(birdNest.tiers.map((tier) => tier.charges),
  [50, 50, 75, 100], 'Bird Nest charges match all tiers');

const meleeAccuracy = series('Melee Accuracy Potion');
assert.strictEqual(meleeAccuracy.unlockLevel, 5, 'Melee Accuracy unlock level matches');
assert.strictEqual(meleeAccuracy.xp, 8, 'Melee Accuracy XP matches');
assert.deepStrictEqual(meleeAccuracy.secondary, {
  itemId: 'bones',
  melvorName: 'Bones',
  localName: '白骨',
  quantity: 1
}, 'Melee Accuracy secondary ingredient matches');

const herblore = series('Herblore Potion');
assert.strictEqual(herblore.secondary, null, 'Herblore Potion has no secondary ingredient');
assert.strictEqual(herblore.unlockLevel, 71, 'Herblore Potion unlock level matches');
assert.strictEqual(herblore.xp, 99, 'Herblore Potion XP matches');

const critical = series('Critical Strike Potion');
assert.strictEqual(critical.unlockLevel, 118, 'high-level unlocks up to 118 are preserved');
assert.strictEqual(critical.tiers[3].charges, 35, 'Critical Strike tier IV charges match');

const voidburst = series('Voidburst Potion');
assert.strictEqual(voidburst.realm, 'abyssal', 'abyssal realm potions are preserved');
assert.strictEqual(voidburst.unlockLevel, 58, 'Voidburst abyssal unlock level matches');
assert.strictEqual(voidburst.tiers[3].charges, 4, 'Voidburst tier IV charges match');
assert.strictEqual(
  voidburst.tiers[3].effect,
  '+20% chance to ignore Voidburst and +20% chance to apply Voidburst when hitting with an attack',
  'Voidburst tier IV effect text matches'
);

assert(byIngredient.has('potatoSeeds'), 'Potato Seeds ingredient item is mapped');
assert(byIngredient.has('gloomsproutHerb'), 'abyssal herb ingredient item is mapped');
assert(byIngredient.has('voidEssence'), 'abyssal secondary ingredient item is mapped');

Herblore.POTION_ITEMS.forEach((item) => {
  assert(byRecipe.has('alchemy:' + item.id), 'potion item has recipe: ' + item.id);
  assert.strictEqual(item.category, 'consumable', 'potion is consumable: ' + item.id);
  assert.strictEqual(item.materialType, 'potion', 'potion material type is exact: ' + item.id);
  assert(Number.isSafeInteger(item.charges) && item.charges > 0,
    'potion charges are positive: ' + item.id);
});

Herblore.RECIPE_ROWS.forEach((recipe) => {
  assert.strictEqual(recipe.baseSeconds, 2, 'recipe base seconds are exact: ' + recipe.outputId);
  assert(Number.isSafeInteger(recipe.skillXp) && recipe.skillXp > 0,
    'recipe skill XP is positive: ' + recipe.outputId);
  assert(byItem.has(recipe.outputId), 'recipe output item exists: ' + recipe.outputId);
  Object.keys(recipe.ingredients).forEach((itemId) => {
    assert(itemId.length > 0, 'recipe ingredient id is non-empty: ' + recipe.outputId);
  });
});

console.log('Herblore parity content selftest passed');
