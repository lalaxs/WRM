'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./runtime-harness');
const { sandbox } = createHarness();
const Items = sandbox.ItemContent;
const Recipes = sandbox.RecipeContent;
const Combat = sandbox.CombatContent;
const Techniques = sandbox.TechniqueContent;
const assets = new Set();

function item(id) { assert(Items.get(id), 'Unknown item reference: ' + id); }
function image(file) { if (file) assets.add(file); }

for (const [id, row] of Object.entries(Items.ITEMS)) {
  assert.strictEqual(row.id, id);
  assert(row.name && row.category);
  image(row.iconSrc); image(row.iconSrc50); image(row.iconSrc100);
}
for (const recipe of Object.values(Recipes.RECIPES)) {
  assert(sandbox.LifeSkillContent.SKILLS[recipe.skillId]);
  assert(recipe.baseSeconds > 0 && recipe.output.quantity > 0);
  item(recipe.output.itemId);
  for (const [id, quantity] of Object.entries(recipe.ingredients)) {
    item(id); assert(quantity > 0);
  }
  for (const choice of recipe.ingredientChoices) {
    for (const id of choice.itemIds || []) item(id);
  }
}
for (const region of Object.values(Combat.REGIONS)) {
  assert(region.enemyIds.length);
  region.enemyIds.forEach(id => assert(Combat.ENEMIES[id]));
  image(region.bannerSrc);
}
for (const enemy of Object.values(Combat.ENEMIES)) {
  assert(enemy.stats.hp > 0 && enemy.stats.attackIntervalTicks > 0);
  assert(Combat.LOOT_TABLES[enemy.lootTableId]);
  image(enemy.portraitSrc);
}
for (const rows of Object.values(Combat.LOOT_TABLES)) {
  for (const row of rows) {
    if (row.itemId) item(row.itemId);
    (row.itemIds || []).forEach(item);
    assert(row.min > 0 && row.max >= row.min);
    assert(row.chance === null || row.chance >= 0 && row.chance <= 1);
  }
}
for (const technique of Object.values(Techniques.TECHNIQUES)) {
  assert(technique.name && technique.effect);
  if (technique.bookItemId) item(technique.bookItemId);
}
for (const sect of Object.values(sandbox.SectContent.SECTS)) {
  assert(sandbox.RegionContent.get(sect.homeRegionId));
}
for (const file of assets) {
  assert(fs.existsSync(path.resolve(__dirname, '..', file)), 'Missing image: ' + file);
}
console.log('Content references, quantities, recipes and ' + assets.size + ' image paths passed');
