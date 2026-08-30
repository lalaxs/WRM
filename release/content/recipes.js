(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.RecipeContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function loadMaterialContent() {
    if (typeof globalThis !== 'undefined' && globalThis.MaterialContent) {
      return globalThis.MaterialContent;
    }
    if (typeof require === 'function') {
      try {
        return require('./materials.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  function loadFishingParityContent() {
    if (typeof globalThis !== 'undefined' && globalThis.FishingParityContent) {
      return globalThis.FishingParityContent;
    }
    if (typeof require === 'function') {
      try {
        return require('./fishing-parity.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  const MATERIAL_CONTENT = loadMaterialContent();
  const FISHING_PARITY_CONTENT = loadFishingParityContent();

  const FISH_SPECIES_ORDER = FISHING_PARITY_CONTENT && FISHING_PARITY_CONTENT.COOKABLE
    ? Object.keys(FISHING_PARITY_CONTENT.COOKABLE)
    : [
      'spiritCarp', 'spiritShrimp', 'silverTrout', 'greenBass', 'darkCatfish',
      'sunsetSalmon', 'thunderEel', 'spiritLobster', 'swordfish', 'dragonFish'
    ];
  const LEGACY_PROTOTYPE_RECIPE_IDS = deepFreeze([
    'alchemy:healingPill', 'alchemy:qiGatheringPill',
    'alchemy:foundationPill', 'alchemy:goldCorePill',
    'alchemy:nascentSoulPill', 'alchemy:spiritTransformationPill',
    'alchemy:voidRefiningPill', 'alchemy:bodyIntegrationPill',
    'alchemy:mahayanaPill',
    'cooking:shrimpSoup',
    'talisman:talismanPaper', 'talisman:gatheringTalisman',
    'talisman:hasteTalisman', 'talisman:wardTalisman',
    'talisman:healingTalisman', 'talisman:beastLureTalisman'
  ]);
  const LEGACY_PROTOTYPE_RECIPE_ID_SET = new Set(LEGACY_PROTOTYPE_RECIPE_IDS);

  function define(skillId, outputId, name, unlockLevel, baseSeconds, ingredients, options) {
    const settings = options || {};
    const skillXp = Number.isSafeInteger(settings.skillXp)
      ? settings.skillXp
      : Math.max(1, Math.round(baseSeconds * 1.5));
    const recipe = {
      id: skillId + ':' + outputId,
      skillId: skillId,
      masteryId: skillId + ':' + outputId,
      name: name,
      unlockLevel: unlockLevel,
      baseSeconds: baseSeconds,
      skillXp: skillXp,
      masteryXp: Number.isSafeInteger(settings.masteryXp)
        ? settings.masteryXp
        : Math.max(1, Math.round(skillXp * 0.5)),
      cultivation: Number.isSafeInteger(settings.cultivation)
        ? settings.cultivation
        : Math.max(1, Math.round(baseSeconds * 0.25)),
      ingredients: ingredients,
      ingredientChoices: settings.ingredientChoices || [],
      output: {
        itemId: outputId,
        quantity: settings.outputQuantity || 1
      }
    };
    if (settings.melvor) recipe.melvor = settings.melvor;
    if (typeof settings.equipmentBaseId === 'string') {
      recipe.equipmentBaseId = settings.equipmentBaseId;
    }
    return recipe;
  }

  const rows = [
    define('alchemy', 'healingPill', '疗伤丹', 1, 8, { lingzhi: 2 }),
    define('alchemy', 'qiGatheringPill', '聚气丹', 5, 10,
      { qiGatheringGrass: 2, spiritHoney: 1 }),
    define('alchemy', 'foundationPill', '筑基丹', 15, 16,
      { ironhideGrass: 3, skySilk: 1, spiritHoney: 1 }),
    define('alchemy', 'goldCorePill', '结金丹', 35, 24,
      { dragonSalivaGrass: 3, moonSpiritGrass: 2, goldOre: 1 }),
    define('alchemy', 'nascentSoulPill', '化婴丹', 50, 36,
      { starGrass: 3, goldenLingzhi: 1, jadeShard: 1 }),
    define('alchemy', 'spiritTransformationPill', '化神丹', 65, 50,
      { thunderSpiritGrass: 3, goldenLingzhi: 2, crystalOre: 1 }),
    define('alchemy', 'voidRefiningPill', '炼虚丹', 75, 64,
      { bloodSpiritGrass: 3, millenniumVine: 1, darkCrystal: 1 }),
    define('alchemy', 'bodyIntegrationPill', '合体丹', 85, 80,
      { goldenLingzhi: 3, dragonFish: 1, adamantOre: 2 }),
    define('alchemy', 'mahayanaPill', '大乘丹', 95, 100,
      { goldenLingzhi: 5, dragonFish: 2, darkCrystal: 2 }),

    define('forging', 'copperSword', '赤铜剑', 1, 10,
      { copperOre: 3, willowWood: 1 }, {
        equipmentBaseId: 'qi-weapon'
      }),
    define('forging', 'ironSword', '玄铁剑', 10, 16,
      { ironOre: 5, pineWood: 2 }, {
        equipmentBaseId: 'foundation-weapon'
      }),
    define('forging', 'silverArmor', '银鳞甲', 20, 24,
      { silverOre: 8, beastHide: 2 }, {
        equipmentBaseId: 'core-robe'
      }),
    define('forging', 'spiritStaff', '灵木杖', 35, 32,
      { spiritWood: 5, jadeShard: 2 }, {
        equipmentBaseId: 'nascent-artifact'
      }),
    define('forging', 'darkIronBlade', '玄铁刃', 55, 45,
      { darkIronOre: 8, thunderWood: 2 }, {
        equipmentBaseId: 'spirit-weapon'
      }),
    define('forging', 'formationBase', '阵基', 20, 20,
      { jadeShard: 3, spiritWood: 3 }),

    define('talisman', 'talismanPaper', '空白符纸', 1, 8,
      { willowWood: 2 }, { outputQuantity: 4 }),
    define('talisman', 'gatheringTalisman', '采灵符', 5, 10,
      { talismanPaper: 1, lingzhi: 1 }),
    define('talisman', 'hasteTalisman', '疾行符', 20, 16,
      { talismanPaper: 1, thunderHerb: 1 }),
    define('talisman', 'wardTalisman', '护身符', 15, 14,
      { talismanPaper: 1, ironOre: 1 }),
    define('talisman', 'healingTalisman', '回春符', 25, 18,
      { talismanPaper: 1, heartClearGrass: 1 }),
    define('talisman', 'beastLureTalisman', '引兽符', 30, 22,
      { talismanPaper: 1, spiritFruit: 1 }),

    define('formation', 'gatheringFormation', '聚材阵', 20, 40,
      { formationBase: 1, spiritWood: 3, qiGatheringGrass: 2 }),
    define('formation', 'farmlandFormation', '丰壤阵', 25, 45,
      { formationBase: 1, spiritRice: 5, moonSpiritGrass: 2 }),
    define('formation', 'fishingFormation', '回澜阵', 30, 50,
      { formationBase: 1, jadeShard: 2, spiritCarp: 5 }),
    define('formation', 'craftingFormation', '百工阵', 40, 60,
      { formationBase: 1, darkIronOre: 2, starGrass: 2 }),
    define('formation', 'beastFormation', '御灵阵', 45, 70,
      { formationBase: 1, beastHide: 2, spiritEgg: 2 })
  ];

  if (!(FISHING_PARITY_CONTENT && typeof FISHING_PARITY_CONTENT.recipeRows === 'function')) {
    rows.push(
      define('cooking', 'grilledCarp', '烤灵鲤', 1, 6, { spiritCarp: 2 }),
      define('cooking', 'shrimpSoup', '灵虾汤', 5, 8,
        { spiritShrimp: 2, spiritMushroom: 1 }),
      define('cooking', 'spiritRiceMeal', '灵米饭', 10, 10,
        { spiritRice: 3, spiritHoney: 1 }),
      define('cooking', 'troutFeast', '银鳟宴', 20, 14,
        { silverTrout: 2, lingzhi: 1 }),
      define('cooking', 'lobsterBanquet', '灵龙虾宴', 40, 22,
        { spiritLobster: 2, spiritFruit: 1 }),
      define('cooking', 'dragonFishBanquet', '龙鱼宴', 70, 36,
        { dragonFish: 1, bloodGinsengFruit: 1, goldenLingzhi: 1 }),
      define('cooking', 'beastFeed', '灵兽口粮', 12, 10,
        { spiritRice: 2 }, {
          outputQuantity: 2,
          ingredientChoices: [{
            quantity: 1,
            itemIds: FISH_SPECIES_ORDER.slice()
          }]
        })
    );
  }

  const materialRecipes = MATERIAL_CONTENT && typeof MATERIAL_CONTENT.recipeRows === 'function'
    ? MATERIAL_CONTENT.recipeRows()
    : [];
  materialRecipes.forEach(function (recipe) {
    rows.push(define(
      recipe.skillId,
      recipe.outputId,
      recipe.name,
      recipe.unlockLevel,
      recipe.baseSeconds,
      recipe.ingredients,
      recipe.options
    ));
  });

  const fishingRecipes = FISHING_PARITY_CONTENT &&
    typeof FISHING_PARITY_CONTENT.recipeRows === 'function'
    ? FISHING_PARITY_CONTENT.recipeRows()
    : [];
  fishingRecipes.forEach(function (recipe) {
    rows.push(define(
      recipe.skillId,
      recipe.outputId,
      recipe.name,
      recipe.unlockLevel,
      recipe.baseSeconds,
      recipe.ingredients,
      recipe.options
    ));
  });

  // Keep a hidden legacy alias for old shrimpSoup inventory/tooltips.
  rows.push(define('cooking', 'shrimpSoup', '灵虾汤', 5, 8,
    { spiritShrimp: 2, spiritMushroom: 1 }));

  const RECIPES = {};
  rows.forEach(function (recipe) {
    if (LEGACY_PROTOTYPE_RECIPE_ID_SET.has(recipe.id)) {
      recipe.legacyDesign = true;
      recipe.designStatus = 'legacy_prototype';
    }
    RECIPES[recipe.id] = deepFreeze(recipe);
  });

  function get(recipeId) {
    return RECIPES[recipeId] || null;
  }

  function includeLegacy(options) {
    return !!(options && options.includeLegacy === true);
  }

  function visibleRecipe(recipe, options) {
    return includeLegacy(options) || recipe.legacyDesign !== true;
  }

  function list(skillId, options) {
    const recipes = Object.values(RECIPES).filter(function (recipe) {
      return visibleRecipe(recipe, options);
    });
    return Object.freeze(skillId == null
      ? recipes.slice()
      : recipes.filter(function (recipe) { return recipe.skillId === skillId; }));
  }

  function eachRecipe(visitor, options) {
    list(null, options).forEach(visitor);
  }

  function syncFromMaterials() {
    const materialApi = (typeof globalThis !== 'undefined' && globalThis.MaterialContent)
      ? globalThis.MaterialContent
      : MATERIAL_CONTENT;
    if (!materialApi || typeof materialApi.recipeRows !== 'function') {
      return { ok: false, added: 0 };
    }
    let added = 0;
    materialApi.recipeRows().forEach(function (recipe) {
      if (!recipe || !recipe.skillId || !recipe.outputId) return;
      const id = recipe.skillId + ':' + recipe.outputId;
      if (RECIPES[id]) return;
      const built = define(
        recipe.skillId,
        recipe.outputId,
        recipe.name,
        recipe.unlockLevel,
        recipe.baseSeconds,
        recipe.ingredients,
        recipe.options
      );
      if (LEGACY_PROTOTYPE_RECIPE_ID_SET.has(built.id)) {
        built.legacyDesign = true;
        built.designStatus = 'legacy_prototype';
      }
      RECIPES[built.id] = deepFreeze(built);
      added += 1;
    });
    return { ok: true, added: added };
  }

  return Object.freeze({
    RECIPES: RECIPES,
    LEGACY_PROTOTYPE_RECIPE_IDS: LEGACY_PROTOTYPE_RECIPE_IDS,
    get: get,
    list: list,
    eachRecipe: eachRecipe,
    syncFromMaterials: syncFromMaterials,
    absorbHerbloreParity: syncFromMaterials
  });
});
