'use strict';

const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
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
  return Object.isFrozen(value)
    && Object.keys(value).every((key) => frozenTree(value[key], seen));
}

function deepFreezeForTest(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.keys(value).forEach((key) => deepFreezeForTest(value[key]));
  return value;
}

function withMutatedRegistry(api, registryKey, mutate) {
  const registry = JSON.parse(JSON.stringify(api[registryKey]));
  mutate(registry);
  return Object.freeze(Object.assign({}, api, {
    [registryKey]: deepFreezeForTest(registry)
  }));
}

const Expected = require('./selftest_stage2_content_fixtures.js');
const MaterialContent = require('../content/materials.js');
const FishingParityContent = require('../content/fishing-parity.js');
let Items = require('../content/items.js');
let Skills = require('../content/life-skills.js');
let Gathering = require('../content/gathering.js');
let Recipes = require('../content/recipes.js');
let Homestead = require('../content/homestead.js');

const materialRows = MaterialContent.itemRows();
const materialRecipeRows = MaterialContent.recipeRows();
const materialGatheringExtensions = MaterialContent.gatheringExtensions();
const fishingRecipeRows = FishingParityContent.recipeRows();
const fishingItemRows = FishingParityContent.itemRows();

switch (process.env.STAGE2_CONTENT_MUTATION || '') {
  case 'skills':
    Skills = withMutatedRegistry(Skills, 'SKILLS',
      (registry) => { registry.herb.label = '错误采药名'; });
    break;
  case 'items':
    Items = withMutatedRegistry(Items, 'ITEMS',
      (registry) => { registry.copperOre.name = '错误矿石名'; });
    break;
  case 'gathering':
    Gathering = withMutatedRegistry(Gathering, 'GATHERING',
      (registry) => { registry.mining.entries[0].name = '错误矿脉名'; });
    break;
  case 'fish':
    Gathering = withMutatedRegistry(Gathering, 'FISH_SPECIES',
      (registry) => { registry.spiritCarp.name = '错误鱼种名'; });
    break;
  case 'recipes':
    Recipes = withMutatedRegistry(Recipes, 'RECIPES',
      (registry) => { registry['alchemy:healingPill'].name = '错误丹方名'; });
    break;
  case 'nestedUndefined':
    Recipes = withMutatedRegistry(Recipes, 'RECIPES',
      (registry) => {
        registry['alchemy:healingPill'].output.unexpected = undefined;
      });
    break;
  case 'crops':
    Homestead = withMutatedRegistry(Homestead, 'CROPS',
      (registry) => { registry.spiritRice.name = '错误作物名'; });
    break;
  case 'formations':
    Homestead = withMutatedRegistry(Homestead, 'FORMATIONS',
      (registry) => { registry.gatheringFormation.name = '错误阵法名'; });
    break;
  case 'beasts':
    Homestead = withMutatedRegistry(Homestead, 'BEASTS',
      (registry) => { registry.spiritFox.name = '错误灵兽名'; });
    break;
  case 'traits':
    Homestead = withMutatedRegistry(Homestead, 'TRAITS',
      (registry) => { registry.keenNose.name = '错误特性名'; });
    break;
  case 'growth':
    Homestead = withMutatedRegistry(Homestead, 'GROWTH_TENDENCIES',
      (registry) => { registry.steady.name = '错误成长名'; });
    break;
}

const strictComparatorExpected = { nested: { value: 1 } };
const strictComparatorUnexpectedUndefined = {
  nested: { value: 1, unexpected: undefined }
};
ok(JSON.stringify(strictComparatorExpected) ===
  JSON.stringify(strictComparatorUnexpectedUndefined),
'legacy JSON comparator demonstrably erases nested undefined properties');
ok(!isDeepStrictEqual(strictComparatorExpected,
  strictComparatorUnexpectedUndefined),
'strict comparator preserves nested property presence and undefined values');

const skillIds = [
  'herb', 'mining', 'woodcutting', 'fishing',
  'alchemy', 'forging', 'cooking', 'talisman',
  'charm', 'beastTaming', 'farming', 'formation'
];

ok(Object.keys(Skills.SKILLS).join(',') === skillIds.join(','),
  'life-skill registry contains the canonical twelve in stable order');
ok(Skills.SKILLS.charm.hasMastery === false, 'charm has no mastery');
ok(Skills.SKILLS.charm.xpSource === 'social', 'charm marks the social XP boundary');
for (const id of skillIds.filter(id => id !== 'charm')) {
  ok(Skills.SKILLS[id].hasMastery === true, id + ' has mastery');
}

ok(Gathering.GATHERING.mining.entries.length ===
  Expected.gathering.mining.length + materialGatheringExtensions.mining.length,
'mining keeps canonical entries plus material extensions');
ok(Gathering.GATHERING.woodcutting.entries.length === 10, 'woodcutting keeps 10 entries');
ok(Gathering.GATHERING.herb.entries.length ===
  Expected.gathering.herb.length + materialGatheringExtensions.herb.length,
'herb keeps canonical entries plus material extensions');
ok(Gathering.GATHERING.fishing.spots.length === FishingParityContent.SPOTS.length,
  'fishing keeps Melvor-parity spot count');
ok(Object.keys(Gathering.FISH_SPECIES).length ===
  Object.keys(FishingParityContent.FISH_SPECIES).length,
  'fishing has Melvor-parity shared species stocks');
const coreRecipeCount = Expected.recipes.filter((row) => row[1] !== 'cooking').length;
ok(Object.keys(Recipes.RECIPES).length ===
  coreRecipeCount + materialRecipeRows.length + fishingRecipeRows.length + 1,
  'production has first-batch recipes plus material and fishing extensions');
// +1 = hidden legacy cooking:shrimpSoup alias
ok(Object.keys(Homestead.CROPS).length === 6, 'farmland has 6 crops');
ok(Object.keys(Homestead.FORMATIONS).length === 5, 'homestead has 5 formations');
ok(Object.keys(Homestead.BEASTS).length === 4, 'homestead has 4 spirit-beast species');

exact(Object.keys(Skills.SKILLS), Expected.skills.map((row) => row[0]),
  'skill registry uses the exact canonical order');
for (const expected of Expected.skills) {
  const actual = Skills.SKILLS[expected[0]];
  exact([
    actual.id,
    actual.label,
    actual.page,
    actual.hasMastery,
    actual.xpSource ?? null
  ], expected, 'skill row is exact: ' + expected[0]);
}

exact(Object.keys(Items.ITEMS).slice(0, Expected.items.length),
  Expected.items.map((row) => row[0]),
  'Stage 2 item registry remains the exact canonical prefix');
const materialItemIds = materialRows.map((row) => row.id);
const materialItemIdSet = new Set(materialItemIds);
materialItemIds.forEach((itemId) => {
  ok(!!Items.ITEMS[itemId], 'Stage 2 item registry includes material row: ' + itemId);
});
ok(materialItemIdSet.size === materialItemIds.length,
  'material item IDs are unique');
exact(Expected.items.slice(0, 66).map((row) => row.slice(0, 2)),
  [
    ['copperOre', '铜矿石'], ['tinOre', '锡矿石'], ['ironOre', '铁矿石'],
    ['silverOre', '银矿石'], ['goldOre', '金矿石'], ['mithrilOre', '秘银矿'],
    ['adamantOre', '精金矿'], ['jadeShard', '灵玉矿'], ['darkIronOre', '玄铁矿'],
    ['crystalOre', '玄晶矿'], ['topaz', '黄玉'], ['sapphire', '蓝宝'],
    ['ruby', '红宝'], ['emerald', '翠玉'], ['diamond', '金钻'],
    ['darkCrystal', '暗晶'], ['willowWood', '杨柳木'], ['pineWood', '松木'],
    ['peachWood', '桃木'], ['nanmuWood', '楠木'], ['phoenixWood', '梧桐木'],
    ['spiritWood', '灵木'], ['thunderWood', '雷击木'], ['bloodSandalwood', '血檀'],
    ['ancientWood', '古木'], ['millenniumVine', '千年藤'], ['resin', '树脂'],
    ['birdNest', '鸟巢'], ['spiritPeach', '灵桃'], ['spiritFruit', '灵果'],
    ['spiritEgg', '灵禽蛋'], ['spiritWormSilk', '灵虫丝'], ['beastHide', '兽皮'],
    ['thunderHerb', '雷灵草'], ['bloodHerb', '血灵草'], ['spiritCarp', '灵鲤'],
    ['spiritShrimp', '灵虾'], ['silverTrout', '银鳟'], ['greenBass', '青鲈'],
    ['darkCatfish', '玄鲶'], ['sunsetSalmon', '霞鲑'], ['thunderEel', '雷鳗'],
    ['spiritLobster', '灵龙虾'], ['swordfish', '剑鱼'], ['dragonFish', '龙鱼'],
    ['lingzhi', '灵芝'], ['spiritMushroom', '灵菇'], ['skySilk', '天蚕丝'],
    ['ironhideGrass', '铁皮草'], ['dragonSalivaGrass', '龙涎草'],
    ['moonSpiritGrass', '月灵草'], ['starGrass', '星辰草'],
    ['bloodSpiritGrass', '血灵草'], ['thunderSpiritGrass', '雷灵草'],
    ['goldenLingzhi', '金芝'], ['qiGatheringGrass', '聚气草'],
    ['heartClearGrass', '清心草'], ['spiritHoney', '灵蜜'], ['spiritRice', '灵米'],
    ['bloodGinsengFruit', '血参果'], ['oldGinseng', '老山参'],
    ['commonSeed', '凡灵种'], ['fineSeed', '上品灵种'], ['rareSeed', '极品灵种'],
    ['lingshi', '灵石'], ['fishBox', '鱼宝箱']
  ], 'legacy item ID/name fixture is independently literal and ordered');
for (const expected of Expected.items) {
  const actual = Items.ITEMS[expected[0]];
  exact([
    actual.id,
    actual.name,
    actual.category,
    actual.sellValue,
    actual.stackable
  ], expected, 'item row is exact: ' + expected[0]);
}

for (const skillId of ['mining', 'woodcutting', 'herb']) {
  const expectedRows = Expected.gathering[skillId];
  const actualRows = Gathering.GATHERING[skillId].entries;
  exact(actualRows.slice(0, expectedRows.length).map((row) => row.id),
    expectedRows.map((row) => row[0]),
    skillId + ' gathering canonical prefix is exact');
  expectedRows.forEach((expected, index) => {
    const actual = actualRows[index];
    exact([
      actual.id,
      actual.name,
      actual.unlockLevel,
      actual.time,
      actual.xp,
      actual.capMin,
      actual.capMax,
      actual.drops.map((drop) => [drop.itemId, drop.w, drop.q])
    ], expected, skillId + ' gathering row is exact: ' + expected[0]);
    ok(actual.masteryId === skillId + ':' + expected[0],
      skillId + ' gathering mastery ID is exact: ' + expected[0]);
  });
  const materialExtensionRows = materialGatheringExtensions[skillId] || [];
  const actualExtensionRows = actualRows.slice(expectedRows.length);
  exact(actualExtensionRows.map((row) => row.id),
    materialExtensionRows.map((row) => row.id),
    skillId + ' gathering material extension order is exact');
  actualExtensionRows.forEach((actual, index) => {
    ok(actual.masteryId === skillId + ':' + materialExtensionRows[index].id,
      skillId + ' material extension mastery ID is exact: ' + actual.id);
  });
}

const expectedFishingRows = FishingParityContent.SPOTS;
const actualFishingRows = Gathering.GATHERING.fishing.spots;
exact(actualFishingRows.map((row) => row.id),
  expectedFishingRows.map((row) => row.id), 'fishing spot order is exact');
expectedFishingRows.forEach((expected, index) => {
  const actual = actualFishingRows[index];
  exact([
    actual.id,
    actual.name,
    actual.unlockLevel,
    actual.time,
    actual.xp,
    actual.fishChance,
    actual.junkChance,
    actual.specialChance,
    actual.unlockFlag || null,
    actual.drops.map((drop) => [drop.itemId, drop.w, drop.q])
  ], [
    expected.id,
    expected.name,
    expected.unlockLevel,
    expected.time,
    expected.xp,
    expected.fishChance,
    expected.junkChance,
    expected.specialChance,
    expected.unlockFlag || null,
    expected.drops.map((drop) => [drop.itemId, drop.w, drop.q])
  ], 'fishing spot row is exact: ' + expected.id);
  ok(!Object.prototype.hasOwnProperty.call(actual, 'capMin')
    && !Object.prototype.hasOwnProperty.call(actual, 'capMax'),
  'fishing spot has no finite resource capacity: ' + expected.id);
});

for (const expected of Expected.explorations) {
  const actual = Gathering.GATHERING[expected[0]].explore;
  exact([
    expected[0],
    actual.masteryId,
    actual.name,
    actual.label,
    actual.time,
    actual.skillXp,
    actual.masteryXp,
    actual.cultivation
  ], expected, 'exploration row is exact: ' + expected[0]);
}

exact(Object.keys(Gathering.FISH_SPECIES),
  Object.keys(FishingParityContent.FISH_SPECIES), 'fish species order is exact');
Object.keys(FishingParityContent.FISH_SPECIES).forEach((speciesId) => {
  const actual = Gathering.FISH_SPECIES[speciesId];
  const expected = FishingParityContent.FISH_SPECIES[speciesId];
  exact([
    actual.id,
    actual.name,
    actual.masteryId,
    actual.maxStock,
    actual.recoverSeconds
  ], [
    expected.id,
    expected.name,
    expected.masteryId,
    expected.maxStock,
    expected.recoverSeconds
  ], 'fish species row is exact: ' + speciesId);
});

fishingItemRows.forEach((row) => {
  ok(!!Items.ITEMS[row.id], 'Stage 2 item registry includes fishing row: ' + row.id);
});
ok(Gathering.JUNK_POOL && Gathering.JUNK_POOL.length === 12,
  'fishing exposes a 12-entry junk pool');
ok(Gathering.SPECIAL_POOL && Gathering.SPECIAL_POOL.length === 7,
  'fishing exposes a 7-entry special pool');

const coreExpectedRecipes = Expected.recipes.filter((row) =>
  row[1] !== 'cooking' || row[0] === 'cooking:shrimpSoup'
);
for (const expected of coreExpectedRecipes) {
  const actual = Recipes.RECIPES[expected[0]];
  ok(!!actual, 'core recipe still registered: ' + expected[0]);
  if (!actual) continue;
  if (expected[1] === 'cooking') continue;
  exact([
    actual.id,
    actual.skillId,
    actual.masteryId,
    actual.name,
    actual.unlockLevel,
    actual.baseSeconds,
    actual.ingredients,
    actual.ingredientChoices,
    actual.output
  ], expected, 'recipe row is exact: ' + expected[0]);
}

fishingRecipeRows.forEach((row) => {
  const id = row.skillId + ':' + row.outputId;
  ok(!!Recipes.RECIPES[id], 'fishing cooking recipe registered: ' + id);
});
ok(Recipes.list('cooking').length >= 35,
  'cooking has Melvor-parity visible fish recipes');

exact(Object.keys(Homestead.CROPS), Expected.crops.map((row) => row[0]),
  'crop registry uses the exact canonical order');
for (const expected of Expected.crops) {
  const actual = Homestead.CROPS[expected[0]];
  exact([
    actual.id,
    actual.name,
    actual.unlockLevel,
    actual.seed,
    actual.growthSeconds,
    actual.output
  ], expected, 'crop row is exact: ' + expected[0]);
  ok(actual.skillId === 'farming'
    && actual.masteryId === 'farming:' + expected[0],
  'crop progression IDs are exact: ' + expected[0]);
}

exact(Object.keys(Homestead.FORMATIONS),
  Expected.formations.map((row) => row[0]),
  'formation registry uses the exact canonical order');
for (const expected of Expected.formations) {
  const actual = Homestead.FORMATIONS[expected[0]];
  exact([
    actual.id,
    actual.itemId,
    actual.masteryId,
    actual.name,
    actual.effect.key,
    actual.effect.value
  ], expected, 'formation row is exact: ' + expected[0]);
}

exact(Object.keys(Homestead.BEASTS), Expected.beasts.map((row) => row[0]),
  'spirit-beast registry uses the exact canonical order');
for (const expected of Expected.beasts) {
  const actual = Homestead.BEASTS[expected[0]];
  exact([
    actual.id,
    actual.name,
    actual.sourceSkillId,
    actual.masteryId,
    actual.encounterChance,
    actual.tameSeconds,
    actual.tamingItemId,
    actual.tameSkillXp,
    actual.tameMasteryXp,
    actual.tameCultivation,
    actual.trainingSeconds,
    actual.trainingItemId,
    actual.trainingBeastXp,
    actual.trainingSkillXp,
    actual.trainingMasteryXp,
    actual.trainingCultivation,
    actual.assistance.key,
    actual.assistance.skillId ?? null,
    actual.assistance.value
  ], expected, 'spirit-beast row is exact: ' + expected[0]);
}

exact(Object.keys(Homestead.TRAITS), Expected.traits.map((row) => row[0]),
  'trait registry uses the exact canonical order');
for (const expected of Expected.traits) {
  const actual = Homestead.TRAITS[expected[0]];
  exact([
    actual.id,
    actual.name,
    Object.keys(actual.effect)[0],
    Object.values(actual.effect)[0]
  ], expected, 'spirit-beast trait row is exact: ' + expected[0]);
}

exact(Object.keys(Homestead.GROWTH_TENDENCIES),
  Expected.growthTendencies.map((row) => row[0]),
  'growth tendency registry uses the exact canonical order');
for (const expected of Expected.growthTendencies) {
  const actual = Homestead.GROWTH_TENDENCIES[expected[0]];
  exact([
    actual.id,
    actual.name,
    actual.xpNeedMultiplier,
    actual.assistanceMultiplier
  ], expected, 'spirit-beast growth row is exact: ' + expected[0]);
}

ok(Gathering.RESOURCE_QUALITIES == null,
  'resource spot qualities are removed from gathering content');
ok(Gathering.GATHERING.herb.explore.masteryId === 'explore:herb',
  'herb exploration has stable mastery ID');
ok(Gathering.GATHERING.mining.explore.masteryId === 'explore:mining',
  'mining exploration has stable mastery ID');
ok(Gathering.GATHERING.woodcutting.explore.masteryId === 'explore:woodcutting',
  'woodcutting exploration has stable mastery ID');

const fishIds = Object.keys(FishingParityContent.FISH_SPECIES);
ok(Object.keys(Gathering.FISH_SPECIES).join(',') === fishIds.join(','),
  'fish species have Melvor-parity stable order');
for (const id of fishIds) {
  ok(Gathering.FISH_SPECIES[id].masteryId === 'fishing:' + id,
    'fish species mastery ID is stable: ' + id);
  ok(Gathering.FISH_SPECIES[id].maxStock === 20,
    'fish species stock cap is canonical: ' + id);
  ok(Gathering.FISH_SPECIES[id].recoverSeconds === 60,
    'fish species recovery interval is canonical: ' + id);
}

const recipeIdsBySkill = {
  alchemy: [
    'healingPill', 'qiGatheringPill', 'foundationPill', 'goldCorePill',
    'nascentSoulPill', 'spiritTransformationPill', 'voidRefiningPill',
    'bodyIntegrationPill', 'mahayanaPill'
  ],
  forging: [
    'copperSword', 'ironSword', 'silverArmor', 'spiritStaff',
    'darkIronBlade', 'formationBase'
  ],
  talisman: [
    'talismanPaper', 'gatheringTalisman', 'hasteTalisman',
    'wardTalisman', 'healingTalisman', 'beastLureTalisman'
  ],
  formation: [
    'gatheringFormation', 'farmlandFormation', 'fishingFormation',
    'craftingFormation', 'beastFormation'
  ]
};
Object.entries(recipeIdsBySkill).forEach(([skillId, ids]) => {
  ids.forEach((id) => {
    ok(!!Recipes.RECIPES[skillId + ':' + id],
      'canonical recipe remains registered: ' + skillId + ':' + id);
  });
});
ok(!!Recipes.RECIPES['cooking:grilledCarp'],
  'parity cooking includes grilledCarp');
ok(!!Recipes.RECIPES['cooking:beastFeed'],
  'parity cooking includes beastFeed');
ok(Recipes.RECIPES['cooking:shrimpSoup'].legacyDesign === true,
  'legacy shrimpSoup remains hidden');
const materialRecipeIds = materialRecipeRows.map(
  (row) => row.skillId + ':' + row.outputId
);
materialRecipeIds.forEach((id) => {
  ok(!!Recipes.RECIPES[id], 'material recipe remains registered: ' + id);
});
const healing = Recipes.get('alchemy:healingPill');
exact([
  healing.id,
  healing.skillId,
  healing.masteryId,
  healing.name,
  healing.unlockLevel,
  healing.baseSeconds,
  healing.skillXp,
  healing.masteryXp,
  healing.cultivation,
  healing.ingredients,
  healing.ingredientChoices,
  healing.output,
  healing.legacyDesign,
  healing.designStatus
], [
  'alchemy:healingPill',
  'alchemy',
  'alchemy:healingPill',
  '疗伤丹',
  1,
  8,
  12,
  6,
  2,
  { lingzhi: 2 },
  [],
  { itemId: 'healingPill', quantity: 1 },
  true,
  'legacy_prototype'
], 'healing pill recipe uses the exact legacy-compatible shape');
const beastFeed = Recipes.get('cooking:beastFeed');
ok(beastFeed.output.quantity === 2, 'beast feed produces two units');
ok(beastFeed.ingredientChoices.length === 1
  && beastFeed.ingredientChoices[0].quantity === 1
  && beastFeed.ingredientChoices[0].itemIds.join(',') ===
    Object.keys(FishingParityContent.COOKABLE).join(','),
  'beast feed is the sole stable fish-choice recipe');
ok(Object.values(Recipes.RECIPES)
  .filter((recipe) => recipe.ingredientChoices.length > 0).length === 1,
  'only beast feed has ingredient choices');

const cropIds = [
  'spiritRice', 'qiGatheringGrass', 'heartClearGrass',
  'moonSpiritGrass', 'bloodSpiritGrass', 'goldenLingzhi'
];
ok(Object.keys(Homestead.CROPS).join(',') === cropIds.join(','),
  'crop IDs keep canonical order');
ok(Homestead.CROPS.spiritRice.growthSeconds === 300
  && Homestead.CROPS.spiritRice.output.quantity === 4,
  'spirit rice growth and harvest are canonical');
ok(Homestead.CROPS.goldenLingzhi.growthSeconds === 5400
  && Homestead.CROPS.goldenLingzhi.output.quantity === 1,
  'golden lingzhi growth and harvest are canonical');

const formationIds = [
  'gatheringFormation', 'farmlandFormation', 'fishingFormation',
  'craftingFormation', 'beastFormation'
];
ok(Object.keys(Homestead.FORMATIONS).join(',') === formationIds.join(','),
  'formation IDs keep canonical order');
ok(!JSON.stringify(Homestead.FORMATIONS).match(/break|突破|probability/i),
  'formation content never modifies breakthrough probability');

const beastIds = ['spiritFox', 'rockshell', 'azureCrane', 'waterTurtle'];
ok(Object.keys(Homestead.BEASTS).join(',') === beastIds.join(','),
  'spirit-beast IDs keep canonical order');
ok(Object.keys(Homestead.TRAITS).join(',') === 'keenNose,diligent,deftPaws,friendly',
  'spirit-beast traits keep canonical order');
ok(Object.keys(Homestead.GROWTH_TENDENCIES).join(',') === 'steady,swift,spiritual',
  'spirit-beast growth tendencies keep canonical order');

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
for (const beast of Object.values(Homestead.BEASTS)) {
  referencedItems.add(beast.tamingItemId);
  referencedItems.add(beast.trainingItemId);
}
for (const itemId of referencedItems) ok(!!Items.ITEMS[itemId], 'item exists: ' + itemId);

ok(Object.keys(Items.CATEGORIES).join(',') ===
  'material,equipment,consumable,technique,quest',
  'item categories are canonical and stable');
for (const item of Object.values(Items.ITEMS)) {
  ok(item.id && item.name && Items.CATEGORIES[item.category],
    'item shape is valid: ' + item.id);
  ok(item.stackable === true, 'Stage 2 item is stackable: ' + item.id);
  ok(Number.isInteger(item.sellValue) && item.sellValue > 0,
    'Stage 2 item has a positive integer sale value: ' + item.id);
  ok(item.sellValue === ({
    material: 1,
    consumable: 5,
    equipment: 10,
    technique: 20
  })[item.category], 'Stage 2 item uses deterministic category sale value: ' + item.id);
}
ok(Expected.items.every((row) => row[2] !== 'technique')
  && Items.list('quest').length === 0,
  'Stage 2 canonical prefix has no technique books and no task items exist');
ok(Items.get('formationBase').category === 'material',
  'formation base is a material');
for (const id of formationIds) {
  ok(Items.get(id).category === 'equipment', 'formation is equipment: ' + id);
}

ok(Gathering.getEntry('mining', 'copper').name === '铜矿脉',
  'gathering entry lookup returns frozen canonical data');
ok(Gathering.getEntry('fishing', 'pond') === null,
  'generic entry lookup does not conflate fishing spots');
ok(Gathering.getFishingSpot('pond').name === '村口池塘',
  'fishing spot lookup returns frozen canonical data');
ok(Recipes.list('alchemy').length ===
  materialRecipeRows.filter((row) => row.skillId === 'alchemy').length,
'default recipe filter returns only visible Herblore alchemy recipes');
ok(Recipes.list('alchemy', { includeLegacy: true }).length ===
  9 + materialRecipeRows.filter((row) => row.skillId === 'alchemy').length,
'explicit legacy recipe filter returns old and Herblore alchemy recipes');
ok(Object.isFrozen(Items.list()) && Object.isFrozen(Skills.list())
  && Object.isFrozen(Recipes.list()),
  'list queries return frozen arrays');
ok(Homestead.getCrop('spiritRice').name === '灵米',
  'crop lookup returns frozen canonical data');
ok(Homestead.getFormation('gatheringFormation').name === '聚材阵',
  'formation lookup returns frozen canonical data');
ok(Homestead.getBeast('spiritFox').name === '灵狐',
  'spirit-beast lookup returns frozen canonical data');

for (const module of [Items, Skills, Gathering, Recipes, Homestead]) {
  ok(Object.isFrozen(module), 'module API is frozen');
  ok(frozenTree(module), 'module data is deeply frozen');
}

console.log('\n=== Stage 2 内容自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
