(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.HerbloreParityContent = api;
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

  const DATA = deepFreeze({
  "SOURCE": {
    "system": "Melvor Idle Herblore",
    "capturedDate": "2026-07-29",
    "sourceUrls": [
      "https://wiki.melvoridle.com/w/Herblore",
      "https://wiki.melvoridle.com/w/Potions"
    ],
    "note": "Full Herblore potion-series parity snapshot parsed from the official wiki."
  },
  "BASE_SECONDS": 2,
  "TIER_MASTERY": {
    "I": {
      "masteryLevel": 1,
      "xpToTier": 0,
      "numericTier": 1
    },
    "II": {
      "masteryLevel": 20,
      "xpToTier": 4470,
      "numericTier": 2
    },
    "III": {
      "masteryLevel": 50,
      "xpToTier": 101333,
      "numericTier": 3
    },
    "IV": {
      "masteryLevel": 90,
      "xpToTier": 5346332,
      "numericTier": 4
    }
  },
  "INGREDIENTS": [
    {
      "id": "abyssalBatwing",
      "melvorName": "Abyssal Batwing",
      "name": "深渊蝠翼",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 7,
      "quality": "orange",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "深渊蝠翼",
      "description": "深渊蝠翼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:abyssalBatwing"
    },
    {
      "id": "abyssalEssence",
      "melvorName": "Abyssal Essence",
      "name": "深渊精粹",
      "category": "material",
      "materialType": "essence",
      "tier": 7,
      "quality": "orange",
      "icon": "📦",
      "visualFamily": "herblore-essence",
      "artDetail": "深渊精粹",
      "description": "深渊精粹，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:abyssalEssence"
    },
    {
      "id": "abyssalStone",
      "melvorName": "Abyssal Stone",
      "name": "深渊石",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 7,
      "quality": "orange",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "深渊石",
      "description": "深渊石，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:abyssalStone"
    },
    {
      "id": "ash",
      "melvorName": "Ash",
      "name": "灰烬",
      "category": "material",
      "materialType": "powder",
      "tier": 2,
      "quality": "blue",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "灰烬",
      "description": "灰烬，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:ash"
    },
    {
      "id": "azurianFragment",
      "melvorName": "Azurian Fragment",
      "name": "湛蓝碎片",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "湛蓝碎片",
      "description": "湛蓝碎片，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:azurianFragment"
    },
    {
      "id": "barrentoeHerb",
      "melvorName": "Barrentoe Herb",
      "name": "荒趾灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "荒趾灵草",
      "description": "荒趾灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:barrentoeHerb"
    },
    {
      "id": "barrierGem",
      "melvorName": "Barrier Gem",
      "name": "屏障宝石",
      "category": "material",
      "materialType": "gem",
      "tier": 2,
      "quality": "blue",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "屏障宝石",
      "description": "屏障宝石，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:barrierGem"
    },
    {
      "id": "bigBones",
      "melvorName": "Big Bones",
      "name": "巨骨",
      "category": "material",
      "materialType": "bone",
      "tier": 4,
      "quality": "purple",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "巨骨",
      "description": "巨骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bigBones"
    },
    {
      "id": "bitterlymeHerb",
      "melvorName": "Bitterlyme Herb",
      "name": "苦莱姆草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "苦莱姆草",
      "description": "苦莱姆草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bitterlymeHerb"
    },
    {
      "id": "bitterlymeSeeds",
      "melvorName": "Bitterlyme Seeds",
      "name": "苦莱姆种子",
      "category": "material",
      "materialType": "seed",
      "tier": 2,
      "quality": "blue",
      "icon": "🌱",
      "visualFamily": "herblore-seed",
      "artDetail": "苦莱姆种子",
      "description": "苦莱姆种子，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bitterlymeSeeds"
    },
    {
      "id": "blightPowder",
      "melvorName": "Blight Powder",
      "name": "凋零粉",
      "category": "material",
      "materialType": "powder",
      "tier": 7,
      "quality": "orange",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "凋零粉",
      "description": "凋零粉，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:blightPowder"
    },
    {
      "id": "blightblossomHerb",
      "melvorName": "Blightblossom Herb",
      "name": "凋花草",
      "category": "material",
      "materialType": "herb",
      "tier": 7,
      "quality": "orange",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "凋花草",
      "description": "凋花草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:blightblossomHerb"
    },
    {
      "id": "blightedRoots",
      "melvorName": "Blighted Roots",
      "name": "凋蚀根",
      "category": "material",
      "materialType": "plant_material",
      "tier": 7,
      "quality": "orange",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "凋蚀根",
      "description": "凋蚀根，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:blightedRoots"
    },
    {
      "id": "bodyCharm",
      "melvorName": "Body Rune",
      "name": "护体符",
      "category": "material",
      "materialType": "rune_charm",
      "tier": 2,
      "quality": "blue",
      "icon": "📜",
      "visualFamily": "herblore-rune_charm",
      "artDetail": "护体符",
      "description": "护体符，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "production:talisman"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bodyCharm"
    },
    {
      "id": "bones",
      "melvorName": "Bones",
      "name": "白骨",
      "category": "material",
      "materialType": "bone",
      "tier": 2,
      "quality": "blue",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "白骨",
      "description": "白骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bones"
    },
    {
      "id": "bowstring",
      "melvorName": "Bowstring",
      "name": "弓弦",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "弓弦",
      "description": "弓弦，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:bowstring"
    },
    {
      "id": "carrot",
      "melvorName": "Carrot",
      "name": "胡萝卜",
      "category": "material",
      "materialType": "plant_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "胡萝卜",
      "description": "胡萝卜，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:carrot"
    },
    {
      "id": "charcoal",
      "melvorName": "Charcoal",
      "name": "木炭",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "木炭",
      "description": "木炭，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:charcoal"
    },
    {
      "id": "compost",
      "melvorName": "Compost",
      "name": "堆肥",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "堆肥",
      "description": "堆肥，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:compost"
    },
    {
      "id": "crimsonBiter",
      "melvorName": "Crimson Biter",
      "name": "绯咬鱼",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "绯咬鱼",
      "description": "绯咬鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:crimsonBiter"
    },
    {
      "id": "crystalBindingDust",
      "melvorName": "Crystal Binding Dust",
      "name": "缚晶尘",
      "category": "material",
      "materialType": "powder",
      "tier": 5,
      "quality": "purple",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "缚晶尘",
      "description": "缚晶尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:crystalBindingDust"
    },
    {
      "id": "cursedDust",
      "melvorName": "Cursed Dust",
      "name": "诅咒尘",
      "category": "material",
      "materialType": "powder",
      "tier": 5,
      "quality": "purple",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "诅咒尘",
      "description": "诅咒尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:cursedDust"
    },
    {
      "id": "diamond",
      "melvorName": "Diamond",
      "name": "金钻",
      "category": "material",
      "materialType": "gem",
      "tier": 5,
      "quality": "purple",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "金钻",
      "description": "金钻，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:diamond"
    },
    {
      "id": "dragonBones",
      "melvorName": "Dragon Bones",
      "name": "龙骨",
      "category": "material",
      "materialType": "bone",
      "tier": 6,
      "quality": "orange",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "龙骨",
      "description": "龙骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:dragonBones"
    },
    {
      "id": "echosnapHerb",
      "melvorName": "Echosnap Herb",
      "name": "回响草",
      "category": "material",
      "materialType": "herb",
      "tier": 8,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "回响草",
      "description": "回响草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:echosnapHerb"
    },
    {
      "id": "ectoplasm",
      "melvorName": "Ectoplasm",
      "name": "灵质",
      "category": "material",
      "materialType": "essence",
      "tier": 4,
      "quality": "purple",
      "icon": "📦",
      "visualFamily": "herblore-essence",
      "artDetail": "灵质",
      "description": "灵质，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:ectoplasm"
    },
    {
      "id": "elderwoodLogs",
      "melvorName": "Elderwood Logs",
      "name": "古木原木",
      "category": "material",
      "materialType": "wood",
      "tier": 3,
      "quality": "blue",
      "icon": "🪵",
      "visualFamily": "herblore-wood",
      "artDetail": "古木原木",
      "description": "古木原木，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:woodcutting"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:elderwoodLogs"
    },
    {
      "id": "eldrarootHerb",
      "melvorName": "Eldraroot Herb",
      "name": "长老根草",
      "category": "material",
      "materialType": "herb",
      "tier": 8,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "长老根草",
      "description": "长老根草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:eldrarootHerb"
    },
    {
      "id": "eldritchTendril",
      "melvorName": "Eldritch Tendril",
      "name": "异界触须",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 8,
      "quality": "red",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "异界触须",
      "description": "异界触须，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:eldritchTendril"
    },
    {
      "id": "erodingBarrierGem",
      "melvorName": "Eroding Barrier Gem",
      "name": "蚀障宝石",
      "category": "material",
      "materialType": "gem",
      "tier": 6,
      "quality": "orange",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "蚀障宝石",
      "description": "蚀障宝石，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:erodingBarrierGem"
    },
    {
      "id": "eyeball",
      "melvorName": "Eyeball",
      "name": "眼球",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "眼球",
      "description": "眼球，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:eyeball"
    },
    {
      "id": "fearmallowHerb",
      "melvorName": "Fearmallow Herb",
      "name": "惧锦葵",
      "category": "material",
      "materialType": "herb",
      "tier": 8,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "惧锦葵",
      "description": "惧锦葵，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:fearmallowHerb"
    },
    {
      "id": "feathers",
      "melvorName": "Feathers",
      "name": "羽毛",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "羽毛",
      "description": "羽毛，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:feathers"
    },
    {
      "id": "garumHerb",
      "melvorName": "Garum Herb",
      "name": "嘉露草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "嘉露草",
      "description": "嘉露草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:garumHerb"
    },
    {
      "id": "gloomResin",
      "melvorName": "Gloom Resin",
      "name": "幽暗树脂",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 8,
      "quality": "red",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "幽暗树脂",
      "description": "幽暗树脂，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:gloomResin"
    },
    {
      "id": "gloomsproutHerb",
      "melvorName": "Gloomsprout Herb",
      "name": "幽芽草",
      "category": "material",
      "materialType": "herb",
      "tier": 8,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "幽芽草",
      "description": "幽芽草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:gloomsproutHerb"
    },
    {
      "id": "goldOre",
      "melvorName": "Gold Ore",
      "name": "金矿石",
      "category": "material",
      "materialType": "ore",
      "tier": 4,
      "quality": "purple",
      "icon": "🪨",
      "visualFamily": "herblore-ore",
      "artDetail": "金矿石",
      "description": "金矿石，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:goldOre"
    },
    {
      "id": "goo",
      "melvorName": "Goo",
      "name": "黏液",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "黏液",
      "description": "黏液，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:goo"
    },
    {
      "id": "greaterSoul",
      "melvorName": "Greater Soul",
      "name": "大魂",
      "category": "material",
      "materialType": "essence",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-essence",
      "artDetail": "大魂",
      "description": "大魂，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:greaterSoul"
    },
    {
      "id": "holyDust",
      "melvorName": "Holy Dust",
      "name": "圣尘",
      "category": "material",
      "materialType": "powder",
      "tier": 5,
      "quality": "purple",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "圣尘",
      "description": "圣尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:holyDust"
    },
    {
      "id": "infernalBones",
      "melvorName": "Infernal Bones",
      "name": "炼狱骨",
      "category": "material",
      "materialType": "bone",
      "tier": 6,
      "quality": "orange",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "炼狱骨",
      "description": "炼狱骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:infernalBones"
    },
    {
      "id": "iridiumBar",
      "melvorName": "Iridium Bar",
      "name": "铱金锭",
      "category": "material",
      "materialType": "bar",
      "tier": 6,
      "quality": "orange",
      "icon": "▰",
      "visualFamily": "herblore-bar",
      "artDetail": "铱金锭",
      "description": "铱金锭，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "production:forging"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:iridiumBar"
    },
    {
      "id": "jungleSpores",
      "melvorName": "Jungle Spores",
      "name": "丛林孢子",
      "category": "material",
      "materialType": "plant_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "丛林孢子",
      "description": "丛林孢子，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:jungleSpores"
    },
    {
      "id": "largeHorn",
      "melvorName": "Large Horn",
      "name": "巨角",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 5,
      "quality": "purple",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "巨角",
      "description": "巨角，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:largeHorn"
    },
    {
      "id": "leather",
      "melvorName": "Leather",
      "name": "皮革",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "皮革",
      "description": "皮革，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:leather"
    },
    {
      "id": "lemontyleHerb",
      "melvorName": "Lemontyle Herb",
      "name": "柠叶灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "柠叶灵草",
      "description": "柠叶灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:lemontyleHerb"
    },
    {
      "id": "magicBones",
      "melvorName": "Magic Bones",
      "name": "魔骨",
      "category": "material",
      "materialType": "bone",
      "tier": 6,
      "quality": "orange",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "魔骨",
      "description": "魔骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:magicBones"
    },
    {
      "id": "mahoganyLogs",
      "melvorName": "Mahogany Logs",
      "name": "桃花心木",
      "category": "material",
      "materialType": "wood",
      "tier": 2,
      "quality": "blue",
      "icon": "🪵",
      "visualFamily": "herblore-wood",
      "artDetail": "桃花心木",
      "description": "桃花心木，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:woodcutting"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:mahoganyLogs"
    },
    {
      "id": "mantalymeHerb",
      "melvorName": "Mantalyme Herb",
      "name": "蔓陀灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "蔓陀灵草",
      "description": "蔓陀灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:mantalymeHerb"
    },
    {
      "id": "meteoriteOre",
      "melvorName": "Meteorite Ore",
      "name": "陨铁矿",
      "category": "material",
      "materialType": "ore",
      "tier": 6,
      "quality": "orange",
      "icon": "🪨",
      "visualFamily": "herblore-ore",
      "artDetail": "陨铁矿",
      "description": "陨铁矿，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:meteoriteOre"
    },
    {
      "id": "moonwortHerb",
      "melvorName": "Moonwort Herb",
      "name": "月苔草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "月苔草",
      "description": "月苔草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:moonwortHerb"
    },
    {
      "id": "mysticiteFragment",
      "melvorName": "Mysticite Fragment",
      "name": "秘晶碎片",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 9,
      "quality": "red",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "秘晶碎片",
      "description": "秘晶碎片，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:mysticiteFragment"
    },
    {
      "id": "nightgleamHerb",
      "melvorName": "Nightgleam Herb",
      "name": "夜辉草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "夜辉草",
      "description": "夜辉草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:nightgleamHerb"
    },
    {
      "id": "nightopal",
      "melvorName": "Nightopal",
      "name": "夜欧泊",
      "category": "material",
      "materialType": "gem",
      "tier": 2,
      "quality": "blue",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "夜欧泊",
      "description": "夜欧泊，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:nightopal"
    },
    {
      "id": "obzurianBar",
      "melvorName": "Obzurian Bar",
      "name": "黑曜锭",
      "category": "material",
      "materialType": "bar",
      "tier": 9,
      "quality": "red",
      "icon": "▰",
      "visualFamily": "herblore-bar",
      "artDetail": "黑曜锭",
      "description": "黑曜锭，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "production:forging"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:obzurianBar"
    },
    {
      "id": "onyx",
      "melvorName": "Onyx",
      "name": "墨曜玉",
      "category": "material",
      "materialType": "gem",
      "tier": 5,
      "quality": "purple",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "墨曜玉",
      "description": "墨曜玉，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:onyx"
    },
    {
      "id": "oxilymeHerb",
      "melvorName": "Oxilyme Herb",
      "name": "青氧灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "青氧灵草",
      "description": "青氧灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:oxilymeHerb"
    },
    {
      "id": "petrifiedEye",
      "melvorName": "Petrified Eye",
      "name": "石化眼",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 2,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "石化眼",
      "description": "石化眼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:petrifiedEye"
    },
    {
      "id": "pigtayleHerb",
      "melvorName": "Pigtayle Herb",
      "name": "尾叶灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "尾叶灵草",
      "description": "尾叶灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:pigtayleHerb"
    },
    {
      "id": "poraxxHerb",
      "melvorName": "Poraxx Herb",
      "name": "破厄灵草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "破厄灵草",
      "description": "破厄灵草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:poraxxHerb"
    },
    {
      "id": "potatoSeeds",
      "melvorName": "Potato Seeds",
      "name": "土豆种子",
      "category": "material",
      "materialType": "seed",
      "tier": 2,
      "quality": "blue",
      "icon": "🌱",
      "visualFamily": "herblore-seed",
      "artDetail": "土豆种子",
      "description": "土豆种子，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:potatoSeeds"
    },
    {
      "id": "pumpkin",
      "melvorName": "Pumpkin",
      "name": "南瓜",
      "category": "material",
      "materialType": "plant_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "南瓜",
      "description": "南瓜，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:pumpkin"
    },
    {
      "id": "pureCrystalBindingDust",
      "melvorName": "Pure Crystal Binding Dust",
      "name": "纯缚晶尘",
      "category": "material",
      "materialType": "powder",
      "tier": 6,
      "quality": "orange",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "纯缚晶尘",
      "description": "纯缚晶尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:pureCrystalBindingDust"
    },
    {
      "id": "rawBeef",
      "melvorName": "Raw Beef",
      "name": "生牛肉",
      "category": "material",
      "materialType": "food_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生牛肉",
      "description": "生牛肉，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawBeef"
    },
    {
      "id": "rawChicken",
      "melvorName": "Raw Chicken",
      "name": "生鸡肉",
      "category": "material",
      "materialType": "food_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生鸡肉",
      "description": "生鸡肉，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawChicken"
    },
    {
      "id": "rawCrab",
      "melvorName": "Raw Crab",
      "name": "生蟹",
      "category": "material",
      "materialType": "food_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生蟹",
      "description": "生蟹，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawCrab"
    },
    {
      "id": "rawGhostFish",
      "melvorName": "Raw Ghost Fish",
      "name": "生幽灵鱼",
      "category": "material",
      "materialType": "food_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生幽灵鱼",
      "description": "生幽灵鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawGhostFish"
    },
    {
      "id": "rawPoisonFish",
      "melvorName": "Raw Poison Fish",
      "name": "生毒鱼",
      "category": "material",
      "materialType": "food_material",
      "tier": 3,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生毒鱼",
      "description": "生毒鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawPoisonFish"
    },
    {
      "id": "rawSteamswimmer",
      "melvorName": "Raw Steamswimmer",
      "name": "生汽游鱼",
      "category": "material",
      "materialType": "food_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生汽游鱼",
      "description": "生汽游鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawSteamswimmer"
    },
    {
      "id": "rawWhisperfish",
      "melvorName": "Raw Whisperfish",
      "name": "生低语鱼",
      "category": "material",
      "materialType": "food_material",
      "tier": 9,
      "quality": "red",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "生低语鱼",
      "description": "生低语鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:rawWhisperfish"
    },
    {
      "id": "ruby",
      "melvorName": "Ruby",
      "name": "红宝",
      "category": "material",
      "materialType": "gem",
      "tier": 4,
      "quality": "purple",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "红宝",
      "description": "红宝，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:ruby"
    },
    {
      "id": "shadefrondHerb",
      "melvorName": "Shadefrond Herb",
      "name": "影叶草",
      "category": "material",
      "materialType": "herb",
      "tier": 9,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "影叶草",
      "description": "影叶草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:shadefrondHerb"
    },
    {
      "id": "silentsnapScales",
      "melvorName": "Silentsnap Scales",
      "name": "静咬鳞",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 9,
      "quality": "red",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "静咬鳞",
      "description": "静咬鳞，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:silentsnapScales"
    },
    {
      "id": "silverBar",
      "melvorName": "Silver Bar",
      "name": "银髓锭",
      "category": "material",
      "materialType": "bar",
      "tier": 3,
      "quality": "blue",
      "icon": "▰",
      "visualFamily": "herblore-bar",
      "artDetail": "银髓锭",
      "description": "银髓锭，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "production:forging"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:silverBar"
    },
    {
      "id": "snapeGrass",
      "melvorName": "Snape Grass",
      "name": "蛇草",
      "category": "material",
      "materialType": "plant_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "蛇草",
      "description": "蛇草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:snapeGrass"
    },
    {
      "id": "snowcressHerb",
      "melvorName": "Snowcress Herb",
      "name": "雪芥草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "雪芥草",
      "description": "雪芥草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:snowcressHerb"
    },
    {
      "id": "soulCharm",
      "melvorName": "Soul Rune",
      "name": "魂印符",
      "category": "material",
      "materialType": "rune_charm",
      "tier": 2,
      "quality": "blue",
      "icon": "📜",
      "visualFamily": "herblore-rune_charm",
      "artDetail": "魂印符",
      "description": "魂印符，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "production:talisman"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:soulCharm"
    },
    {
      "id": "sourweedHerb",
      "melvorName": "Sourweed Herb",
      "name": "酸藤草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "酸藤草",
      "description": "酸藤草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:sourweedHerb"
    },
    {
      "id": "stardust",
      "melvorName": "Stardust",
      "name": "星尘",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 4,
      "quality": "purple",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "星尘",
      "description": "星尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:stardust"
    },
    {
      "id": "staticJellyfish",
      "melvorName": "Static Jellyfish",
      "name": "静电水母",
      "category": "material",
      "materialType": "food_material",
      "tier": 3,
      "quality": "blue",
      "icon": "🐟",
      "visualFamily": "herblore-food_material",
      "artDetail": "静电水母",
      "description": "静电水母，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:fishing"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:staticJellyfish"
    },
    {
      "id": "strawberrySeeds",
      "melvorName": "Strawberry Seeds",
      "name": "草莓种子",
      "category": "material",
      "materialType": "seed",
      "tier": 2,
      "quality": "blue",
      "icon": "🌱",
      "visualFamily": "herblore-seed",
      "artDetail": "草莓种子",
      "description": "草莓种子，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:strawberrySeeds"
    },
    {
      "id": "swordfish",
      "melvorName": "Swordfish",
      "name": "剑鱼",
      "category": "material",
      "materialType": "alchemy_material",
      "tier": 3,
      "quality": "blue",
      "icon": "📦",
      "visualFamily": "herblore-alchemy_material",
      "artDetail": "剑鱼",
      "description": "剑鱼，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:swordfish"
    },
    {
      "id": "unholyDust",
      "melvorName": "Unholy Dust",
      "name": "秽尘",
      "category": "material",
      "materialType": "powder",
      "tier": 5,
      "quality": "purple",
      "icon": "✦",
      "visualFamily": "herblore-powder",
      "artDetail": "秽尘",
      "description": "秽尘，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:unholyDust"
    },
    {
      "id": "voidEssence",
      "melvorName": "Void Essence",
      "name": "虚空精粹",
      "category": "material",
      "materialType": "essence",
      "tier": 9,
      "quality": "red",
      "icon": "📦",
      "visualFamily": "herblore-essence",
      "artDetail": "虚空精粹",
      "description": "虚空精粹，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:voidEssence"
    },
    {
      "id": "voidbloomHerb",
      "melvorName": "Voidbloom Herb",
      "name": "虚空花草",
      "category": "material",
      "materialType": "herb",
      "tier": 9,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "虚空花草",
      "description": "虚空花草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:voidbloomHerb"
    },
    {
      "id": "whispertallowHerb",
      "melvorName": "Whispertallow Herb",
      "name": "低语脂草",
      "category": "material",
      "materialType": "herb",
      "tier": 9,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "低语脂草",
      "description": "低语脂草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:whispertallowHerb"
    },
    {
      "id": "wildflower",
      "melvorName": "Wildflower",
      "name": "野花",
      "category": "material",
      "materialType": "plant_material",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-plant_material",
      "artDetail": "野花",
      "description": "野花，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:wildflower"
    },
    {
      "id": "witheringBones",
      "melvorName": "Withering Bones",
      "name": "枯萎骨",
      "category": "material",
      "materialType": "bone",
      "tier": 9,
      "quality": "red",
      "icon": "🦴",
      "visualFamily": "herblore-bone",
      "artDetail": "枯萎骨",
      "description": "枯萎骨，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "combat:drop"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:witheringBones"
    },
    {
      "id": "witherlymeHerb",
      "melvorName": "Witherlyme Herb",
      "name": "枯莱姆草",
      "category": "material",
      "materialType": "herb",
      "tier": 9,
      "quality": "red",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "枯莱姆草",
      "description": "枯莱姆草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:witherlymeHerb"
    },
    {
      "id": "wurmtayleHerb",
      "melvorName": "Wurmtayle Herb",
      "name": "虫尾草",
      "category": "material",
      "materialType": "herb",
      "tier": 2,
      "quality": "blue",
      "icon": "🌿",
      "visualFamily": "herblore-herb",
      "artDetail": "虫尾草",
      "description": "虫尾草，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:herb"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:wurmtayleHerb"
    },
    {
      "id": "zephyte",
      "melvorName": "Zephyte",
      "name": "风辉石",
      "category": "material",
      "materialType": "gem",
      "tier": 6,
      "quality": "orange",
      "icon": "💎",
      "visualFamily": "herblore-gem",
      "artDetail": "风辉石",
      "description": "风辉石，对标 Herblore 药剂体系的炼丹辅材。",
      "sourceTags": [
        "gathering:mining"
      ],
      "useTags": [
        "alchemy"
      ],
      "iconPromptKey": "herbloreIngredient:zephyte"
    }
  ],
  "SERIES": [
    {
      "id": "birdNestPotion",
      "melvorName": "Bird Nest Potion",
      "localName": "巢羽丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 1,
      "xp": 5,
      "baseSeconds": 2,
      "herb": {
        "itemId": "garumHerb",
        "melvorName": "Garum Herb",
        "localName": "嘉露草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "potatoSeeds",
        "melvorName": "Potato Seeds",
        "localName": "土豆种子",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "birdNestPotionI",
          "name": "巢羽丹·一阶",
          "charges": 50,
          "effect": "+5% chance to gain Bird Nest in Woodcutting",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:birdNestPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "birdNestPotionII",
          "name": "巢羽丹·二阶",
          "charges": 50,
          "effect": "+10% chance to gain Bird Nest in Woodcutting",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:birdNestPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "birdNestPotionIII",
          "name": "巢羽丹·三阶",
          "charges": 75,
          "effect": "+15% chance to gain Bird Nest in Woodcutting",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:birdNestPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "birdNestPotionIV",
          "name": "巢羽丹·四阶",
          "charges": 100,
          "effect": "+30% chance to gain Bird Nest in Woodcutting",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:birdNestPotion"
        }
      ]
    },
    {
      "id": "meleeAccuracyPotion",
      "melvorName": "Melee Accuracy Potion",
      "localName": "近战精准丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 5,
      "xp": 8,
      "baseSeconds": 2,
      "herb": {
        "itemId": "garumHerb",
        "melvorName": "Garum Herb",
        "localName": "嘉露草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "bones",
        "melvorName": "Bones",
        "localName": "白骨",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "meleeAccuracyPotionI",
          "name": "近战精准丹·一阶",
          "charges": 20,
          "effect": "+8% Melee Accuracy Rating",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:meleeAccuracyPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "meleeAccuracyPotionII",
          "name": "近战精准丹·二阶",
          "charges": 20,
          "effect": "+12% Melee Accuracy Rating",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:meleeAccuracyPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "meleeAccuracyPotionIII",
          "name": "近战精准丹·三阶",
          "charges": 20,
          "effect": "+15% Melee Accuracy Rating",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:meleeAccuracyPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "meleeAccuracyPotionIV",
          "name": "近战精准丹·四阶",
          "charges": 30,
          "effect": "+25% Melee Accuracy Rating",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:meleeAccuracyPotion"
        }
      ]
    },
    {
      "id": "meleeEvasionPotion",
      "melvorName": "Melee Evasion Potion",
      "localName": "近战闪避丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 10,
      "xp": 10,
      "baseSeconds": 2,
      "herb": {
        "itemId": "garumHerb",
        "melvorName": "Garum Herb",
        "localName": "嘉露草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "rawChicken",
        "melvorName": "Raw Chicken",
        "localName": "生鸡肉",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "meleeEvasionPotionI",
          "name": "近战闪避丹·一阶",
          "charges": 30,
          "effect": "+8% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:meleeEvasionPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "meleeEvasionPotionII",
          "name": "近战闪避丹·二阶",
          "charges": 30,
          "effect": "+12% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:meleeEvasionPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "meleeEvasionPotionIII",
          "name": "近战闪避丹·三阶",
          "charges": 30,
          "effect": "+15% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:meleeEvasionPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "meleeEvasionPotionIV",
          "name": "近战闪避丹·四阶",
          "charges": 40,
          "effect": "+25% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:meleeEvasionPotion"
        }
      ]
    },
    {
      "id": "barrierTouchPotion",
      "melvorName": "Barrier Touch Potion",
      "localName": "屏障触媒丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 12,
      "xp": 13,
      "baseSeconds": 2,
      "herb": {
        "itemId": "garumHerb",
        "melvorName": "Garum Herb",
        "localName": "嘉露草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "barrierGem",
        "melvorName": "Barrier Gem",
        "localName": "屏障宝石",
        "quantity": 5
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "barrierTouchPotionI",
          "name": "屏障触媒丹·一阶",
          "charges": 2,
          "effect": "+10 Flat Barrier damage added to Summon Familiar",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:barrierTouchPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "barrierTouchPotionII",
          "name": "屏障触媒丹·二阶",
          "charges": 4,
          "effect": "+20 Flat Barrier damage added to Summon Familiar",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:barrierTouchPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "barrierTouchPotionIII",
          "name": "屏障触媒丹·三阶",
          "charges": 6,
          "effect": "+30 Flat Barrier damage added to Summon Familiar",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:barrierTouchPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "barrierTouchPotionIV",
          "name": "屏障触媒丹·四阶",
          "charges": 8,
          "effect": "+40 Flat Barrier damage added to Summon Familiar",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:barrierTouchPotion"
        }
      ]
    },
    {
      "id": "rangedAssistancePotion",
      "melvorName": "Ranged Assistance Potion",
      "localName": "远程助攻丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 15,
      "xp": 14,
      "baseSeconds": 2,
      "herb": {
        "itemId": "sourweedHerb",
        "melvorName": "Sourweed Herb",
        "localName": "酸藤草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "rawBeef",
        "melvorName": "Raw Beef",
        "localName": "生牛肉",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "rangedAssistancePotionI",
          "name": "远程助攻丹·一阶",
          "charges": 15,
          "effect": "+4% Ranged Accuracy Rating, +4% Ranged Evasion, and +10% chance to ignore Poison",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:rangedAssistancePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "rangedAssistancePotionII",
          "name": "远程助攻丹·二阶",
          "charges": 15,
          "effect": "+8% Ranged Accuracy Rating, +8% Ranged Evasion, and +10% chance to ignore Poison",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:rangedAssistancePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "rangedAssistancePotionIII",
          "name": "远程助攻丹·三阶",
          "charges": 15,
          "effect": "+12% Ranged Accuracy Rating, +12% Ranged Evasion, and +10% chance to ignore Poison",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:rangedAssistancePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "rangedAssistancePotionIV",
          "name": "远程助攻丹·四阶",
          "charges": 20,
          "effect": "+20% Ranged Accuracy Rating, +20% Ranged Evasion, and +10% chance to ignore Poison",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:rangedAssistancePotion"
        }
      ]
    },
    {
      "id": "hinderPotion",
      "melvorName": "Hinder Potion",
      "localName": "迟滞丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 18,
      "xp": 16,
      "baseSeconds": 2,
      "herb": {
        "itemId": "sourweedHerb",
        "melvorName": "Sourweed Herb",
        "localName": "酸藤草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "goo",
        "melvorName": "Goo",
        "localName": "黏液",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "hinderPotionI",
          "name": "迟滞丹·一阶",
          "charges": 5,
          "effect": "Inflict a slow that increases the target's attack interval by 3% when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:hinderPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "hinderPotionII",
          "name": "迟滞丹·二阶",
          "charges": 10,
          "effect": "Inflict a slow that increases the target's attack interval by 6% when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:hinderPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "hinderPotionIII",
          "name": "迟滞丹·三阶",
          "charges": 15,
          "effect": "Inflict a slow that increases the target's attack interval by 10% when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:hinderPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "hinderPotionIV",
          "name": "迟滞丹·四阶",
          "charges": 25,
          "effect": "Inflict a slow that increases the target's attack interval by 15% when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:hinderPotion"
        }
      ]
    },
    {
      "id": "controlledHeatPotion",
      "melvorName": "Controlled Heat Potion",
      "localName": "控火丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 20,
      "xp": 18,
      "baseSeconds": 2,
      "herb": {
        "itemId": "sourweedHerb",
        "melvorName": "Sourweed Herb",
        "localName": "酸藤草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "mahoganyLogs",
        "melvorName": "Mahogany Logs",
        "localName": "桃花心木",
        "quantity": 3
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "controlledHeatPotionI",
          "name": "控火丹·一阶",
          "charges": 5,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:controlledHeatPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "controlledHeatPotionII",
          "name": "控火丹·二阶",
          "charges": 10,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:controlledHeatPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "controlledHeatPotionIII",
          "name": "控火丹·三阶",
          "charges": 15,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:controlledHeatPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "controlledHeatPotionIV",
          "name": "控火丹·四阶",
          "charges": 25,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:controlledHeatPotion"
        }
      ]
    },
    {
      "id": "magicAssistancePotion",
      "melvorName": "Magic Assistance Potion",
      "localName": "法术助攻丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 25,
      "xp": 22,
      "baseSeconds": 2,
      "herb": {
        "itemId": "mantalymeHerb",
        "melvorName": "Mantalyme Herb",
        "localName": "蔓陀灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "holyDust",
        "melvorName": "Holy Dust",
        "localName": "圣尘",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "magicAssistancePotionI",
          "name": "法术助攻丹·一阶",
          "charges": 15,
          "effect": "+4% Magic Accuracy Rating, +4% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:magicAssistancePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "magicAssistancePotionII",
          "name": "法术助攻丹·二阶",
          "charges": 15,
          "effect": "+8% Magic Accuracy Rating, +8% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:magicAssistancePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "magicAssistancePotionIII",
          "name": "法术助攻丹·三阶",
          "charges": 15,
          "effect": "+12% Magic Accuracy Rating, +12% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:magicAssistancePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "magicAssistancePotionIV",
          "name": "法术助攻丹·四阶",
          "charges": 20,
          "effect": "+20% Magic Accuracy Rating, +20% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:magicAssistancePotion"
        }
      ]
    },
    {
      "id": "generousCookPotion",
      "melvorName": "Generous Cook Potion",
      "localName": "丰厨丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 32,
      "xp": 28,
      "baseSeconds": 2,
      "herb": {
        "itemId": "mantalymeHerb",
        "melvorName": "Mantalyme Herb",
        "localName": "蔓陀灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "swordfish",
        "melvorName": "Swordfish",
        "localName": "剑鱼",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "generousCookPotionI",
          "name": "丰厨丹·一阶",
          "charges": 15,
          "effect": "+10% Chance to Double Items in Cooking",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:generousCookPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "generousCookPotionII",
          "name": "丰厨丹·二阶",
          "charges": 30,
          "effect": "+20% Chance to Double Items in Cooking",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:generousCookPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "generousCookPotionIII",
          "name": "丰厨丹·三阶",
          "charges": 40,
          "effect": "+30% Chance to Double Items in Cooking",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:generousCookPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "generousCookPotionIV",
          "name": "丰厨丹·四阶",
          "charges": 60,
          "effect": "+50% Chance to Double Items in Cooking",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:generousCookPotion"
        }
      ]
    },
    {
      "id": "regenerationPotion",
      "melvorName": "Regeneration Potion",
      "localName": "回元丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 35,
      "xp": 31,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "ruby",
        "melvorName": "Ruby",
        "localName": "红宝",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "regenerationPotionI",
          "name": "回元丹·一阶",
          "charges": 15,
          "effect": "+30% Hitpoint Regeneration",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:regenerationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "regenerationPotionII",
          "name": "回元丹·二阶",
          "charges": 25,
          "effect": "+60% Hitpoint Regeneration",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:regenerationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "regenerationPotionIII",
          "name": "回元丹·三阶",
          "charges": 40,
          "effect": "+100% Hitpoint Regeneration",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:regenerationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "regenerationPotionIV",
          "name": "回元丹·四阶",
          "charges": 60,
          "effect": "+150% Hitpoint Regeneration",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:regenerationPotion"
        }
      ]
    },
    {
      "id": "seeingGoldPotion",
      "melvorName": "Seeing Gold Potion",
      "localName": "见金丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 36,
      "xp": 33,
      "baseSeconds": 2,
      "herb": {
        "itemId": "mantalymeHerb",
        "melvorName": "Mantalyme Herb",
        "localName": "蔓陀灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "silverBar",
        "melvorName": "Silver Bar",
        "localName": "银髓锭",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "seeingGoldPotionI",
          "name": "见金丹·一阶",
          "charges": 20,
          "effect": "+10% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:seeingGoldPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "seeingGoldPotionII",
          "name": "见金丹·二阶",
          "charges": 30,
          "effect": "+20% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:seeingGoldPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "seeingGoldPotionIII",
          "name": "见金丹·三阶",
          "charges": 50,
          "effect": "+40% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:seeingGoldPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "seeingGoldPotionIV",
          "name": "见金丹·四阶",
          "charges": 80,
          "effect": "+75% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:seeingGoldPotion"
        }
      ]
    },
    {
      "id": "famishedPotion",
      "melvorName": "Famished Potion",
      "localName": "饥食丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 40,
      "xp": 38,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "wildflower",
        "melvorName": "Wildflower",
        "localName": "野花",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "famishedPotionI",
          "name": "饥食丹·一阶",
          "charges": 10,
          "effect": "+5% Auto Eat Efficiency and +5% Chance to Preserve Food when eaten",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:famishedPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "famishedPotionII",
          "name": "饥食丹·二阶",
          "charges": 20,
          "effect": "+10% Auto Eat Efficiency and +10% Chance to Preserve Food when eaten",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:famishedPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "famishedPotionIII",
          "name": "饥食丹·三阶",
          "charges": 30,
          "effect": "+15% Auto Eat Efficiency and +15% Chance to Preserve Food when eaten",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:famishedPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "famishedPotionIV",
          "name": "饥食丹·四阶",
          "charges": 40,
          "effect": "+25% Auto Eat Efficiency and +25% Chance to Preserve Food when eaten",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:famishedPotion"
        }
      ]
    },
    {
      "id": "fishermansPotion",
      "melvorName": "Fishermans Potion",
      "localName": "渔夫丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 40,
      "xp": 36,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "rawCrab",
        "melvorName": "Raw Crab",
        "localName": "生蟹",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "fishermansPotionI",
          "name": "渔夫丹·一阶",
          "charges": 5,
          "effect": "+3% Chance to Double Items in Fishing",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:fishermansPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "fishermansPotionII",
          "name": "渔夫丹·二阶",
          "charges": 10,
          "effect": "+5% Chance to Double Items in Fishing",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:fishermansPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "fishermansPotionIII",
          "name": "渔夫丹·三阶",
          "charges": 15,
          "effect": "+8% Chance to Double Items in Fishing",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:fishermansPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "fishermansPotionIV",
          "name": "渔夫丹·四阶",
          "charges": 20,
          "effect": "+12% Chance to Double Items in Fishing",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:fishermansPotion"
        }
      ]
    },
    {
      "id": "crystallizationPotion",
      "melvorName": "Crystallization Potion",
      "localName": "晶化丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 40,
      "xp": 41,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 3
      },
      "secondary": {
        "itemId": "crystalBindingDust",
        "melvorName": "Crystal Binding Dust",
        "localName": "缚晶尘",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "crystallizationPotionI",
          "name": "晶化丹·一阶",
          "charges": 2,
          "effect": "+1% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:crystallizationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "crystallizationPotionII",
          "name": "晶化丹·二阶",
          "charges": 4,
          "effect": "+2% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:crystallizationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "crystallizationPotionIII",
          "name": "晶化丹·三阶",
          "charges": 6,
          "effect": "+3% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:crystallizationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "crystallizationPotionIV",
          "name": "晶化丹·四阶",
          "charges": 10,
          "effect": "+4% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:crystallizationPotion"
        }
      ]
    },
    {
      "id": "unholyPotion",
      "melvorName": "Unholy Potion",
      "localName": "秽祷丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 42,
      "xp": 43,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "unholyDust",
        "melvorName": "Unholy Dust",
        "localName": "秽尘",
        "quantity": 3
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "unholyPotionI",
          "name": "秽祷丹·一阶",
          "charges": 5,
          "effect": "+5% chance to preserve Prayer Points for Unholy Prayers",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:unholyPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "unholyPotionII",
          "name": "秽祷丹·二阶",
          "charges": 10,
          "effect": "+10% chance to preserve Prayer Points for Unholy Prayers",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:unholyPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "unholyPotionIII",
          "name": "秽祷丹·三阶",
          "charges": 15,
          "effect": "+15% chance to preserve Prayer Points for Unholy Prayers",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:unholyPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "unholyPotionIV",
          "name": "秽祷丹·四阶",
          "charges": 20,
          "effect": "+20% chance to preserve Prayer Points for Unholy Prayers",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:unholyPotion"
        }
      ]
    },
    {
      "id": "skilledFletchingPotion",
      "melvorName": "Skilled Fletching Potion",
      "localName": "巧弓丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 42,
      "xp": 39,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "bowstring",
        "melvorName": "Bowstring",
        "localName": "弓弦",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "skilledFletchingPotionI",
          "name": "巧弓丹·一阶",
          "charges": 20,
          "effect": "+5% Chance to Double Items in Fletching",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:skilledFletchingPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "skilledFletchingPotionII",
          "name": "巧弓丹·二阶",
          "charges": 30,
          "effect": "+10% Chance to Double Items in Fletching",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:skilledFletchingPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "skilledFletchingPotionIII",
          "name": "巧弓丹·三阶",
          "charges": 40,
          "effect": "+15% Chance to Double Items in Fletching",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:skilledFletchingPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "skilledFletchingPotionIV",
          "name": "巧弓丹·四阶",
          "charges": 50,
          "effect": "+25% Chance to Double Items in Fletching",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:skilledFletchingPotion"
        }
      ]
    },
    {
      "id": "rangedStrengthPotion",
      "melvorName": "Ranged Strength Potion",
      "localName": "远程强击丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 45,
      "xp": 45,
      "baseSeconds": 2,
      "herb": {
        "itemId": "oxilymeHerb",
        "melvorName": "Oxilyme Herb",
        "localName": "青氧灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "eyeball",
        "melvorName": "Eyeball",
        "localName": "眼球",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "rangedStrengthPotionI",
          "name": "远程强击丹·一阶",
          "charges": 5,
          "effect": "+5% Ranged Maximum Hit",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:rangedStrengthPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "rangedStrengthPotionII",
          "name": "远程强击丹·二阶",
          "charges": 5,
          "effect": "+10% Ranged Maximum Hit",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:rangedStrengthPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "rangedStrengthPotionIII",
          "name": "远程强击丹·三阶",
          "charges": 5,
          "effect": "+15% Ranged Maximum Hit",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:rangedStrengthPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "rangedStrengthPotionIV",
          "name": "远程强击丹·四阶",
          "charges": 10,
          "effect": "+25% Ranged Maximum Hit",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:rangedStrengthPotion"
        }
      ]
    },
    {
      "id": "gentleHandsPotion",
      "melvorName": "Gentle Hands Potion",
      "localName": "巧手丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 45,
      "xp": 41,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "strawberrySeeds",
        "melvorName": "Strawberry Seeds",
        "localName": "草莓种子",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "gentleHandsPotionI",
          "name": "巧手丹·一阶",
          "charges": 20,
          "effect": "+15 Stealth while Thieving",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:gentleHandsPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "gentleHandsPotionII",
          "name": "巧手丹·二阶",
          "charges": 30,
          "effect": "+30 Stealth while Thieving",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:gentleHandsPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "gentleHandsPotionIII",
          "name": "巧手丹·三阶",
          "charges": 40,
          "effect": "+50 Stealth while Thieving",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:gentleHandsPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "gentleHandsPotionIV",
          "name": "巧手丹·四阶",
          "charges": 50,
          "effect": "+75 Stealth while Thieving",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:gentleHandsPotion"
        }
      ]
    },
    {
      "id": "secretStardustPotion",
      "melvorName": "Secret Stardust Potion",
      "localName": "秘星尘丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 47,
      "xp": 47,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "stardust",
        "melvorName": "Stardust",
        "localName": "星尘",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "secretStardustPotionI",
          "name": "秘星尘丹·一阶",
          "charges": 5,
          "effect": "-3% Astrology Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:secretStardustPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "secretStardustPotionII",
          "name": "秘星尘丹·二阶",
          "charges": 10,
          "effect": "-5% Astrology Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:secretStardustPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "secretStardustPotionIII",
          "name": "秘星尘丹·三阶",
          "charges": 15,
          "effect": "-10% Astrology Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:secretStardustPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "secretStardustPotionIV",
          "name": "秘星尘丹·四阶",
          "charges": 25,
          "effect": "-15% Astrology Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:secretStardustPotion"
        }
      ]
    },
    {
      "id": "craftingPotion",
      "melvorName": "Crafting Potion",
      "localName": "巧作丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 49,
      "xp": 41,
      "baseSeconds": 2,
      "herb": {
        "itemId": "lemontyleHerb",
        "melvorName": "Lemontyle Herb",
        "localName": "柠叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "leather",
        "melvorName": "Leather",
        "localName": "皮革",
        "quantity": 3
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "craftingPotionI",
          "name": "巧作丹·一阶",
          "charges": 10,
          "effect": "+5% Chance to Double Items in Crafting",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:craftingPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "craftingPotionII",
          "name": "巧作丹·二阶",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Crafting",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:craftingPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "craftingPotionIII",
          "name": "巧作丹·三阶",
          "charges": 10,
          "effect": "+15% Chance to Double Items in Crafting",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:craftingPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "craftingPotionIV",
          "name": "巧作丹·四阶",
          "charges": 15,
          "effect": "+25% Chance to Double Items in Crafting",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:craftingPotion"
        }
      ]
    },
    {
      "id": "luckyHerbPotion",
      "melvorName": "Lucky Herb Potion",
      "localName": "幸运灵草丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 50,
      "xp": 47,
      "baseSeconds": 2,
      "herb": {
        "itemId": "oxilymeHerb",
        "melvorName": "Oxilyme Herb",
        "localName": "青氧灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "compost",
        "melvorName": "Compost",
        "localName": "堆肥",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "luckyHerbPotionI",
          "name": "幸运灵草丹·一阶",
          "charges": 8,
          "effect": "+10% chance to convert combat seed drops to herbs",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:luckyHerbPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "luckyHerbPotionII",
          "name": "幸运灵草丹·二阶",
          "charges": 10,
          "effect": "+20% chance to convert combat seed drops to herbs",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:luckyHerbPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "luckyHerbPotionIII",
          "name": "幸运灵草丹·三阶",
          "charges": 15,
          "effect": "+30% chance to convert combat seed drops to herbs",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:luckyHerbPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "luckyHerbPotionIV",
          "name": "幸运灵草丹·四阶",
          "charges": 20,
          "effect": "+50% chance to convert combat seed drops to herbs",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:luckyHerbPotion"
        }
      ]
    },
    {
      "id": "perfectSwingPotion",
      "melvorName": "Perfect Swing Potion",
      "localName": "完美挥镐丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 53,
      "xp": 53,
      "baseSeconds": 2,
      "herb": {
        "itemId": "oxilymeHerb",
        "melvorName": "Oxilyme Herb",
        "localName": "青氧灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "goldOre",
        "melvorName": "Gold Ore",
        "localName": "金矿石",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "perfectSwingPotionI",
          "name": "完美挥镐丹·一阶",
          "charges": 30,
          "effect": "+10% chance to deal no damage to Essence Nodes in Mining and +10% chance to deal no damage to Ore Nodes in Mining",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:perfectSwingPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "perfectSwingPotionII",
          "name": "完美挥镐丹·二阶",
          "charges": 50,
          "effect": "+20% chance to deal no damage to Essence Nodes in Mining and +20% chance to deal no damage to Ore Nodes in Mining",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:perfectSwingPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "perfectSwingPotionIII",
          "name": "完美挥镐丹·三阶",
          "charges": 80,
          "effect": "+40% chance to deal no damage to Essence Nodes in Mining and +40% chance to deal no damage to Ore Nodes in Mining",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:perfectSwingPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "perfectSwingPotionIV",
          "name": "完美挥镐丹·四阶",
          "charges": 100,
          "effect": "+80% chance to deal no damage to Essence Nodes in Mining and +80% chance to deal no damage to Ore Nodes in Mining",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:perfectSwingPotion"
        }
      ]
    },
    {
      "id": "necromancerPotion",
      "melvorName": "Necromancer Potion",
      "localName": "唤灵丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 55,
      "xp": 50,
      "baseSeconds": 2,
      "herb": {
        "itemId": "oxilymeHerb",
        "melvorName": "Oxilyme Herb",
        "localName": "青氧灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "feathers",
        "melvorName": "Feathers",
        "localName": "羽毛",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "necromancerPotionI",
          "name": "唤灵丹·一阶",
          "charges": 15,
          "effect": "+1 base primary resource quantity gained in Summoning",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:necromancerPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "necromancerPotionII",
          "name": "唤灵丹·二阶",
          "charges": 30,
          "effect": "+2 base primary resource quantity gained in Summoning",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:necromancerPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "necromancerPotionIII",
          "name": "唤灵丹·三阶",
          "charges": 45,
          "effect": "+3 base primary resource quantity gained in Summoning",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:necromancerPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "necromancerPotionIV",
          "name": "唤灵丹·四阶",
          "charges": 60,
          "effect": "+5 base primary resource quantity gained in Summoning",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:necromancerPotion"
        }
      ]
    },
    {
      "id": "divinePotion",
      "melvorName": "Divine Potion",
      "localName": "神佑丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 57,
      "xp": 51,
      "baseSeconds": 2,
      "herb": {
        "itemId": "oxilymeHerb",
        "melvorName": "Oxilyme Herb",
        "localName": "青氧灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "bigBones",
        "melvorName": "Big Bones",
        "localName": "巨骨",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "divinePotionI",
          "name": "神佑丹·一阶",
          "charges": 15,
          "effect": "+10% Chance To Preserve Prayer Points",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:divinePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "divinePotionII",
          "name": "神佑丹·二阶",
          "charges": 20,
          "effect": "+15% Chance To Preserve Prayer Points",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:divinePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "divinePotionIII",
          "name": "神佑丹·三阶",
          "charges": 25,
          "effect": "+20% Chance To Preserve Prayer Points",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:divinePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "divinePotionIV",
          "name": "神佑丹·四阶",
          "charges": 30,
          "effect": "+35% Chance To Preserve Prayer Points",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:divinePotion"
        }
      ]
    },
    {
      "id": "meleeStrengthPotion",
      "melvorName": "Melee Strength Potion",
      "localName": "近战强击丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 60,
      "xp": 60,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "dragonBones",
        "melvorName": "Dragon Bones",
        "localName": "龙骨",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "meleeStrengthPotionI",
          "name": "近战强击丹·一阶",
          "charges": 5,
          "effect": "+1% Melee Maximum Hit",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:meleeStrengthPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "meleeStrengthPotionII",
          "name": "近战强击丹·二阶",
          "charges": 5,
          "effect": "+3% Melee Maximum Hit",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:meleeStrengthPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "meleeStrengthPotionIII",
          "name": "近战强击丹·三阶",
          "charges": 5,
          "effect": "+6% Melee Maximum Hit",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:meleeStrengthPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "meleeStrengthPotionIV",
          "name": "近战强击丹·四阶",
          "charges": 10,
          "effect": "+10% Melee Maximum Hit",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:meleeStrengthPotion"
        }
      ]
    },
    {
      "id": "performanceEnhancingPotion",
      "melvorName": "Performance Enhancing Potion",
      "localName": "身法强化丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 62,
      "xp": 61,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "rawPoisonFish",
        "melvorName": "Raw Poison Fish",
        "localName": "生毒鱼",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "performanceEnhancingPotionI",
          "name": "身法强化丹·一阶",
          "charges": 10,
          "effect": "-4% Agility Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:performanceEnhancingPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "performanceEnhancingPotionII",
          "name": "身法强化丹·二阶",
          "charges": 20,
          "effect": "-6% Agility Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:performanceEnhancingPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "performanceEnhancingPotionIII",
          "name": "身法强化丹·三阶",
          "charges": 30,
          "effect": "-8% Agility Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:performanceEnhancingPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "performanceEnhancingPotionIV",
          "name": "身法强化丹·四阶",
          "charges": 50,
          "effect": "-12% Agility Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:performanceEnhancingPotion"
        }
      ]
    },
    {
      "id": "elementalPotion",
      "melvorName": "Elemental Potion",
      "localName": "元素丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 63,
      "xp": 63,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "bodyCharm",
        "melvorName": "Body Rune",
        "localName": "护体符",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "elementalPotionI",
          "name": "元素丹·一阶",
          "charges": 20,
          "effect": "+5% chance to gain 2 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:elementalPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "elementalPotionII",
          "name": "元素丹·二阶",
          "charges": 30,
          "effect": "+10% chance to gain 4 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:elementalPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "elementalPotionIII",
          "name": "元素丹·三阶",
          "charges": 40,
          "effect": "+25% chance to gain 6 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:elementalPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "elementalPotionIV",
          "name": "元素丹·四阶",
          "charges": 50,
          "effect": "+50% chance to gain 8 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:elementalPotion"
        }
      ]
    },
    {
      "id": "magicDamagePotion",
      "melvorName": "Magic Damage Potion",
      "localName": "法伤丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 65,
      "xp": 85,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "snapeGrass",
        "melvorName": "Snape Grass",
        "localName": "蛇草",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "magicDamagePotionI",
          "name": "法伤丹·一阶",
          "charges": 5,
          "effect": "+1% Magic Maximum Hit",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:magicDamagePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "magicDamagePotionII",
          "name": "法伤丹·二阶",
          "charges": 5,
          "effect": "+5% Magic Maximum Hit",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:magicDamagePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "magicDamagePotionIII",
          "name": "法伤丹·三阶",
          "charges": 5,
          "effect": "+10% Magic Maximum Hit",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:magicDamagePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "magicDamagePotionIV",
          "name": "法伤丹·四阶",
          "charges": 5,
          "effect": "+15% Magic Maximum Hit",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:magicDamagePotion"
        }
      ]
    },
    {
      "id": "lethalToxinsPotion",
      "melvorName": "Lethal Toxins Potion",
      "localName": "剧毒丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 68,
      "xp": 92,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "rawPoisonFish",
        "melvorName": "Raw Poison Fish",
        "localName": "生毒鱼",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "lethalToxinsPotionI",
          "name": "剧毒丹·一阶",
          "charges": 5,
          "effect": "+3% chance to apply Poison when hitting with a Melee or Ranged attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:lethalToxinsPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "lethalToxinsPotionII",
          "name": "剧毒丹·二阶",
          "charges": 10,
          "effect": "+6% chance to apply Poison when hitting with a Melee or Ranged attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:lethalToxinsPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "lethalToxinsPotionIII",
          "name": "剧毒丹·三阶",
          "charges": 15,
          "effect": "+10% chance to apply Poison when hitting with a Melee or Ranged attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:lethalToxinsPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "lethalToxinsPotionIV",
          "name": "剧毒丹·四阶",
          "charges": 20,
          "effect": "+15% chance to apply Poison when hitting with a Melee or Ranged attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:lethalToxinsPotion"
        }
      ]
    },
    {
      "id": "herblorePotion",
      "melvorName": "Herblore Potion",
      "localName": "百草丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 71,
      "xp": 99,
      "baseSeconds": 2,
      "herb": {
        "itemId": "pigtayleHerb",
        "melvorName": "Pigtayle Herb",
        "localName": "尾叶灵草",
        "quantity": 3
      },
      "secondary": null,
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "herblorePotionI",
          "name": "百草丹·一阶",
          "charges": 20,
          "effect": "+1% Chance to receive a Random Tier of the same Potion in Herblore",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:herblorePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "herblorePotionII",
          "name": "百草丹·二阶",
          "charges": 30,
          "effect": "+2% Chance to receive a Random Tier of the same Potion in Herblore",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:herblorePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "herblorePotionIII",
          "name": "百草丹·三阶",
          "charges": 40,
          "effect": "+3% Chance to receive a Random Tier of the same Potion in Herblore",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:herblorePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "herblorePotionIV",
          "name": "百草丹·四阶",
          "charges": 60,
          "effect": "+6% Chance to receive a Random Tier of the same Potion in Herblore",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:herblorePotion"
        }
      ]
    },
    {
      "id": "cursedPotion",
      "melvorName": "Cursed Potion",
      "localName": "诅咒丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 73,
      "xp": 126,
      "baseSeconds": 2,
      "herb": {
        "itemId": "poraxxHerb",
        "melvorName": "Poraxx Herb",
        "localName": "破厄灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "cursedDust",
        "melvorName": "Cursed Dust",
        "localName": "诅咒尘",
        "quantity": 3
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "cursedPotionI",
          "name": "诅咒丹·一阶",
          "charges": 5,
          "effect": "+5% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:cursedPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "cursedPotionII",
          "name": "诅咒丹·二阶",
          "charges": 10,
          "effect": "+10% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:cursedPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "cursedPotionIII",
          "name": "诅咒丹·三阶",
          "charges": 15,
          "effect": "+15% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:cursedPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "cursedPotionIV",
          "name": "诅咒丹·四阶",
          "charges": 20,
          "effect": "+20% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:cursedPotion"
        }
      ]
    },
    {
      "id": "generousHarvestPotion",
      "melvorName": "Generous Harvest Potion",
      "localName": "丰收丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 74,
      "xp": 112,
      "baseSeconds": 2,
      "herb": {
        "itemId": "pigtayleHerb",
        "melvorName": "Pigtayle Herb",
        "localName": "尾叶灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "carrot",
        "melvorName": "Carrot",
        "localName": "胡萝卜",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "generousHarvestPotionI",
          "name": "丰收丹·一阶",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Farming",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:generousHarvestPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "generousHarvestPotionII",
          "name": "丰收丹·二阶",
          "charges": 10,
          "effect": "+15% Chance to Double Items in Farming",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:generousHarvestPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "generousHarvestPotionIII",
          "name": "丰收丹·三阶",
          "charges": 10,
          "effect": "+20% Chance to Double Items in Farming",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:generousHarvestPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "generousHarvestPotionIV",
          "name": "丰收丹·四阶",
          "charges": 10,
          "effect": "+30% Chance to Double Items in Farming",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:generousHarvestPotion"
        }
      ]
    },
    {
      "id": "barrierIgniterPotion",
      "melvorName": "Barrier Igniter Potion",
      "localName": "屏障燃灼丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 75,
      "xp": 130,
      "baseSeconds": 2,
      "herb": {
        "itemId": "barrentoeHerb",
        "melvorName": "Barrentoe Herb",
        "localName": "荒趾灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "erodingBarrierGem",
        "melvorName": "Eroding Barrier Gem",
        "localName": "蚀障宝石",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "barrierIgniterPotionI",
          "name": "屏障燃灼丹·一阶",
          "charges": 2,
          "effect": "+3% chance to apply Barrier Burn when hitting with a summon attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:barrierIgniterPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "barrierIgniterPotionII",
          "name": "屏障燃灼丹·二阶",
          "charges": 4,
          "effect": "+6% chance to apply Barrier Burn when hitting with a summon attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:barrierIgniterPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "barrierIgniterPotionIII",
          "name": "屏障燃灼丹·三阶",
          "charges": 6,
          "effect": "+9% chance to apply Barrier Burn when hitting with a summon attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:barrierIgniterPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "barrierIgniterPotionIV",
          "name": "屏障燃灼丹·四阶",
          "charges": 8,
          "effect": "+12% chance to apply Barrier Burn when hitting with a summon attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:barrierIgniterPotion"
        }
      ]
    },
    {
      "id": "diamondLuckPotion",
      "melvorName": "Diamond Luck Potion",
      "localName": "钻运丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 85,
      "xp": 160,
      "baseSeconds": 2,
      "herb": {
        "itemId": "barrentoeHerb",
        "melvorName": "Barrentoe Herb",
        "localName": "荒趾灵草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "diamond",
        "melvorName": "Diamond",
        "localName": "金钻",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "diamondLuckPotionI",
          "name": "钻运丹·一阶",
          "charges": 5,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:diamondLuckPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "diamondLuckPotionII",
          "name": "钻运丹·二阶",
          "charges": 10,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:diamondLuckPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "diamondLuckPotionIII",
          "name": "钻运丹·三阶",
          "charges": 15,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:diamondLuckPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "diamondLuckPotionIV",
          "name": "钻运丹·四阶",
          "charges": 25,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:diamondLuckPotion"
        }
      ]
    },
    {
      "id": "crystalSanctionPotion",
      "melvorName": "Crystal Sanction Potion",
      "localName": "晶裁丹",
      "realm": "melvor",
      "dlc": "Atlas of Discovery Expansion",
      "unlockLevel": 85,
      "xp": 180,
      "baseSeconds": 2,
      "herb": {
        "itemId": "barrentoeHerb",
        "melvorName": "Barrentoe Herb",
        "localName": "荒趾灵草",
        "quantity": 3
      },
      "secondary": {
        "itemId": "pureCrystalBindingDust",
        "melvorName": "Pure Crystal Binding Dust",
        "localName": "纯缚晶尘",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "crystalSanctionPotionI",
          "name": "晶裁丹·一阶",
          "charges": 2,
          "effect": "+1% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:crystalSanctionPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "crystalSanctionPotionII",
          "name": "晶裁丹·二阶",
          "charges": 4,
          "effect": "+2% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:crystalSanctionPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "crystalSanctionPotionIII",
          "name": "晶裁丹·三阶",
          "charges": 6,
          "effect": "+3% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:crystalSanctionPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "crystalSanctionPotionIV",
          "name": "晶裁丹·四阶",
          "charges": 10,
          "effect": "+4% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:crystalSanctionPotion"
        }
      ]
    },
    {
      "id": "damageReductionPotion",
      "melvorName": "Damage Reduction Potion",
      "localName": "减伤丹",
      "realm": "melvor",
      "dlc": "Full Version",
      "unlockLevel": 90,
      "xp": 180,
      "baseSeconds": 2,
      "herb": {
        "itemId": "barrentoeHerb",
        "melvorName": "Barrentoe Herb",
        "localName": "荒趾灵草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "largeHorn",
        "melvorName": "Large Horn",
        "localName": "巨角",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "damageReductionPotionI",
          "name": "减伤丹·一阶",
          "charges": 10,
          "effect": "+2% Damage Reduction",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:damageReductionPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "damageReductionPotionII",
          "name": "减伤丹·二阶",
          "charges": 15,
          "effect": "+4% Damage Reduction",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:damageReductionPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "damageReductionPotionIII",
          "name": "减伤丹·三阶",
          "charges": 20,
          "effect": "+6% Damage Reduction",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:damageReductionPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "damageReductionPotionIV",
          "name": "减伤丹·四阶",
          "charges": 30,
          "effect": "+10% Damage Reduction",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:damageReductionPotion"
        }
      ]
    },
    {
      "id": "areaControlPotion",
      "melvorName": "Area Control Potion",
      "localName": "控域丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 100,
      "xp": 365,
      "baseSeconds": 2,
      "herb": {
        "itemId": "snowcressHerb",
        "melvorName": "Snowcress Herb",
        "localName": "雪芥草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "jungleSpores",
        "melvorName": "Jungle Spores",
        "localName": "丛林孢子",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "areaControlPotionI",
          "name": "控域丹·一阶",
          "charges": 10,
          "effect": "+20% Flat Slayer Area Effect Negation",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:areaControlPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "areaControlPotionII",
          "name": "控域丹·二阶",
          "charges": 20,
          "effect": "+30% Flat Slayer Area Effect Negation",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:areaControlPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "areaControlPotionIII",
          "name": "控域丹·三阶",
          "charges": 35,
          "effect": "+40% Flat Slayer Area Effect Negation",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:areaControlPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "areaControlPotionIV",
          "name": "控域丹·四阶",
          "charges": 50,
          "effect": "+50% Flat Slayer Area Effect Negation",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:areaControlPotion"
        }
      ]
    },
    {
      "id": "alchemicPracticePotion",
      "melvorName": "Alchemic Practice Potion",
      "localName": "炼丹熟习丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 100,
      "xp": 297,
      "baseSeconds": 2,
      "herb": {
        "itemId": "snowcressHerb",
        "melvorName": "Snowcress Herb",
        "localName": "雪芥草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "pumpkin",
        "melvorName": "Pumpkin",
        "localName": "南瓜",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "alchemicPracticePotionI",
          "name": "炼丹熟习丹·一阶",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Herblore",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:alchemicPracticePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "alchemicPracticePotionII",
          "name": "炼丹熟习丹·二阶",
          "charges": 15,
          "effect": "+15% Chance to Double Items in Herblore",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:alchemicPracticePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "alchemicPracticePotionIII",
          "name": "炼丹熟习丹·三阶",
          "charges": 20,
          "effect": "+20% Chance to Double Items in Herblore",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:alchemicPracticePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "alchemicPracticePotionIV",
          "name": "炼丹熟习丹·四阶",
          "charges": 30,
          "effect": "+25% Chance to Double Items in Herblore",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:alchemicPracticePotion"
        }
      ]
    },
    {
      "id": "adaptiveDefencePotion",
      "melvorName": "Adaptive Defence Potion",
      "localName": "应变防御丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 102,
      "xp": 394,
      "baseSeconds": 2,
      "herb": {
        "itemId": "snowcressHerb",
        "melvorName": "Snowcress Herb",
        "localName": "雪芥草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "staticJellyfish",
        "melvorName": "Static Jellyfish",
        "localName": "静电水母",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "adaptiveDefencePotionI",
          "name": "应变防御丹·一阶",
          "charges": 20,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:adaptiveDefencePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "adaptiveDefencePotionII",
          "name": "应变防御丹·二阶",
          "charges": 35,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:adaptiveDefencePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "adaptiveDefencePotionIII",
          "name": "应变防御丹·三阶",
          "charges": 50,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:adaptiveDefencePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "adaptiveDefencePotionIV",
          "name": "应变防御丹·四阶",
          "charges": 75,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:adaptiveDefencePotion"
        }
      ]
    },
    {
      "id": "gemDetectorPotion",
      "melvorName": "Gem Detector Potion",
      "localName": "寻宝石丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 102,
      "xp": 313,
      "baseSeconds": 2,
      "herb": {
        "itemId": "snowcressHerb",
        "melvorName": "Snowcress Herb",
        "localName": "雪芥草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "onyx",
        "melvorName": "Onyx",
        "localName": "墨曜玉",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "gemDetectorPotionI",
          "name": "寻宝石丹·一阶",
          "charges": 10,
          "effect": "+2% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:gemDetectorPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "gemDetectorPotionII",
          "name": "寻宝石丹·二阶",
          "charges": 20,
          "effect": "+4% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:gemDetectorPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "gemDetectorPotionIII",
          "name": "寻宝石丹·三阶",
          "charges": 30,
          "effect": "+7% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:gemDetectorPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "gemDetectorPotionIV",
          "name": "寻宝石丹·四阶",
          "charges": 40,
          "effect": "+10% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:gemDetectorPotion"
        }
      ]
    },
    {
      "id": "slayerBountyPotion",
      "melvorName": "Slayer Bounty Potion",
      "localName": "猎妖赏金丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 105,
      "xp": 428,
      "baseSeconds": 2,
      "herb": {
        "itemId": "bitterlymeHerb",
        "melvorName": "Bitterlyme Herb",
        "localName": "苦莱姆草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "bitterlymeSeeds",
        "melvorName": "Bitterlyme Seeds",
        "localName": "苦莱姆种子",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "slayerBountyPotionI",
          "name": "猎妖赏金丹·一阶",
          "charges": 10,
          "effect": "+10% Global Slayer Coins (except Item Sales) and +10% chance for a Slayer Task kill to count as 2 kills.",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:slayerBountyPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "slayerBountyPotionII",
          "name": "猎妖赏金丹·二阶",
          "charges": 15,
          "effect": "+15% Global Slayer Coins (except Item Sales) and +15% chance for a Slayer Task kill to count as 2 kills.",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:slayerBountyPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "slayerBountyPotionIII",
          "name": "猎妖赏金丹·三阶",
          "charges": 20,
          "effect": "+20% Global Slayer Coins (except Item Sales) and +20% chance for a Slayer Task kill to count as 2 kills.",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:slayerBountyPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "slayerBountyPotionIV",
          "name": "猎妖赏金丹·四阶",
          "charges": 30,
          "effect": "+25% Global Slayer Coins (except Item Sales) and +25% chance for a Slayer Task kill to count as 2 kills.",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:slayerBountyPotion"
        }
      ]
    },
    {
      "id": "multicookerPotion",
      "melvorName": "Multicooker Potion",
      "localName": "复烹丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 105,
      "xp": 329,
      "baseSeconds": 2,
      "herb": {
        "itemId": "bitterlymeHerb",
        "melvorName": "Bitterlyme Herb",
        "localName": "苦莱姆草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "ash",
        "melvorName": "Ash",
        "localName": "灰烬",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "multicookerPotionI",
          "name": "复烹丹·一阶",
          "charges": 10,
          "effect": "-10% Passive Cook Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:multicookerPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "multicookerPotionII",
          "name": "复烹丹·二阶",
          "charges": 20,
          "effect": "-15% Passive Cook Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:multicookerPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "multicookerPotionIII",
          "name": "复烹丹·三阶",
          "charges": 30,
          "effect": "-25% Passive Cook Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:multicookerPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "multicookerPotionIV",
          "name": "复烹丹·四阶",
          "charges": 50,
          "effect": "-40% Passive Cook Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:multicookerPotion"
        }
      ]
    },
    {
      "id": "holyBulwarkPotion",
      "melvorName": "Holy Bulwark Potion",
      "localName": "圣壁丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 108,
      "xp": 457,
      "baseSeconds": 2,
      "herb": {
        "itemId": "bitterlymeHerb",
        "melvorName": "Bitterlyme Herb",
        "localName": "苦莱姆草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "magicBones",
        "melvorName": "Magic Bones",
        "localName": "魔骨",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "holyBulwarkPotionI",
          "name": "圣壁丹·一阶",
          "charges": 10,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:holyBulwarkPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "holyBulwarkPotionII",
          "name": "圣壁丹·二阶",
          "charges": 15,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:holyBulwarkPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "holyBulwarkPotionIII",
          "name": "圣壁丹·三阶",
          "charges": 20,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:holyBulwarkPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "holyBulwarkPotionIV",
          "name": "圣壁丹·四阶",
          "charges": 30,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:holyBulwarkPotion"
        }
      ]
    },
    {
      "id": "starSeekerPotion",
      "melvorName": "Star Seeker Potion",
      "localName": "寻星丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 108,
      "xp": 340,
      "baseSeconds": 2,
      "herb": {
        "itemId": "bitterlymeHerb",
        "melvorName": "Bitterlyme Herb",
        "localName": "苦莱姆草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "meteoriteOre",
        "melvorName": "Meteorite Ore",
        "localName": "陨铁矿",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "starSeekerPotionI",
          "name": "寻星丹·一阶",
          "charges": 15,
          "effect": "+1% chance to gain Golden Stardust in Astrology",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:starSeekerPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "starSeekerPotionII",
          "name": "寻星丹·二阶",
          "charges": 25,
          "effect": "+2% chance to gain Golden Stardust in Astrology",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:starSeekerPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "starSeekerPotionIII",
          "name": "寻星丹·三阶",
          "charges": 35,
          "effect": "+3% chance to gain Golden Stardust in Astrology",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:starSeekerPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "starSeekerPotionIV",
          "name": "寻星丹·四阶",
          "charges": 50,
          "effect": "+5% chance to gain Golden Stardust in Astrology",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:starSeekerPotion"
        }
      ]
    },
    {
      "id": "trapsPotion",
      "melvorName": "Traps Potion",
      "localName": "陷阱丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 110,
      "xp": 369,
      "baseSeconds": 2,
      "herb": {
        "itemId": "moonwortHerb",
        "melvorName": "Moonwort Herb",
        "localName": "月苔草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "elderwoodLogs",
        "melvorName": "Elderwood Logs",
        "localName": "古木原木",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "trapsPotionI",
          "name": "陷阱丹·一阶",
          "charges": 5,
          "effect": "+2% Agility Skill XP from Obstacles that contain a negative modifier and +2% Agility Mastery XP from Obstacles that contain a negative modifier and +20% GP from Agility Obstacles that contain a negative modifier",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:trapsPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "trapsPotionII",
          "name": "陷阱丹·二阶",
          "charges": 10,
          "effect": "+3% Agility Skill XP from Obstacles that contain a negative modifier and +3% Agility Mastery XP from Obstacles that contain a negative modifier and +30% GP from Agility Obstacles that contain a negative modifier",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:trapsPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "trapsPotionIII",
          "name": "陷阱丹·三阶",
          "charges": 15,
          "effect": "+4% Agility Skill XP from Obstacles that contain a negative modifier and +4% Agility Mastery XP from Obstacles that contain a negative modifier and +40% GP from Agility Obstacles that contain a negative modifier",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:trapsPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "trapsPotionIV",
          "name": "陷阱丹·四阶",
          "charges": 20,
          "effect": "+5% Agility Skill XP from Obstacles that contain a negative modifier and +5% Agility Mastery XP from Obstacles that contain a negative modifier and +50% GP from Agility Obstacles that contain a negative modifier",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:trapsPotion"
        }
      ]
    },
    {
      "id": "adaptiveAccuracyPotion",
      "melvorName": "Adaptive Accuracy Potion",
      "localName": "应变精准丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 110,
      "xp": 493,
      "baseSeconds": 2,
      "herb": {
        "itemId": "moonwortHerb",
        "melvorName": "Moonwort Herb",
        "localName": "月苔草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "infernalBones",
        "melvorName": "Infernal Bones",
        "localName": "炼狱骨",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "adaptiveAccuracyPotionI",
          "name": "应变精准丹·一阶",
          "charges": 20,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "adaptiveAccuracyPotionII",
          "name": "应变精准丹·二阶",
          "charges": 35,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "adaptiveAccuracyPotionIII",
          "name": "应变精准丹·三阶",
          "charges": 50,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "adaptiveAccuracyPotionIV",
          "name": "应变精准丹·四阶",
          "charges": 75,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion"
        }
      ]
    },
    {
      "id": "reaperPotion",
      "melvorName": "Reaper Potion",
      "localName": "收割丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 112,
      "xp": 523,
      "baseSeconds": 2,
      "herb": {
        "itemId": "moonwortHerb",
        "melvorName": "Moonwort Herb",
        "localName": "月苔草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "rawGhostFish",
        "melvorName": "Raw Ghost Fish",
        "localName": "生幽灵鱼",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "reaperPotionI",
          "name": "收割丹·一阶",
          "charges": 15,
          "effect": "+30% Bleed lifesteal, +30% Burn lifesteal, and +30% Poison lifesteal",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:reaperPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "reaperPotionII",
          "name": "收割丹·二阶",
          "charges": 25,
          "effect": "+40% Bleed lifesteal, +40% Burn lifesteal, and +40% Poison lifesteal",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:reaperPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "reaperPotionIII",
          "name": "收割丹·三阶",
          "charges": 35,
          "effect": "+50% Bleed lifesteal, +50% Burn lifesteal, and +50% Poison lifesteal",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:reaperPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "reaperPotionIV",
          "name": "收割丹·四阶",
          "charges": 50,
          "effect": "+75% Bleed lifesteal, +75% Burn lifesteal, and +75% Poison lifesteal",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:reaperPotion"
        }
      ]
    },
    {
      "id": "blacksmithPotion",
      "melvorName": "Blacksmith Potion",
      "localName": "锻匠丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 112,
      "xp": 397,
      "baseSeconds": 2,
      "herb": {
        "itemId": "moonwortHerb",
        "melvorName": "Moonwort Herb",
        "localName": "月苔草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "iridiumBar",
        "melvorName": "Iridium Bar",
        "localName": "铱金锭",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "blacksmithPotionI",
          "name": "锻匠丹·一阶",
          "charges": 15,
          "effect": "+5% Chance to Double Items in Smithing",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:blacksmithPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "blacksmithPotionII",
          "name": "锻匠丹·二阶",
          "charges": 25,
          "effect": "+10% Chance to Double Items in Smithing",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:blacksmithPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "blacksmithPotionIII",
          "name": "锻匠丹·三阶",
          "charges": 35,
          "effect": "+15% Chance to Double Items in Smithing",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:blacksmithPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "blacksmithPotionIV",
          "name": "锻匠丹·四阶",
          "charges": 50,
          "effect": "+20% Chance to Double Items in Smithing",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:blacksmithPotion"
        }
      ]
    },
    {
      "id": "enkindledYieldsPotion",
      "melvorName": "Enkindled Yields Potion",
      "localName": "引火丰产丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 115,
      "xp": 432,
      "baseSeconds": 2,
      "herb": {
        "itemId": "wurmtayleHerb",
        "melvorName": "Wurmtayle Herb",
        "localName": "虫尾草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "charcoal",
        "melvorName": "Charcoal",
        "localName": "木炭",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "enkindledYieldsPotionI",
          "name": "引火丰产丹·一阶",
          "charges": 15,
          "effect": "+10% Chance to Double Items in Firemaking",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:enkindledYieldsPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "enkindledYieldsPotionII",
          "name": "引火丰产丹·二阶",
          "charges": 25,
          "effect": "+15% Chance to Double Items in Firemaking",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:enkindledYieldsPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "enkindledYieldsPotionIII",
          "name": "引火丰产丹·三阶",
          "charges": 35,
          "effect": "+20% Chance to Double Items in Firemaking",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:enkindledYieldsPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "enkindledYieldsPotionIV",
          "name": "引火丰产丹·四阶",
          "charges": 50,
          "effect": "+25% Chance to Double Items in Firemaking",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:enkindledYieldsPotion"
        }
      ]
    },
    {
      "id": "penetrationPotion",
      "melvorName": "Penetration Potion",
      "localName": "穿透丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 115,
      "xp": 561,
      "baseSeconds": 2,
      "herb": {
        "itemId": "wurmtayleHerb",
        "melvorName": "Wurmtayle Herb",
        "localName": "虫尾草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "ectoplasm",
        "melvorName": "Ectoplasm",
        "localName": "灵质",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "penetrationPotionI",
          "name": "穿透丹·一阶",
          "charges": 10,
          "effect": "Gives the Enemy: -2% Damage Reduction",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:penetrationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "penetrationPotionII",
          "name": "穿透丹·二阶",
          "charges": 15,
          "effect": "Gives the Enemy: -4% Damage Reduction",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:penetrationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "penetrationPotionIII",
          "name": "穿透丹·三阶",
          "charges": 20,
          "effect": "Gives the Enemy: -6% Damage Reduction",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:penetrationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "penetrationPotionIV",
          "name": "穿透丹·四阶",
          "charges": 25,
          "effect": "Gives the Enemy: -8% Damage Reduction",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:penetrationPotion"
        }
      ]
    },
    {
      "id": "altMagicPotion",
      "melvorName": "Alt. Magic Potion",
      "localName": "异术丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 118,
      "xp": 477,
      "baseSeconds": 2,
      "herb": {
        "itemId": "wurmtayleHerb",
        "melvorName": "Wurmtayle Herb",
        "localName": "虫尾草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "soulCharm",
        "melvorName": "Soul Rune",
        "localName": "魂印符",
        "quantity": 5
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "altMagicPotionI",
          "name": "异术丹·一阶",
          "charges": 15,
          "effect": "-5% Magic Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:altMagicPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "altMagicPotionII",
          "name": "异术丹·二阶",
          "charges": 25,
          "effect": "-10% Magic Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:altMagicPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "altMagicPotionIII",
          "name": "异术丹·三阶",
          "charges": 35,
          "effect": "-15% Magic Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:altMagicPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "altMagicPotionIV",
          "name": "异术丹·四阶",
          "charges": 50,
          "effect": "-20% Magic Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:altMagicPotion"
        }
      ]
    },
    {
      "id": "criticalStrikePotion",
      "melvorName": "Critical Strike Potion",
      "localName": "会心丹",
      "realm": "melvor",
      "dlc": "Throne of the Herald Expansion",
      "unlockLevel": 118,
      "xp": 594,
      "baseSeconds": 2,
      "herb": {
        "itemId": "wurmtayleHerb",
        "melvorName": "Wurmtayle Herb",
        "localName": "虫尾草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "zephyte",
        "melvorName": "Zephyte",
        "localName": "风辉石",
        "quantity": 1
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "criticalStrikePotionI",
          "name": "会心丹·一阶",
          "charges": 10,
          "effect": "+5% Melee critical hit chance, +5% Ranged critical hit chance, and +5% Magic critical hit chance",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:criticalStrikePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "criticalStrikePotionII",
          "name": "会心丹·二阶",
          "charges": 15,
          "effect": "+10% Melee critical hit chance, +10% Ranged critical hit chance, and +10% Magic critical hit chance",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:criticalStrikePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "criticalStrikePotionIII",
          "name": "会心丹·三阶",
          "charges": 25,
          "effect": "+15% Melee critical hit chance, +15% Ranged critical hit chance, and +15% Magic critical hit chance",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:criticalStrikePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "criticalStrikePotionIV",
          "name": "会心丹·四阶",
          "charges": 35,
          "effect": "+20% Melee critical hit chance, +20% Ranged critical hit chance, and +20% Magic critical hit chance",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:criticalStrikePotion"
        }
      ]
    },
    {
      "id": "harvesterSPotion",
      "melvorName": "Harvester's Potion",
      "localName": "采收丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 1,
      "xp": 1340,
      "baseSeconds": 2,
      "herb": {
        "itemId": "gloomsproutHerb",
        "melvorName": "Gloomsprout Herb",
        "localName": "幽芽草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "abyssalStone",
        "melvorName": "Abyssal Stone",
        "localName": "深渊石",
        "quantity": 5
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "harvesterSPotionI",
          "name": "采收丹·一阶",
          "charges": 1,
          "effect": "-2% Harvesting Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:harvesterSPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "harvesterSPotionII",
          "name": "采收丹·二阶",
          "charges": 2,
          "effect": "-4% Harvesting Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:harvesterSPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "harvesterSPotionIII",
          "name": "采收丹·三阶",
          "charges": 3,
          "effect": "-6% Harvesting Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:harvesterSPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "harvesterSPotionIV",
          "name": "采收丹·四阶",
          "charges": 4,
          "effect": "-8% Harvesting Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:harvesterSPotion"
        }
      ]
    },
    {
      "id": "corruptedFighterPotion",
      "melvorName": "Corrupted Fighter Potion",
      "localName": "腐化斗士丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 4,
      "xp": 1718,
      "baseSeconds": 2,
      "herb": {
        "itemId": "gloomsproutHerb",
        "melvorName": "Gloomsprout Herb",
        "localName": "幽芽草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "crimsonBiter",
        "melvorName": "Crimson Biter",
        "localName": "绯咬鱼",
        "quantity": 5
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "corruptedFighterPotionI",
          "name": "腐化斗士丹·一阶",
          "charges": 1,
          "effect": "+2% Corruption Abyssal XP",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:corruptedFighterPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "corruptedFighterPotionII",
          "name": "腐化斗士丹·二阶",
          "charges": 2,
          "effect": "+4% Corruption Abyssal XP",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:corruptedFighterPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "corruptedFighterPotionIII",
          "name": "腐化斗士丹·三阶",
          "charges": 3,
          "effect": "+6% Corruption Abyssal XP",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:corruptedFighterPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "corruptedFighterPotionIV",
          "name": "腐化斗士丹·四阶",
          "charges": 4,
          "effect": "+8% Corruption Abyssal XP",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:corruptedFighterPotion"
        }
      ]
    },
    {
      "id": "piecesFinderPotion",
      "melvorName": "Pieces Finder Potion",
      "localName": "残片搜寻丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 7,
      "xp": 2226,
      "baseSeconds": 2,
      "herb": {
        "itemId": "nightgleamHerb",
        "melvorName": "Nightgleam Herb",
        "localName": "夜辉草",
        "quantity": 1
      },
      "secondary": {
        "itemId": "nightopal",
        "melvorName": "Nightopal",
        "localName": "夜欧泊",
        "quantity": 2
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "piecesFinderPotionI",
          "name": "残片搜寻丹·一阶",
          "charges": 1,
          "effect": "+5% AP from Combat",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:piecesFinderPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "piecesFinderPotionII",
          "name": "残片搜寻丹·二阶",
          "charges": 2,
          "effect": "+10% AP from Combat",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:piecesFinderPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "piecesFinderPotionIII",
          "name": "残片搜寻丹·三阶",
          "charges": 3,
          "effect": "+15% AP from Combat",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:piecesFinderPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "piecesFinderPotionIV",
          "name": "残片搜寻丹·四阶",
          "charges": 4,
          "effect": "+20% AP from Combat",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:piecesFinderPotion"
        }
      ]
    },
    {
      "id": "lacerationPotion",
      "melvorName": "Laceration Potion",
      "localName": "撕裂丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 10,
      "xp": 1942,
      "baseSeconds": 2,
      "herb": {
        "itemId": "nightgleamHerb",
        "melvorName": "Nightgleam Herb",
        "localName": "夜辉草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "abyssalBatwing",
        "melvorName": "Abyssal Batwing",
        "localName": "深渊蝠翼",
        "quantity": 5
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "lacerationPotionI",
          "name": "撕裂丹·一阶",
          "charges": 1,
          "effect": "+10% chance to apply Laceration when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:lacerationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "lacerationPotionII",
          "name": "撕裂丹·二阶",
          "charges": 2,
          "effect": "+20% chance to apply Laceration when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:lacerationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "lacerationPotionIII",
          "name": "撕裂丹·三阶",
          "charges": 3,
          "effect": "+30% chance to apply Laceration when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:lacerationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "lacerationPotionIV",
          "name": "撕裂丹·四阶",
          "charges": 4,
          "effect": "+40% chance to apply Laceration when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:lacerationPotion"
        }
      ]
    },
    {
      "id": "gloomgrowthPotion",
      "melvorName": "Gloomgrowth Potion",
      "localName": "幽生丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 13,
      "xp": 2525,
      "baseSeconds": 2,
      "herb": {
        "itemId": "blightblossomHerb",
        "melvorName": "Blightblossom Herb",
        "localName": "凋花草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "gloomResin",
        "melvorName": "Gloom Resin",
        "localName": "幽暗树脂",
        "quantity": 10
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "gloomgrowthPotionI",
          "name": "幽生丹·一阶",
          "charges": 1,
          "effect": "+20% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:gloomgrowthPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "gloomgrowthPotionII",
          "name": "幽生丹·二阶",
          "charges": 2,
          "effect": "+25% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:gloomgrowthPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "gloomgrowthPotionIII",
          "name": "幽生丹·三阶",
          "charges": 3,
          "effect": "+30% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:gloomgrowthPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "gloomgrowthPotionIV",
          "name": "幽生丹·四阶",
          "charges": 4,
          "effect": "+40% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:gloomgrowthPotion"
        }
      ]
    },
    {
      "id": "blightedTouchPotion",
      "melvorName": "Blighted Touch Potion",
      "localName": "凋触丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 16,
      "xp": 2815,
      "baseSeconds": 2,
      "herb": {
        "itemId": "blightblossomHerb",
        "melvorName": "Blightblossom Herb",
        "localName": "凋花草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "blightPowder",
        "melvorName": "Blight Powder",
        "localName": "凋零粉",
        "quantity": 10
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "blightedTouchPotionI",
          "name": "凋触丹·一阶",
          "charges": 1,
          "effect": "+2% chance to ignore Blight and +2% chance to apply Blight when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:blightedTouchPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "blightedTouchPotionII",
          "name": "凋触丹·二阶",
          "charges": 2,
          "effect": "+4% chance to ignore Blight and +4% chance to apply Blight when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:blightedTouchPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "blightedTouchPotionIII",
          "name": "凋触丹·三阶",
          "charges": 3,
          "effect": "+6% chance to ignore Blight and +6% chance to apply Blight when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:blightedTouchPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "blightedTouchPotionIV",
          "name": "凋触丹·四阶",
          "charges": 4,
          "effect": "+8% chance to ignore Blight and +8% chance to apply Blight when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:blightedTouchPotion"
        }
      ]
    },
    {
      "id": "abyssalMinerPotion",
      "melvorName": "Abyssal Miner Potion",
      "localName": "深渊采矿丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 19,
      "xp": 3669,
      "baseSeconds": 2,
      "herb": {
        "itemId": "shadefrondHerb",
        "melvorName": "Shadefrond Herb",
        "localName": "影叶草",
        "quantity": 2
      },
      "secondary": {
        "itemId": "azurianFragment",
        "melvorName": "Azurian Fragment",
        "localName": "湛蓝碎片",
        "quantity": 10
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "abyssalMinerPotionI",
          "name": "深渊采矿丹·一阶",
          "charges": 1,
          "effect": "+0.10% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:abyssalMinerPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "abyssalMinerPotionII",
          "name": "深渊采矿丹·二阶",
          "charges": 2,
          "effect": "+0.20% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:abyssalMinerPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "abyssalMinerPotionIII",
          "name": "深渊采矿丹·三阶",
          "charges": 3,
          "effect": "+0.30% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:abyssalMinerPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "abyssalMinerPotionIV",
          "name": "深渊采矿丹·四阶",
          "charges": 4,
          "effect": "+0.40% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:abyssalMinerPotion"
        }
      ]
    },
    {
      "id": "shadeveilPotion",
      "melvorName": "Shadeveil Potion",
      "localName": "影幕丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 22,
      "xp": 2675,
      "baseSeconds": 2,
      "herb": {
        "itemId": "shadefrondHerb",
        "melvorName": "Shadefrond Herb",
        "localName": "影叶草",
        "quantity": 4
      },
      "secondary": {
        "itemId": "rawSteamswimmer",
        "melvorName": "Raw Steamswimmer",
        "localName": "生汽游鱼",
        "quantity": 20
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "shadeveilPotionI",
          "name": "影幕丹·一阶",
          "charges": 1,
          "effect": "+15% Global critical hit chance and +15% chance to apply Shadeveil when critically hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:shadeveilPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "shadeveilPotionII",
          "name": "影幕丹·二阶",
          "charges": 2,
          "effect": "+15% Global critical hit chance and +25% chance to apply Shadeveil when critically hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:shadeveilPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "shadeveilPotionIII",
          "name": "影幕丹·三阶",
          "charges": 3,
          "effect": "+15% Global critical hit chance and +35% chance to apply Shadeveil when critically hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:shadeveilPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "shadeveilPotionIV",
          "name": "影幕丹·四阶",
          "charges": 4,
          "effect": "+20% Global critical hit chance and +50% chance to apply Shadeveil when critically hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:shadeveilPotion"
        }
      ]
    },
    {
      "id": "abyssalCombinationPotion",
      "melvorName": "Abyssal Combination Potion",
      "localName": "深渊合符丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 25,
      "xp": 3491,
      "baseSeconds": 2,
      "herb": {
        "itemId": "fearmallowHerb",
        "melvorName": "Fearmallow Herb",
        "localName": "惧锦葵",
        "quantity": 4
      },
      "secondary": {
        "itemId": "abyssalEssence",
        "melvorName": "Abyssal Essence",
        "localName": "深渊精粹",
        "quantity": 20
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "abyssalCombinationPotionI",
          "name": "深渊合符丹·一阶",
          "charges": 1,
          "effect": "+5% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:abyssalCombinationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "abyssalCombinationPotionII",
          "name": "深渊合符丹·二阶",
          "charges": 2,
          "effect": "+10% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:abyssalCombinationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "abyssalCombinationPotionIII",
          "name": "深渊合符丹·三阶",
          "charges": 3,
          "effect": "+15% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:abyssalCombinationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "abyssalCombinationPotionIV",
          "name": "深渊合符丹·四阶",
          "charges": 4,
          "effect": "+20% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:abyssalCombinationPotion"
        }
      ]
    },
    {
      "id": "fearPotion",
      "melvorName": "Fear Potion",
      "localName": "恐惧丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 28,
      "xp": 4563,
      "baseSeconds": 2,
      "herb": {
        "itemId": "fearmallowHerb",
        "melvorName": "Fearmallow Herb",
        "localName": "惧锦葵",
        "quantity": 4
      },
      "secondary": {
        "itemId": "petrifiedEye",
        "melvorName": "Petrified Eye",
        "localName": "石化眼",
        "quantity": 20
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "fearPotionI",
          "name": "恐惧丹·一阶",
          "charges": 1,
          "effect": "+5% chance to ignore Fear and +2% chance to apply Fear when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:fearPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "fearPotionII",
          "name": "恐惧丹·二阶",
          "charges": 2,
          "effect": "+10% chance to ignore Fear and +4% chance to apply Fear when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:fearPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "fearPotionIII",
          "name": "恐惧丹·三阶",
          "charges": 3,
          "effect": "+15% chance to ignore Fear and +6% chance to apply Fear when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:fearPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "fearPotionIV",
          "name": "恐惧丹·四阶",
          "charges": 4,
          "effect": "+25% chance to ignore Fear and +8% chance to apply Fear when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:fearPotion"
        }
      ]
    },
    {
      "id": "abyssalConsumablePotion",
      "melvorName": "Abyssal Consumable Potion",
      "localName": "深渊消耗丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 31,
      "xp": 3933,
      "baseSeconds": 2,
      "herb": {
        "itemId": "witherlymeHerb",
        "melvorName": "Witherlyme Herb",
        "localName": "枯莱姆草",
        "quantity": 8
      },
      "secondary": {
        "itemId": "mysticiteFragment",
        "melvorName": "Mysticite Fragment",
        "localName": "秘晶碎片",
        "quantity": 40
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "abyssalConsumablePotionI",
          "name": "深渊消耗丹·一阶",
          "charges": 1,
          "effect": "+3 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:abyssalConsumablePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "abyssalConsumablePotionII",
          "name": "深渊消耗丹·二阶",
          "charges": 2,
          "effect": "+5 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:abyssalConsumablePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "abyssalConsumablePotionIII",
          "name": "深渊消耗丹·三阶",
          "charges": 3,
          "effect": "+8 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:abyssalConsumablePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "abyssalConsumablePotionIV",
          "name": "深渊消耗丹·四阶",
          "charges": 4,
          "effect": "+12 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:abyssalConsumablePotion"
        }
      ]
    },
    {
      "id": "witheringPotion",
      "melvorName": "Withering Potion",
      "localName": "枯萎丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 34,
      "xp": 5148,
      "baseSeconds": 2,
      "herb": {
        "itemId": "witherlymeHerb",
        "melvorName": "Witherlyme Herb",
        "localName": "枯莱姆草",
        "quantity": 8
      },
      "secondary": {
        "itemId": "witheringBones",
        "melvorName": "Withering Bones",
        "localName": "枯萎骨",
        "quantity": 40
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "witheringPotionI",
          "name": "枯萎丹·一阶",
          "charges": 1,
          "effect": "+10% chance to ignore Wither and +10% chance to apply Wither when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:witheringPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "witheringPotionII",
          "name": "枯萎丹·二阶",
          "charges": 2,
          "effect": "+20% chance to ignore Wither and +20% chance to apply Wither when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:witheringPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "witheringPotionIII",
          "name": "枯萎丹·三阶",
          "charges": 3,
          "effect": "+30% chance to ignore Wither and +30% chance to apply Wither when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:witheringPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "witheringPotionIV",
          "name": "枯萎丹·四阶",
          "charges": 4,
          "effect": "+40% chance to ignore Wither and +40% chance to apply Wither when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:witheringPotion"
        }
      ]
    },
    {
      "id": "silentThiefPotion",
      "melvorName": "Silent Thief Potion",
      "localName": "静默窃行丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 37,
      "xp": 6179,
      "baseSeconds": 2,
      "herb": {
        "itemId": "whispertallowHerb",
        "melvorName": "Whispertallow Herb",
        "localName": "低语脂草",
        "quantity": 8
      },
      "secondary": {
        "itemId": "blightedRoots",
        "melvorName": "Blighted Roots",
        "localName": "凋蚀根",
        "quantity": 10
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "silentThiefPotionI",
          "name": "静默窃行丹·一阶",
          "charges": 1,
          "effect": "+50 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:silentThiefPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "silentThiefPotionII",
          "name": "静默窃行丹·二阶",
          "charges": 2,
          "effect": "+60 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:silentThiefPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "silentThiefPotionIII",
          "name": "静默窃行丹·三阶",
          "charges": 3,
          "effect": "+75 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:silentThiefPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "silentThiefPotionIV",
          "name": "静默窃行丹·四阶",
          "charges": 4,
          "effect": "+100 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:silentThiefPotion"
        }
      ]
    },
    {
      "id": "silencePotion",
      "melvorName": "Silence Potion",
      "localName": "沉默丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 40,
      "xp": 9365,
      "baseSeconds": 2,
      "herb": {
        "itemId": "whispertallowHerb",
        "melvorName": "Whispertallow Herb",
        "localName": "低语脂草",
        "quantity": 16
      },
      "secondary": {
        "itemId": "silentsnapScales",
        "melvorName": "Silentsnap Scales",
        "localName": "静咬鳞",
        "quantity": 80
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "silencePotionI",
          "name": "沉默丹·一阶",
          "charges": 1,
          "effect": "+10% chance to ignore Silence and +10% chance to apply Silence when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:silencePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "silencePotionII",
          "name": "沉默丹·二阶",
          "charges": 2,
          "effect": "+20% chance to ignore Silence and +20% chance to apply Silence when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:silencePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "silencePotionIII",
          "name": "沉默丹·三阶",
          "charges": 3,
          "effect": "+30% chance to ignore Silence and +30% chance to apply Silence when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:silencePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "silencePotionIV",
          "name": "沉默丹·四阶",
          "charges": 4,
          "effect": "+40% chance to ignore Silence and +40% chance to apply Silence when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:silencePotion"
        }
      ]
    },
    {
      "id": "echoingLurePotion",
      "melvorName": "Echoing Lure Potion",
      "localName": "回响诱饵丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 43,
      "xp": 5193,
      "baseSeconds": 2,
      "herb": {
        "itemId": "echosnapHerb",
        "melvorName": "Echosnap Herb",
        "localName": "回响草",
        "quantity": 16
      },
      "secondary": {
        "itemId": "rawWhisperfish",
        "melvorName": "Raw Whisperfish",
        "localName": "生低语鱼",
        "quantity": 40
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "echoingLurePotionI",
          "name": "回响诱饵丹·一阶",
          "charges": 1,
          "effect": "+5% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:echoingLurePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "echoingLurePotionII",
          "name": "回响诱饵丹·二阶",
          "charges": 2,
          "effect": "+10% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:echoingLurePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "echoingLurePotionIII",
          "name": "回响诱饵丹·三阶",
          "charges": 3,
          "effect": "+15% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:echoingLurePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "echoingLurePotionIV",
          "name": "回响诱饵丹·四阶",
          "charges": 4,
          "effect": "+20% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:echoingLurePotion"
        }
      ]
    },
    {
      "id": "soulsnapPotion",
      "melvorName": "Soulsnap Potion",
      "localName": "摄魂丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 46,
      "xp": 11740,
      "baseSeconds": 2,
      "herb": {
        "itemId": "echosnapHerb",
        "melvorName": "Echosnap Herb",
        "localName": "回响草",
        "quantity": 16
      },
      "secondary": {
        "itemId": "greaterSoul",
        "melvorName": "Greater Soul",
        "localName": "大魂",
        "quantity": 40
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "soulsnapPotionI",
          "name": "摄魂丹·一阶",
          "charges": 1,
          "effect": "+5% chance to double Soul drops from enemies",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:soulsnapPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "soulsnapPotionII",
          "name": "摄魂丹·二阶",
          "charges": 2,
          "effect": "+10% chance to double Soul drops from enemies",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:soulsnapPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "soulsnapPotionIII",
          "name": "摄魂丹·三阶",
          "charges": 3,
          "effect": "+15% chance to double Soul drops from enemies",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:soulsnapPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "soulsnapPotionIV",
          "name": "摄魂丹·四阶",
          "charges": 4,
          "effect": "+20% chance to double Soul drops from enemies",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:soulsnapPotion"
        }
      ]
    },
    {
      "id": "darkRitualPotion",
      "melvorName": "Dark Ritual Potion",
      "localName": "暗仪丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 49,
      "xp": 12180,
      "baseSeconds": 2,
      "herb": {
        "itemId": "eldrarootHerb",
        "melvorName": "Eldraroot Herb",
        "localName": "长老根草",
        "quantity": 32
      },
      "secondary": {
        "itemId": "obzurianBar",
        "melvorName": "Obzurian Bar",
        "localName": "黑曜锭",
        "quantity": 40
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "darkRitualPotionI",
          "name": "暗仪丹·一阶",
          "charges": 1,
          "effect": "+5% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:darkRitualPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "darkRitualPotionII",
          "name": "暗仪丹·二阶",
          "charges": 2,
          "effect": "+10% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:darkRitualPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "darkRitualPotionIII",
          "name": "暗仪丹·三阶",
          "charges": 3,
          "effect": "+15% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:darkRitualPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "darkRitualPotionIV",
          "name": "暗仪丹·四阶",
          "charges": 4,
          "effect": "+25% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:darkRitualPotion"
        }
      ]
    },
    {
      "id": "eldritchCursePotion",
      "melvorName": "Eldritch Curse Potion",
      "localName": "异咒丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 52,
      "xp": 11570,
      "baseSeconds": 2,
      "herb": {
        "itemId": "eldrarootHerb",
        "melvorName": "Eldraroot Herb",
        "localName": "长老根草",
        "quantity": 32
      },
      "secondary": {
        "itemId": "eldritchTendril",
        "melvorName": "Eldritch Tendril",
        "localName": "异界触须",
        "quantity": 80
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "eldritchCursePotionI",
          "name": "异咒丹·一阶",
          "charges": 1,
          "effect": "+5% chance to ignore Eldritch Curse and +5% chance to apply Eldritch Curse when attacking",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:eldritchCursePotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "eldritchCursePotionII",
          "name": "异咒丹·二阶",
          "charges": 2,
          "effect": "+10% chance to ignore Eldritch Curse and +10% chance to apply Eldritch Curse when attacking",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:eldritchCursePotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "eldritchCursePotionIII",
          "name": "异咒丹·三阶",
          "charges": 3,
          "effect": "+15% chance to ignore Eldritch Curse and +15% chance to apply Eldritch Curse when attacking",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:eldritchCursePotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "eldritchCursePotionIV",
          "name": "异咒丹·四阶",
          "charges": 4,
          "effect": "+20% chance to ignore Eldritch Curse and +20% chance to apply Eldritch Curse when attacking",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:eldritchCursePotion"
        }
      ]
    },
    {
      "id": "voidStabilisationPotion",
      "melvorName": "Void Stabilisation Potion",
      "localName": "虚空稳定丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 55,
      "xp": 10833,
      "baseSeconds": 2,
      "herb": {
        "itemId": "voidbloomHerb",
        "melvorName": "Voidbloom Herb",
        "localName": "虚空花草",
        "quantity": 32
      },
      "secondary": {
        "itemId": "voidEssence",
        "melvorName": "Void Essence",
        "localName": "虚空精粹",
        "quantity": 20
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "voidStabilisationPotionI",
          "name": "虚空稳定丹·一阶",
          "charges": 1,
          "effect": "-5% cost to produce Abyssal Realm Items in Herblore",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:voidStabilisationPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "voidStabilisationPotionII",
          "name": "虚空稳定丹·二阶",
          "charges": 2,
          "effect": "-10% cost to produce Abyssal Realm Items in Herblore",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:voidStabilisationPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "voidStabilisationPotionIII",
          "name": "虚空稳定丹·三阶",
          "charges": 3,
          "effect": "-15% cost to produce Abyssal Realm Items in Herblore",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:voidStabilisationPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "voidStabilisationPotionIV",
          "name": "虚空稳定丹·四阶",
          "charges": 4,
          "effect": "-15% cost to produce Abyssal Realm Items in Herblore and +1 additional quantity of primary resource gained in Herblore for Abyssal Realm only (cannot be doubled)",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:voidStabilisationPotion"
        }
      ]
    },
    {
      "id": "voidburstPotion",
      "melvorName": "Voidburst Potion",
      "localName": "虚爆丹",
      "realm": "abyssal",
      "dlc": "Into the Abyss Expansion",
      "unlockLevel": 58,
      "xp": 12140,
      "baseSeconds": 2,
      "herb": {
        "itemId": "voidbloomHerb",
        "melvorName": "Voidbloom Herb",
        "localName": "虚空花草",
        "quantity": 32
      },
      "secondary": {
        "itemId": "voidEssence",
        "melvorName": "Void Essence",
        "localName": "虚空精粹",
        "quantity": 80
      },
      "tiers": [
        {
          "tier": "I",
          "numericTier": 1,
          "itemId": "voidburstPotionI",
          "name": "虚爆丹·一阶",
          "charges": 1,
          "effect": "+5% chance to ignore Voidburst and +5% chance to apply Voidburst when hitting with an attack",
          "quality": "green",
          "masteryLevel": 1,
          "xpToTier": 0,
          "iconPromptKey": "herblorePotion:voidburstPotion"
        },
        {
          "tier": "II",
          "numericTier": 2,
          "itemId": "voidburstPotionII",
          "name": "虚爆丹·二阶",
          "charges": 2,
          "effect": "+10% chance to ignore Voidburst and +10% chance to apply Voidburst when hitting with an attack",
          "quality": "blue",
          "masteryLevel": 20,
          "xpToTier": 4470,
          "iconPromptKey": "herblorePotion:voidburstPotion"
        },
        {
          "tier": "III",
          "numericTier": 3,
          "itemId": "voidburstPotionIII",
          "name": "虚爆丹·三阶",
          "charges": 3,
          "effect": "+15% chance to ignore Voidburst and +15% chance to apply Voidburst when hitting with an attack",
          "quality": "purple",
          "masteryLevel": 50,
          "xpToTier": 101333,
          "iconPromptKey": "herblorePotion:voidburstPotion"
        },
        {
          "tier": "IV",
          "numericTier": 4,
          "itemId": "voidburstPotionIV",
          "name": "虚爆丹·四阶",
          "charges": 4,
          "effect": "+20% chance to ignore Voidburst and +20% chance to apply Voidburst when hitting with an attack",
          "quality": "orange",
          "masteryLevel": 90,
          "xpToTier": 5346332,
          "iconPromptKey": "herblorePotion:voidburstPotion"
        }
      ]
    }
  ],
  "POTION_ITEMS": [
    {
      "id": "birdNestPotionI",
      "name": "巢羽丹·一阶",
      "melvorName": "Bird Nest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巢羽丹，一阶药瓶",
      "description": "巢羽丹·一阶，充能 50。对标效果：+5% chance to gain Bird Nest in Woodcutting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:birdNestPotion",
      "melvor": {
        "seriesId": "birdNestPotion",
        "name": "Bird Nest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 50,
        "effect": "+5% chance to gain Bird Nest in Woodcutting"
      }
    },
    {
      "id": "birdNestPotionII",
      "name": "巢羽丹·二阶",
      "melvorName": "Bird Nest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巢羽丹，二阶药瓶",
      "description": "巢羽丹·二阶，充能 50。对标效果：+10% chance to gain Bird Nest in Woodcutting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:birdNestPotion",
      "melvor": {
        "seriesId": "birdNestPotion",
        "name": "Bird Nest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 50,
        "effect": "+10% chance to gain Bird Nest in Woodcutting"
      }
    },
    {
      "id": "birdNestPotionIII",
      "name": "巢羽丹·三阶",
      "melvorName": "Bird Nest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 75,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巢羽丹，三阶药瓶",
      "description": "巢羽丹·三阶，充能 75。对标效果：+15% chance to gain Bird Nest in Woodcutting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:birdNestPotion",
      "melvor": {
        "seriesId": "birdNestPotion",
        "name": "Bird Nest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 75,
        "effect": "+15% chance to gain Bird Nest in Woodcutting"
      }
    },
    {
      "id": "birdNestPotionIV",
      "name": "巢羽丹·四阶",
      "melvorName": "Bird Nest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 100,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巢羽丹，四阶药瓶",
      "description": "巢羽丹·四阶，充能 100。对标效果：+30% chance to gain Bird Nest in Woodcutting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:birdNestPotion",
      "melvor": {
        "seriesId": "birdNestPotion",
        "name": "Bird Nest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 100,
        "effect": "+30% chance to gain Bird Nest in Woodcutting"
      }
    },
    {
      "id": "meleeAccuracyPotionI",
      "name": "近战精准丹·一阶",
      "melvorName": "Melee Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战精准丹，一阶药瓶",
      "description": "近战精准丹·一阶，充能 20。对标效果：+8% Melee Accuracy Rating。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeAccuracyPotion",
      "melvor": {
        "seriesId": "meleeAccuracyPotion",
        "name": "Melee Accuracy Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+8% Melee Accuracy Rating"
      }
    },
    {
      "id": "meleeAccuracyPotionII",
      "name": "近战精准丹·二阶",
      "melvorName": "Melee Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战精准丹，二阶药瓶",
      "description": "近战精准丹·二阶，充能 20。对标效果：+12% Melee Accuracy Rating。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeAccuracyPotion",
      "melvor": {
        "seriesId": "meleeAccuracyPotion",
        "name": "Melee Accuracy Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 20,
        "effect": "+12% Melee Accuracy Rating"
      }
    },
    {
      "id": "meleeAccuracyPotionIII",
      "name": "近战精准丹·三阶",
      "melvorName": "Melee Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战精准丹，三阶药瓶",
      "description": "近战精准丹·三阶，充能 20。对标效果：+15% Melee Accuracy Rating。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeAccuracyPotion",
      "melvor": {
        "seriesId": "meleeAccuracyPotion",
        "name": "Melee Accuracy Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 20,
        "effect": "+15% Melee Accuracy Rating"
      }
    },
    {
      "id": "meleeAccuracyPotionIV",
      "name": "近战精准丹·四阶",
      "melvorName": "Melee Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战精准丹，四阶药瓶",
      "description": "近战精准丹·四阶，充能 30。对标效果：+25% Melee Accuracy Rating。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeAccuracyPotion",
      "melvor": {
        "seriesId": "meleeAccuracyPotion",
        "name": "Melee Accuracy Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 30,
        "effect": "+25% Melee Accuracy Rating"
      }
    },
    {
      "id": "meleeEvasionPotionI",
      "name": "近战闪避丹·一阶",
      "melvorName": "Melee Evasion Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战闪避丹，一阶药瓶",
      "description": "近战闪避丹·一阶，充能 30。对标效果：+8% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeEvasionPotion",
      "melvor": {
        "seriesId": "meleeEvasionPotion",
        "name": "Melee Evasion Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 30,
        "effect": "+8% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize"
      }
    },
    {
      "id": "meleeEvasionPotionII",
      "name": "近战闪避丹·二阶",
      "melvorName": "Melee Evasion Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战闪避丹，二阶药瓶",
      "description": "近战闪避丹·二阶，充能 30。对标效果：+12% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeEvasionPotion",
      "melvor": {
        "seriesId": "meleeEvasionPotion",
        "name": "Melee Evasion Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+12% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize"
      }
    },
    {
      "id": "meleeEvasionPotionIII",
      "name": "近战闪避丹·三阶",
      "melvorName": "Melee Evasion Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战闪避丹，三阶药瓶",
      "description": "近战闪避丹·三阶，充能 30。对标效果：+15% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeEvasionPotion",
      "melvor": {
        "seriesId": "meleeEvasionPotion",
        "name": "Melee Evasion Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 30,
        "effect": "+15% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize"
      }
    },
    {
      "id": "meleeEvasionPotionIV",
      "name": "近战闪避丹·四阶",
      "melvorName": "Melee Evasion Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战闪避丹，四阶药瓶",
      "description": "近战闪避丹·四阶，充能 40。对标效果：+25% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeEvasionPotion",
      "melvor": {
        "seriesId": "meleeEvasionPotion",
        "name": "Melee Evasion Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 40,
        "effect": "+25% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize"
      }
    },
    {
      "id": "barrierTouchPotionI",
      "name": "屏障触媒丹·一阶",
      "melvorName": "Barrier Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障触媒丹，一阶药瓶",
      "description": "屏障触媒丹·一阶，充能 2。对标效果：+10 Flat Barrier damage added to Summon Familiar。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierTouchPotion",
      "melvor": {
        "seriesId": "barrierTouchPotion",
        "name": "Barrier Touch Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 2,
        "effect": "+10 Flat Barrier damage added to Summon Familiar"
      }
    },
    {
      "id": "barrierTouchPotionII",
      "name": "屏障触媒丹·二阶",
      "melvorName": "Barrier Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障触媒丹，二阶药瓶",
      "description": "屏障触媒丹·二阶，充能 4。对标效果：+20 Flat Barrier damage added to Summon Familiar。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierTouchPotion",
      "melvor": {
        "seriesId": "barrierTouchPotion",
        "name": "Barrier Touch Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 4,
        "effect": "+20 Flat Barrier damage added to Summon Familiar"
      }
    },
    {
      "id": "barrierTouchPotionIII",
      "name": "屏障触媒丹·三阶",
      "melvorName": "Barrier Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 6,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障触媒丹，三阶药瓶",
      "description": "屏障触媒丹·三阶，充能 6。对标效果：+30 Flat Barrier damage added to Summon Familiar。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierTouchPotion",
      "melvor": {
        "seriesId": "barrierTouchPotion",
        "name": "Barrier Touch Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 6,
        "effect": "+30 Flat Barrier damage added to Summon Familiar"
      }
    },
    {
      "id": "barrierTouchPotionIV",
      "name": "屏障触媒丹·四阶",
      "melvorName": "Barrier Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 8,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障触媒丹，四阶药瓶",
      "description": "屏障触媒丹·四阶，充能 8。对标效果：+40 Flat Barrier damage added to Summon Familiar。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierTouchPotion",
      "melvor": {
        "seriesId": "barrierTouchPotion",
        "name": "Barrier Touch Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 8,
        "effect": "+40 Flat Barrier damage added to Summon Familiar"
      }
    },
    {
      "id": "rangedAssistancePotionI",
      "name": "远程助攻丹·一阶",
      "melvorName": "Ranged Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程助攻丹，一阶药瓶",
      "description": "远程助攻丹·一阶，充能 15。对标效果：+4% Ranged Accuracy Rating, +4% Ranged Evasion, and +10% chance to ignore Poison。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedAssistancePotion",
      "melvor": {
        "seriesId": "rangedAssistancePotion",
        "name": "Ranged Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+4% Ranged Accuracy Rating, +4% Ranged Evasion, and +10% chance to ignore Poison"
      }
    },
    {
      "id": "rangedAssistancePotionII",
      "name": "远程助攻丹·二阶",
      "melvorName": "Ranged Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程助攻丹，二阶药瓶",
      "description": "远程助攻丹·二阶，充能 15。对标效果：+8% Ranged Accuracy Rating, +8% Ranged Evasion, and +10% chance to ignore Poison。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedAssistancePotion",
      "melvor": {
        "seriesId": "rangedAssistancePotion",
        "name": "Ranged Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 15,
        "effect": "+8% Ranged Accuracy Rating, +8% Ranged Evasion, and +10% chance to ignore Poison"
      }
    },
    {
      "id": "rangedAssistancePotionIII",
      "name": "远程助攻丹·三阶",
      "melvorName": "Ranged Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程助攻丹，三阶药瓶",
      "description": "远程助攻丹·三阶，充能 15。对标效果：+12% Ranged Accuracy Rating, +12% Ranged Evasion, and +10% chance to ignore Poison。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedAssistancePotion",
      "melvor": {
        "seriesId": "rangedAssistancePotion",
        "name": "Ranged Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "+12% Ranged Accuracy Rating, +12% Ranged Evasion, and +10% chance to ignore Poison"
      }
    },
    {
      "id": "rangedAssistancePotionIV",
      "name": "远程助攻丹·四阶",
      "melvorName": "Ranged Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程助攻丹，四阶药瓶",
      "description": "远程助攻丹·四阶，充能 20。对标效果：+20% Ranged Accuracy Rating, +20% Ranged Evasion, and +10% chance to ignore Poison。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedAssistancePotion",
      "melvor": {
        "seriesId": "rangedAssistancePotion",
        "name": "Ranged Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 20,
        "effect": "+20% Ranged Accuracy Rating, +20% Ranged Evasion, and +10% chance to ignore Poison"
      }
    },
    {
      "id": "hinderPotionI",
      "name": "迟滞丹·一阶",
      "melvorName": "Hinder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "迟滞丹，一阶药瓶",
      "description": "迟滞丹·一阶，充能 5。对标效果：Inflict a slow that increases the target's attack interval by 3% when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:hinderPotion",
      "melvor": {
        "seriesId": "hinderPotion",
        "name": "Hinder Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "Inflict a slow that increases the target's attack interval by 3% when hitting with an attack"
      }
    },
    {
      "id": "hinderPotionII",
      "name": "迟滞丹·二阶",
      "melvorName": "Hinder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "迟滞丹，二阶药瓶",
      "description": "迟滞丹·二阶，充能 10。对标效果：Inflict a slow that increases the target's attack interval by 6% when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:hinderPotion",
      "melvor": {
        "seriesId": "hinderPotion",
        "name": "Hinder Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "Inflict a slow that increases the target's attack interval by 6% when hitting with an attack"
      }
    },
    {
      "id": "hinderPotionIII",
      "name": "迟滞丹·三阶",
      "melvorName": "Hinder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "迟滞丹，三阶药瓶",
      "description": "迟滞丹·三阶，充能 15。对标效果：Inflict a slow that increases the target's attack interval by 10% when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:hinderPotion",
      "melvor": {
        "seriesId": "hinderPotion",
        "name": "Hinder Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "Inflict a slow that increases the target's attack interval by 10% when hitting with an attack"
      }
    },
    {
      "id": "hinderPotionIV",
      "name": "迟滞丹·四阶",
      "melvorName": "Hinder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "迟滞丹，四阶药瓶",
      "description": "迟滞丹·四阶，充能 25。对标效果：Inflict a slow that increases the target's attack interval by 15% when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:hinderPotion",
      "melvor": {
        "seriesId": "hinderPotion",
        "name": "Hinder Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 25,
        "effect": "Inflict a slow that increases the target's attack interval by 15% when hitting with an attack"
      }
    },
    {
      "id": "controlledHeatPotionI",
      "name": "控火丹·一阶",
      "melvorName": "Controlled Heat Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控火丹，一阶药瓶",
      "description": "控火丹·一阶，充能 5。对标效果：Bonfires that provide Skill XP are now free to light.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:controlledHeatPotion",
      "melvor": {
        "seriesId": "controlledHeatPotion",
        "name": "Controlled Heat Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "Bonfires that provide Skill XP are now free to light."
      }
    },
    {
      "id": "controlledHeatPotionII",
      "name": "控火丹·二阶",
      "melvorName": "Controlled Heat Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控火丹，二阶药瓶",
      "description": "控火丹·二阶，充能 10。对标效果：Bonfires that provide Skill XP are now free to light.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:controlledHeatPotion",
      "melvor": {
        "seriesId": "controlledHeatPotion",
        "name": "Controlled Heat Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "Bonfires that provide Skill XP are now free to light."
      }
    },
    {
      "id": "controlledHeatPotionIII",
      "name": "控火丹·三阶",
      "melvorName": "Controlled Heat Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控火丹，三阶药瓶",
      "description": "控火丹·三阶，充能 15。对标效果：Bonfires that provide Skill XP are now free to light.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:controlledHeatPotion",
      "melvor": {
        "seriesId": "controlledHeatPotion",
        "name": "Controlled Heat Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "Bonfires that provide Skill XP are now free to light."
      }
    },
    {
      "id": "controlledHeatPotionIV",
      "name": "控火丹·四阶",
      "melvorName": "Controlled Heat Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控火丹，四阶药瓶",
      "description": "控火丹·四阶，充能 25。对标效果：Bonfires that provide Skill XP are now free to light.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:controlledHeatPotion",
      "melvor": {
        "seriesId": "controlledHeatPotion",
        "name": "Controlled Heat Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 25,
        "effect": "Bonfires that provide Skill XP are now free to light."
      }
    },
    {
      "id": "magicAssistancePotionI",
      "name": "法术助攻丹·一阶",
      "melvorName": "Magic Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法术助攻丹，一阶药瓶",
      "description": "法术助攻丹·一阶，充能 15。对标效果：+4% Magic Accuracy Rating, +4% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:magicAssistancePotion",
      "melvor": {
        "seriesId": "magicAssistancePotion",
        "name": "Magic Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+4% Magic Accuracy Rating, +4% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn"
      }
    },
    {
      "id": "magicAssistancePotionII",
      "name": "法术助攻丹·二阶",
      "melvorName": "Magic Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法术助攻丹，二阶药瓶",
      "description": "法术助攻丹·二阶，充能 15。对标效果：+8% Magic Accuracy Rating, +8% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:magicAssistancePotion",
      "melvor": {
        "seriesId": "magicAssistancePotion",
        "name": "Magic Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 15,
        "effect": "+8% Magic Accuracy Rating, +8% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn"
      }
    },
    {
      "id": "magicAssistancePotionIII",
      "name": "法术助攻丹·三阶",
      "melvorName": "Magic Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法术助攻丹，三阶药瓶",
      "description": "法术助攻丹·三阶，充能 15。对标效果：+12% Magic Accuracy Rating, +12% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:magicAssistancePotion",
      "melvor": {
        "seriesId": "magicAssistancePotion",
        "name": "Magic Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "+12% Magic Accuracy Rating, +12% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn"
      }
    },
    {
      "id": "magicAssistancePotionIV",
      "name": "法术助攻丹·四阶",
      "melvorName": "Magic Assistance Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法术助攻丹，四阶药瓶",
      "description": "法术助攻丹·四阶，充能 20。对标效果：+20% Magic Accuracy Rating, +20% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:magicAssistancePotion",
      "melvor": {
        "seriesId": "magicAssistancePotion",
        "name": "Magic Assistance Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 20,
        "effect": "+20% Magic Accuracy Rating, +20% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn"
      }
    },
    {
      "id": "generousCookPotionI",
      "name": "丰厨丹·一阶",
      "melvorName": "Generous Cook Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰厨丹，一阶药瓶",
      "description": "丰厨丹·一阶，充能 15。对标效果：+10% Chance to Double Items in Cooking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousCookPotion",
      "melvor": {
        "seriesId": "generousCookPotion",
        "name": "Generous Cook Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+10% Chance to Double Items in Cooking"
      }
    },
    {
      "id": "generousCookPotionII",
      "name": "丰厨丹·二阶",
      "melvorName": "Generous Cook Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰厨丹，二阶药瓶",
      "description": "丰厨丹·二阶，充能 30。对标效果：+20% Chance to Double Items in Cooking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousCookPotion",
      "melvor": {
        "seriesId": "generousCookPotion",
        "name": "Generous Cook Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+20% Chance to Double Items in Cooking"
      }
    },
    {
      "id": "generousCookPotionIII",
      "name": "丰厨丹·三阶",
      "melvorName": "Generous Cook Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰厨丹，三阶药瓶",
      "description": "丰厨丹·三阶，充能 40。对标效果：+30% Chance to Double Items in Cooking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousCookPotion",
      "melvor": {
        "seriesId": "generousCookPotion",
        "name": "Generous Cook Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+30% Chance to Double Items in Cooking"
      }
    },
    {
      "id": "generousCookPotionIV",
      "name": "丰厨丹·四阶",
      "melvorName": "Generous Cook Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 60,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰厨丹，四阶药瓶",
      "description": "丰厨丹·四阶，充能 60。对标效果：+50% Chance to Double Items in Cooking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousCookPotion",
      "melvor": {
        "seriesId": "generousCookPotion",
        "name": "Generous Cook Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 60,
        "effect": "+50% Chance to Double Items in Cooking"
      }
    },
    {
      "id": "regenerationPotionI",
      "name": "回元丹·一阶",
      "melvorName": "Regeneration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "回元丹，一阶药瓶",
      "description": "回元丹·一阶，充能 15。对标效果：+30% Hitpoint Regeneration。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:regenerationPotion",
      "melvor": {
        "seriesId": "regenerationPotion",
        "name": "Regeneration Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+30% Hitpoint Regeneration"
      }
    },
    {
      "id": "regenerationPotionII",
      "name": "回元丹·二阶",
      "melvorName": "Regeneration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "回元丹，二阶药瓶",
      "description": "回元丹·二阶，充能 25。对标效果：+60% Hitpoint Regeneration。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:regenerationPotion",
      "melvor": {
        "seriesId": "regenerationPotion",
        "name": "Regeneration Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 25,
        "effect": "+60% Hitpoint Regeneration"
      }
    },
    {
      "id": "regenerationPotionIII",
      "name": "回元丹·三阶",
      "melvorName": "Regeneration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "回元丹，三阶药瓶",
      "description": "回元丹·三阶，充能 40。对标效果：+100% Hitpoint Regeneration。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:regenerationPotion",
      "melvor": {
        "seriesId": "regenerationPotion",
        "name": "Regeneration Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+100% Hitpoint Regeneration"
      }
    },
    {
      "id": "regenerationPotionIV",
      "name": "回元丹·四阶",
      "melvorName": "Regeneration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 60,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "回元丹，四阶药瓶",
      "description": "回元丹·四阶，充能 60。对标效果：+150% Hitpoint Regeneration。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:regenerationPotion",
      "melvor": {
        "seriesId": "regenerationPotion",
        "name": "Regeneration Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 60,
        "effect": "+150% Hitpoint Regeneration"
      }
    },
    {
      "id": "seeingGoldPotionI",
      "name": "见金丹·一阶",
      "melvorName": "Seeing Gold Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "见金丹，一阶药瓶",
      "description": "见金丹·一阶，充能 20。对标效果：+10% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:seeingGoldPotion",
      "melvor": {
        "seriesId": "seeingGoldPotion",
        "name": "Seeing Gold Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+10% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)"
      }
    },
    {
      "id": "seeingGoldPotionII",
      "name": "见金丹·二阶",
      "melvorName": "Seeing Gold Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "见金丹，二阶药瓶",
      "description": "见金丹·二阶，充能 30。对标效果：+20% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:seeingGoldPotion",
      "melvor": {
        "seriesId": "seeingGoldPotion",
        "name": "Seeing Gold Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+20% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)"
      }
    },
    {
      "id": "seeingGoldPotionIII",
      "name": "见金丹·三阶",
      "melvorName": "Seeing Gold Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "见金丹，三阶药瓶",
      "description": "见金丹·三阶，充能 50。对标效果：+40% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:seeingGoldPotion",
      "melvor": {
        "seriesId": "seeingGoldPotion",
        "name": "Seeing Gold Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 50,
        "effect": "+40% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)"
      }
    },
    {
      "id": "seeingGoldPotionIV",
      "name": "见金丹·四阶",
      "melvorName": "Seeing Gold Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 80,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "见金丹，四阶药瓶",
      "description": "见金丹·四阶，充能 80。对标效果：+75% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:seeingGoldPotion",
      "melvor": {
        "seriesId": "seeingGoldPotion",
        "name": "Seeing Gold Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 80,
        "effect": "+75% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)"
      }
    },
    {
      "id": "famishedPotionI",
      "name": "饥食丹·一阶",
      "melvorName": "Famished Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "饥食丹，一阶药瓶",
      "description": "饥食丹·一阶，充能 10。对标效果：+5% Auto Eat Efficiency and +5% Chance to Preserve Food when eaten。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:famishedPotion",
      "melvor": {
        "seriesId": "famishedPotion",
        "name": "Famished Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 10,
        "effect": "+5% Auto Eat Efficiency and +5% Chance to Preserve Food when eaten"
      }
    },
    {
      "id": "famishedPotionII",
      "name": "饥食丹·二阶",
      "melvorName": "Famished Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "饥食丹，二阶药瓶",
      "description": "饥食丹·二阶，充能 20。对标效果：+10% Auto Eat Efficiency and +10% Chance to Preserve Food when eaten。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:famishedPotion",
      "melvor": {
        "seriesId": "famishedPotion",
        "name": "Famished Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 20,
        "effect": "+10% Auto Eat Efficiency and +10% Chance to Preserve Food when eaten"
      }
    },
    {
      "id": "famishedPotionIII",
      "name": "饥食丹·三阶",
      "melvorName": "Famished Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "饥食丹，三阶药瓶",
      "description": "饥食丹·三阶，充能 30。对标效果：+15% Auto Eat Efficiency and +15% Chance to Preserve Food when eaten。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:famishedPotion",
      "melvor": {
        "seriesId": "famishedPotion",
        "name": "Famished Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 30,
        "effect": "+15% Auto Eat Efficiency and +15% Chance to Preserve Food when eaten"
      }
    },
    {
      "id": "famishedPotionIV",
      "name": "饥食丹·四阶",
      "melvorName": "Famished Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "饥食丹，四阶药瓶",
      "description": "饥食丹·四阶，充能 40。对标效果：+25% Auto Eat Efficiency and +25% Chance to Preserve Food when eaten。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:famishedPotion",
      "melvor": {
        "seriesId": "famishedPotion",
        "name": "Famished Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 40,
        "effect": "+25% Auto Eat Efficiency and +25% Chance to Preserve Food when eaten"
      }
    },
    {
      "id": "fishermansPotionI",
      "name": "渔夫丹·一阶",
      "melvorName": "Fishermans Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "渔夫丹，一阶药瓶",
      "description": "渔夫丹·一阶，充能 5。对标效果：+3% Chance to Double Items in Fishing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:fishermansPotion",
      "melvor": {
        "seriesId": "fishermansPotion",
        "name": "Fishermans Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "+3% Chance to Double Items in Fishing"
      }
    },
    {
      "id": "fishermansPotionII",
      "name": "渔夫丹·二阶",
      "melvorName": "Fishermans Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "渔夫丹，二阶药瓶",
      "description": "渔夫丹·二阶，充能 10。对标效果：+5% Chance to Double Items in Fishing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:fishermansPotion",
      "melvor": {
        "seriesId": "fishermansPotion",
        "name": "Fishermans Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "+5% Chance to Double Items in Fishing"
      }
    },
    {
      "id": "fishermansPotionIII",
      "name": "渔夫丹·三阶",
      "melvorName": "Fishermans Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "渔夫丹，三阶药瓶",
      "description": "渔夫丹·三阶，充能 15。对标效果：+8% Chance to Double Items in Fishing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:fishermansPotion",
      "melvor": {
        "seriesId": "fishermansPotion",
        "name": "Fishermans Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "+8% Chance to Double Items in Fishing"
      }
    },
    {
      "id": "fishermansPotionIV",
      "name": "渔夫丹·四阶",
      "melvorName": "Fishermans Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "渔夫丹，四阶药瓶",
      "description": "渔夫丹·四阶，充能 20。对标效果：+12% Chance to Double Items in Fishing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:fishermansPotion",
      "melvor": {
        "seriesId": "fishermansPotion",
        "name": "Fishermans Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 20,
        "effect": "+12% Chance to Double Items in Fishing"
      }
    },
    {
      "id": "crystallizationPotionI",
      "name": "晶化丹·一阶",
      "melvorName": "Crystallization Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶化丹，一阶药瓶",
      "description": "晶化丹·一阶，充能 2。对标效果：+1% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystallizationPotion",
      "melvor": {
        "seriesId": "crystallizationPotion",
        "name": "Crystallization Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 2,
        "effect": "+1% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking"
      }
    },
    {
      "id": "crystallizationPotionII",
      "name": "晶化丹·二阶",
      "melvorName": "Crystallization Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶化丹，二阶药瓶",
      "description": "晶化丹·二阶，充能 4。对标效果：+2% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystallizationPotion",
      "melvor": {
        "seriesId": "crystallizationPotion",
        "name": "Crystallization Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 4,
        "effect": "+2% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking"
      }
    },
    {
      "id": "crystallizationPotionIII",
      "name": "晶化丹·三阶",
      "melvorName": "Crystallization Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 6,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶化丹，三阶药瓶",
      "description": "晶化丹·三阶，充能 6。对标效果：+3% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystallizationPotion",
      "melvor": {
        "seriesId": "crystallizationPotion",
        "name": "Crystallization Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 6,
        "effect": "+3% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking"
      }
    },
    {
      "id": "crystallizationPotionIV",
      "name": "晶化丹·四阶",
      "melvorName": "Crystallization Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶化丹，四阶药瓶",
      "description": "晶化丹·四阶，充能 10。对标效果：+4% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystallizationPotion",
      "melvor": {
        "seriesId": "crystallizationPotion",
        "name": "Crystallization Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 10,
        "effect": "+4% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking"
      }
    },
    {
      "id": "unholyPotionI",
      "name": "秽祷丹·一阶",
      "melvorName": "Unholy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秽祷丹，一阶药瓶",
      "description": "秽祷丹·一阶，充能 5。对标效果：+5% chance to preserve Prayer Points for Unholy Prayers。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:unholyPotion",
      "melvor": {
        "seriesId": "unholyPotion",
        "name": "Unholy Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 5,
        "effect": "+5% chance to preserve Prayer Points for Unholy Prayers"
      }
    },
    {
      "id": "unholyPotionII",
      "name": "秽祷丹·二阶",
      "melvorName": "Unholy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秽祷丹，二阶药瓶",
      "description": "秽祷丹·二阶，充能 10。对标效果：+10% chance to preserve Prayer Points for Unholy Prayers。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:unholyPotion",
      "melvor": {
        "seriesId": "unholyPotion",
        "name": "Unholy Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 10,
        "effect": "+10% chance to preserve Prayer Points for Unholy Prayers"
      }
    },
    {
      "id": "unholyPotionIII",
      "name": "秽祷丹·三阶",
      "melvorName": "Unholy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秽祷丹，三阶药瓶",
      "description": "秽祷丹·三阶，充能 15。对标效果：+15% chance to preserve Prayer Points for Unholy Prayers。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:unholyPotion",
      "melvor": {
        "seriesId": "unholyPotion",
        "name": "Unholy Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 15,
        "effect": "+15% chance to preserve Prayer Points for Unholy Prayers"
      }
    },
    {
      "id": "unholyPotionIV",
      "name": "秽祷丹·四阶",
      "melvorName": "Unholy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秽祷丹，四阶药瓶",
      "description": "秽祷丹·四阶，充能 20。对标效果：+20% chance to preserve Prayer Points for Unholy Prayers。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:unholyPotion",
      "melvor": {
        "seriesId": "unholyPotion",
        "name": "Unholy Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 20,
        "effect": "+20% chance to preserve Prayer Points for Unholy Prayers"
      }
    },
    {
      "id": "skilledFletchingPotionI",
      "name": "巧弓丹·一阶",
      "melvorName": "Skilled Fletching Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧弓丹，一阶药瓶",
      "description": "巧弓丹·一阶，充能 20。对标效果：+5% Chance to Double Items in Fletching。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:skilledFletchingPotion",
      "melvor": {
        "seriesId": "skilledFletchingPotion",
        "name": "Skilled Fletching Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+5% Chance to Double Items in Fletching"
      }
    },
    {
      "id": "skilledFletchingPotionII",
      "name": "巧弓丹·二阶",
      "melvorName": "Skilled Fletching Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧弓丹，二阶药瓶",
      "description": "巧弓丹·二阶，充能 30。对标效果：+10% Chance to Double Items in Fletching。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:skilledFletchingPotion",
      "melvor": {
        "seriesId": "skilledFletchingPotion",
        "name": "Skilled Fletching Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+10% Chance to Double Items in Fletching"
      }
    },
    {
      "id": "skilledFletchingPotionIII",
      "name": "巧弓丹·三阶",
      "melvorName": "Skilled Fletching Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧弓丹，三阶药瓶",
      "description": "巧弓丹·三阶，充能 40。对标效果：+15% Chance to Double Items in Fletching。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:skilledFletchingPotion",
      "melvor": {
        "seriesId": "skilledFletchingPotion",
        "name": "Skilled Fletching Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+15% Chance to Double Items in Fletching"
      }
    },
    {
      "id": "skilledFletchingPotionIV",
      "name": "巧弓丹·四阶",
      "melvorName": "Skilled Fletching Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧弓丹，四阶药瓶",
      "description": "巧弓丹·四阶，充能 50。对标效果：+25% Chance to Double Items in Fletching。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:skilledFletchingPotion",
      "melvor": {
        "seriesId": "skilledFletchingPotion",
        "name": "Skilled Fletching Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 50,
        "effect": "+25% Chance to Double Items in Fletching"
      }
    },
    {
      "id": "rangedStrengthPotionI",
      "name": "远程强击丹·一阶",
      "melvorName": "Ranged Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程强击丹，一阶药瓶",
      "description": "远程强击丹·一阶，充能 5。对标效果：+5% Ranged Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedStrengthPotion",
      "melvor": {
        "seriesId": "rangedStrengthPotion",
        "name": "Ranged Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "+5% Ranged Maximum Hit"
      }
    },
    {
      "id": "rangedStrengthPotionII",
      "name": "远程强击丹·二阶",
      "melvorName": "Ranged Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程强击丹，二阶药瓶",
      "description": "远程强击丹·二阶，充能 5。对标效果：+10% Ranged Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedStrengthPotion",
      "melvor": {
        "seriesId": "rangedStrengthPotion",
        "name": "Ranged Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 5,
        "effect": "+10% Ranged Maximum Hit"
      }
    },
    {
      "id": "rangedStrengthPotionIII",
      "name": "远程强击丹·三阶",
      "melvorName": "Ranged Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程强击丹，三阶药瓶",
      "description": "远程强击丹·三阶，充能 5。对标效果：+15% Ranged Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedStrengthPotion",
      "melvor": {
        "seriesId": "rangedStrengthPotion",
        "name": "Ranged Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 5,
        "effect": "+15% Ranged Maximum Hit"
      }
    },
    {
      "id": "rangedStrengthPotionIV",
      "name": "远程强击丹·四阶",
      "melvorName": "Ranged Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "远程强击丹，四阶药瓶",
      "description": "远程强击丹·四阶，充能 10。对标效果：+25% Ranged Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:rangedStrengthPotion",
      "melvor": {
        "seriesId": "rangedStrengthPotion",
        "name": "Ranged Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 10,
        "effect": "+25% Ranged Maximum Hit"
      }
    },
    {
      "id": "gentleHandsPotionI",
      "name": "巧手丹·一阶",
      "melvorName": "Gentle Hands Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧手丹，一阶药瓶",
      "description": "巧手丹·一阶，充能 20。对标效果：+15 Stealth while Thieving。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gentleHandsPotion",
      "melvor": {
        "seriesId": "gentleHandsPotion",
        "name": "Gentle Hands Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+15 Stealth while Thieving"
      }
    },
    {
      "id": "gentleHandsPotionII",
      "name": "巧手丹·二阶",
      "melvorName": "Gentle Hands Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧手丹，二阶药瓶",
      "description": "巧手丹·二阶，充能 30。对标效果：+30 Stealth while Thieving。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gentleHandsPotion",
      "melvor": {
        "seriesId": "gentleHandsPotion",
        "name": "Gentle Hands Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+30 Stealth while Thieving"
      }
    },
    {
      "id": "gentleHandsPotionIII",
      "name": "巧手丹·三阶",
      "melvorName": "Gentle Hands Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧手丹，三阶药瓶",
      "description": "巧手丹·三阶，充能 40。对标效果：+50 Stealth while Thieving。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gentleHandsPotion",
      "melvor": {
        "seriesId": "gentleHandsPotion",
        "name": "Gentle Hands Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+50 Stealth while Thieving"
      }
    },
    {
      "id": "gentleHandsPotionIV",
      "name": "巧手丹·四阶",
      "melvorName": "Gentle Hands Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧手丹，四阶药瓶",
      "description": "巧手丹·四阶，充能 50。对标效果：+75 Stealth while Thieving。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gentleHandsPotion",
      "melvor": {
        "seriesId": "gentleHandsPotion",
        "name": "Gentle Hands Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 50,
        "effect": "+75 Stealth while Thieving"
      }
    },
    {
      "id": "secretStardustPotionI",
      "name": "秘星尘丹·一阶",
      "melvorName": "Secret Stardust Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秘星尘丹，一阶药瓶",
      "description": "秘星尘丹·一阶，充能 5。对标效果：-3% Astrology Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:secretStardustPotion",
      "melvor": {
        "seriesId": "secretStardustPotion",
        "name": "Secret Stardust Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "-3% Astrology Interval"
      }
    },
    {
      "id": "secretStardustPotionII",
      "name": "秘星尘丹·二阶",
      "melvorName": "Secret Stardust Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秘星尘丹，二阶药瓶",
      "description": "秘星尘丹·二阶，充能 10。对标效果：-5% Astrology Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:secretStardustPotion",
      "melvor": {
        "seriesId": "secretStardustPotion",
        "name": "Secret Stardust Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "-5% Astrology Interval"
      }
    },
    {
      "id": "secretStardustPotionIII",
      "name": "秘星尘丹·三阶",
      "melvorName": "Secret Stardust Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秘星尘丹，三阶药瓶",
      "description": "秘星尘丹·三阶，充能 15。对标效果：-10% Astrology Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:secretStardustPotion",
      "melvor": {
        "seriesId": "secretStardustPotion",
        "name": "Secret Stardust Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "-10% Astrology Interval"
      }
    },
    {
      "id": "secretStardustPotionIV",
      "name": "秘星尘丹·四阶",
      "melvorName": "Secret Stardust Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "秘星尘丹，四阶药瓶",
      "description": "秘星尘丹·四阶，充能 25。对标效果：-15% Astrology Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:secretStardustPotion",
      "melvor": {
        "seriesId": "secretStardustPotion",
        "name": "Secret Stardust Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 25,
        "effect": "-15% Astrology Interval"
      }
    },
    {
      "id": "craftingPotionI",
      "name": "巧作丹·一阶",
      "melvorName": "Crafting Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧作丹，一阶药瓶",
      "description": "巧作丹·一阶，充能 10。对标效果：+5% Chance to Double Items in Crafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:craftingPotion",
      "melvor": {
        "seriesId": "craftingPotion",
        "name": "Crafting Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 10,
        "effect": "+5% Chance to Double Items in Crafting"
      }
    },
    {
      "id": "craftingPotionII",
      "name": "巧作丹·二阶",
      "melvorName": "Crafting Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧作丹，二阶药瓶",
      "description": "巧作丹·二阶，充能 10。对标效果：+10% Chance to Double Items in Crafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:craftingPotion",
      "melvor": {
        "seriesId": "craftingPotion",
        "name": "Crafting Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "+10% Chance to Double Items in Crafting"
      }
    },
    {
      "id": "craftingPotionIII",
      "name": "巧作丹·三阶",
      "melvorName": "Crafting Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧作丹，三阶药瓶",
      "description": "巧作丹·三阶，充能 10。对标效果：+15% Chance to Double Items in Crafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:craftingPotion",
      "melvor": {
        "seriesId": "craftingPotion",
        "name": "Crafting Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 10,
        "effect": "+15% Chance to Double Items in Crafting"
      }
    },
    {
      "id": "craftingPotionIV",
      "name": "巧作丹·四阶",
      "melvorName": "Crafting Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "巧作丹，四阶药瓶",
      "description": "巧作丹·四阶，充能 15。对标效果：+25% Chance to Double Items in Crafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:craftingPotion",
      "melvor": {
        "seriesId": "craftingPotion",
        "name": "Crafting Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 15,
        "effect": "+25% Chance to Double Items in Crafting"
      }
    },
    {
      "id": "luckyHerbPotionI",
      "name": "幸运灵草丹·一阶",
      "melvorName": "Lucky Herb Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 8,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "幸运灵草丹，一阶药瓶",
      "description": "幸运灵草丹·一阶，充能 8。对标效果：+10% chance to convert combat seed drops to herbs。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:luckyHerbPotion",
      "melvor": {
        "seriesId": "luckyHerbPotion",
        "name": "Lucky Herb Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 8,
        "effect": "+10% chance to convert combat seed drops to herbs"
      }
    },
    {
      "id": "luckyHerbPotionII",
      "name": "幸运灵草丹·二阶",
      "melvorName": "Lucky Herb Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "幸运灵草丹，二阶药瓶",
      "description": "幸运灵草丹·二阶，充能 10。对标效果：+20% chance to convert combat seed drops to herbs。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:luckyHerbPotion",
      "melvor": {
        "seriesId": "luckyHerbPotion",
        "name": "Lucky Herb Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "+20% chance to convert combat seed drops to herbs"
      }
    },
    {
      "id": "luckyHerbPotionIII",
      "name": "幸运灵草丹·三阶",
      "melvorName": "Lucky Herb Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "幸运灵草丹，三阶药瓶",
      "description": "幸运灵草丹·三阶，充能 15。对标效果：+30% chance to convert combat seed drops to herbs。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:luckyHerbPotion",
      "melvor": {
        "seriesId": "luckyHerbPotion",
        "name": "Lucky Herb Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "+30% chance to convert combat seed drops to herbs"
      }
    },
    {
      "id": "luckyHerbPotionIV",
      "name": "幸运灵草丹·四阶",
      "melvorName": "Lucky Herb Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "幸运灵草丹，四阶药瓶",
      "description": "幸运灵草丹·四阶，充能 20。对标效果：+50% chance to convert combat seed drops to herbs。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:luckyHerbPotion",
      "melvor": {
        "seriesId": "luckyHerbPotion",
        "name": "Lucky Herb Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 20,
        "effect": "+50% chance to convert combat seed drops to herbs"
      }
    },
    {
      "id": "perfectSwingPotionI",
      "name": "完美挥镐丹·一阶",
      "melvorName": "Perfect Swing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "完美挥镐丹，一阶药瓶",
      "description": "完美挥镐丹·一阶，充能 30。对标效果：+10% chance to deal no damage to Essence Nodes in Mining and +10% chance to deal no damage to Ore Nodes in Mining。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:perfectSwingPotion",
      "melvor": {
        "seriesId": "perfectSwingPotion",
        "name": "Perfect Swing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 30,
        "effect": "+10% chance to deal no damage to Essence Nodes in Mining and +10% chance to deal no damage to Ore Nodes in Mining"
      }
    },
    {
      "id": "perfectSwingPotionII",
      "name": "完美挥镐丹·二阶",
      "melvorName": "Perfect Swing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "完美挥镐丹，二阶药瓶",
      "description": "完美挥镐丹·二阶，充能 50。对标效果：+20% chance to deal no damage to Essence Nodes in Mining and +20% chance to deal no damage to Ore Nodes in Mining。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:perfectSwingPotion",
      "melvor": {
        "seriesId": "perfectSwingPotion",
        "name": "Perfect Swing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 50,
        "effect": "+20% chance to deal no damage to Essence Nodes in Mining and +20% chance to deal no damage to Ore Nodes in Mining"
      }
    },
    {
      "id": "perfectSwingPotionIII",
      "name": "完美挥镐丹·三阶",
      "melvorName": "Perfect Swing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 80,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "完美挥镐丹，三阶药瓶",
      "description": "完美挥镐丹·三阶，充能 80。对标效果：+40% chance to deal no damage to Essence Nodes in Mining and +40% chance to deal no damage to Ore Nodes in Mining。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:perfectSwingPotion",
      "melvor": {
        "seriesId": "perfectSwingPotion",
        "name": "Perfect Swing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 80,
        "effect": "+40% chance to deal no damage to Essence Nodes in Mining and +40% chance to deal no damage to Ore Nodes in Mining"
      }
    },
    {
      "id": "perfectSwingPotionIV",
      "name": "完美挥镐丹·四阶",
      "melvorName": "Perfect Swing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 100,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "完美挥镐丹，四阶药瓶",
      "description": "完美挥镐丹·四阶，充能 100。对标效果：+80% chance to deal no damage to Essence Nodes in Mining and +80% chance to deal no damage to Ore Nodes in Mining。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:perfectSwingPotion",
      "melvor": {
        "seriesId": "perfectSwingPotion",
        "name": "Perfect Swing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 100,
        "effect": "+80% chance to deal no damage to Essence Nodes in Mining and +80% chance to deal no damage to Ore Nodes in Mining"
      }
    },
    {
      "id": "necromancerPotionI",
      "name": "唤灵丹·一阶",
      "melvorName": "Necromancer Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "唤灵丹，一阶药瓶",
      "description": "唤灵丹·一阶，充能 15。对标效果：+1 base primary resource quantity gained in Summoning。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:necromancerPotion",
      "melvor": {
        "seriesId": "necromancerPotion",
        "name": "Necromancer Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+1 base primary resource quantity gained in Summoning"
      }
    },
    {
      "id": "necromancerPotionII",
      "name": "唤灵丹·二阶",
      "melvorName": "Necromancer Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "唤灵丹，二阶药瓶",
      "description": "唤灵丹·二阶，充能 30。对标效果：+2 base primary resource quantity gained in Summoning。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:necromancerPotion",
      "melvor": {
        "seriesId": "necromancerPotion",
        "name": "Necromancer Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+2 base primary resource quantity gained in Summoning"
      }
    },
    {
      "id": "necromancerPotionIII",
      "name": "唤灵丹·三阶",
      "melvorName": "Necromancer Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 45,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "唤灵丹，三阶药瓶",
      "description": "唤灵丹·三阶，充能 45。对标效果：+3 base primary resource quantity gained in Summoning。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:necromancerPotion",
      "melvor": {
        "seriesId": "necromancerPotion",
        "name": "Necromancer Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 45,
        "effect": "+3 base primary resource quantity gained in Summoning"
      }
    },
    {
      "id": "necromancerPotionIV",
      "name": "唤灵丹·四阶",
      "melvorName": "Necromancer Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 60,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "唤灵丹，四阶药瓶",
      "description": "唤灵丹·四阶，充能 60。对标效果：+5 base primary resource quantity gained in Summoning。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:necromancerPotion",
      "melvor": {
        "seriesId": "necromancerPotion",
        "name": "Necromancer Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 60,
        "effect": "+5 base primary resource quantity gained in Summoning"
      }
    },
    {
      "id": "divinePotionI",
      "name": "神佑丹·一阶",
      "melvorName": "Divine Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "神佑丹，一阶药瓶",
      "description": "神佑丹·一阶，充能 15。对标效果：+10% Chance To Preserve Prayer Points。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:divinePotion",
      "melvor": {
        "seriesId": "divinePotion",
        "name": "Divine Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 15,
        "effect": "+10% Chance To Preserve Prayer Points"
      }
    },
    {
      "id": "divinePotionII",
      "name": "神佑丹·二阶",
      "melvorName": "Divine Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "神佑丹，二阶药瓶",
      "description": "神佑丹·二阶，充能 20。对标效果：+15% Chance To Preserve Prayer Points。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:divinePotion",
      "melvor": {
        "seriesId": "divinePotion",
        "name": "Divine Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 20,
        "effect": "+15% Chance To Preserve Prayer Points"
      }
    },
    {
      "id": "divinePotionIII",
      "name": "神佑丹·三阶",
      "melvorName": "Divine Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "神佑丹，三阶药瓶",
      "description": "神佑丹·三阶，充能 25。对标效果：+20% Chance To Preserve Prayer Points。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:divinePotion",
      "melvor": {
        "seriesId": "divinePotion",
        "name": "Divine Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 25,
        "effect": "+20% Chance To Preserve Prayer Points"
      }
    },
    {
      "id": "divinePotionIV",
      "name": "神佑丹·四阶",
      "melvorName": "Divine Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "神佑丹，四阶药瓶",
      "description": "神佑丹·四阶，充能 30。对标效果：+35% Chance To Preserve Prayer Points。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:divinePotion",
      "melvor": {
        "seriesId": "divinePotion",
        "name": "Divine Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 30,
        "effect": "+35% Chance To Preserve Prayer Points"
      }
    },
    {
      "id": "meleeStrengthPotionI",
      "name": "近战强击丹·一阶",
      "melvorName": "Melee Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战强击丹，一阶药瓶",
      "description": "近战强击丹·一阶，充能 5。对标效果：+1% Melee Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeStrengthPotion",
      "melvor": {
        "seriesId": "meleeStrengthPotion",
        "name": "Melee Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "+1% Melee Maximum Hit"
      }
    },
    {
      "id": "meleeStrengthPotionII",
      "name": "近战强击丹·二阶",
      "melvorName": "Melee Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战强击丹，二阶药瓶",
      "description": "近战强击丹·二阶，充能 5。对标效果：+3% Melee Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeStrengthPotion",
      "melvor": {
        "seriesId": "meleeStrengthPotion",
        "name": "Melee Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 5,
        "effect": "+3% Melee Maximum Hit"
      }
    },
    {
      "id": "meleeStrengthPotionIII",
      "name": "近战强击丹·三阶",
      "melvorName": "Melee Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战强击丹，三阶药瓶",
      "description": "近战强击丹·三阶，充能 5。对标效果：+6% Melee Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeStrengthPotion",
      "melvor": {
        "seriesId": "meleeStrengthPotion",
        "name": "Melee Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 5,
        "effect": "+6% Melee Maximum Hit"
      }
    },
    {
      "id": "meleeStrengthPotionIV",
      "name": "近战强击丹·四阶",
      "melvorName": "Melee Strength Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "近战强击丹，四阶药瓶",
      "description": "近战强击丹·四阶，充能 10。对标效果：+10% Melee Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:meleeStrengthPotion",
      "melvor": {
        "seriesId": "meleeStrengthPotion",
        "name": "Melee Strength Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 10,
        "effect": "+10% Melee Maximum Hit"
      }
    },
    {
      "id": "performanceEnhancingPotionI",
      "name": "身法强化丹·一阶",
      "melvorName": "Performance Enhancing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "身法强化丹，一阶药瓶",
      "description": "身法强化丹·一阶，充能 10。对标效果：-4% Agility Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:performanceEnhancingPotion",
      "melvor": {
        "seriesId": "performanceEnhancingPotion",
        "name": "Performance Enhancing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 10,
        "effect": "-4% Agility Interval"
      }
    },
    {
      "id": "performanceEnhancingPotionII",
      "name": "身法强化丹·二阶",
      "melvorName": "Performance Enhancing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "身法强化丹，二阶药瓶",
      "description": "身法强化丹·二阶，充能 20。对标效果：-6% Agility Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:performanceEnhancingPotion",
      "melvor": {
        "seriesId": "performanceEnhancingPotion",
        "name": "Performance Enhancing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 20,
        "effect": "-6% Agility Interval"
      }
    },
    {
      "id": "performanceEnhancingPotionIII",
      "name": "身法强化丹·三阶",
      "melvorName": "Performance Enhancing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "身法强化丹，三阶药瓶",
      "description": "身法强化丹·三阶，充能 30。对标效果：-8% Agility Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:performanceEnhancingPotion",
      "melvor": {
        "seriesId": "performanceEnhancingPotion",
        "name": "Performance Enhancing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 30,
        "effect": "-8% Agility Interval"
      }
    },
    {
      "id": "performanceEnhancingPotionIV",
      "name": "身法强化丹·四阶",
      "melvorName": "Performance Enhancing Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "身法强化丹，四阶药瓶",
      "description": "身法强化丹·四阶，充能 50。对标效果：-12% Agility Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:performanceEnhancingPotion",
      "melvor": {
        "seriesId": "performanceEnhancingPotion",
        "name": "Performance Enhancing Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 50,
        "effect": "-12% Agility Interval"
      }
    },
    {
      "id": "elementalPotionI",
      "name": "元素丹·一阶",
      "melvorName": "Elemental Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "元素丹，一阶药瓶",
      "description": "元素丹·一阶，充能 20。对标效果：+5% chance to gain 2 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:elementalPotion",
      "melvor": {
        "seriesId": "elementalPotion",
        "name": "Elemental Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+5% chance to gain 2 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting"
      }
    },
    {
      "id": "elementalPotionII",
      "name": "元素丹·二阶",
      "melvorName": "Elemental Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "元素丹，二阶药瓶",
      "description": "元素丹·二阶，充能 30。对标效果：+10% chance to gain 4 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:elementalPotion",
      "melvor": {
        "seriesId": "elementalPotion",
        "name": "Elemental Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+10% chance to gain 4 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting"
      }
    },
    {
      "id": "elementalPotionIII",
      "name": "元素丹·三阶",
      "melvorName": "Elemental Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "元素丹，三阶药瓶",
      "description": "元素丹·三阶，充能 40。对标效果：+25% chance to gain 6 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:elementalPotion",
      "melvor": {
        "seriesId": "elementalPotion",
        "name": "Elemental Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+25% chance to gain 6 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting"
      }
    },
    {
      "id": "elementalPotionIV",
      "name": "元素丹·四阶",
      "melvorName": "Elemental Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "元素丹，四阶药瓶",
      "description": "元素丹·四阶，充能 50。对标效果：+50% chance to gain 8 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:elementalPotion",
      "melvor": {
        "seriesId": "elementalPotion",
        "name": "Elemental Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 50,
        "effect": "+50% chance to gain 8 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting"
      }
    },
    {
      "id": "magicDamagePotionI",
      "name": "法伤丹·一阶",
      "melvorName": "Magic Damage Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法伤丹，一阶药瓶",
      "description": "法伤丹·一阶，充能 5。对标效果：+1% Magic Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:magicDamagePotion",
      "melvor": {
        "seriesId": "magicDamagePotion",
        "name": "Magic Damage Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "+1% Magic Maximum Hit"
      }
    },
    {
      "id": "magicDamagePotionII",
      "name": "法伤丹·二阶",
      "melvorName": "Magic Damage Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法伤丹，二阶药瓶",
      "description": "法伤丹·二阶，充能 5。对标效果：+5% Magic Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:magicDamagePotion",
      "melvor": {
        "seriesId": "magicDamagePotion",
        "name": "Magic Damage Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 5,
        "effect": "+5% Magic Maximum Hit"
      }
    },
    {
      "id": "magicDamagePotionIII",
      "name": "法伤丹·三阶",
      "melvorName": "Magic Damage Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法伤丹，三阶药瓶",
      "description": "法伤丹·三阶，充能 5。对标效果：+10% Magic Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:magicDamagePotion",
      "melvor": {
        "seriesId": "magicDamagePotion",
        "name": "Magic Damage Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 5,
        "effect": "+10% Magic Maximum Hit"
      }
    },
    {
      "id": "magicDamagePotionIV",
      "name": "法伤丹·四阶",
      "melvorName": "Magic Damage Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "法伤丹，四阶药瓶",
      "description": "法伤丹·四阶，充能 5。对标效果：+15% Magic Maximum Hit。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:magicDamagePotion",
      "melvor": {
        "seriesId": "magicDamagePotion",
        "name": "Magic Damage Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 5,
        "effect": "+15% Magic Maximum Hit"
      }
    },
    {
      "id": "lethalToxinsPotionI",
      "name": "剧毒丹·一阶",
      "melvorName": "Lethal Toxins Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "剧毒丹，一阶药瓶",
      "description": "剧毒丹·一阶，充能 5。对标效果：+3% chance to apply Poison when hitting with a Melee or Ranged attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lethalToxinsPotion",
      "melvor": {
        "seriesId": "lethalToxinsPotion",
        "name": "Lethal Toxins Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "+3% chance to apply Poison when hitting with a Melee or Ranged attack"
      }
    },
    {
      "id": "lethalToxinsPotionII",
      "name": "剧毒丹·二阶",
      "melvorName": "Lethal Toxins Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "剧毒丹，二阶药瓶",
      "description": "剧毒丹·二阶，充能 10。对标效果：+6% chance to apply Poison when hitting with a Melee or Ranged attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lethalToxinsPotion",
      "melvor": {
        "seriesId": "lethalToxinsPotion",
        "name": "Lethal Toxins Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "+6% chance to apply Poison when hitting with a Melee or Ranged attack"
      }
    },
    {
      "id": "lethalToxinsPotionIII",
      "name": "剧毒丹·三阶",
      "melvorName": "Lethal Toxins Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "剧毒丹，三阶药瓶",
      "description": "剧毒丹·三阶，充能 15。对标效果：+10% chance to apply Poison when hitting with a Melee or Ranged attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lethalToxinsPotion",
      "melvor": {
        "seriesId": "lethalToxinsPotion",
        "name": "Lethal Toxins Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "+10% chance to apply Poison when hitting with a Melee or Ranged attack"
      }
    },
    {
      "id": "lethalToxinsPotionIV",
      "name": "剧毒丹·四阶",
      "melvorName": "Lethal Toxins Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "剧毒丹，四阶药瓶",
      "description": "剧毒丹·四阶，充能 20。对标效果：+15% chance to apply Poison when hitting with a Melee or Ranged attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lethalToxinsPotion",
      "melvor": {
        "seriesId": "lethalToxinsPotion",
        "name": "Lethal Toxins Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 20,
        "effect": "+15% chance to apply Poison when hitting with a Melee or Ranged attack"
      }
    },
    {
      "id": "herblorePotionI",
      "name": "百草丹·一阶",
      "melvorName": "Herblore Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "百草丹，一阶药瓶",
      "description": "百草丹·一阶，充能 20。对标效果：+1% Chance to receive a Random Tier of the same Potion in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:herblorePotion",
      "melvor": {
        "seriesId": "herblorePotion",
        "name": "Herblore Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 20,
        "effect": "+1% Chance to receive a Random Tier of the same Potion in Herblore"
      }
    },
    {
      "id": "herblorePotionII",
      "name": "百草丹·二阶",
      "melvorName": "Herblore Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "百草丹，二阶药瓶",
      "description": "百草丹·二阶，充能 30。对标效果：+2% Chance to receive a Random Tier of the same Potion in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:herblorePotion",
      "melvor": {
        "seriesId": "herblorePotion",
        "name": "Herblore Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 30,
        "effect": "+2% Chance to receive a Random Tier of the same Potion in Herblore"
      }
    },
    {
      "id": "herblorePotionIII",
      "name": "百草丹·三阶",
      "melvorName": "Herblore Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "百草丹，三阶药瓶",
      "description": "百草丹·三阶，充能 40。对标效果：+3% Chance to receive a Random Tier of the same Potion in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:herblorePotion",
      "melvor": {
        "seriesId": "herblorePotion",
        "name": "Herblore Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 40,
        "effect": "+3% Chance to receive a Random Tier of the same Potion in Herblore"
      }
    },
    {
      "id": "herblorePotionIV",
      "name": "百草丹·四阶",
      "melvorName": "Herblore Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 60,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "百草丹，四阶药瓶",
      "description": "百草丹·四阶，充能 60。对标效果：+6% Chance to receive a Random Tier of the same Potion in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:herblorePotion",
      "melvor": {
        "seriesId": "herblorePotion",
        "name": "Herblore Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 60,
        "effect": "+6% Chance to receive a Random Tier of the same Potion in Herblore"
      }
    },
    {
      "id": "cursedPotionI",
      "name": "诅咒丹·一阶",
      "melvorName": "Cursed Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "诅咒丹，一阶药瓶",
      "description": "诅咒丹·一阶，充能 5。对标效果：+5% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:cursedPotion",
      "melvor": {
        "seriesId": "cursedPotion",
        "name": "Cursed Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 5,
        "effect": "+5% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark"
      }
    },
    {
      "id": "cursedPotionII",
      "name": "诅咒丹·二阶",
      "melvorName": "Cursed Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "诅咒丹，二阶药瓶",
      "description": "诅咒丹·二阶，充能 10。对标效果：+10% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:cursedPotion",
      "melvor": {
        "seriesId": "cursedPotion",
        "name": "Cursed Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 10,
        "effect": "+10% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark"
      }
    },
    {
      "id": "cursedPotionIII",
      "name": "诅咒丹·三阶",
      "melvorName": "Cursed Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "诅咒丹，三阶药瓶",
      "description": "诅咒丹·三阶，充能 15。对标效果：+15% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:cursedPotion",
      "melvor": {
        "seriesId": "cursedPotion",
        "name": "Cursed Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 15,
        "effect": "+15% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark"
      }
    },
    {
      "id": "cursedPotionIV",
      "name": "诅咒丹·四阶",
      "melvorName": "Cursed Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "诅咒丹，四阶药瓶",
      "description": "诅咒丹·四阶，充能 20。对标效果：+20% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:cursedPotion",
      "melvor": {
        "seriesId": "cursedPotion",
        "name": "Cursed Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 20,
        "effect": "+20% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark"
      }
    },
    {
      "id": "generousHarvestPotionI",
      "name": "丰收丹·一阶",
      "melvorName": "Generous Harvest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰收丹，一阶药瓶",
      "description": "丰收丹·一阶，充能 10。对标效果：+10% Chance to Double Items in Farming。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousHarvestPotion",
      "melvor": {
        "seriesId": "generousHarvestPotion",
        "name": "Generous Harvest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 10,
        "effect": "+10% Chance to Double Items in Farming"
      }
    },
    {
      "id": "generousHarvestPotionII",
      "name": "丰收丹·二阶",
      "melvorName": "Generous Harvest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰收丹，二阶药瓶",
      "description": "丰收丹·二阶，充能 10。对标效果：+15% Chance to Double Items in Farming。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousHarvestPotion",
      "melvor": {
        "seriesId": "generousHarvestPotion",
        "name": "Generous Harvest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "+15% Chance to Double Items in Farming"
      }
    },
    {
      "id": "generousHarvestPotionIII",
      "name": "丰收丹·三阶",
      "melvorName": "Generous Harvest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰收丹，三阶药瓶",
      "description": "丰收丹·三阶，充能 10。对标效果：+20% Chance to Double Items in Farming。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousHarvestPotion",
      "melvor": {
        "seriesId": "generousHarvestPotion",
        "name": "Generous Harvest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 10,
        "effect": "+20% Chance to Double Items in Farming"
      }
    },
    {
      "id": "generousHarvestPotionIV",
      "name": "丰收丹·四阶",
      "melvorName": "Generous Harvest Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "丰收丹，四阶药瓶",
      "description": "丰收丹·四阶，充能 10。对标效果：+30% Chance to Double Items in Farming。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:generousHarvestPotion",
      "melvor": {
        "seriesId": "generousHarvestPotion",
        "name": "Generous Harvest Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 10,
        "effect": "+30% Chance to Double Items in Farming"
      }
    },
    {
      "id": "barrierIgniterPotionI",
      "name": "屏障燃灼丹·一阶",
      "melvorName": "Barrier Igniter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障燃灼丹，一阶药瓶",
      "description": "屏障燃灼丹·一阶，充能 2。对标效果：+3% chance to apply Barrier Burn when hitting with a summon attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierIgniterPotion",
      "melvor": {
        "seriesId": "barrierIgniterPotion",
        "name": "Barrier Igniter Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 2,
        "effect": "+3% chance to apply Barrier Burn when hitting with a summon attack"
      }
    },
    {
      "id": "barrierIgniterPotionII",
      "name": "屏障燃灼丹·二阶",
      "melvorName": "Barrier Igniter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障燃灼丹，二阶药瓶",
      "description": "屏障燃灼丹·二阶，充能 4。对标效果：+6% chance to apply Barrier Burn when hitting with a summon attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierIgniterPotion",
      "melvor": {
        "seriesId": "barrierIgniterPotion",
        "name": "Barrier Igniter Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 4,
        "effect": "+6% chance to apply Barrier Burn when hitting with a summon attack"
      }
    },
    {
      "id": "barrierIgniterPotionIII",
      "name": "屏障燃灼丹·三阶",
      "melvorName": "Barrier Igniter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 6,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障燃灼丹，三阶药瓶",
      "description": "屏障燃灼丹·三阶，充能 6。对标效果：+9% chance to apply Barrier Burn when hitting with a summon attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierIgniterPotion",
      "melvor": {
        "seriesId": "barrierIgniterPotion",
        "name": "Barrier Igniter Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 6,
        "effect": "+9% chance to apply Barrier Burn when hitting with a summon attack"
      }
    },
    {
      "id": "barrierIgniterPotionIV",
      "name": "屏障燃灼丹·四阶",
      "melvorName": "Barrier Igniter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 8,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "屏障燃灼丹，四阶药瓶",
      "description": "屏障燃灼丹·四阶，充能 8。对标效果：+12% chance to apply Barrier Burn when hitting with a summon attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:barrierIgniterPotion",
      "melvor": {
        "seriesId": "barrierIgniterPotion",
        "name": "Barrier Igniter Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 8,
        "effect": "+12% chance to apply Barrier Burn when hitting with a summon attack"
      }
    },
    {
      "id": "diamondLuckPotionI",
      "name": "钻运丹·一阶",
      "melvorName": "Diamond Luck Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "钻运丹，一阶药瓶",
      "description": "钻运丹·一阶，充能 5。对标效果：Your chance to hit an enemy is lucky (Roll twice, take the better result)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:diamondLuckPotion",
      "melvor": {
        "seriesId": "diamondLuckPotion",
        "name": "Diamond Luck Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 5,
        "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)"
      }
    },
    {
      "id": "diamondLuckPotionII",
      "name": "钻运丹·二阶",
      "melvorName": "Diamond Luck Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "钻运丹，二阶药瓶",
      "description": "钻运丹·二阶，充能 10。对标效果：Your chance to hit an enemy is lucky (Roll twice, take the better result)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:diamondLuckPotion",
      "melvor": {
        "seriesId": "diamondLuckPotion",
        "name": "Diamond Luck Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 10,
        "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)"
      }
    },
    {
      "id": "diamondLuckPotionIII",
      "name": "钻运丹·三阶",
      "melvorName": "Diamond Luck Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "钻运丹，三阶药瓶",
      "description": "钻运丹·三阶，充能 15。对标效果：Your chance to hit an enemy is lucky (Roll twice, take the better result)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:diamondLuckPotion",
      "melvor": {
        "seriesId": "diamondLuckPotion",
        "name": "Diamond Luck Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 15,
        "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)"
      }
    },
    {
      "id": "diamondLuckPotionIV",
      "name": "钻运丹·四阶",
      "melvorName": "Diamond Luck Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "钻运丹，四阶药瓶",
      "description": "钻运丹·四阶，充能 25。对标效果：Your chance to hit an enemy is lucky (Roll twice, take the better result)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:diamondLuckPotion",
      "melvor": {
        "seriesId": "diamondLuckPotion",
        "name": "Diamond Luck Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 25,
        "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)"
      }
    },
    {
      "id": "crystalSanctionPotionI",
      "name": "晶裁丹·一阶",
      "melvorName": "Crystal Sanction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶裁丹，一阶药瓶",
      "description": "晶裁丹·一阶，充能 2。对标效果：+1% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystalSanctionPotion",
      "melvor": {
        "seriesId": "crystalSanctionPotion",
        "name": "Crystal Sanction Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "I",
        "charges": 2,
        "effect": "+1% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking"
      }
    },
    {
      "id": "crystalSanctionPotionII",
      "name": "晶裁丹·二阶",
      "melvorName": "Crystal Sanction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶裁丹，二阶药瓶",
      "description": "晶裁丹·二阶，充能 4。对标效果：+2% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystalSanctionPotion",
      "melvor": {
        "seriesId": "crystalSanctionPotion",
        "name": "Crystal Sanction Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "II",
        "charges": 4,
        "effect": "+2% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking"
      }
    },
    {
      "id": "crystalSanctionPotionIII",
      "name": "晶裁丹·三阶",
      "melvorName": "Crystal Sanction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 6,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶裁丹，三阶药瓶",
      "description": "晶裁丹·三阶，充能 6。对标效果：+3% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystalSanctionPotion",
      "melvor": {
        "seriesId": "crystalSanctionPotion",
        "name": "Crystal Sanction Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "III",
        "charges": 6,
        "effect": "+3% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking"
      }
    },
    {
      "id": "crystalSanctionPotionIV",
      "name": "晶裁丹·四阶",
      "melvorName": "Crystal Sanction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "晶裁丹，四阶药瓶",
      "description": "晶裁丹·四阶，充能 10。对标效果：+4% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:crystalSanctionPotion",
      "melvor": {
        "seriesId": "crystalSanctionPotion",
        "name": "Crystal Sanction Potion",
        "realm": "melvor",
        "dlc": "Atlas of Discovery Expansion",
        "tier": "IV",
        "charges": 10,
        "effect": "+4% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking"
      }
    },
    {
      "id": "damageReductionPotionI",
      "name": "减伤丹·一阶",
      "melvorName": "Damage Reduction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "减伤丹，一阶药瓶",
      "description": "减伤丹·一阶，充能 10。对标效果：+2% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:damageReductionPotion",
      "melvor": {
        "seriesId": "damageReductionPotion",
        "name": "Damage Reduction Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "I",
        "charges": 10,
        "effect": "+2% Damage Reduction"
      }
    },
    {
      "id": "damageReductionPotionII",
      "name": "减伤丹·二阶",
      "melvorName": "Damage Reduction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "减伤丹，二阶药瓶",
      "description": "减伤丹·二阶，充能 15。对标效果：+4% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:damageReductionPotion",
      "melvor": {
        "seriesId": "damageReductionPotion",
        "name": "Damage Reduction Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "II",
        "charges": 15,
        "effect": "+4% Damage Reduction"
      }
    },
    {
      "id": "damageReductionPotionIII",
      "name": "减伤丹·三阶",
      "melvorName": "Damage Reduction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "减伤丹，三阶药瓶",
      "description": "减伤丹·三阶，充能 20。对标效果：+6% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:damageReductionPotion",
      "melvor": {
        "seriesId": "damageReductionPotion",
        "name": "Damage Reduction Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "III",
        "charges": 20,
        "effect": "+6% Damage Reduction"
      }
    },
    {
      "id": "damageReductionPotionIV",
      "name": "减伤丹·四阶",
      "melvorName": "Damage Reduction Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "减伤丹，四阶药瓶",
      "description": "减伤丹·四阶，充能 30。对标效果：+10% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:damageReductionPotion",
      "melvor": {
        "seriesId": "damageReductionPotion",
        "name": "Damage Reduction Potion",
        "realm": "melvor",
        "dlc": "Full Version",
        "tier": "IV",
        "charges": 30,
        "effect": "+10% Damage Reduction"
      }
    },
    {
      "id": "areaControlPotionI",
      "name": "控域丹·一阶",
      "melvorName": "Area Control Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控域丹，一阶药瓶",
      "description": "控域丹·一阶，充能 10。对标效果：+20% Flat Slayer Area Effect Negation。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:areaControlPotion",
      "melvor": {
        "seriesId": "areaControlPotion",
        "name": "Area Control Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+20% Flat Slayer Area Effect Negation"
      }
    },
    {
      "id": "areaControlPotionII",
      "name": "控域丹·二阶",
      "melvorName": "Area Control Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控域丹，二阶药瓶",
      "description": "控域丹·二阶，充能 20。对标效果：+30% Flat Slayer Area Effect Negation。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:areaControlPotion",
      "melvor": {
        "seriesId": "areaControlPotion",
        "name": "Area Control Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 20,
        "effect": "+30% Flat Slayer Area Effect Negation"
      }
    },
    {
      "id": "areaControlPotionIII",
      "name": "控域丹·三阶",
      "melvorName": "Area Control Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控域丹，三阶药瓶",
      "description": "控域丹·三阶，充能 35。对标效果：+40% Flat Slayer Area Effect Negation。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:areaControlPotion",
      "melvor": {
        "seriesId": "areaControlPotion",
        "name": "Area Control Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "+40% Flat Slayer Area Effect Negation"
      }
    },
    {
      "id": "areaControlPotionIV",
      "name": "控域丹·四阶",
      "melvorName": "Area Control Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "控域丹，四阶药瓶",
      "description": "控域丹·四阶，充能 50。对标效果：+50% Flat Slayer Area Effect Negation。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:areaControlPotion",
      "melvor": {
        "seriesId": "areaControlPotion",
        "name": "Area Control Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "+50% Flat Slayer Area Effect Negation"
      }
    },
    {
      "id": "alchemicPracticePotionI",
      "name": "炼丹熟习丹·一阶",
      "melvorName": "Alchemic Practice Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "炼丹熟习丹，一阶药瓶",
      "description": "炼丹熟习丹·一阶，充能 10。对标效果：+10% Chance to Double Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:alchemicPracticePotion",
      "melvor": {
        "seriesId": "alchemicPracticePotion",
        "name": "Alchemic Practice Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+10% Chance to Double Items in Herblore"
      }
    },
    {
      "id": "alchemicPracticePotionII",
      "name": "炼丹熟习丹·二阶",
      "melvorName": "Alchemic Practice Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "炼丹熟习丹，二阶药瓶",
      "description": "炼丹熟习丹·二阶，充能 15。对标效果：+15% Chance to Double Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:alchemicPracticePotion",
      "melvor": {
        "seriesId": "alchemicPracticePotion",
        "name": "Alchemic Practice Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 15,
        "effect": "+15% Chance to Double Items in Herblore"
      }
    },
    {
      "id": "alchemicPracticePotionIII",
      "name": "炼丹熟习丹·三阶",
      "melvorName": "Alchemic Practice Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "炼丹熟习丹，三阶药瓶",
      "description": "炼丹熟习丹·三阶，充能 20。对标效果：+20% Chance to Double Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:alchemicPracticePotion",
      "melvor": {
        "seriesId": "alchemicPracticePotion",
        "name": "Alchemic Practice Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 20,
        "effect": "+20% Chance to Double Items in Herblore"
      }
    },
    {
      "id": "alchemicPracticePotionIV",
      "name": "炼丹熟习丹·四阶",
      "melvorName": "Alchemic Practice Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "炼丹熟习丹，四阶药瓶",
      "description": "炼丹熟习丹·四阶，充能 30。对标效果：+25% Chance to Double Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:alchemicPracticePotion",
      "melvor": {
        "seriesId": "alchemicPracticePotion",
        "name": "Alchemic Practice Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 30,
        "effect": "+25% Chance to Double Items in Herblore"
      }
    },
    {
      "id": "adaptiveDefencePotionI",
      "name": "应变防御丹·一阶",
      "melvorName": "Adaptive Defence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变防御丹，一阶药瓶",
      "description": "应变防御丹·一阶，充能 20。对标效果：Evasion Ratings are multiplied by 1.75 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveDefencePotion",
      "melvor": {
        "seriesId": "adaptiveDefencePotion",
        "name": "Adaptive Defence Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 20,
        "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveDefencePotionII",
      "name": "应变防御丹·二阶",
      "melvorName": "Adaptive Defence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变防御丹，二阶药瓶",
      "description": "应变防御丹·二阶，充能 35。对标效果：Evasion Ratings are multiplied by 1.75 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveDefencePotion",
      "melvor": {
        "seriesId": "adaptiveDefencePotion",
        "name": "Adaptive Defence Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 35,
        "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveDefencePotionIII",
      "name": "应变防御丹·三阶",
      "melvorName": "Adaptive Defence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变防御丹，三阶药瓶",
      "description": "应变防御丹·三阶，充能 50。对标效果：Evasion Ratings are multiplied by 1.75 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveDefencePotion",
      "melvor": {
        "seriesId": "adaptiveDefencePotion",
        "name": "Adaptive Defence Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 50,
        "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveDefencePotionIV",
      "name": "应变防御丹·四阶",
      "melvorName": "Adaptive Defence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 75,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变防御丹，四阶药瓶",
      "description": "应变防御丹·四阶，充能 75。对标效果：Evasion Ratings are multiplied by 1.75 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveDefencePotion",
      "melvor": {
        "seriesId": "adaptiveDefencePotion",
        "name": "Adaptive Defence Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 75,
        "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent"
      }
    },
    {
      "id": "gemDetectorPotionI",
      "name": "寻宝石丹·一阶",
      "melvorName": "Gem Detector Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻宝石丹，一阶药瓶",
      "description": "寻宝石丹·一阶，充能 10。对标效果：+2% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gemDetectorPotion",
      "melvor": {
        "seriesId": "gemDetectorPotion",
        "name": "Gem Detector Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+2% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore"
      }
    },
    {
      "id": "gemDetectorPotionII",
      "name": "寻宝石丹·二阶",
      "melvorName": "Gem Detector Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻宝石丹，二阶药瓶",
      "description": "寻宝石丹·二阶，充能 20。对标效果：+4% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gemDetectorPotion",
      "melvor": {
        "seriesId": "gemDetectorPotion",
        "name": "Gem Detector Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 20,
        "effect": "+4% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore"
      }
    },
    {
      "id": "gemDetectorPotionIII",
      "name": "寻宝石丹·三阶",
      "melvorName": "Gem Detector Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻宝石丹，三阶药瓶",
      "description": "寻宝石丹·三阶，充能 30。对标效果：+7% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gemDetectorPotion",
      "melvor": {
        "seriesId": "gemDetectorPotion",
        "name": "Gem Detector Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 30,
        "effect": "+7% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore"
      }
    },
    {
      "id": "gemDetectorPotionIV",
      "name": "寻宝石丹·四阶",
      "melvorName": "Gem Detector Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 40,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻宝石丹，四阶药瓶",
      "description": "寻宝石丹·四阶，充能 40。对标效果：+10% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gemDetectorPotion",
      "melvor": {
        "seriesId": "gemDetectorPotion",
        "name": "Gem Detector Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 40,
        "effect": "+10% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore"
      }
    },
    {
      "id": "slayerBountyPotionI",
      "name": "猎妖赏金丹·一阶",
      "melvorName": "Slayer Bounty Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "猎妖赏金丹，一阶药瓶",
      "description": "猎妖赏金丹·一阶，充能 10。对标效果：+10% Global Slayer Coins (except Item Sales) and +10% chance for a Slayer Task kill to count as 2 kills.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:slayerBountyPotion",
      "melvor": {
        "seriesId": "slayerBountyPotion",
        "name": "Slayer Bounty Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+10% Global Slayer Coins (except Item Sales) and +10% chance for a Slayer Task kill to count as 2 kills."
      }
    },
    {
      "id": "slayerBountyPotionII",
      "name": "猎妖赏金丹·二阶",
      "melvorName": "Slayer Bounty Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "猎妖赏金丹，二阶药瓶",
      "description": "猎妖赏金丹·二阶，充能 15。对标效果：+15% Global Slayer Coins (except Item Sales) and +15% chance for a Slayer Task kill to count as 2 kills.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:slayerBountyPotion",
      "melvor": {
        "seriesId": "slayerBountyPotion",
        "name": "Slayer Bounty Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 15,
        "effect": "+15% Global Slayer Coins (except Item Sales) and +15% chance for a Slayer Task kill to count as 2 kills."
      }
    },
    {
      "id": "slayerBountyPotionIII",
      "name": "猎妖赏金丹·三阶",
      "melvorName": "Slayer Bounty Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "猎妖赏金丹，三阶药瓶",
      "description": "猎妖赏金丹·三阶，充能 20。对标效果：+20% Global Slayer Coins (except Item Sales) and +20% chance for a Slayer Task kill to count as 2 kills.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:slayerBountyPotion",
      "melvor": {
        "seriesId": "slayerBountyPotion",
        "name": "Slayer Bounty Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 20,
        "effect": "+20% Global Slayer Coins (except Item Sales) and +20% chance for a Slayer Task kill to count as 2 kills."
      }
    },
    {
      "id": "slayerBountyPotionIV",
      "name": "猎妖赏金丹·四阶",
      "melvorName": "Slayer Bounty Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "猎妖赏金丹，四阶药瓶",
      "description": "猎妖赏金丹·四阶，充能 30。对标效果：+25% Global Slayer Coins (except Item Sales) and +25% chance for a Slayer Task kill to count as 2 kills.。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:slayerBountyPotion",
      "melvor": {
        "seriesId": "slayerBountyPotion",
        "name": "Slayer Bounty Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 30,
        "effect": "+25% Global Slayer Coins (except Item Sales) and +25% chance for a Slayer Task kill to count as 2 kills."
      }
    },
    {
      "id": "multicookerPotionI",
      "name": "复烹丹·一阶",
      "melvorName": "Multicooker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "复烹丹，一阶药瓶",
      "description": "复烹丹·一阶，充能 10。对标效果：-10% Passive Cook Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:multicookerPotion",
      "melvor": {
        "seriesId": "multicookerPotion",
        "name": "Multicooker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "-10% Passive Cook Interval"
      }
    },
    {
      "id": "multicookerPotionII",
      "name": "复烹丹·二阶",
      "melvorName": "Multicooker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "复烹丹，二阶药瓶",
      "description": "复烹丹·二阶，充能 20。对标效果：-15% Passive Cook Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:multicookerPotion",
      "melvor": {
        "seriesId": "multicookerPotion",
        "name": "Multicooker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 20,
        "effect": "-15% Passive Cook Interval"
      }
    },
    {
      "id": "multicookerPotionIII",
      "name": "复烹丹·三阶",
      "melvorName": "Multicooker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "复烹丹，三阶药瓶",
      "description": "复烹丹·三阶，充能 30。对标效果：-25% Passive Cook Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:multicookerPotion",
      "melvor": {
        "seriesId": "multicookerPotion",
        "name": "Multicooker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 30,
        "effect": "-25% Passive Cook Interval"
      }
    },
    {
      "id": "multicookerPotionIV",
      "name": "复烹丹·四阶",
      "melvorName": "Multicooker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "复烹丹，四阶药瓶",
      "description": "复烹丹·四阶，充能 50。对标效果：-40% Passive Cook Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:multicookerPotion",
      "melvor": {
        "seriesId": "multicookerPotion",
        "name": "Multicooker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "-40% Passive Cook Interval"
      }
    },
    {
      "id": "holyBulwarkPotionI",
      "name": "圣壁丹·一阶",
      "melvorName": "Holy Bulwark Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "圣壁丹，一阶药瓶",
      "description": "圣壁丹·一阶，充能 10。对标效果：+1% of all damage taken is added as Prayer Points (Rounded down)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:holyBulwarkPotion",
      "melvor": {
        "seriesId": "holyBulwarkPotion",
        "name": "Holy Bulwark Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)"
      }
    },
    {
      "id": "holyBulwarkPotionII",
      "name": "圣壁丹·二阶",
      "melvorName": "Holy Bulwark Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "圣壁丹，二阶药瓶",
      "description": "圣壁丹·二阶，充能 15。对标效果：+1% of all damage taken is added as Prayer Points (Rounded down)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:holyBulwarkPotion",
      "melvor": {
        "seriesId": "holyBulwarkPotion",
        "name": "Holy Bulwark Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 15,
        "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)"
      }
    },
    {
      "id": "holyBulwarkPotionIII",
      "name": "圣壁丹·三阶",
      "melvorName": "Holy Bulwark Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "圣壁丹，三阶药瓶",
      "description": "圣壁丹·三阶，充能 20。对标效果：+1% of all damage taken is added as Prayer Points (Rounded down)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:holyBulwarkPotion",
      "melvor": {
        "seriesId": "holyBulwarkPotion",
        "name": "Holy Bulwark Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 20,
        "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)"
      }
    },
    {
      "id": "holyBulwarkPotionIV",
      "name": "圣壁丹·四阶",
      "melvorName": "Holy Bulwark Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 30,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "圣壁丹，四阶药瓶",
      "description": "圣壁丹·四阶，充能 30。对标效果：+1% of all damage taken is added as Prayer Points (Rounded down)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:holyBulwarkPotion",
      "melvor": {
        "seriesId": "holyBulwarkPotion",
        "name": "Holy Bulwark Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 30,
        "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)"
      }
    },
    {
      "id": "starSeekerPotionI",
      "name": "寻星丹·一阶",
      "melvorName": "Star Seeker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻星丹，一阶药瓶",
      "description": "寻星丹·一阶，充能 15。对标效果：+1% chance to gain Golden Stardust in Astrology。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:starSeekerPotion",
      "melvor": {
        "seriesId": "starSeekerPotion",
        "name": "Star Seeker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 15,
        "effect": "+1% chance to gain Golden Stardust in Astrology"
      }
    },
    {
      "id": "starSeekerPotionII",
      "name": "寻星丹·二阶",
      "melvorName": "Star Seeker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻星丹，二阶药瓶",
      "description": "寻星丹·二阶，充能 25。对标效果：+2% chance to gain Golden Stardust in Astrology。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:starSeekerPotion",
      "melvor": {
        "seriesId": "starSeekerPotion",
        "name": "Star Seeker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 25,
        "effect": "+2% chance to gain Golden Stardust in Astrology"
      }
    },
    {
      "id": "starSeekerPotionIII",
      "name": "寻星丹·三阶",
      "melvorName": "Star Seeker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻星丹，三阶药瓶",
      "description": "寻星丹·三阶，充能 35。对标效果：+3% chance to gain Golden Stardust in Astrology。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:starSeekerPotion",
      "melvor": {
        "seriesId": "starSeekerPotion",
        "name": "Star Seeker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "+3% chance to gain Golden Stardust in Astrology"
      }
    },
    {
      "id": "starSeekerPotionIV",
      "name": "寻星丹·四阶",
      "melvorName": "Star Seeker Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "寻星丹，四阶药瓶",
      "description": "寻星丹·四阶，充能 50。对标效果：+5% chance to gain Golden Stardust in Astrology。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:starSeekerPotion",
      "melvor": {
        "seriesId": "starSeekerPotion",
        "name": "Star Seeker Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "+5% chance to gain Golden Stardust in Astrology"
      }
    },
    {
      "id": "trapsPotionI",
      "name": "陷阱丹·一阶",
      "melvorName": "Traps Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 5,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "陷阱丹，一阶药瓶",
      "description": "陷阱丹·一阶，充能 5。对标效果：+2% Agility Skill XP from Obstacles that contain a negative modifier and +2% Agility Mastery XP from Obstacles that contain a negative modifier and +20% GP from Agility Obstacles that contain a negative modifier。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:trapsPotion",
      "melvor": {
        "seriesId": "trapsPotion",
        "name": "Traps Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 5,
        "effect": "+2% Agility Skill XP from Obstacles that contain a negative modifier and +2% Agility Mastery XP from Obstacles that contain a negative modifier and +20% GP from Agility Obstacles that contain a negative modifier"
      }
    },
    {
      "id": "trapsPotionII",
      "name": "陷阱丹·二阶",
      "melvorName": "Traps Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "陷阱丹，二阶药瓶",
      "description": "陷阱丹·二阶，充能 10。对标效果：+3% Agility Skill XP from Obstacles that contain a negative modifier and +3% Agility Mastery XP from Obstacles that contain a negative modifier and +30% GP from Agility Obstacles that contain a negative modifier。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:trapsPotion",
      "melvor": {
        "seriesId": "trapsPotion",
        "name": "Traps Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 10,
        "effect": "+3% Agility Skill XP from Obstacles that contain a negative modifier and +3% Agility Mastery XP from Obstacles that contain a negative modifier and +30% GP from Agility Obstacles that contain a negative modifier"
      }
    },
    {
      "id": "trapsPotionIII",
      "name": "陷阱丹·三阶",
      "melvorName": "Traps Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "陷阱丹，三阶药瓶",
      "description": "陷阱丹·三阶，充能 15。对标效果：+4% Agility Skill XP from Obstacles that contain a negative modifier and +4% Agility Mastery XP from Obstacles that contain a negative modifier and +40% GP from Agility Obstacles that contain a negative modifier。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:trapsPotion",
      "melvor": {
        "seriesId": "trapsPotion",
        "name": "Traps Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 15,
        "effect": "+4% Agility Skill XP from Obstacles that contain a negative modifier and +4% Agility Mastery XP from Obstacles that contain a negative modifier and +40% GP from Agility Obstacles that contain a negative modifier"
      }
    },
    {
      "id": "trapsPotionIV",
      "name": "陷阱丹·四阶",
      "melvorName": "Traps Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "陷阱丹，四阶药瓶",
      "description": "陷阱丹·四阶，充能 20。对标效果：+5% Agility Skill XP from Obstacles that contain a negative modifier and +5% Agility Mastery XP from Obstacles that contain a negative modifier and +50% GP from Agility Obstacles that contain a negative modifier。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:trapsPotion",
      "melvor": {
        "seriesId": "trapsPotion",
        "name": "Traps Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 20,
        "effect": "+5% Agility Skill XP from Obstacles that contain a negative modifier and +5% Agility Mastery XP from Obstacles that contain a negative modifier and +50% GP from Agility Obstacles that contain a negative modifier"
      }
    },
    {
      "id": "adaptiveAccuracyPotionI",
      "name": "应变精准丹·一阶",
      "melvorName": "Adaptive Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变精准丹，一阶药瓶",
      "description": "应变精准丹·一阶，充能 20。对标效果：Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion",
      "melvor": {
        "seriesId": "adaptiveAccuracyPotion",
        "name": "Adaptive Accuracy Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 20,
        "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveAccuracyPotionII",
      "name": "应变精准丹·二阶",
      "melvorName": "Adaptive Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变精准丹，二阶药瓶",
      "description": "应变精准丹·二阶，充能 35。对标效果：Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion",
      "melvor": {
        "seriesId": "adaptiveAccuracyPotion",
        "name": "Adaptive Accuracy Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 35,
        "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveAccuracyPotionIII",
      "name": "应变精准丹·三阶",
      "melvorName": "Adaptive Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变精准丹，三阶药瓶",
      "description": "应变精准丹·三阶，充能 50。对标效果：Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion",
      "melvor": {
        "seriesId": "adaptiveAccuracyPotion",
        "name": "Adaptive Accuracy Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 50,
        "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent"
      }
    },
    {
      "id": "adaptiveAccuracyPotionIV",
      "name": "应变精准丹·四阶",
      "melvorName": "Adaptive Accuracy Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 75,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "应变精准丹，四阶药瓶",
      "description": "应变精准丹·四阶，充能 75。对标效果：Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:adaptiveAccuracyPotion",
      "melvor": {
        "seriesId": "adaptiveAccuracyPotion",
        "name": "Adaptive Accuracy Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 75,
        "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent"
      }
    },
    {
      "id": "reaperPotionI",
      "name": "收割丹·一阶",
      "melvorName": "Reaper Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "收割丹，一阶药瓶",
      "description": "收割丹·一阶，充能 15。对标效果：+30% Bleed lifesteal, +30% Burn lifesteal, and +30% Poison lifesteal。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:reaperPotion",
      "melvor": {
        "seriesId": "reaperPotion",
        "name": "Reaper Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 15,
        "effect": "+30% Bleed lifesteal, +30% Burn lifesteal, and +30% Poison lifesteal"
      }
    },
    {
      "id": "reaperPotionII",
      "name": "收割丹·二阶",
      "melvorName": "Reaper Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "收割丹，二阶药瓶",
      "description": "收割丹·二阶，充能 25。对标效果：+40% Bleed lifesteal, +40% Burn lifesteal, and +40% Poison lifesteal。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:reaperPotion",
      "melvor": {
        "seriesId": "reaperPotion",
        "name": "Reaper Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 25,
        "effect": "+40% Bleed lifesteal, +40% Burn lifesteal, and +40% Poison lifesteal"
      }
    },
    {
      "id": "reaperPotionIII",
      "name": "收割丹·三阶",
      "melvorName": "Reaper Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "收割丹，三阶药瓶",
      "description": "收割丹·三阶，充能 35。对标效果：+50% Bleed lifesteal, +50% Burn lifesteal, and +50% Poison lifesteal。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:reaperPotion",
      "melvor": {
        "seriesId": "reaperPotion",
        "name": "Reaper Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "+50% Bleed lifesteal, +50% Burn lifesteal, and +50% Poison lifesteal"
      }
    },
    {
      "id": "reaperPotionIV",
      "name": "收割丹·四阶",
      "melvorName": "Reaper Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "收割丹，四阶药瓶",
      "description": "收割丹·四阶，充能 50。对标效果：+75% Bleed lifesteal, +75% Burn lifesteal, and +75% Poison lifesteal。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:reaperPotion",
      "melvor": {
        "seriesId": "reaperPotion",
        "name": "Reaper Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "+75% Bleed lifesteal, +75% Burn lifesteal, and +75% Poison lifesteal"
      }
    },
    {
      "id": "blacksmithPotionI",
      "name": "锻匠丹·一阶",
      "melvorName": "Blacksmith Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "锻匠丹，一阶药瓶",
      "description": "锻匠丹·一阶，充能 15。对标效果：+5% Chance to Double Items in Smithing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:blacksmithPotion",
      "melvor": {
        "seriesId": "blacksmithPotion",
        "name": "Blacksmith Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 15,
        "effect": "+5% Chance to Double Items in Smithing"
      }
    },
    {
      "id": "blacksmithPotionII",
      "name": "锻匠丹·二阶",
      "melvorName": "Blacksmith Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "锻匠丹，二阶药瓶",
      "description": "锻匠丹·二阶，充能 25。对标效果：+10% Chance to Double Items in Smithing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:blacksmithPotion",
      "melvor": {
        "seriesId": "blacksmithPotion",
        "name": "Blacksmith Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 25,
        "effect": "+10% Chance to Double Items in Smithing"
      }
    },
    {
      "id": "blacksmithPotionIII",
      "name": "锻匠丹·三阶",
      "melvorName": "Blacksmith Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "锻匠丹，三阶药瓶",
      "description": "锻匠丹·三阶，充能 35。对标效果：+15% Chance to Double Items in Smithing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:blacksmithPotion",
      "melvor": {
        "seriesId": "blacksmithPotion",
        "name": "Blacksmith Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "+15% Chance to Double Items in Smithing"
      }
    },
    {
      "id": "blacksmithPotionIV",
      "name": "锻匠丹·四阶",
      "melvorName": "Blacksmith Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "锻匠丹，四阶药瓶",
      "description": "锻匠丹·四阶，充能 50。对标效果：+20% Chance to Double Items in Smithing。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:blacksmithPotion",
      "melvor": {
        "seriesId": "blacksmithPotion",
        "name": "Blacksmith Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "+20% Chance to Double Items in Smithing"
      }
    },
    {
      "id": "enkindledYieldsPotionI",
      "name": "引火丰产丹·一阶",
      "melvorName": "Enkindled Yields Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "引火丰产丹，一阶药瓶",
      "description": "引火丰产丹·一阶，充能 15。对标效果：+10% Chance to Double Items in Firemaking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:enkindledYieldsPotion",
      "melvor": {
        "seriesId": "enkindledYieldsPotion",
        "name": "Enkindled Yields Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 15,
        "effect": "+10% Chance to Double Items in Firemaking"
      }
    },
    {
      "id": "enkindledYieldsPotionII",
      "name": "引火丰产丹·二阶",
      "melvorName": "Enkindled Yields Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "引火丰产丹，二阶药瓶",
      "description": "引火丰产丹·二阶，充能 25。对标效果：+15% Chance to Double Items in Firemaking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:enkindledYieldsPotion",
      "melvor": {
        "seriesId": "enkindledYieldsPotion",
        "name": "Enkindled Yields Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 25,
        "effect": "+15% Chance to Double Items in Firemaking"
      }
    },
    {
      "id": "enkindledYieldsPotionIII",
      "name": "引火丰产丹·三阶",
      "melvorName": "Enkindled Yields Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "引火丰产丹，三阶药瓶",
      "description": "引火丰产丹·三阶，充能 35。对标效果：+20% Chance to Double Items in Firemaking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:enkindledYieldsPotion",
      "melvor": {
        "seriesId": "enkindledYieldsPotion",
        "name": "Enkindled Yields Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "+20% Chance to Double Items in Firemaking"
      }
    },
    {
      "id": "enkindledYieldsPotionIV",
      "name": "引火丰产丹·四阶",
      "melvorName": "Enkindled Yields Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "引火丰产丹，四阶药瓶",
      "description": "引火丰产丹·四阶，充能 50。对标效果：+25% Chance to Double Items in Firemaking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:enkindledYieldsPotion",
      "melvor": {
        "seriesId": "enkindledYieldsPotion",
        "name": "Enkindled Yields Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "+25% Chance to Double Items in Firemaking"
      }
    },
    {
      "id": "penetrationPotionI",
      "name": "穿透丹·一阶",
      "melvorName": "Penetration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "穿透丹，一阶药瓶",
      "description": "穿透丹·一阶，充能 10。对标效果：Gives the Enemy: -2% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:penetrationPotion",
      "melvor": {
        "seriesId": "penetrationPotion",
        "name": "Penetration Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "Gives the Enemy: -2% Damage Reduction"
      }
    },
    {
      "id": "penetrationPotionII",
      "name": "穿透丹·二阶",
      "melvorName": "Penetration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "穿透丹，二阶药瓶",
      "description": "穿透丹·二阶，充能 15。对标效果：Gives the Enemy: -4% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:penetrationPotion",
      "melvor": {
        "seriesId": "penetrationPotion",
        "name": "Penetration Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 15,
        "effect": "Gives the Enemy: -4% Damage Reduction"
      }
    },
    {
      "id": "penetrationPotionIII",
      "name": "穿透丹·三阶",
      "melvorName": "Penetration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 20,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "穿透丹，三阶药瓶",
      "description": "穿透丹·三阶，充能 20。对标效果：Gives the Enemy: -6% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:penetrationPotion",
      "melvor": {
        "seriesId": "penetrationPotion",
        "name": "Penetration Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 20,
        "effect": "Gives the Enemy: -6% Damage Reduction"
      }
    },
    {
      "id": "penetrationPotionIV",
      "name": "穿透丹·四阶",
      "melvorName": "Penetration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "穿透丹，四阶药瓶",
      "description": "穿透丹·四阶，充能 25。对标效果：Gives the Enemy: -8% Damage Reduction。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:penetrationPotion",
      "melvor": {
        "seriesId": "penetrationPotion",
        "name": "Penetration Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 25,
        "effect": "Gives the Enemy: -8% Damage Reduction"
      }
    },
    {
      "id": "altMagicPotionI",
      "name": "异术丹·一阶",
      "melvorName": "Alt. Magic Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "异术丹，一阶药瓶",
      "description": "异术丹·一阶，充能 15。对标效果：-5% Magic Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:altMagicPotion",
      "melvor": {
        "seriesId": "altMagicPotion",
        "name": "Alt. Magic Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 15,
        "effect": "-5% Magic Interval"
      }
    },
    {
      "id": "altMagicPotionII",
      "name": "异术丹·二阶",
      "melvorName": "Alt. Magic Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "异术丹，二阶药瓶",
      "description": "异术丹·二阶，充能 25。对标效果：-10% Magic Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:altMagicPotion",
      "melvor": {
        "seriesId": "altMagicPotion",
        "name": "Alt. Magic Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 25,
        "effect": "-10% Magic Interval"
      }
    },
    {
      "id": "altMagicPotionIII",
      "name": "异术丹·三阶",
      "melvorName": "Alt. Magic Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "异术丹，三阶药瓶",
      "description": "异术丹·三阶，充能 35。对标效果：-15% Magic Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:altMagicPotion",
      "melvor": {
        "seriesId": "altMagicPotion",
        "name": "Alt. Magic Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 35,
        "effect": "-15% Magic Interval"
      }
    },
    {
      "id": "altMagicPotionIV",
      "name": "异术丹·四阶",
      "melvorName": "Alt. Magic Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 50,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "异术丹，四阶药瓶",
      "description": "异术丹·四阶，充能 50。对标效果：-20% Magic Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:altMagicPotion",
      "melvor": {
        "seriesId": "altMagicPotion",
        "name": "Alt. Magic Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 50,
        "effect": "-20% Magic Interval"
      }
    },
    {
      "id": "criticalStrikePotionI",
      "name": "会心丹·一阶",
      "melvorName": "Critical Strike Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 10,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "会心丹，一阶药瓶",
      "description": "会心丹·一阶，充能 10。对标效果：+5% Melee critical hit chance, +5% Ranged critical hit chance, and +5% Magic critical hit chance。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:criticalStrikePotion",
      "melvor": {
        "seriesId": "criticalStrikePotion",
        "name": "Critical Strike Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "I",
        "charges": 10,
        "effect": "+5% Melee critical hit chance, +5% Ranged critical hit chance, and +5% Magic critical hit chance"
      }
    },
    {
      "id": "criticalStrikePotionII",
      "name": "会心丹·二阶",
      "melvorName": "Critical Strike Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 15,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "会心丹，二阶药瓶",
      "description": "会心丹·二阶，充能 15。对标效果：+10% Melee critical hit chance, +10% Ranged critical hit chance, and +10% Magic critical hit chance。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:criticalStrikePotion",
      "melvor": {
        "seriesId": "criticalStrikePotion",
        "name": "Critical Strike Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "II",
        "charges": 15,
        "effect": "+10% Melee critical hit chance, +10% Ranged critical hit chance, and +10% Magic critical hit chance"
      }
    },
    {
      "id": "criticalStrikePotionIII",
      "name": "会心丹·三阶",
      "melvorName": "Critical Strike Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 25,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "会心丹，三阶药瓶",
      "description": "会心丹·三阶，充能 25。对标效果：+15% Melee critical hit chance, +15% Ranged critical hit chance, and +15% Magic critical hit chance。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:criticalStrikePotion",
      "melvor": {
        "seriesId": "criticalStrikePotion",
        "name": "Critical Strike Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "III",
        "charges": 25,
        "effect": "+15% Melee critical hit chance, +15% Ranged critical hit chance, and +15% Magic critical hit chance"
      }
    },
    {
      "id": "criticalStrikePotionIV",
      "name": "会心丹·四阶",
      "melvorName": "Critical Strike Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 35,
      "icon": "🧪",
      "visualFamily": "potion-herblore",
      "artDetail": "会心丹，四阶药瓶",
      "description": "会心丹·四阶，充能 35。对标效果：+20% Melee critical hit chance, +20% Ranged critical hit chance, and +20% Magic critical hit chance。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:criticalStrikePotion",
      "melvor": {
        "seriesId": "criticalStrikePotion",
        "name": "Critical Strike Potion",
        "realm": "melvor",
        "dlc": "Throne of the Herald Expansion",
        "tier": "IV",
        "charges": 35,
        "effect": "+20% Melee critical hit chance, +20% Ranged critical hit chance, and +20% Magic critical hit chance"
      }
    },
    {
      "id": "harvesterSPotionI",
      "name": "采收丹·一阶",
      "melvorName": "Harvester's Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "采收丹，一阶药瓶",
      "description": "采收丹·一阶，充能 1。对标效果：-2% Harvesting Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:harvesterSPotion",
      "melvor": {
        "seriesId": "harvesterSPotion",
        "name": "Harvester's Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "-2% Harvesting Interval"
      }
    },
    {
      "id": "harvesterSPotionII",
      "name": "采收丹·二阶",
      "melvorName": "Harvester's Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "采收丹，二阶药瓶",
      "description": "采收丹·二阶，充能 2。对标效果：-4% Harvesting Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:harvesterSPotion",
      "melvor": {
        "seriesId": "harvesterSPotion",
        "name": "Harvester's Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "-4% Harvesting Interval"
      }
    },
    {
      "id": "harvesterSPotionIII",
      "name": "采收丹·三阶",
      "melvorName": "Harvester's Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "采收丹，三阶药瓶",
      "description": "采收丹·三阶，充能 3。对标效果：-6% Harvesting Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:harvesterSPotion",
      "melvor": {
        "seriesId": "harvesterSPotion",
        "name": "Harvester's Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "-6% Harvesting Interval"
      }
    },
    {
      "id": "harvesterSPotionIV",
      "name": "采收丹·四阶",
      "melvorName": "Harvester's Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "采收丹，四阶药瓶",
      "description": "采收丹·四阶，充能 4。对标效果：-8% Harvesting Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:harvesterSPotion",
      "melvor": {
        "seriesId": "harvesterSPotion",
        "name": "Harvester's Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "-8% Harvesting Interval"
      }
    },
    {
      "id": "corruptedFighterPotionI",
      "name": "腐化斗士丹·一阶",
      "melvorName": "Corrupted Fighter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "腐化斗士丹，一阶药瓶",
      "description": "腐化斗士丹·一阶，充能 1。对标效果：+2% Corruption Abyssal XP。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:corruptedFighterPotion",
      "melvor": {
        "seriesId": "corruptedFighterPotion",
        "name": "Corrupted Fighter Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+2% Corruption Abyssal XP"
      }
    },
    {
      "id": "corruptedFighterPotionII",
      "name": "腐化斗士丹·二阶",
      "melvorName": "Corrupted Fighter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "腐化斗士丹，二阶药瓶",
      "description": "腐化斗士丹·二阶，充能 2。对标效果：+4% Corruption Abyssal XP。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:corruptedFighterPotion",
      "melvor": {
        "seriesId": "corruptedFighterPotion",
        "name": "Corrupted Fighter Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+4% Corruption Abyssal XP"
      }
    },
    {
      "id": "corruptedFighterPotionIII",
      "name": "腐化斗士丹·三阶",
      "melvorName": "Corrupted Fighter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "腐化斗士丹，三阶药瓶",
      "description": "腐化斗士丹·三阶，充能 3。对标效果：+6% Corruption Abyssal XP。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:corruptedFighterPotion",
      "melvor": {
        "seriesId": "corruptedFighterPotion",
        "name": "Corrupted Fighter Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+6% Corruption Abyssal XP"
      }
    },
    {
      "id": "corruptedFighterPotionIV",
      "name": "腐化斗士丹·四阶",
      "melvorName": "Corrupted Fighter Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "腐化斗士丹，四阶药瓶",
      "description": "腐化斗士丹·四阶，充能 4。对标效果：+8% Corruption Abyssal XP。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:corruptedFighterPotion",
      "melvor": {
        "seriesId": "corruptedFighterPotion",
        "name": "Corrupted Fighter Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+8% Corruption Abyssal XP"
      }
    },
    {
      "id": "piecesFinderPotionI",
      "name": "残片搜寻丹·一阶",
      "melvorName": "Pieces Finder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "残片搜寻丹，一阶药瓶",
      "description": "残片搜寻丹·一阶，充能 1。对标效果：+5% AP from Combat。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:piecesFinderPotion",
      "melvor": {
        "seriesId": "piecesFinderPotion",
        "name": "Pieces Finder Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% AP from Combat"
      }
    },
    {
      "id": "piecesFinderPotionII",
      "name": "残片搜寻丹·二阶",
      "melvorName": "Pieces Finder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "残片搜寻丹，二阶药瓶",
      "description": "残片搜寻丹·二阶，充能 2。对标效果：+10% AP from Combat。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:piecesFinderPotion",
      "melvor": {
        "seriesId": "piecesFinderPotion",
        "name": "Pieces Finder Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% AP from Combat"
      }
    },
    {
      "id": "piecesFinderPotionIII",
      "name": "残片搜寻丹·三阶",
      "melvorName": "Pieces Finder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "残片搜寻丹，三阶药瓶",
      "description": "残片搜寻丹·三阶，充能 3。对标效果：+15% AP from Combat。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:piecesFinderPotion",
      "melvor": {
        "seriesId": "piecesFinderPotion",
        "name": "Pieces Finder Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% AP from Combat"
      }
    },
    {
      "id": "piecesFinderPotionIV",
      "name": "残片搜寻丹·四阶",
      "melvorName": "Pieces Finder Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "残片搜寻丹，四阶药瓶",
      "description": "残片搜寻丹·四阶，充能 4。对标效果：+20% AP from Combat。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:piecesFinderPotion",
      "melvor": {
        "seriesId": "piecesFinderPotion",
        "name": "Pieces Finder Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% AP from Combat"
      }
    },
    {
      "id": "lacerationPotionI",
      "name": "撕裂丹·一阶",
      "melvorName": "Laceration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "撕裂丹，一阶药瓶",
      "description": "撕裂丹·一阶，充能 1。对标效果：+10% chance to apply Laceration when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lacerationPotion",
      "melvor": {
        "seriesId": "lacerationPotion",
        "name": "Laceration Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+10% chance to apply Laceration when hitting with an attack"
      }
    },
    {
      "id": "lacerationPotionII",
      "name": "撕裂丹·二阶",
      "melvorName": "Laceration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "撕裂丹，二阶药瓶",
      "description": "撕裂丹·二阶，充能 2。对标效果：+20% chance to apply Laceration when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lacerationPotion",
      "melvor": {
        "seriesId": "lacerationPotion",
        "name": "Laceration Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+20% chance to apply Laceration when hitting with an attack"
      }
    },
    {
      "id": "lacerationPotionIII",
      "name": "撕裂丹·三阶",
      "melvorName": "Laceration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "撕裂丹，三阶药瓶",
      "description": "撕裂丹·三阶，充能 3。对标效果：+30% chance to apply Laceration when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lacerationPotion",
      "melvor": {
        "seriesId": "lacerationPotion",
        "name": "Laceration Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+30% chance to apply Laceration when hitting with an attack"
      }
    },
    {
      "id": "lacerationPotionIV",
      "name": "撕裂丹·四阶",
      "melvorName": "Laceration Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "撕裂丹，四阶药瓶",
      "description": "撕裂丹·四阶，充能 4。对标效果：+40% chance to apply Laceration when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:lacerationPotion",
      "melvor": {
        "seriesId": "lacerationPotion",
        "name": "Laceration Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+40% chance to apply Laceration when hitting with an attack"
      }
    },
    {
      "id": "gloomgrowthPotionI",
      "name": "幽生丹·一阶",
      "melvorName": "Gloomgrowth Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "幽生丹，一阶药瓶",
      "description": "幽生丹·一阶，充能 1。对标效果：+20% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gloomgrowthPotion",
      "melvor": {
        "seriesId": "gloomgrowthPotion",
        "name": "Gloomgrowth Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+20% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval"
      }
    },
    {
      "id": "gloomgrowthPotionII",
      "name": "幽生丹·二阶",
      "melvorName": "Gloomgrowth Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "幽生丹，二阶药瓶",
      "description": "幽生丹·二阶，充能 2。对标效果：+25% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gloomgrowthPotion",
      "melvor": {
        "seriesId": "gloomgrowthPotion",
        "name": "Gloomgrowth Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+25% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval"
      }
    },
    {
      "id": "gloomgrowthPotionIII",
      "name": "幽生丹·三阶",
      "melvorName": "Gloomgrowth Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "幽生丹，三阶药瓶",
      "description": "幽生丹·三阶，充能 3。对标效果：+30% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gloomgrowthPotion",
      "melvor": {
        "seriesId": "gloomgrowthPotion",
        "name": "Gloomgrowth Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+30% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval"
      }
    },
    {
      "id": "gloomgrowthPotionIV",
      "name": "幽生丹·四阶",
      "melvorName": "Gloomgrowth Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "幽生丹，四阶药瓶",
      "description": "幽生丹·四阶，充能 4。对标效果：+40% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:gloomgrowthPotion",
      "melvor": {
        "seriesId": "gloomgrowthPotion",
        "name": "Gloomgrowth Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+40% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval"
      }
    },
    {
      "id": "blightedTouchPotionI",
      "name": "凋触丹·一阶",
      "melvorName": "Blighted Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "凋触丹，一阶药瓶",
      "description": "凋触丹·一阶，充能 1。对标效果：+2% chance to ignore Blight and +2% chance to apply Blight when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:blightedTouchPotion",
      "melvor": {
        "seriesId": "blightedTouchPotion",
        "name": "Blighted Touch Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+2% chance to ignore Blight and +2% chance to apply Blight when hitting with an attack"
      }
    },
    {
      "id": "blightedTouchPotionII",
      "name": "凋触丹·二阶",
      "melvorName": "Blighted Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "凋触丹，二阶药瓶",
      "description": "凋触丹·二阶，充能 2。对标效果：+4% chance to ignore Blight and +4% chance to apply Blight when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:blightedTouchPotion",
      "melvor": {
        "seriesId": "blightedTouchPotion",
        "name": "Blighted Touch Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+4% chance to ignore Blight and +4% chance to apply Blight when hitting with an attack"
      }
    },
    {
      "id": "blightedTouchPotionIII",
      "name": "凋触丹·三阶",
      "melvorName": "Blighted Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "凋触丹，三阶药瓶",
      "description": "凋触丹·三阶，充能 3。对标效果：+6% chance to ignore Blight and +6% chance to apply Blight when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:blightedTouchPotion",
      "melvor": {
        "seriesId": "blightedTouchPotion",
        "name": "Blighted Touch Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+6% chance to ignore Blight and +6% chance to apply Blight when hitting with an attack"
      }
    },
    {
      "id": "blightedTouchPotionIV",
      "name": "凋触丹·四阶",
      "melvorName": "Blighted Touch Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "凋触丹，四阶药瓶",
      "description": "凋触丹·四阶，充能 4。对标效果：+8% chance to ignore Blight and +8% chance to apply Blight when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:blightedTouchPotion",
      "melvor": {
        "seriesId": "blightedTouchPotion",
        "name": "Blighted Touch Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+8% chance to ignore Blight and +8% chance to apply Blight when hitting with an attack"
      }
    },
    {
      "id": "abyssalMinerPotionI",
      "name": "深渊采矿丹·一阶",
      "melvorName": "Abyssal Miner Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊采矿丹，一阶药瓶",
      "description": "深渊采矿丹·一阶，充能 1。对标效果：+0.10% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalMinerPotion",
      "melvor": {
        "seriesId": "abyssalMinerPotion",
        "name": "Abyssal Miner Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+0.10% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes"
      }
    },
    {
      "id": "abyssalMinerPotionII",
      "name": "深渊采矿丹·二阶",
      "melvorName": "Abyssal Miner Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊采矿丹，二阶药瓶",
      "description": "深渊采矿丹·二阶，充能 2。对标效果：+0.20% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalMinerPotion",
      "melvor": {
        "seriesId": "abyssalMinerPotion",
        "name": "Abyssal Miner Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+0.20% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes"
      }
    },
    {
      "id": "abyssalMinerPotionIII",
      "name": "深渊采矿丹·三阶",
      "melvorName": "Abyssal Miner Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊采矿丹，三阶药瓶",
      "description": "深渊采矿丹·三阶，充能 3。对标效果：+0.30% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalMinerPotion",
      "melvor": {
        "seriesId": "abyssalMinerPotion",
        "name": "Abyssal Miner Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+0.30% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes"
      }
    },
    {
      "id": "abyssalMinerPotionIV",
      "name": "深渊采矿丹·四阶",
      "melvorName": "Abyssal Miner Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊采矿丹，四阶药瓶",
      "description": "深渊采矿丹·四阶，充能 4。对标效果：+0.40% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalMinerPotion",
      "melvor": {
        "seriesId": "abyssalMinerPotion",
        "name": "Abyssal Miner Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+0.40% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes"
      }
    },
    {
      "id": "shadeveilPotionI",
      "name": "影幕丹·一阶",
      "melvorName": "Shadeveil Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "影幕丹，一阶药瓶",
      "description": "影幕丹·一阶，充能 1。对标效果：+15% Global critical hit chance and +15% chance to apply Shadeveil when critically hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:shadeveilPotion",
      "melvor": {
        "seriesId": "shadeveilPotion",
        "name": "Shadeveil Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+15% Global critical hit chance and +15% chance to apply Shadeveil when critically hitting with an attack"
      }
    },
    {
      "id": "shadeveilPotionII",
      "name": "影幕丹·二阶",
      "melvorName": "Shadeveil Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "影幕丹，二阶药瓶",
      "description": "影幕丹·二阶，充能 2。对标效果：+15% Global critical hit chance and +25% chance to apply Shadeveil when critically hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:shadeveilPotion",
      "melvor": {
        "seriesId": "shadeveilPotion",
        "name": "Shadeveil Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+15% Global critical hit chance and +25% chance to apply Shadeveil when critically hitting with an attack"
      }
    },
    {
      "id": "shadeveilPotionIII",
      "name": "影幕丹·三阶",
      "melvorName": "Shadeveil Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "影幕丹，三阶药瓶",
      "description": "影幕丹·三阶，充能 3。对标效果：+15% Global critical hit chance and +35% chance to apply Shadeveil when critically hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:shadeveilPotion",
      "melvor": {
        "seriesId": "shadeveilPotion",
        "name": "Shadeveil Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% Global critical hit chance and +35% chance to apply Shadeveil when critically hitting with an attack"
      }
    },
    {
      "id": "shadeveilPotionIV",
      "name": "影幕丹·四阶",
      "melvorName": "Shadeveil Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "影幕丹，四阶药瓶",
      "description": "影幕丹·四阶，充能 4。对标效果：+20% Global critical hit chance and +50% chance to apply Shadeveil when critically hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:shadeveilPotion",
      "melvor": {
        "seriesId": "shadeveilPotion",
        "name": "Shadeveil Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% Global critical hit chance and +50% chance to apply Shadeveil when critically hitting with an attack"
      }
    },
    {
      "id": "abyssalCombinationPotionI",
      "name": "深渊合符丹·一阶",
      "melvorName": "Abyssal Combination Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊合符丹，一阶药瓶",
      "description": "深渊合符丹·一阶，充能 1。对标效果：+5% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalCombinationPotion",
      "melvor": {
        "seriesId": "abyssalCombinationPotion",
        "name": "Abyssal Combination Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalCombinationPotionII",
      "name": "深渊合符丹·二阶",
      "melvorName": "Abyssal Combination Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊合符丹，二阶药瓶",
      "description": "深渊合符丹·二阶，充能 2。对标效果：+10% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalCombinationPotion",
      "melvor": {
        "seriesId": "abyssalCombinationPotion",
        "name": "Abyssal Combination Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalCombinationPotionIII",
      "name": "深渊合符丹·三阶",
      "melvorName": "Abyssal Combination Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊合符丹，三阶药瓶",
      "description": "深渊合符丹·三阶，充能 3。对标效果：+15% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalCombinationPotion",
      "melvor": {
        "seriesId": "abyssalCombinationPotion",
        "name": "Abyssal Combination Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalCombinationPotionIV",
      "name": "深渊合符丹·四阶",
      "melvorName": "Abyssal Combination Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊合符丹，四阶药瓶",
      "description": "深渊合符丹·四阶，充能 4。对标效果：+20% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalCombinationPotion",
      "melvor": {
        "seriesId": "abyssalCombinationPotion",
        "name": "Abyssal Combination Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)"
      }
    },
    {
      "id": "fearPotionI",
      "name": "恐惧丹·一阶",
      "melvorName": "Fear Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "恐惧丹，一阶药瓶",
      "description": "恐惧丹·一阶，充能 1。对标效果：+5% chance to ignore Fear and +2% chance to apply Fear when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:fearPotion",
      "melvor": {
        "seriesId": "fearPotion",
        "name": "Fear Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to ignore Fear and +2% chance to apply Fear when hitting with an attack"
      }
    },
    {
      "id": "fearPotionII",
      "name": "恐惧丹·二阶",
      "melvorName": "Fear Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "恐惧丹，二阶药瓶",
      "description": "恐惧丹·二阶，充能 2。对标效果：+10% chance to ignore Fear and +4% chance to apply Fear when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:fearPotion",
      "melvor": {
        "seriesId": "fearPotion",
        "name": "Fear Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to ignore Fear and +4% chance to apply Fear when hitting with an attack"
      }
    },
    {
      "id": "fearPotionIII",
      "name": "恐惧丹·三阶",
      "melvorName": "Fear Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "恐惧丹，三阶药瓶",
      "description": "恐惧丹·三阶，充能 3。对标效果：+15% chance to ignore Fear and +6% chance to apply Fear when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:fearPotion",
      "melvor": {
        "seriesId": "fearPotion",
        "name": "Fear Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to ignore Fear and +6% chance to apply Fear when hitting with an attack"
      }
    },
    {
      "id": "fearPotionIV",
      "name": "恐惧丹·四阶",
      "melvorName": "Fear Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "恐惧丹，四阶药瓶",
      "description": "恐惧丹·四阶，充能 4。对标效果：+25% chance to ignore Fear and +8% chance to apply Fear when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:fearPotion",
      "melvor": {
        "seriesId": "fearPotion",
        "name": "Fear Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+25% chance to ignore Fear and +8% chance to apply Fear when hitting with an attack"
      }
    },
    {
      "id": "abyssalConsumablePotionI",
      "name": "深渊消耗丹·一阶",
      "melvorName": "Abyssal Consumable Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊消耗丹，一阶药瓶",
      "description": "深渊消耗丹·一阶，充能 1。对标效果：+3 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalConsumablePotion",
      "melvor": {
        "seriesId": "abyssalConsumablePotion",
        "name": "Abyssal Consumable Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+3 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalConsumablePotionII",
      "name": "深渊消耗丹·二阶",
      "melvorName": "Abyssal Consumable Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊消耗丹，二阶药瓶",
      "description": "深渊消耗丹·二阶，充能 2。对标效果：+5 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalConsumablePotion",
      "melvor": {
        "seriesId": "abyssalConsumablePotion",
        "name": "Abyssal Consumable Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+5 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalConsumablePotionIII",
      "name": "深渊消耗丹·三阶",
      "melvorName": "Abyssal Consumable Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊消耗丹，三阶药瓶",
      "description": "深渊消耗丹·三阶，充能 3。对标效果：+8 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalConsumablePotion",
      "melvor": {
        "seriesId": "abyssalConsumablePotion",
        "name": "Abyssal Consumable Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+8 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)"
      }
    },
    {
      "id": "abyssalConsumablePotionIV",
      "name": "深渊消耗丹·四阶",
      "melvorName": "Abyssal Consumable Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "深渊消耗丹，四阶药瓶",
      "description": "深渊消耗丹·四阶，充能 4。对标效果：+12 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:abyssalConsumablePotion",
      "melvor": {
        "seriesId": "abyssalConsumablePotion",
        "name": "Abyssal Consumable Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+12 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)"
      }
    },
    {
      "id": "witheringPotionI",
      "name": "枯萎丹·一阶",
      "melvorName": "Withering Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "枯萎丹，一阶药瓶",
      "description": "枯萎丹·一阶，充能 1。对标效果：+10% chance to ignore Wither and +10% chance to apply Wither when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:witheringPotion",
      "melvor": {
        "seriesId": "witheringPotion",
        "name": "Withering Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+10% chance to ignore Wither and +10% chance to apply Wither when hitting with an attack"
      }
    },
    {
      "id": "witheringPotionII",
      "name": "枯萎丹·二阶",
      "melvorName": "Withering Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "枯萎丹，二阶药瓶",
      "description": "枯萎丹·二阶，充能 2。对标效果：+20% chance to ignore Wither and +20% chance to apply Wither when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:witheringPotion",
      "melvor": {
        "seriesId": "witheringPotion",
        "name": "Withering Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+20% chance to ignore Wither and +20% chance to apply Wither when hitting with an attack"
      }
    },
    {
      "id": "witheringPotionIII",
      "name": "枯萎丹·三阶",
      "melvorName": "Withering Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "枯萎丹，三阶药瓶",
      "description": "枯萎丹·三阶，充能 3。对标效果：+30% chance to ignore Wither and +30% chance to apply Wither when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:witheringPotion",
      "melvor": {
        "seriesId": "witheringPotion",
        "name": "Withering Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+30% chance to ignore Wither and +30% chance to apply Wither when hitting with an attack"
      }
    },
    {
      "id": "witheringPotionIV",
      "name": "枯萎丹·四阶",
      "melvorName": "Withering Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "枯萎丹，四阶药瓶",
      "description": "枯萎丹·四阶，充能 4。对标效果：+40% chance to ignore Wither and +40% chance to apply Wither when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:witheringPotion",
      "melvor": {
        "seriesId": "witheringPotion",
        "name": "Withering Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+40% chance to ignore Wither and +40% chance to apply Wither when hitting with an attack"
      }
    },
    {
      "id": "silentThiefPotionI",
      "name": "静默窃行丹·一阶",
      "melvorName": "Silent Thief Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "静默窃行丹，一阶药瓶",
      "description": "静默窃行丹·一阶，充能 1。对标效果：+50 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silentThiefPotion",
      "melvor": {
        "seriesId": "silentThiefPotion",
        "name": "Silent Thief Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+50 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only"
      }
    },
    {
      "id": "silentThiefPotionII",
      "name": "静默窃行丹·二阶",
      "melvorName": "Silent Thief Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "静默窃行丹，二阶药瓶",
      "description": "静默窃行丹·二阶，充能 2。对标效果：+60 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silentThiefPotion",
      "melvor": {
        "seriesId": "silentThiefPotion",
        "name": "Silent Thief Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+60 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only"
      }
    },
    {
      "id": "silentThiefPotionIII",
      "name": "静默窃行丹·三阶",
      "melvorName": "Silent Thief Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "静默窃行丹，三阶药瓶",
      "description": "静默窃行丹·三阶，充能 3。对标效果：+75 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silentThiefPotion",
      "melvor": {
        "seriesId": "silentThiefPotion",
        "name": "Silent Thief Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+75 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only"
      }
    },
    {
      "id": "silentThiefPotionIV",
      "name": "静默窃行丹·四阶",
      "melvorName": "Silent Thief Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "静默窃行丹，四阶药瓶",
      "description": "静默窃行丹·四阶，充能 4。对标效果：+100 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silentThiefPotion",
      "melvor": {
        "seriesId": "silentThiefPotion",
        "name": "Silent Thief Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+100 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only"
      }
    },
    {
      "id": "silencePotionI",
      "name": "沉默丹·一阶",
      "melvorName": "Silence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "沉默丹，一阶药瓶",
      "description": "沉默丹·一阶，充能 1。对标效果：+10% chance to ignore Silence and +10% chance to apply Silence when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silencePotion",
      "melvor": {
        "seriesId": "silencePotion",
        "name": "Silence Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+10% chance to ignore Silence and +10% chance to apply Silence when hitting with an attack"
      }
    },
    {
      "id": "silencePotionII",
      "name": "沉默丹·二阶",
      "melvorName": "Silence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "沉默丹，二阶药瓶",
      "description": "沉默丹·二阶，充能 2。对标效果：+20% chance to ignore Silence and +20% chance to apply Silence when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silencePotion",
      "melvor": {
        "seriesId": "silencePotion",
        "name": "Silence Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+20% chance to ignore Silence and +20% chance to apply Silence when hitting with an attack"
      }
    },
    {
      "id": "silencePotionIII",
      "name": "沉默丹·三阶",
      "melvorName": "Silence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "沉默丹，三阶药瓶",
      "description": "沉默丹·三阶，充能 3。对标效果：+30% chance to ignore Silence and +30% chance to apply Silence when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silencePotion",
      "melvor": {
        "seriesId": "silencePotion",
        "name": "Silence Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+30% chance to ignore Silence and +30% chance to apply Silence when hitting with an attack"
      }
    },
    {
      "id": "silencePotionIV",
      "name": "沉默丹·四阶",
      "melvorName": "Silence Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "沉默丹，四阶药瓶",
      "description": "沉默丹·四阶，充能 4。对标效果：+40% chance to ignore Silence and +40% chance to apply Silence when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:silencePotion",
      "melvor": {
        "seriesId": "silencePotion",
        "name": "Silence Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+40% chance to ignore Silence and +40% chance to apply Silence when hitting with an attack"
      }
    },
    {
      "id": "echoingLurePotionI",
      "name": "回响诱饵丹·一阶",
      "melvorName": "Echoing Lure Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "回响诱饵丹，一阶药瓶",
      "description": "回响诱饵丹·一阶，充能 1。对标效果：+5% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:echoingLurePotion",
      "melvor": {
        "seriesId": "echoingLurePotion",
        "name": "Echoing Lure Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)"
      }
    },
    {
      "id": "echoingLurePotionII",
      "name": "回响诱饵丹·二阶",
      "melvorName": "Echoing Lure Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "回响诱饵丹，二阶药瓶",
      "description": "回响诱饵丹·二阶，充能 2。对标效果：+10% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:echoingLurePotion",
      "melvor": {
        "seriesId": "echoingLurePotion",
        "name": "Echoing Lure Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)"
      }
    },
    {
      "id": "echoingLurePotionIII",
      "name": "回响诱饵丹·三阶",
      "melvorName": "Echoing Lure Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "回响诱饵丹，三阶药瓶",
      "description": "回响诱饵丹·三阶，充能 3。对标效果：+15% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:echoingLurePotion",
      "melvor": {
        "seriesId": "echoingLurePotion",
        "name": "Echoing Lure Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)"
      }
    },
    {
      "id": "echoingLurePotionIV",
      "name": "回响诱饵丹·四阶",
      "melvorName": "Echoing Lure Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "回响诱饵丹，四阶药瓶",
      "description": "回响诱饵丹·四阶，充能 4。对标效果：+20% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:echoingLurePotion",
      "melvor": {
        "seriesId": "echoingLurePotion",
        "name": "Echoing Lure Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)"
      }
    },
    {
      "id": "soulsnapPotionI",
      "name": "摄魂丹·一阶",
      "melvorName": "Soulsnap Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "摄魂丹，一阶药瓶",
      "description": "摄魂丹·一阶，充能 1。对标效果：+5% chance to double Soul drops from enemies。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:soulsnapPotion",
      "melvor": {
        "seriesId": "soulsnapPotion",
        "name": "Soulsnap Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to double Soul drops from enemies"
      }
    },
    {
      "id": "soulsnapPotionII",
      "name": "摄魂丹·二阶",
      "melvorName": "Soulsnap Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "摄魂丹，二阶药瓶",
      "description": "摄魂丹·二阶，充能 2。对标效果：+10% chance to double Soul drops from enemies。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:soulsnapPotion",
      "melvor": {
        "seriesId": "soulsnapPotion",
        "name": "Soulsnap Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to double Soul drops from enemies"
      }
    },
    {
      "id": "soulsnapPotionIII",
      "name": "摄魂丹·三阶",
      "melvorName": "Soulsnap Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "摄魂丹，三阶药瓶",
      "description": "摄魂丹·三阶，充能 3。对标效果：+15% chance to double Soul drops from enemies。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:soulsnapPotion",
      "melvor": {
        "seriesId": "soulsnapPotion",
        "name": "Soulsnap Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to double Soul drops from enemies"
      }
    },
    {
      "id": "soulsnapPotionIV",
      "name": "摄魂丹·四阶",
      "melvorName": "Soulsnap Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "摄魂丹，四阶药瓶",
      "description": "摄魂丹·四阶，充能 4。对标效果：+20% chance to double Soul drops from enemies。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "utility_effect"
      ],
      "iconPromptKey": "herblorePotion:soulsnapPotion",
      "melvor": {
        "seriesId": "soulsnapPotion",
        "name": "Soulsnap Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% chance to double Soul drops from enemies"
      }
    },
    {
      "id": "darkRitualPotionI",
      "name": "暗仪丹·一阶",
      "melvorName": "Dark Ritual Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "暗仪丹，一阶药瓶",
      "description": "暗仪丹·一阶，充能 1。对标效果：+5% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:darkRitualPotion",
      "melvor": {
        "seriesId": "darkRitualPotion",
        "name": "Dark Ritual Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only"
      }
    },
    {
      "id": "darkRitualPotionII",
      "name": "暗仪丹·二阶",
      "melvorName": "Dark Ritual Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "暗仪丹，二阶药瓶",
      "description": "暗仪丹·二阶，充能 2。对标效果：+10% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:darkRitualPotion",
      "melvor": {
        "seriesId": "darkRitualPotion",
        "name": "Dark Ritual Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only"
      }
    },
    {
      "id": "darkRitualPotionIII",
      "name": "暗仪丹·三阶",
      "melvorName": "Dark Ritual Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "暗仪丹，三阶药瓶",
      "description": "暗仪丹·三阶，充能 3。对标效果：+15% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:darkRitualPotion",
      "melvor": {
        "seriesId": "darkRitualPotion",
        "name": "Dark Ritual Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only"
      }
    },
    {
      "id": "darkRitualPotionIV",
      "name": "暗仪丹·四阶",
      "melvorName": "Dark Ritual Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "暗仪丹，四阶药瓶",
      "description": "暗仪丹·四阶，充能 4。对标效果：+25% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:darkRitualPotion",
      "melvor": {
        "seriesId": "darkRitualPotion",
        "name": "Dark Ritual Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+25% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only"
      }
    },
    {
      "id": "eldritchCursePotionI",
      "name": "异咒丹·一阶",
      "melvorName": "Eldritch Curse Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "异咒丹，一阶药瓶",
      "description": "异咒丹·一阶，充能 1。对标效果：+5% chance to ignore Eldritch Curse and +5% chance to apply Eldritch Curse when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:eldritchCursePotion",
      "melvor": {
        "seriesId": "eldritchCursePotion",
        "name": "Eldritch Curse Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to ignore Eldritch Curse and +5% chance to apply Eldritch Curse when attacking"
      }
    },
    {
      "id": "eldritchCursePotionII",
      "name": "异咒丹·二阶",
      "melvorName": "Eldritch Curse Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "异咒丹，二阶药瓶",
      "description": "异咒丹·二阶，充能 2。对标效果：+10% chance to ignore Eldritch Curse and +10% chance to apply Eldritch Curse when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:eldritchCursePotion",
      "melvor": {
        "seriesId": "eldritchCursePotion",
        "name": "Eldritch Curse Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to ignore Eldritch Curse and +10% chance to apply Eldritch Curse when attacking"
      }
    },
    {
      "id": "eldritchCursePotionIII",
      "name": "异咒丹·三阶",
      "melvorName": "Eldritch Curse Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "异咒丹，三阶药瓶",
      "description": "异咒丹·三阶，充能 3。对标效果：+15% chance to ignore Eldritch Curse and +15% chance to apply Eldritch Curse when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:eldritchCursePotion",
      "melvor": {
        "seriesId": "eldritchCursePotion",
        "name": "Eldritch Curse Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to ignore Eldritch Curse and +15% chance to apply Eldritch Curse when attacking"
      }
    },
    {
      "id": "eldritchCursePotionIV",
      "name": "异咒丹·四阶",
      "melvorName": "Eldritch Curse Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "异咒丹，四阶药瓶",
      "description": "异咒丹·四阶，充能 4。对标效果：+20% chance to ignore Eldritch Curse and +20% chance to apply Eldritch Curse when attacking。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:eldritchCursePotion",
      "melvor": {
        "seriesId": "eldritchCursePotion",
        "name": "Eldritch Curse Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% chance to ignore Eldritch Curse and +20% chance to apply Eldritch Curse when attacking"
      }
    },
    {
      "id": "voidStabilisationPotionI",
      "name": "虚空稳定丹·一阶",
      "melvorName": "Void Stabilisation Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚空稳定丹，一阶药瓶",
      "description": "虚空稳定丹·一阶，充能 1。对标效果：-5% cost to produce Abyssal Realm Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:voidStabilisationPotion",
      "melvor": {
        "seriesId": "voidStabilisationPotion",
        "name": "Void Stabilisation Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "-5% cost to produce Abyssal Realm Items in Herblore"
      }
    },
    {
      "id": "voidStabilisationPotionII",
      "name": "虚空稳定丹·二阶",
      "melvorName": "Void Stabilisation Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚空稳定丹，二阶药瓶",
      "description": "虚空稳定丹·二阶，充能 2。对标效果：-10% cost to produce Abyssal Realm Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:voidStabilisationPotion",
      "melvor": {
        "seriesId": "voidStabilisationPotion",
        "name": "Void Stabilisation Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "-10% cost to produce Abyssal Realm Items in Herblore"
      }
    },
    {
      "id": "voidStabilisationPotionIII",
      "name": "虚空稳定丹·三阶",
      "melvorName": "Void Stabilisation Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚空稳定丹，三阶药瓶",
      "description": "虚空稳定丹·三阶，充能 3。对标效果：-15% cost to produce Abyssal Realm Items in Herblore。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:voidStabilisationPotion",
      "melvor": {
        "seriesId": "voidStabilisationPotion",
        "name": "Void Stabilisation Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "-15% cost to produce Abyssal Realm Items in Herblore"
      }
    },
    {
      "id": "voidStabilisationPotionIV",
      "name": "虚空稳定丹·四阶",
      "melvorName": "Void Stabilisation Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚空稳定丹，四阶药瓶",
      "description": "虚空稳定丹·四阶，充能 4。对标效果：-15% cost to produce Abyssal Realm Items in Herblore and +1 additional quantity of primary resource gained in Herblore for Abyssal Realm only (cannot be doubled)。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "skill_boost"
      ],
      "iconPromptKey": "herblorePotion:voidStabilisationPotion",
      "melvor": {
        "seriesId": "voidStabilisationPotion",
        "name": "Void Stabilisation Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "-15% cost to produce Abyssal Realm Items in Herblore and +1 additional quantity of primary resource gained in Herblore for Abyssal Realm only (cannot be doubled)"
      }
    },
    {
      "id": "voidburstPotionI",
      "name": "虚爆丹·一阶",
      "melvorName": "Voidburst Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "I",
      "tier": 1,
      "quality": "green",
      "charges": 1,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚爆丹，一阶药瓶",
      "description": "虚爆丹·一阶，充能 1。对标效果：+5% chance to ignore Voidburst and +5% chance to apply Voidburst when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:voidburstPotion",
      "melvor": {
        "seriesId": "voidburstPotion",
        "name": "Voidburst Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "I",
        "charges": 1,
        "effect": "+5% chance to ignore Voidburst and +5% chance to apply Voidburst when hitting with an attack"
      }
    },
    {
      "id": "voidburstPotionII",
      "name": "虚爆丹·二阶",
      "melvorName": "Voidburst Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "II",
      "tier": 2,
      "quality": "blue",
      "charges": 2,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚爆丹，二阶药瓶",
      "description": "虚爆丹·二阶，充能 2。对标效果：+10% chance to ignore Voidburst and +10% chance to apply Voidburst when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:voidburstPotion",
      "melvor": {
        "seriesId": "voidburstPotion",
        "name": "Voidburst Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "II",
        "charges": 2,
        "effect": "+10% chance to ignore Voidburst and +10% chance to apply Voidburst when hitting with an attack"
      }
    },
    {
      "id": "voidburstPotionIII",
      "name": "虚爆丹·三阶",
      "melvorName": "Voidburst Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "III",
      "tier": 3,
      "quality": "purple",
      "charges": 3,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚爆丹，三阶药瓶",
      "description": "虚爆丹·三阶，充能 3。对标效果：+15% chance to ignore Voidburst and +15% chance to apply Voidburst when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:voidburstPotion",
      "melvor": {
        "seriesId": "voidburstPotion",
        "name": "Voidburst Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "III",
        "charges": 3,
        "effect": "+15% chance to ignore Voidburst and +15% chance to apply Voidburst when hitting with an attack"
      }
    },
    {
      "id": "voidburstPotionIV",
      "name": "虚爆丹·四阶",
      "melvorName": "Voidburst Potion",
      "category": "consumable",
      "materialType": "potion",
      "potionTier": "IV",
      "tier": 4,
      "quality": "orange",
      "charges": 4,
      "icon": "🧪",
      "visualFamily": "potion-abyssal",
      "artDetail": "虚爆丹，四阶药瓶",
      "description": "虚爆丹·四阶，充能 4。对标效果：+20% chance to ignore Voidburst and +20% chance to apply Voidburst when hitting with an attack。",
      "sourceTags": [
        "production:alchemy"
      ],
      "useTags": [
        "potion",
        "combat_effect"
      ],
      "iconPromptKey": "herblorePotion:voidburstPotion",
      "melvor": {
        "seriesId": "voidburstPotion",
        "name": "Voidburst Potion",
        "realm": "abyssal",
        "dlc": "Into the Abyss Expansion",
        "tier": "IV",
        "charges": 4,
        "effect": "+20% chance to ignore Voidburst and +20% chance to apply Voidburst when hitting with an attack"
      }
    }
  ],
  "RECIPE_ROWS": [
    {
      "skillId": "alchemy",
      "outputId": "birdNestPotionI",
      "name": "炼制巢羽丹·一阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 5,
      "masteryXp": 5,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "potatoSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5,
        "masteryXp": 5,
        "cultivation": 1,
        "melvor": {
          "seriesId": "birdNestPotion",
          "name": "Bird Nest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 50,
          "effect": "+5% chance to gain Bird Nest in Woodcutting",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "birdNestPotionII",
      "name": "炼制巢羽丹·二阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 5,
      "masteryXp": 5,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "potatoSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5,
        "masteryXp": 5,
        "cultivation": 1,
        "melvor": {
          "seriesId": "birdNestPotion",
          "name": "Bird Nest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 50,
          "effect": "+10% chance to gain Bird Nest in Woodcutting",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "birdNestPotionIII",
      "name": "炼制巢羽丹·三阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 5,
      "masteryXp": 5,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "potatoSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5,
        "masteryXp": 5,
        "cultivation": 1,
        "melvor": {
          "seriesId": "birdNestPotion",
          "name": "Bird Nest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 75,
          "effect": "+15% chance to gain Bird Nest in Woodcutting",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "birdNestPotionIV",
      "name": "炼制巢羽丹·四阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 5,
      "masteryXp": 5,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "potatoSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5,
        "masteryXp": 5,
        "cultivation": 1,
        "melvor": {
          "seriesId": "birdNestPotion",
          "name": "Bird Nest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 100,
          "effect": "+30% chance to gain Bird Nest in Woodcutting",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeAccuracyPotionI",
      "name": "炼制近战精准丹·一阶",
      "unlockLevel": 5,
      "baseSeconds": 2,
      "skillXp": 8,
      "masteryXp": 8,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "bones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 8,
        "masteryXp": 8,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeAccuracyPotion",
          "name": "Melee Accuracy Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+8% Melee Accuracy Rating",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeAccuracyPotionII",
      "name": "炼制近战精准丹·二阶",
      "unlockLevel": 5,
      "baseSeconds": 2,
      "skillXp": 8,
      "masteryXp": 8,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "bones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 8,
        "masteryXp": 8,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeAccuracyPotion",
          "name": "Melee Accuracy Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 20,
          "effect": "+12% Melee Accuracy Rating",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeAccuracyPotionIII",
      "name": "炼制近战精准丹·三阶",
      "unlockLevel": 5,
      "baseSeconds": 2,
      "skillXp": 8,
      "masteryXp": 8,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "bones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 8,
        "masteryXp": 8,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeAccuracyPotion",
          "name": "Melee Accuracy Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 20,
          "effect": "+15% Melee Accuracy Rating",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeAccuracyPotionIV",
      "name": "炼制近战精准丹·四阶",
      "unlockLevel": 5,
      "baseSeconds": 2,
      "skillXp": 8,
      "masteryXp": 8,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "bones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 8,
        "masteryXp": 8,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeAccuracyPotion",
          "name": "Melee Accuracy Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 30,
          "effect": "+25% Melee Accuracy Rating",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeEvasionPotionI",
      "name": "炼制近战闪避丹·一阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 10,
      "masteryXp": 10,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "rawChicken": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10,
        "masteryXp": 10,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeEvasionPotion",
          "name": "Melee Evasion Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 30,
          "effect": "+8% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeEvasionPotionII",
      "name": "炼制近战闪避丹·二阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 10,
      "masteryXp": 10,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "rawChicken": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10,
        "masteryXp": 10,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeEvasionPotion",
          "name": "Melee Evasion Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+12% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeEvasionPotionIII",
      "name": "炼制近战闪避丹·三阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 10,
      "masteryXp": 10,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "rawChicken": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10,
        "masteryXp": 10,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeEvasionPotion",
          "name": "Melee Evasion Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 30,
          "effect": "+15% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeEvasionPotionIV",
      "name": "炼制近战闪避丹·四阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 10,
      "masteryXp": 10,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "rawChicken": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10,
        "masteryXp": 10,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeEvasionPotion",
          "name": "Melee Evasion Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 40,
          "effect": "+25% Melee Evasion and +10% chance to ignore Stun, Freeze or Crystallize",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierTouchPotionI",
      "name": "炼制屏障触媒丹·一阶",
      "unlockLevel": 12,
      "baseSeconds": 2,
      "skillXp": 13,
      "masteryXp": 13,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "barrierGem": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 13,
        "masteryXp": 13,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierTouchPotion",
          "name": "Barrier Touch Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 2,
          "effect": "+10 Flat Barrier damage added to Summon Familiar",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierTouchPotionII",
      "name": "炼制屏障触媒丹·二阶",
      "unlockLevel": 12,
      "baseSeconds": 2,
      "skillXp": 13,
      "masteryXp": 13,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "barrierGem": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 13,
        "masteryXp": 13,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierTouchPotion",
          "name": "Barrier Touch Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 4,
          "effect": "+20 Flat Barrier damage added to Summon Familiar",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierTouchPotionIII",
      "name": "炼制屏障触媒丹·三阶",
      "unlockLevel": 12,
      "baseSeconds": 2,
      "skillXp": 13,
      "masteryXp": 13,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "barrierGem": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 13,
        "masteryXp": 13,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierTouchPotion",
          "name": "Barrier Touch Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 6,
          "effect": "+30 Flat Barrier damage added to Summon Familiar",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierTouchPotionIV",
      "name": "炼制屏障触媒丹·四阶",
      "unlockLevel": 12,
      "baseSeconds": 2,
      "skillXp": 13,
      "masteryXp": 13,
      "cultivation": 1,
      "ingredients": {
        "garumHerb": 1,
        "barrierGem": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 13,
        "masteryXp": 13,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierTouchPotion",
          "name": "Barrier Touch Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 8,
          "effect": "+40 Flat Barrier damage added to Summon Familiar",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedAssistancePotionI",
      "name": "炼制远程助攻丹·一阶",
      "unlockLevel": 15,
      "baseSeconds": 2,
      "skillXp": 14,
      "masteryXp": 14,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "rawBeef": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 14,
        "masteryXp": 14,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedAssistancePotion",
          "name": "Ranged Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+4% Ranged Accuracy Rating, +4% Ranged Evasion, and +10% chance to ignore Poison",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedAssistancePotionII",
      "name": "炼制远程助攻丹·二阶",
      "unlockLevel": 15,
      "baseSeconds": 2,
      "skillXp": 14,
      "masteryXp": 14,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "rawBeef": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 14,
        "masteryXp": 14,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedAssistancePotion",
          "name": "Ranged Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 15,
          "effect": "+8% Ranged Accuracy Rating, +8% Ranged Evasion, and +10% chance to ignore Poison",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedAssistancePotionIII",
      "name": "炼制远程助攻丹·三阶",
      "unlockLevel": 15,
      "baseSeconds": 2,
      "skillXp": 14,
      "masteryXp": 14,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "rawBeef": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 14,
        "masteryXp": 14,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedAssistancePotion",
          "name": "Ranged Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "+12% Ranged Accuracy Rating, +12% Ranged Evasion, and +10% chance to ignore Poison",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedAssistancePotionIV",
      "name": "炼制远程助攻丹·四阶",
      "unlockLevel": 15,
      "baseSeconds": 2,
      "skillXp": 14,
      "masteryXp": 14,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "rawBeef": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 14,
        "masteryXp": 14,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedAssistancePotion",
          "name": "Ranged Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 20,
          "effect": "+20% Ranged Accuracy Rating, +20% Ranged Evasion, and +10% chance to ignore Poison",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "hinderPotionI",
      "name": "炼制迟滞丹·一阶",
      "unlockLevel": 18,
      "baseSeconds": 2,
      "skillXp": 16,
      "masteryXp": 16,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "goo": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 16,
        "masteryXp": 16,
        "cultivation": 1,
        "melvor": {
          "seriesId": "hinderPotion",
          "name": "Hinder Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "Inflict a slow that increases the target's attack interval by 3% when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "hinderPotionII",
      "name": "炼制迟滞丹·二阶",
      "unlockLevel": 18,
      "baseSeconds": 2,
      "skillXp": 16,
      "masteryXp": 16,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "goo": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 16,
        "masteryXp": 16,
        "cultivation": 1,
        "melvor": {
          "seriesId": "hinderPotion",
          "name": "Hinder Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "Inflict a slow that increases the target's attack interval by 6% when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "hinderPotionIII",
      "name": "炼制迟滞丹·三阶",
      "unlockLevel": 18,
      "baseSeconds": 2,
      "skillXp": 16,
      "masteryXp": 16,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "goo": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 16,
        "masteryXp": 16,
        "cultivation": 1,
        "melvor": {
          "seriesId": "hinderPotion",
          "name": "Hinder Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "Inflict a slow that increases the target's attack interval by 10% when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "hinderPotionIV",
      "name": "炼制迟滞丹·四阶",
      "unlockLevel": 18,
      "baseSeconds": 2,
      "skillXp": 16,
      "masteryXp": 16,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 1,
        "goo": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 16,
        "masteryXp": 16,
        "cultivation": 1,
        "melvor": {
          "seriesId": "hinderPotion",
          "name": "Hinder Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 25,
          "effect": "Inflict a slow that increases the target's attack interval by 15% when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "controlledHeatPotionI",
      "name": "炼制控火丹·一阶",
      "unlockLevel": 20,
      "baseSeconds": 2,
      "skillXp": 18,
      "masteryXp": 18,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 2,
        "mahoganyLogs": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 18,
        "masteryXp": 18,
        "cultivation": 1,
        "melvor": {
          "seriesId": "controlledHeatPotion",
          "name": "Controlled Heat Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "controlledHeatPotionII",
      "name": "炼制控火丹·二阶",
      "unlockLevel": 20,
      "baseSeconds": 2,
      "skillXp": 18,
      "masteryXp": 18,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 2,
        "mahoganyLogs": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 18,
        "masteryXp": 18,
        "cultivation": 1,
        "melvor": {
          "seriesId": "controlledHeatPotion",
          "name": "Controlled Heat Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "controlledHeatPotionIII",
      "name": "炼制控火丹·三阶",
      "unlockLevel": 20,
      "baseSeconds": 2,
      "skillXp": 18,
      "masteryXp": 18,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 2,
        "mahoganyLogs": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 18,
        "masteryXp": 18,
        "cultivation": 1,
        "melvor": {
          "seriesId": "controlledHeatPotion",
          "name": "Controlled Heat Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "controlledHeatPotionIV",
      "name": "炼制控火丹·四阶",
      "unlockLevel": 20,
      "baseSeconds": 2,
      "skillXp": 18,
      "masteryXp": 18,
      "cultivation": 1,
      "ingredients": {
        "sourweedHerb": 2,
        "mahoganyLogs": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 18,
        "masteryXp": 18,
        "cultivation": 1,
        "melvor": {
          "seriesId": "controlledHeatPotion",
          "name": "Controlled Heat Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 25,
          "effect": "Bonfires that provide Skill XP are now free to light.",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicAssistancePotionI",
      "name": "炼制法术助攻丹·一阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 22,
      "masteryXp": 22,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "holyDust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 22,
        "masteryXp": 22,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicAssistancePotion",
          "name": "Magic Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+4% Magic Accuracy Rating, +4% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicAssistancePotionII",
      "name": "炼制法术助攻丹·二阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 22,
      "masteryXp": 22,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "holyDust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 22,
        "masteryXp": 22,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicAssistancePotion",
          "name": "Magic Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 15,
          "effect": "+8% Magic Accuracy Rating, +8% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicAssistancePotionIII",
      "name": "炼制法术助攻丹·三阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 22,
      "masteryXp": 22,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "holyDust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 22,
        "masteryXp": 22,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicAssistancePotion",
          "name": "Magic Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "+12% Magic Accuracy Rating, +12% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicAssistancePotionIV",
      "name": "炼制法术助攻丹·四阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 22,
      "masteryXp": 22,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "holyDust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 22,
        "masteryXp": 22,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicAssistancePotion",
          "name": "Magic Assistance Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 20,
          "effect": "+20% Magic Accuracy Rating, +20% Magic Evasion, +10% chance to ignore Burn, and +10% chance to ignore Frostburn",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousCookPotionI",
      "name": "炼制丰厨丹·一阶",
      "unlockLevel": 32,
      "baseSeconds": 2,
      "skillXp": 28,
      "masteryXp": 28,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "swordfish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 28,
        "masteryXp": 28,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousCookPotion",
          "name": "Generous Cook Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+10% Chance to Double Items in Cooking",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousCookPotionII",
      "name": "炼制丰厨丹·二阶",
      "unlockLevel": 32,
      "baseSeconds": 2,
      "skillXp": 28,
      "masteryXp": 28,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "swordfish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 28,
        "masteryXp": 28,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousCookPotion",
          "name": "Generous Cook Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+20% Chance to Double Items in Cooking",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousCookPotionIII",
      "name": "炼制丰厨丹·三阶",
      "unlockLevel": 32,
      "baseSeconds": 2,
      "skillXp": 28,
      "masteryXp": 28,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "swordfish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 28,
        "masteryXp": 28,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousCookPotion",
          "name": "Generous Cook Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+30% Chance to Double Items in Cooking",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousCookPotionIV",
      "name": "炼制丰厨丹·四阶",
      "unlockLevel": 32,
      "baseSeconds": 2,
      "skillXp": 28,
      "masteryXp": 28,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "swordfish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 28,
        "masteryXp": 28,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousCookPotion",
          "name": "Generous Cook Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 60,
          "effect": "+50% Chance to Double Items in Cooking",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "regenerationPotionI",
      "name": "炼制回元丹·一阶",
      "unlockLevel": 35,
      "baseSeconds": 2,
      "skillXp": 31,
      "masteryXp": 31,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "ruby": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 31,
        "masteryXp": 31,
        "cultivation": 1,
        "melvor": {
          "seriesId": "regenerationPotion",
          "name": "Regeneration Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+30% Hitpoint Regeneration",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "regenerationPotionII",
      "name": "炼制回元丹·二阶",
      "unlockLevel": 35,
      "baseSeconds": 2,
      "skillXp": 31,
      "masteryXp": 31,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "ruby": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 31,
        "masteryXp": 31,
        "cultivation": 1,
        "melvor": {
          "seriesId": "regenerationPotion",
          "name": "Regeneration Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 25,
          "effect": "+60% Hitpoint Regeneration",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "regenerationPotionIII",
      "name": "炼制回元丹·三阶",
      "unlockLevel": 35,
      "baseSeconds": 2,
      "skillXp": 31,
      "masteryXp": 31,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "ruby": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 31,
        "masteryXp": 31,
        "cultivation": 1,
        "melvor": {
          "seriesId": "regenerationPotion",
          "name": "Regeneration Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+100% Hitpoint Regeneration",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "regenerationPotionIV",
      "name": "炼制回元丹·四阶",
      "unlockLevel": 35,
      "baseSeconds": 2,
      "skillXp": 31,
      "masteryXp": 31,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "ruby": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 31,
        "masteryXp": 31,
        "cultivation": 1,
        "melvor": {
          "seriesId": "regenerationPotion",
          "name": "Regeneration Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 60,
          "effect": "+150% Hitpoint Regeneration",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "seeingGoldPotionI",
      "name": "炼制见金丹·一阶",
      "unlockLevel": 36,
      "baseSeconds": 2,
      "skillXp": 33,
      "masteryXp": 33,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "silverBar": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 33,
        "masteryXp": 33,
        "cultivation": 1,
        "melvor": {
          "seriesId": "seeingGoldPotion",
          "name": "Seeing Gold Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+10% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "seeingGoldPotionII",
      "name": "炼制见金丹·二阶",
      "unlockLevel": 36,
      "baseSeconds": 2,
      "skillXp": 33,
      "masteryXp": 33,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "silverBar": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 33,
        "masteryXp": 33,
        "cultivation": 1,
        "melvor": {
          "seriesId": "seeingGoldPotion",
          "name": "Seeing Gold Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+20% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "seeingGoldPotionIII",
      "name": "炼制见金丹·三阶",
      "unlockLevel": 36,
      "baseSeconds": 2,
      "skillXp": 33,
      "masteryXp": 33,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "silverBar": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 33,
        "masteryXp": 33,
        "cultivation": 1,
        "melvor": {
          "seriesId": "seeingGoldPotion",
          "name": "Seeing Gold Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 50,
          "effect": "+40% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "seeingGoldPotionIV",
      "name": "炼制见金丹·四阶",
      "unlockLevel": 36,
      "baseSeconds": 2,
      "skillXp": 33,
      "masteryXp": 33,
      "cultivation": 1,
      "ingredients": {
        "mantalymeHerb": 1,
        "silverBar": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 33,
        "masteryXp": 33,
        "cultivation": 1,
        "melvor": {
          "seriesId": "seeingGoldPotion",
          "name": "Seeing Gold Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 80,
          "effect": "+75% chance to gain 1 Gold Bar from Smithing when making Silver Bar (Cannot be doubled)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "famishedPotionI",
      "name": "炼制饥食丹·一阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 38,
      "masteryXp": 38,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "wildflower": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 38,
        "masteryXp": 38,
        "cultivation": 1,
        "melvor": {
          "seriesId": "famishedPotion",
          "name": "Famished Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 10,
          "effect": "+5% Auto Eat Efficiency and +5% Chance to Preserve Food when eaten",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "famishedPotionII",
      "name": "炼制饥食丹·二阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 38,
      "masteryXp": 38,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "wildflower": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 38,
        "masteryXp": 38,
        "cultivation": 1,
        "melvor": {
          "seriesId": "famishedPotion",
          "name": "Famished Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 20,
          "effect": "+10% Auto Eat Efficiency and +10% Chance to Preserve Food when eaten",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "famishedPotionIII",
      "name": "炼制饥食丹·三阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 38,
      "masteryXp": 38,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "wildflower": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 38,
        "masteryXp": 38,
        "cultivation": 1,
        "melvor": {
          "seriesId": "famishedPotion",
          "name": "Famished Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 30,
          "effect": "+15% Auto Eat Efficiency and +15% Chance to Preserve Food when eaten",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "famishedPotionIV",
      "name": "炼制饥食丹·四阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 38,
      "masteryXp": 38,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "wildflower": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 38,
        "masteryXp": 38,
        "cultivation": 1,
        "melvor": {
          "seriesId": "famishedPotion",
          "name": "Famished Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 40,
          "effect": "+25% Auto Eat Efficiency and +25% Chance to Preserve Food when eaten",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fishermansPotionI",
      "name": "炼制渔夫丹·一阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 36,
      "masteryXp": 36,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "rawCrab": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 36,
        "masteryXp": 36,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fishermansPotion",
          "name": "Fishermans Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "+3% Chance to Double Items in Fishing",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fishermansPotionII",
      "name": "炼制渔夫丹·二阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 36,
      "masteryXp": 36,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "rawCrab": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 36,
        "masteryXp": 36,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fishermansPotion",
          "name": "Fishermans Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "+5% Chance to Double Items in Fishing",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fishermansPotionIII",
      "name": "炼制渔夫丹·三阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 36,
      "masteryXp": 36,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "rawCrab": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 36,
        "masteryXp": 36,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fishermansPotion",
          "name": "Fishermans Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "+8% Chance to Double Items in Fishing",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fishermansPotionIV",
      "name": "炼制渔夫丹·四阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 36,
      "masteryXp": 36,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "rawCrab": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 36,
        "masteryXp": 36,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fishermansPotion",
          "name": "Fishermans Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 20,
          "effect": "+12% Chance to Double Items in Fishing",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystallizationPotionI",
      "name": "炼制晶化丹·一阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 3,
        "crystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystallizationPotion",
          "name": "Crystallization Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 2,
          "effect": "+1% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystallizationPotionII",
      "name": "炼制晶化丹·二阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 3,
        "crystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystallizationPotion",
          "name": "Crystallization Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 4,
          "effect": "+2% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystallizationPotionIII",
      "name": "炼制晶化丹·三阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 3,
        "crystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystallizationPotion",
          "name": "Crystallization Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 6,
          "effect": "+3% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystallizationPotionIV",
      "name": "炼制晶化丹·四阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 3,
        "crystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystallizationPotion",
          "name": "Crystallization Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 10,
          "effect": "+4% chance to apply Crystallization (Target is stunned and takes +50% Damage during effect) for 1 Attack turn(s) when attacking",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "unholyPotionI",
      "name": "炼制秽祷丹·一阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 43,
      "masteryXp": 43,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "unholyDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 43,
        "masteryXp": 43,
        "cultivation": 1,
        "melvor": {
          "seriesId": "unholyPotion",
          "name": "Unholy Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 5,
          "effect": "+5% chance to preserve Prayer Points for Unholy Prayers",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "unholyPotionII",
      "name": "炼制秽祷丹·二阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 43,
      "masteryXp": 43,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "unholyDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 43,
        "masteryXp": 43,
        "cultivation": 1,
        "melvor": {
          "seriesId": "unholyPotion",
          "name": "Unholy Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 10,
          "effect": "+10% chance to preserve Prayer Points for Unholy Prayers",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "unholyPotionIII",
      "name": "炼制秽祷丹·三阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 43,
      "masteryXp": 43,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "unholyDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 43,
        "masteryXp": 43,
        "cultivation": 1,
        "melvor": {
          "seriesId": "unholyPotion",
          "name": "Unholy Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 15,
          "effect": "+15% chance to preserve Prayer Points for Unholy Prayers",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "unholyPotionIV",
      "name": "炼制秽祷丹·四阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 43,
      "masteryXp": 43,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "unholyDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 43,
        "masteryXp": 43,
        "cultivation": 1,
        "melvor": {
          "seriesId": "unholyPotion",
          "name": "Unholy Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 20,
          "effect": "+20% chance to preserve Prayer Points for Unholy Prayers",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "skilledFletchingPotionI",
      "name": "炼制巧弓丹·一阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 39,
      "masteryXp": 39,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "bowstring": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 39,
        "masteryXp": 39,
        "cultivation": 1,
        "melvor": {
          "seriesId": "skilledFletchingPotion",
          "name": "Skilled Fletching Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+5% Chance to Double Items in Fletching",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "skilledFletchingPotionII",
      "name": "炼制巧弓丹·二阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 39,
      "masteryXp": 39,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "bowstring": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 39,
        "masteryXp": 39,
        "cultivation": 1,
        "melvor": {
          "seriesId": "skilledFletchingPotion",
          "name": "Skilled Fletching Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+10% Chance to Double Items in Fletching",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "skilledFletchingPotionIII",
      "name": "炼制巧弓丹·三阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 39,
      "masteryXp": 39,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "bowstring": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 39,
        "masteryXp": 39,
        "cultivation": 1,
        "melvor": {
          "seriesId": "skilledFletchingPotion",
          "name": "Skilled Fletching Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+15% Chance to Double Items in Fletching",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "skilledFletchingPotionIV",
      "name": "炼制巧弓丹·四阶",
      "unlockLevel": 42,
      "baseSeconds": 2,
      "skillXp": 39,
      "masteryXp": 39,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "bowstring": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 39,
        "masteryXp": 39,
        "cultivation": 1,
        "melvor": {
          "seriesId": "skilledFletchingPotion",
          "name": "Skilled Fletching Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 50,
          "effect": "+25% Chance to Double Items in Fletching",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedStrengthPotionI",
      "name": "炼制远程强击丹·一阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 45,
      "masteryXp": 45,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "eyeball": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 45,
        "masteryXp": 45,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedStrengthPotion",
          "name": "Ranged Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "+5% Ranged Maximum Hit",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedStrengthPotionII",
      "name": "炼制远程强击丹·二阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 45,
      "masteryXp": 45,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "eyeball": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 45,
        "masteryXp": 45,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedStrengthPotion",
          "name": "Ranged Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 5,
          "effect": "+10% Ranged Maximum Hit",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedStrengthPotionIII",
      "name": "炼制远程强击丹·三阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 45,
      "masteryXp": 45,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "eyeball": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 45,
        "masteryXp": 45,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedStrengthPotion",
          "name": "Ranged Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 5,
          "effect": "+15% Ranged Maximum Hit",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "rangedStrengthPotionIV",
      "name": "炼制远程强击丹·四阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 45,
      "masteryXp": 45,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "eyeball": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 45,
        "masteryXp": 45,
        "cultivation": 1,
        "melvor": {
          "seriesId": "rangedStrengthPotion",
          "name": "Ranged Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 10,
          "effect": "+25% Ranged Maximum Hit",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gentleHandsPotionI",
      "name": "炼制巧手丹·一阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "strawberrySeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gentleHandsPotion",
          "name": "Gentle Hands Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+15 Stealth while Thieving",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gentleHandsPotionII",
      "name": "炼制巧手丹·二阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "strawberrySeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gentleHandsPotion",
          "name": "Gentle Hands Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+30 Stealth while Thieving",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gentleHandsPotionIII",
      "name": "炼制巧手丹·三阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "strawberrySeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gentleHandsPotion",
          "name": "Gentle Hands Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+50 Stealth while Thieving",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gentleHandsPotionIV",
      "name": "炼制巧手丹·四阶",
      "unlockLevel": 45,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "strawberrySeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gentleHandsPotion",
          "name": "Gentle Hands Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 50,
          "effect": "+75 Stealth while Thieving",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "secretStardustPotionI",
      "name": "炼制秘星尘丹·一阶",
      "unlockLevel": 47,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "stardust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "secretStardustPotion",
          "name": "Secret Stardust Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "-3% Astrology Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "secretStardustPotionII",
      "name": "炼制秘星尘丹·二阶",
      "unlockLevel": 47,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "stardust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "secretStardustPotion",
          "name": "Secret Stardust Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "-5% Astrology Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "secretStardustPotionIII",
      "name": "炼制秘星尘丹·三阶",
      "unlockLevel": 47,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "stardust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "secretStardustPotion",
          "name": "Secret Stardust Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "-10% Astrology Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "secretStardustPotionIV",
      "name": "炼制秘星尘丹·四阶",
      "unlockLevel": 47,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 2,
        "stardust": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "secretStardustPotion",
          "name": "Secret Stardust Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 25,
          "effect": "-15% Astrology Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "craftingPotionI",
      "name": "炼制巧作丹·一阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "leather": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "craftingPotion",
          "name": "Crafting Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 10,
          "effect": "+5% Chance to Double Items in Crafting",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "craftingPotionII",
      "name": "炼制巧作丹·二阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "leather": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "craftingPotion",
          "name": "Crafting Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Crafting",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "craftingPotionIII",
      "name": "炼制巧作丹·三阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "leather": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "craftingPotion",
          "name": "Crafting Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 10,
          "effect": "+15% Chance to Double Items in Crafting",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "craftingPotionIV",
      "name": "炼制巧作丹·四阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 41,
      "masteryXp": 41,
      "cultivation": 1,
      "ingredients": {
        "lemontyleHerb": 1,
        "leather": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 41,
        "masteryXp": 41,
        "cultivation": 1,
        "melvor": {
          "seriesId": "craftingPotion",
          "name": "Crafting Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 15,
          "effect": "+25% Chance to Double Items in Crafting",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "luckyHerbPotionI",
      "name": "炼制幸运灵草丹·一阶",
      "unlockLevel": 50,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "compost": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "luckyHerbPotion",
          "name": "Lucky Herb Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 8,
          "effect": "+10% chance to convert combat seed drops to herbs",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "luckyHerbPotionII",
      "name": "炼制幸运灵草丹·二阶",
      "unlockLevel": 50,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "compost": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "luckyHerbPotion",
          "name": "Lucky Herb Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "+20% chance to convert combat seed drops to herbs",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "luckyHerbPotionIII",
      "name": "炼制幸运灵草丹·三阶",
      "unlockLevel": 50,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "compost": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "luckyHerbPotion",
          "name": "Lucky Herb Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "+30% chance to convert combat seed drops to herbs",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "luckyHerbPotionIV",
      "name": "炼制幸运灵草丹·四阶",
      "unlockLevel": 50,
      "baseSeconds": 2,
      "skillXp": 47,
      "masteryXp": 47,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "compost": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 47,
        "masteryXp": 47,
        "cultivation": 1,
        "melvor": {
          "seriesId": "luckyHerbPotion",
          "name": "Lucky Herb Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 20,
          "effect": "+50% chance to convert combat seed drops to herbs",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "perfectSwingPotionI",
      "name": "炼制完美挥镐丹·一阶",
      "unlockLevel": 53,
      "baseSeconds": 2,
      "skillXp": 53,
      "masteryXp": 53,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "goldOre": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 53,
        "masteryXp": 53,
        "cultivation": 1,
        "melvor": {
          "seriesId": "perfectSwingPotion",
          "name": "Perfect Swing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 30,
          "effect": "+10% chance to deal no damage to Essence Nodes in Mining and +10% chance to deal no damage to Ore Nodes in Mining",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "perfectSwingPotionII",
      "name": "炼制完美挥镐丹·二阶",
      "unlockLevel": 53,
      "baseSeconds": 2,
      "skillXp": 53,
      "masteryXp": 53,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "goldOre": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 53,
        "masteryXp": 53,
        "cultivation": 1,
        "melvor": {
          "seriesId": "perfectSwingPotion",
          "name": "Perfect Swing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 50,
          "effect": "+20% chance to deal no damage to Essence Nodes in Mining and +20% chance to deal no damage to Ore Nodes in Mining",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "perfectSwingPotionIII",
      "name": "炼制完美挥镐丹·三阶",
      "unlockLevel": 53,
      "baseSeconds": 2,
      "skillXp": 53,
      "masteryXp": 53,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "goldOre": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 53,
        "masteryXp": 53,
        "cultivation": 1,
        "melvor": {
          "seriesId": "perfectSwingPotion",
          "name": "Perfect Swing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 80,
          "effect": "+40% chance to deal no damage to Essence Nodes in Mining and +40% chance to deal no damage to Ore Nodes in Mining",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "perfectSwingPotionIV",
      "name": "炼制完美挥镐丹·四阶",
      "unlockLevel": 53,
      "baseSeconds": 2,
      "skillXp": 53,
      "masteryXp": 53,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "goldOre": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 53,
        "masteryXp": 53,
        "cultivation": 1,
        "melvor": {
          "seriesId": "perfectSwingPotion",
          "name": "Perfect Swing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 100,
          "effect": "+80% chance to deal no damage to Essence Nodes in Mining and +80% chance to deal no damage to Ore Nodes in Mining",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "necromancerPotionI",
      "name": "炼制唤灵丹·一阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 50,
      "masteryXp": 50,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "feathers": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 50,
        "masteryXp": 50,
        "cultivation": 1,
        "melvor": {
          "seriesId": "necromancerPotion",
          "name": "Necromancer Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+1 base primary resource quantity gained in Summoning",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "necromancerPotionII",
      "name": "炼制唤灵丹·二阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 50,
      "masteryXp": 50,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "feathers": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 50,
        "masteryXp": 50,
        "cultivation": 1,
        "melvor": {
          "seriesId": "necromancerPotion",
          "name": "Necromancer Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+2 base primary resource quantity gained in Summoning",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "necromancerPotionIII",
      "name": "炼制唤灵丹·三阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 50,
      "masteryXp": 50,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "feathers": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 50,
        "masteryXp": 50,
        "cultivation": 1,
        "melvor": {
          "seriesId": "necromancerPotion",
          "name": "Necromancer Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 45,
          "effect": "+3 base primary resource quantity gained in Summoning",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "necromancerPotionIV",
      "name": "炼制唤灵丹·四阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 50,
      "masteryXp": 50,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 2,
        "feathers": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 50,
        "masteryXp": 50,
        "cultivation": 1,
        "melvor": {
          "seriesId": "necromancerPotion",
          "name": "Necromancer Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 60,
          "effect": "+5 base primary resource quantity gained in Summoning",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "divinePotionI",
      "name": "炼制神佑丹·一阶",
      "unlockLevel": 57,
      "baseSeconds": 2,
      "skillXp": 51,
      "masteryXp": 51,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "bigBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 51,
        "masteryXp": 51,
        "cultivation": 1,
        "melvor": {
          "seriesId": "divinePotion",
          "name": "Divine Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 15,
          "effect": "+10% Chance To Preserve Prayer Points",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "divinePotionII",
      "name": "炼制神佑丹·二阶",
      "unlockLevel": 57,
      "baseSeconds": 2,
      "skillXp": 51,
      "masteryXp": 51,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "bigBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 51,
        "masteryXp": 51,
        "cultivation": 1,
        "melvor": {
          "seriesId": "divinePotion",
          "name": "Divine Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 20,
          "effect": "+15% Chance To Preserve Prayer Points",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "divinePotionIII",
      "name": "炼制神佑丹·三阶",
      "unlockLevel": 57,
      "baseSeconds": 2,
      "skillXp": 51,
      "masteryXp": 51,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "bigBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 51,
        "masteryXp": 51,
        "cultivation": 1,
        "melvor": {
          "seriesId": "divinePotion",
          "name": "Divine Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 25,
          "effect": "+20% Chance To Preserve Prayer Points",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "divinePotionIV",
      "name": "炼制神佑丹·四阶",
      "unlockLevel": 57,
      "baseSeconds": 2,
      "skillXp": 51,
      "masteryXp": 51,
      "cultivation": 1,
      "ingredients": {
        "oxilymeHerb": 1,
        "bigBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 51,
        "masteryXp": 51,
        "cultivation": 1,
        "melvor": {
          "seriesId": "divinePotion",
          "name": "Divine Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 30,
          "effect": "+35% Chance To Preserve Prayer Points",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeStrengthPotionI",
      "name": "炼制近战强击丹·一阶",
      "unlockLevel": 60,
      "baseSeconds": 2,
      "skillXp": 60,
      "masteryXp": 60,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "dragonBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 60,
        "masteryXp": 60,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeStrengthPotion",
          "name": "Melee Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "+1% Melee Maximum Hit",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeStrengthPotionII",
      "name": "炼制近战强击丹·二阶",
      "unlockLevel": 60,
      "baseSeconds": 2,
      "skillXp": 60,
      "masteryXp": 60,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "dragonBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 60,
        "masteryXp": 60,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeStrengthPotion",
          "name": "Melee Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 5,
          "effect": "+3% Melee Maximum Hit",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeStrengthPotionIII",
      "name": "炼制近战强击丹·三阶",
      "unlockLevel": 60,
      "baseSeconds": 2,
      "skillXp": 60,
      "masteryXp": 60,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "dragonBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 60,
        "masteryXp": 60,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeStrengthPotion",
          "name": "Melee Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 5,
          "effect": "+6% Melee Maximum Hit",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "meleeStrengthPotionIV",
      "name": "炼制近战强击丹·四阶",
      "unlockLevel": 60,
      "baseSeconds": 2,
      "skillXp": 60,
      "masteryXp": 60,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "dragonBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 60,
        "masteryXp": 60,
        "cultivation": 1,
        "melvor": {
          "seriesId": "meleeStrengthPotion",
          "name": "Melee Strength Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 10,
          "effect": "+10% Melee Maximum Hit",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "performanceEnhancingPotionI",
      "name": "炼制身法强化丹·一阶",
      "unlockLevel": 62,
      "baseSeconds": 2,
      "skillXp": 61,
      "masteryXp": 61,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 61,
        "masteryXp": 61,
        "cultivation": 1,
        "melvor": {
          "seriesId": "performanceEnhancingPotion",
          "name": "Performance Enhancing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 10,
          "effect": "-4% Agility Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "performanceEnhancingPotionII",
      "name": "炼制身法强化丹·二阶",
      "unlockLevel": 62,
      "baseSeconds": 2,
      "skillXp": 61,
      "masteryXp": 61,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 61,
        "masteryXp": 61,
        "cultivation": 1,
        "melvor": {
          "seriesId": "performanceEnhancingPotion",
          "name": "Performance Enhancing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 20,
          "effect": "-6% Agility Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "performanceEnhancingPotionIII",
      "name": "炼制身法强化丹·三阶",
      "unlockLevel": 62,
      "baseSeconds": 2,
      "skillXp": 61,
      "masteryXp": 61,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 61,
        "masteryXp": 61,
        "cultivation": 1,
        "melvor": {
          "seriesId": "performanceEnhancingPotion",
          "name": "Performance Enhancing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 30,
          "effect": "-8% Agility Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "performanceEnhancingPotionIV",
      "name": "炼制身法强化丹·四阶",
      "unlockLevel": 62,
      "baseSeconds": 2,
      "skillXp": 61,
      "masteryXp": 61,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 61,
        "masteryXp": 61,
        "cultivation": 1,
        "melvor": {
          "seriesId": "performanceEnhancingPotion",
          "name": "Performance Enhancing Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 50,
          "effect": "-12% Agility Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "elementalPotionI",
      "name": "炼制元素丹·一阶",
      "unlockLevel": 63,
      "baseSeconds": 2,
      "skillXp": 63,
      "masteryXp": 63,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "bodyCharm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 63,
        "masteryXp": 63,
        "cultivation": 1,
        "melvor": {
          "seriesId": "elementalPotion",
          "name": "Elemental Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+5% chance to gain 2 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "elementalPotionII",
      "name": "炼制元素丹·二阶",
      "unlockLevel": 63,
      "baseSeconds": 2,
      "skillXp": 63,
      "masteryXp": 63,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "bodyCharm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 63,
        "masteryXp": 63,
        "cultivation": 1,
        "melvor": {
          "seriesId": "elementalPotion",
          "name": "Elemental Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+10% chance to gain 4 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "elementalPotionIII",
      "name": "炼制元素丹·三阶",
      "unlockLevel": 63,
      "baseSeconds": 2,
      "skillXp": 63,
      "masteryXp": 63,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "bodyCharm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 63,
        "masteryXp": 63,
        "cultivation": 1,
        "melvor": {
          "seriesId": "elementalPotion",
          "name": "Elemental Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+25% chance to gain 6 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "elementalPotionIV",
      "name": "炼制元素丹·四阶",
      "unlockLevel": 63,
      "baseSeconds": 2,
      "skillXp": 63,
      "masteryXp": 63,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "bodyCharm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 63,
        "masteryXp": 63,
        "cultivation": 1,
        "melvor": {
          "seriesId": "elementalPotion",
          "name": "Elemental Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 50,
          "effect": "+50% chance to gain 8 of a random Elemental Rune per Standard Rune or Combination Rune creation action in Runecrafting",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicDamagePotionI",
      "name": "炼制法伤丹·一阶",
      "unlockLevel": 65,
      "baseSeconds": 2,
      "skillXp": 85,
      "masteryXp": 85,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "snapeGrass": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 85,
        "masteryXp": 85,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicDamagePotion",
          "name": "Magic Damage Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "+1% Magic Maximum Hit",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicDamagePotionII",
      "name": "炼制法伤丹·二阶",
      "unlockLevel": 65,
      "baseSeconds": 2,
      "skillXp": 85,
      "masteryXp": 85,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "snapeGrass": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 85,
        "masteryXp": 85,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicDamagePotion",
          "name": "Magic Damage Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 5,
          "effect": "+5% Magic Maximum Hit",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicDamagePotionIII",
      "name": "炼制法伤丹·三阶",
      "unlockLevel": 65,
      "baseSeconds": 2,
      "skillXp": 85,
      "masteryXp": 85,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "snapeGrass": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 85,
        "masteryXp": 85,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicDamagePotion",
          "name": "Magic Damage Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 5,
          "effect": "+10% Magic Maximum Hit",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "magicDamagePotionIV",
      "name": "炼制法伤丹·四阶",
      "unlockLevel": 65,
      "baseSeconds": 2,
      "skillXp": 85,
      "masteryXp": 85,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "snapeGrass": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 85,
        "masteryXp": 85,
        "cultivation": 1,
        "melvor": {
          "seriesId": "magicDamagePotion",
          "name": "Magic Damage Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 5,
          "effect": "+15% Magic Maximum Hit",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lethalToxinsPotionI",
      "name": "炼制剧毒丹·一阶",
      "unlockLevel": 68,
      "baseSeconds": 2,
      "skillXp": 92,
      "masteryXp": 92,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 92,
        "masteryXp": 92,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lethalToxinsPotion",
          "name": "Lethal Toxins Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "+3% chance to apply Poison when hitting with a Melee or Ranged attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lethalToxinsPotionII",
      "name": "炼制剧毒丹·二阶",
      "unlockLevel": 68,
      "baseSeconds": 2,
      "skillXp": 92,
      "masteryXp": 92,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 92,
        "masteryXp": 92,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lethalToxinsPotion",
          "name": "Lethal Toxins Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "+6% chance to apply Poison when hitting with a Melee or Ranged attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lethalToxinsPotionIII",
      "name": "炼制剧毒丹·三阶",
      "unlockLevel": 68,
      "baseSeconds": 2,
      "skillXp": 92,
      "masteryXp": 92,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 92,
        "masteryXp": 92,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lethalToxinsPotion",
          "name": "Lethal Toxins Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "+10% chance to apply Poison when hitting with a Melee or Ranged attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lethalToxinsPotionIV",
      "name": "炼制剧毒丹·四阶",
      "unlockLevel": 68,
      "baseSeconds": 2,
      "skillXp": 92,
      "masteryXp": 92,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 2,
        "rawPoisonFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 92,
        "masteryXp": 92,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lethalToxinsPotion",
          "name": "Lethal Toxins Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 20,
          "effect": "+15% chance to apply Poison when hitting with a Melee or Ranged attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "herblorePotionI",
      "name": "炼制百草丹·一阶",
      "unlockLevel": 71,
      "baseSeconds": 2,
      "skillXp": 99,
      "masteryXp": 99,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 99,
        "masteryXp": 99,
        "cultivation": 1,
        "melvor": {
          "seriesId": "herblorePotion",
          "name": "Herblore Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 20,
          "effect": "+1% Chance to receive a Random Tier of the same Potion in Herblore",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "herblorePotionII",
      "name": "炼制百草丹·二阶",
      "unlockLevel": 71,
      "baseSeconds": 2,
      "skillXp": 99,
      "masteryXp": 99,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 99,
        "masteryXp": 99,
        "cultivation": 1,
        "melvor": {
          "seriesId": "herblorePotion",
          "name": "Herblore Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 30,
          "effect": "+2% Chance to receive a Random Tier of the same Potion in Herblore",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "herblorePotionIII",
      "name": "炼制百草丹·三阶",
      "unlockLevel": 71,
      "baseSeconds": 2,
      "skillXp": 99,
      "masteryXp": 99,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 99,
        "masteryXp": 99,
        "cultivation": 1,
        "melvor": {
          "seriesId": "herblorePotion",
          "name": "Herblore Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 40,
          "effect": "+3% Chance to receive a Random Tier of the same Potion in Herblore",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "herblorePotionIV",
      "name": "炼制百草丹·四阶",
      "unlockLevel": 71,
      "baseSeconds": 2,
      "skillXp": 99,
      "masteryXp": 99,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 99,
        "masteryXp": 99,
        "cultivation": 1,
        "melvor": {
          "seriesId": "herblorePotion",
          "name": "Herblore Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 60,
          "effect": "+6% Chance to receive a Random Tier of the same Potion in Herblore",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "cursedPotionI",
      "name": "炼制诅咒丹·一阶",
      "unlockLevel": 73,
      "baseSeconds": 2,
      "skillXp": 126,
      "masteryXp": 126,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "cursedDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 126,
        "masteryXp": 126,
        "cultivation": 1,
        "melvor": {
          "seriesId": "cursedPotion",
          "name": "Cursed Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 5,
          "effect": "+5% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "cursedPotionII",
      "name": "炼制诅咒丹·二阶",
      "unlockLevel": 73,
      "baseSeconds": 2,
      "skillXp": 126,
      "masteryXp": 126,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "cursedDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 126,
        "masteryXp": 126,
        "cultivation": 1,
        "melvor": {
          "seriesId": "cursedPotion",
          "name": "Cursed Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 10,
          "effect": "+10% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "cursedPotionIII",
      "name": "炼制诅咒丹·三阶",
      "unlockLevel": 73,
      "baseSeconds": 2,
      "skillXp": 126,
      "masteryXp": 126,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "cursedDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 126,
        "masteryXp": 126,
        "cultivation": 1,
        "melvor": {
          "seriesId": "cursedPotion",
          "name": "Cursed Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 15,
          "effect": "+15% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "cursedPotionIV",
      "name": "炼制诅咒丹·四阶",
      "unlockLevel": 73,
      "baseSeconds": 2,
      "skillXp": 126,
      "masteryXp": 126,
      "cultivation": 1,
      "ingredients": {
        "poraxxHerb": 1,
        "cursedDust": 3
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 126,
        "masteryXp": 126,
        "cultivation": 1,
        "melvor": {
          "seriesId": "cursedPotion",
          "name": "Cursed Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 20,
          "effect": "+20% chance to apply a random Curse when hitting with an attack if the target has Unholy Mark",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousHarvestPotionI",
      "name": "炼制丰收丹·一阶",
      "unlockLevel": 74,
      "baseSeconds": 2,
      "skillXp": 112,
      "masteryXp": 112,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 1,
        "carrot": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 112,
        "masteryXp": 112,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousHarvestPotion",
          "name": "Generous Harvest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Farming",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousHarvestPotionII",
      "name": "炼制丰收丹·二阶",
      "unlockLevel": 74,
      "baseSeconds": 2,
      "skillXp": 112,
      "masteryXp": 112,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 1,
        "carrot": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 112,
        "masteryXp": 112,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousHarvestPotion",
          "name": "Generous Harvest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "+15% Chance to Double Items in Farming",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousHarvestPotionIII",
      "name": "炼制丰收丹·三阶",
      "unlockLevel": 74,
      "baseSeconds": 2,
      "skillXp": 112,
      "masteryXp": 112,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 1,
        "carrot": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 112,
        "masteryXp": 112,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousHarvestPotion",
          "name": "Generous Harvest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 10,
          "effect": "+20% Chance to Double Items in Farming",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "generousHarvestPotionIV",
      "name": "炼制丰收丹·四阶",
      "unlockLevel": 74,
      "baseSeconds": 2,
      "skillXp": 112,
      "masteryXp": 112,
      "cultivation": 1,
      "ingredients": {
        "pigtayleHerb": 1,
        "carrot": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 112,
        "masteryXp": 112,
        "cultivation": 1,
        "melvor": {
          "seriesId": "generousHarvestPotion",
          "name": "Generous Harvest Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 10,
          "effect": "+30% Chance to Double Items in Farming",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierIgniterPotionI",
      "name": "炼制屏障燃灼丹·一阶",
      "unlockLevel": 75,
      "baseSeconds": 2,
      "skillXp": 130,
      "masteryXp": 130,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "erodingBarrierGem": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 130,
        "masteryXp": 130,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierIgniterPotion",
          "name": "Barrier Igniter Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 2,
          "effect": "+3% chance to apply Barrier Burn when hitting with a summon attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierIgniterPotionII",
      "name": "炼制屏障燃灼丹·二阶",
      "unlockLevel": 75,
      "baseSeconds": 2,
      "skillXp": 130,
      "masteryXp": 130,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "erodingBarrierGem": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 130,
        "masteryXp": 130,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierIgniterPotion",
          "name": "Barrier Igniter Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 4,
          "effect": "+6% chance to apply Barrier Burn when hitting with a summon attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierIgniterPotionIII",
      "name": "炼制屏障燃灼丹·三阶",
      "unlockLevel": 75,
      "baseSeconds": 2,
      "skillXp": 130,
      "masteryXp": 130,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "erodingBarrierGem": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 130,
        "masteryXp": 130,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierIgniterPotion",
          "name": "Barrier Igniter Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 6,
          "effect": "+9% chance to apply Barrier Burn when hitting with a summon attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "barrierIgniterPotionIV",
      "name": "炼制屏障燃灼丹·四阶",
      "unlockLevel": 75,
      "baseSeconds": 2,
      "skillXp": 130,
      "masteryXp": 130,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "erodingBarrierGem": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 130,
        "masteryXp": 130,
        "cultivation": 1,
        "melvor": {
          "seriesId": "barrierIgniterPotion",
          "name": "Barrier Igniter Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 8,
          "effect": "+12% chance to apply Barrier Burn when hitting with a summon attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "diamondLuckPotionI",
      "name": "炼制钻运丹·一阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 160,
      "masteryXp": 160,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "diamond": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 160,
        "masteryXp": 160,
        "cultivation": 1,
        "melvor": {
          "seriesId": "diamondLuckPotion",
          "name": "Diamond Luck Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 5,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "diamondLuckPotionII",
      "name": "炼制钻运丹·二阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 160,
      "masteryXp": 160,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "diamond": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 160,
        "masteryXp": 160,
        "cultivation": 1,
        "melvor": {
          "seriesId": "diamondLuckPotion",
          "name": "Diamond Luck Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 10,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "diamondLuckPotionIII",
      "name": "炼制钻运丹·三阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 160,
      "masteryXp": 160,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "diamond": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 160,
        "masteryXp": 160,
        "cultivation": 1,
        "melvor": {
          "seriesId": "diamondLuckPotion",
          "name": "Diamond Luck Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 15,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "diamondLuckPotionIV",
      "name": "炼制钻运丹·四阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 160,
      "masteryXp": 160,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 1,
        "diamond": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 160,
        "masteryXp": 160,
        "cultivation": 1,
        "melvor": {
          "seriesId": "diamondLuckPotion",
          "name": "Diamond Luck Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 25,
          "effect": "Your chance to hit an enemy is lucky (Roll twice, take the better result)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystalSanctionPotionI",
      "name": "炼制晶裁丹·一阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 3,
        "pureCrystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystalSanctionPotion",
          "name": "Crystal Sanction Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "I",
          "charges": 2,
          "effect": "+1% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystalSanctionPotionII",
      "name": "炼制晶裁丹·二阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 3,
        "pureCrystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystalSanctionPotion",
          "name": "Crystal Sanction Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "II",
          "charges": 4,
          "effect": "+2% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystalSanctionPotionIII",
      "name": "炼制晶裁丹·三阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 3,
        "pureCrystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystalSanctionPotion",
          "name": "Crystal Sanction Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "III",
          "charges": 6,
          "effect": "+3% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "crystalSanctionPotionIV",
      "name": "炼制晶裁丹·四阶",
      "unlockLevel": 85,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 3,
        "pureCrystalBindingDust": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "crystalSanctionPotion",
          "name": "Crystal Sanction Potion",
          "realm": "melvor",
          "dlc": "Atlas of Discovery Expansion",
          "tier": "IV",
          "charges": 10,
          "effect": "+4% chance to apply Crystal Sanction (Next Attack Turn from Target deals no Damage) when attacking",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "damageReductionPotionI",
      "name": "炼制减伤丹·一阶",
      "unlockLevel": 90,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 2,
        "largeHorn": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "damageReductionPotion",
          "name": "Damage Reduction Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "I",
          "charges": 10,
          "effect": "+2% Damage Reduction",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "damageReductionPotionII",
      "name": "炼制减伤丹·二阶",
      "unlockLevel": 90,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 2,
        "largeHorn": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "damageReductionPotion",
          "name": "Damage Reduction Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "II",
          "charges": 15,
          "effect": "+4% Damage Reduction",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "damageReductionPotionIII",
      "name": "炼制减伤丹·三阶",
      "unlockLevel": 90,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 2,
        "largeHorn": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "damageReductionPotion",
          "name": "Damage Reduction Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "III",
          "charges": 20,
          "effect": "+6% Damage Reduction",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "damageReductionPotionIV",
      "name": "炼制减伤丹·四阶",
      "unlockLevel": 90,
      "baseSeconds": 2,
      "skillXp": 180,
      "masteryXp": 180,
      "cultivation": 1,
      "ingredients": {
        "barrentoeHerb": 2,
        "largeHorn": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 180,
        "masteryXp": 180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "damageReductionPotion",
          "name": "Damage Reduction Potion",
          "realm": "melvor",
          "dlc": "Full Version",
          "tier": "IV",
          "charges": 30,
          "effect": "+10% Damage Reduction",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "areaControlPotionI",
      "name": "炼制控域丹·一阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 365,
      "masteryXp": 365,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "jungleSpores": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 365,
        "masteryXp": 365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "areaControlPotion",
          "name": "Area Control Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+20% Flat Slayer Area Effect Negation",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "areaControlPotionII",
      "name": "炼制控域丹·二阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 365,
      "masteryXp": 365,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "jungleSpores": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 365,
        "masteryXp": 365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "areaControlPotion",
          "name": "Area Control Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 20,
          "effect": "+30% Flat Slayer Area Effect Negation",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "areaControlPotionIII",
      "name": "炼制控域丹·三阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 365,
      "masteryXp": 365,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "jungleSpores": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 365,
        "masteryXp": 365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "areaControlPotion",
          "name": "Area Control Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "+40% Flat Slayer Area Effect Negation",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "areaControlPotionIV",
      "name": "炼制控域丹·四阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 365,
      "masteryXp": 365,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "jungleSpores": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 365,
        "masteryXp": 365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "areaControlPotion",
          "name": "Area Control Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "+50% Flat Slayer Area Effect Negation",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "alchemicPracticePotionI",
      "name": "炼制炼丹熟习丹·一阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 297,
      "masteryXp": 297,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "pumpkin": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 297,
        "masteryXp": 297,
        "cultivation": 1,
        "melvor": {
          "seriesId": "alchemicPracticePotion",
          "name": "Alchemic Practice Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+10% Chance to Double Items in Herblore",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "alchemicPracticePotionII",
      "name": "炼制炼丹熟习丹·二阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 297,
      "masteryXp": 297,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "pumpkin": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 297,
        "masteryXp": 297,
        "cultivation": 1,
        "melvor": {
          "seriesId": "alchemicPracticePotion",
          "name": "Alchemic Practice Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 15,
          "effect": "+15% Chance to Double Items in Herblore",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "alchemicPracticePotionIII",
      "name": "炼制炼丹熟习丹·三阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 297,
      "masteryXp": 297,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "pumpkin": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 297,
        "masteryXp": 297,
        "cultivation": 1,
        "melvor": {
          "seriesId": "alchemicPracticePotion",
          "name": "Alchemic Practice Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 20,
          "effect": "+20% Chance to Double Items in Herblore",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "alchemicPracticePotionIV",
      "name": "炼制炼丹熟习丹·四阶",
      "unlockLevel": 100,
      "baseSeconds": 2,
      "skillXp": 297,
      "masteryXp": 297,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "pumpkin": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 297,
        "masteryXp": 297,
        "cultivation": 1,
        "melvor": {
          "seriesId": "alchemicPracticePotion",
          "name": "Alchemic Practice Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 30,
          "effect": "+25% Chance to Double Items in Herblore",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveDefencePotionI",
      "name": "炼制应变防御丹·一阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 394,
      "masteryXp": 394,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "staticJellyfish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 394,
        "masteryXp": 394,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveDefencePotion",
          "name": "Adaptive Defence Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 20,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveDefencePotionII",
      "name": "炼制应变防御丹·二阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 394,
      "masteryXp": 394,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "staticJellyfish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 394,
        "masteryXp": 394,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveDefencePotion",
          "name": "Adaptive Defence Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 35,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveDefencePotionIII",
      "name": "炼制应变防御丹·三阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 394,
      "masteryXp": 394,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "staticJellyfish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 394,
        "masteryXp": 394,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveDefencePotion",
          "name": "Adaptive Defence Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 50,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveDefencePotionIV",
      "name": "炼制应变防御丹·四阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 394,
      "masteryXp": 394,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "staticJellyfish": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 394,
        "masteryXp": 394,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveDefencePotion",
          "name": "Adaptive Defence Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 75,
          "effect": "Evasion Ratings are multiplied by 1.75 times current Hitpoints percent",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gemDetectorPotionI",
      "name": "炼制寻宝石丹·一阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 313,
      "masteryXp": 313,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "onyx": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 313,
        "masteryXp": 313,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gemDetectorPotion",
          "name": "Gem Detector Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+2% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gemDetectorPotionII",
      "name": "炼制寻宝石丹·二阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 313,
      "masteryXp": 313,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "onyx": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 313,
        "masteryXp": 313,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gemDetectorPotion",
          "name": "Gem Detector Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 20,
          "effect": "+4% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gemDetectorPotionIII",
      "name": "炼制寻宝石丹·三阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 313,
      "masteryXp": 313,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "onyx": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 313,
        "masteryXp": 313,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gemDetectorPotion",
          "name": "Gem Detector Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 30,
          "effect": "+7% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gemDetectorPotionIV",
      "name": "炼制寻宝石丹·四阶",
      "unlockLevel": 102,
      "baseSeconds": 2,
      "skillXp": 313,
      "masteryXp": 313,
      "cultivation": 1,
      "ingredients": {
        "snowcressHerb": 1,
        "onyx": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 313,
        "masteryXp": 313,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gemDetectorPotion",
          "name": "Gem Detector Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 40,
          "effect": "+10% chance to receive a Quality Superior Gem while Mining a \"Gem Vein\" Node or Meteorite Ore",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "slayerBountyPotionI",
      "name": "炼制猎妖赏金丹·一阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 428,
      "masteryXp": 428,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "bitterlymeSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 428,
        "masteryXp": 428,
        "cultivation": 1,
        "melvor": {
          "seriesId": "slayerBountyPotion",
          "name": "Slayer Bounty Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+10% Global Slayer Coins (except Item Sales) and +10% chance for a Slayer Task kill to count as 2 kills.",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "slayerBountyPotionII",
      "name": "炼制猎妖赏金丹·二阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 428,
      "masteryXp": 428,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "bitterlymeSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 428,
        "masteryXp": 428,
        "cultivation": 1,
        "melvor": {
          "seriesId": "slayerBountyPotion",
          "name": "Slayer Bounty Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 15,
          "effect": "+15% Global Slayer Coins (except Item Sales) and +15% chance for a Slayer Task kill to count as 2 kills.",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "slayerBountyPotionIII",
      "name": "炼制猎妖赏金丹·三阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 428,
      "masteryXp": 428,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "bitterlymeSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 428,
        "masteryXp": 428,
        "cultivation": 1,
        "melvor": {
          "seriesId": "slayerBountyPotion",
          "name": "Slayer Bounty Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 20,
          "effect": "+20% Global Slayer Coins (except Item Sales) and +20% chance for a Slayer Task kill to count as 2 kills.",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "slayerBountyPotionIV",
      "name": "炼制猎妖赏金丹·四阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 428,
      "masteryXp": 428,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "bitterlymeSeeds": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 428,
        "masteryXp": 428,
        "cultivation": 1,
        "melvor": {
          "seriesId": "slayerBountyPotion",
          "name": "Slayer Bounty Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 30,
          "effect": "+25% Global Slayer Coins (except Item Sales) and +25% chance for a Slayer Task kill to count as 2 kills.",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "multicookerPotionI",
      "name": "炼制复烹丹·一阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 329,
      "masteryXp": 329,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "ash": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 329,
        "masteryXp": 329,
        "cultivation": 1,
        "melvor": {
          "seriesId": "multicookerPotion",
          "name": "Multicooker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "-10% Passive Cook Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "multicookerPotionII",
      "name": "炼制复烹丹·二阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 329,
      "masteryXp": 329,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "ash": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 329,
        "masteryXp": 329,
        "cultivation": 1,
        "melvor": {
          "seriesId": "multicookerPotion",
          "name": "Multicooker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 20,
          "effect": "-15% Passive Cook Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "multicookerPotionIII",
      "name": "炼制复烹丹·三阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 329,
      "masteryXp": 329,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "ash": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 329,
        "masteryXp": 329,
        "cultivation": 1,
        "melvor": {
          "seriesId": "multicookerPotion",
          "name": "Multicooker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 30,
          "effect": "-25% Passive Cook Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "multicookerPotionIV",
      "name": "炼制复烹丹·四阶",
      "unlockLevel": 105,
      "baseSeconds": 2,
      "skillXp": 329,
      "masteryXp": 329,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "ash": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 329,
        "masteryXp": 329,
        "cultivation": 1,
        "melvor": {
          "seriesId": "multicookerPotion",
          "name": "Multicooker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "-40% Passive Cook Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "holyBulwarkPotionI",
      "name": "炼制圣壁丹·一阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 457,
      "masteryXp": 457,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "magicBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 457,
        "masteryXp": 457,
        "cultivation": 1,
        "melvor": {
          "seriesId": "holyBulwarkPotion",
          "name": "Holy Bulwark Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "holyBulwarkPotionII",
      "name": "炼制圣壁丹·二阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 457,
      "masteryXp": 457,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "magicBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 457,
        "masteryXp": 457,
        "cultivation": 1,
        "melvor": {
          "seriesId": "holyBulwarkPotion",
          "name": "Holy Bulwark Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 15,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "holyBulwarkPotionIII",
      "name": "炼制圣壁丹·三阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 457,
      "masteryXp": 457,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "magicBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 457,
        "masteryXp": 457,
        "cultivation": 1,
        "melvor": {
          "seriesId": "holyBulwarkPotion",
          "name": "Holy Bulwark Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 20,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "holyBulwarkPotionIV",
      "name": "炼制圣壁丹·四阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 457,
      "masteryXp": 457,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "magicBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 457,
        "masteryXp": 457,
        "cultivation": 1,
        "melvor": {
          "seriesId": "holyBulwarkPotion",
          "name": "Holy Bulwark Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 30,
          "effect": "+1% of all damage taken is added as Prayer Points (Rounded down)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "starSeekerPotionI",
      "name": "炼制寻星丹·一阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 340,
      "masteryXp": 340,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "meteoriteOre": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 340,
        "masteryXp": 340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "starSeekerPotion",
          "name": "Star Seeker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 15,
          "effect": "+1% chance to gain Golden Stardust in Astrology",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "starSeekerPotionII",
      "name": "炼制寻星丹·二阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 340,
      "masteryXp": 340,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "meteoriteOre": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 340,
        "masteryXp": 340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "starSeekerPotion",
          "name": "Star Seeker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 25,
          "effect": "+2% chance to gain Golden Stardust in Astrology",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "starSeekerPotionIII",
      "name": "炼制寻星丹·三阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 340,
      "masteryXp": 340,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "meteoriteOre": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 340,
        "masteryXp": 340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "starSeekerPotion",
          "name": "Star Seeker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "+3% chance to gain Golden Stardust in Astrology",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "starSeekerPotionIV",
      "name": "炼制寻星丹·四阶",
      "unlockLevel": 108,
      "baseSeconds": 2,
      "skillXp": 340,
      "masteryXp": 340,
      "cultivation": 1,
      "ingredients": {
        "bitterlymeHerb": 1,
        "meteoriteOre": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 340,
        "masteryXp": 340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "starSeekerPotion",
          "name": "Star Seeker Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "+5% chance to gain Golden Stardust in Astrology",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "trapsPotionI",
      "name": "炼制陷阱丹·一阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 369,
      "masteryXp": 369,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "elderwoodLogs": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 369,
        "masteryXp": 369,
        "cultivation": 1,
        "melvor": {
          "seriesId": "trapsPotion",
          "name": "Traps Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 5,
          "effect": "+2% Agility Skill XP from Obstacles that contain a negative modifier and +2% Agility Mastery XP from Obstacles that contain a negative modifier and +20% GP from Agility Obstacles that contain a negative modifier",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "trapsPotionII",
      "name": "炼制陷阱丹·二阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 369,
      "masteryXp": 369,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "elderwoodLogs": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 369,
        "masteryXp": 369,
        "cultivation": 1,
        "melvor": {
          "seriesId": "trapsPotion",
          "name": "Traps Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 10,
          "effect": "+3% Agility Skill XP from Obstacles that contain a negative modifier and +3% Agility Mastery XP from Obstacles that contain a negative modifier and +30% GP from Agility Obstacles that contain a negative modifier",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "trapsPotionIII",
      "name": "炼制陷阱丹·三阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 369,
      "masteryXp": 369,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "elderwoodLogs": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 369,
        "masteryXp": 369,
        "cultivation": 1,
        "melvor": {
          "seriesId": "trapsPotion",
          "name": "Traps Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 15,
          "effect": "+4% Agility Skill XP from Obstacles that contain a negative modifier and +4% Agility Mastery XP from Obstacles that contain a negative modifier and +40% GP from Agility Obstacles that contain a negative modifier",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "trapsPotionIV",
      "name": "炼制陷阱丹·四阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 369,
      "masteryXp": 369,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "elderwoodLogs": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 369,
        "masteryXp": 369,
        "cultivation": 1,
        "melvor": {
          "seriesId": "trapsPotion",
          "name": "Traps Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 20,
          "effect": "+5% Agility Skill XP from Obstacles that contain a negative modifier and +5% Agility Mastery XP from Obstacles that contain a negative modifier and +50% GP from Agility Obstacles that contain a negative modifier",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveAccuracyPotionI",
      "name": "炼制应变精准丹·一阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 493,
      "masteryXp": 493,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "infernalBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 493,
        "masteryXp": 493,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveAccuracyPotion",
          "name": "Adaptive Accuracy Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 20,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveAccuracyPotionII",
      "name": "炼制应变精准丹·二阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 493,
      "masteryXp": 493,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "infernalBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 493,
        "masteryXp": 493,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveAccuracyPotion",
          "name": "Adaptive Accuracy Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 35,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveAccuracyPotionIII",
      "name": "炼制应变精准丹·三阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 493,
      "masteryXp": 493,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "infernalBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 493,
        "masteryXp": 493,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveAccuracyPotion",
          "name": "Adaptive Accuracy Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 50,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "adaptiveAccuracyPotionIV",
      "name": "炼制应变精准丹·四阶",
      "unlockLevel": 110,
      "baseSeconds": 2,
      "skillXp": 493,
      "masteryXp": 493,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "infernalBones": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 493,
        "masteryXp": 493,
        "cultivation": 1,
        "melvor": {
          "seriesId": "adaptiveAccuracyPotion",
          "name": "Adaptive Accuracy Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 75,
          "effect": "Accuracy Ratings are multiplied by 1.50 times current Hitpoints percent",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "reaperPotionI",
      "name": "炼制收割丹·一阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 523,
      "masteryXp": 523,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "rawGhostFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 523,
        "masteryXp": 523,
        "cultivation": 1,
        "melvor": {
          "seriesId": "reaperPotion",
          "name": "Reaper Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 15,
          "effect": "+30% Bleed lifesteal, +30% Burn lifesteal, and +30% Poison lifesteal",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "reaperPotionII",
      "name": "炼制收割丹·二阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 523,
      "masteryXp": 523,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "rawGhostFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 523,
        "masteryXp": 523,
        "cultivation": 1,
        "melvor": {
          "seriesId": "reaperPotion",
          "name": "Reaper Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 25,
          "effect": "+40% Bleed lifesteal, +40% Burn lifesteal, and +40% Poison lifesteal",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "reaperPotionIII",
      "name": "炼制收割丹·三阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 523,
      "masteryXp": 523,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "rawGhostFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 523,
        "masteryXp": 523,
        "cultivation": 1,
        "melvor": {
          "seriesId": "reaperPotion",
          "name": "Reaper Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "+50% Bleed lifesteal, +50% Burn lifesteal, and +50% Poison lifesteal",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "reaperPotionIV",
      "name": "炼制收割丹·四阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 523,
      "masteryXp": 523,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "rawGhostFish": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 523,
        "masteryXp": 523,
        "cultivation": 1,
        "melvor": {
          "seriesId": "reaperPotion",
          "name": "Reaper Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "+75% Bleed lifesteal, +75% Burn lifesteal, and +75% Poison lifesteal",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blacksmithPotionI",
      "name": "炼制锻匠丹·一阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 397,
      "masteryXp": 397,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "iridiumBar": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 397,
        "masteryXp": 397,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blacksmithPotion",
          "name": "Blacksmith Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 15,
          "effect": "+5% Chance to Double Items in Smithing",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blacksmithPotionII",
      "name": "炼制锻匠丹·二阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 397,
      "masteryXp": 397,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "iridiumBar": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 397,
        "masteryXp": 397,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blacksmithPotion",
          "name": "Blacksmith Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 25,
          "effect": "+10% Chance to Double Items in Smithing",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blacksmithPotionIII",
      "name": "炼制锻匠丹·三阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 397,
      "masteryXp": 397,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "iridiumBar": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 397,
        "masteryXp": 397,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blacksmithPotion",
          "name": "Blacksmith Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "+15% Chance to Double Items in Smithing",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blacksmithPotionIV",
      "name": "炼制锻匠丹·四阶",
      "unlockLevel": 112,
      "baseSeconds": 2,
      "skillXp": 397,
      "masteryXp": 397,
      "cultivation": 1,
      "ingredients": {
        "moonwortHerb": 1,
        "iridiumBar": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 397,
        "masteryXp": 397,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blacksmithPotion",
          "name": "Blacksmith Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "+20% Chance to Double Items in Smithing",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "enkindledYieldsPotionI",
      "name": "炼制引火丰产丹·一阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 432,
      "masteryXp": 432,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "charcoal": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 432,
        "masteryXp": 432,
        "cultivation": 1,
        "melvor": {
          "seriesId": "enkindledYieldsPotion",
          "name": "Enkindled Yields Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 15,
          "effect": "+10% Chance to Double Items in Firemaking",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "enkindledYieldsPotionII",
      "name": "炼制引火丰产丹·二阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 432,
      "masteryXp": 432,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "charcoal": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 432,
        "masteryXp": 432,
        "cultivation": 1,
        "melvor": {
          "seriesId": "enkindledYieldsPotion",
          "name": "Enkindled Yields Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 25,
          "effect": "+15% Chance to Double Items in Firemaking",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "enkindledYieldsPotionIII",
      "name": "炼制引火丰产丹·三阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 432,
      "masteryXp": 432,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "charcoal": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 432,
        "masteryXp": 432,
        "cultivation": 1,
        "melvor": {
          "seriesId": "enkindledYieldsPotion",
          "name": "Enkindled Yields Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "+20% Chance to Double Items in Firemaking",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "enkindledYieldsPotionIV",
      "name": "炼制引火丰产丹·四阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 432,
      "masteryXp": 432,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "charcoal": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 432,
        "masteryXp": 432,
        "cultivation": 1,
        "melvor": {
          "seriesId": "enkindledYieldsPotion",
          "name": "Enkindled Yields Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "+25% Chance to Double Items in Firemaking",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "penetrationPotionI",
      "name": "炼制穿透丹·一阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 561,
      "masteryXp": 561,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "ectoplasm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 561,
        "masteryXp": 561,
        "cultivation": 1,
        "melvor": {
          "seriesId": "penetrationPotion",
          "name": "Penetration Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "Gives the Enemy: -2% Damage Reduction",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "penetrationPotionII",
      "name": "炼制穿透丹·二阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 561,
      "masteryXp": 561,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "ectoplasm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 561,
        "masteryXp": 561,
        "cultivation": 1,
        "melvor": {
          "seriesId": "penetrationPotion",
          "name": "Penetration Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 15,
          "effect": "Gives the Enemy: -4% Damage Reduction",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "penetrationPotionIII",
      "name": "炼制穿透丹·三阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 561,
      "masteryXp": 561,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "ectoplasm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 561,
        "masteryXp": 561,
        "cultivation": 1,
        "melvor": {
          "seriesId": "penetrationPotion",
          "name": "Penetration Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 20,
          "effect": "Gives the Enemy: -6% Damage Reduction",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "penetrationPotionIV",
      "name": "炼制穿透丹·四阶",
      "unlockLevel": 115,
      "baseSeconds": 2,
      "skillXp": 561,
      "masteryXp": 561,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "ectoplasm": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 561,
        "masteryXp": 561,
        "cultivation": 1,
        "melvor": {
          "seriesId": "penetrationPotion",
          "name": "Penetration Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 25,
          "effect": "Gives the Enemy: -8% Damage Reduction",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "altMagicPotionI",
      "name": "炼制异术丹·一阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 477,
      "masteryXp": 477,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "soulCharm": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 477,
        "masteryXp": 477,
        "cultivation": 1,
        "melvor": {
          "seriesId": "altMagicPotion",
          "name": "Alt. Magic Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 15,
          "effect": "-5% Magic Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "altMagicPotionII",
      "name": "炼制异术丹·二阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 477,
      "masteryXp": 477,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "soulCharm": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 477,
        "masteryXp": 477,
        "cultivation": 1,
        "melvor": {
          "seriesId": "altMagicPotion",
          "name": "Alt. Magic Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 25,
          "effect": "-10% Magic Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "altMagicPotionIII",
      "name": "炼制异术丹·三阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 477,
      "masteryXp": 477,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "soulCharm": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 477,
        "masteryXp": 477,
        "cultivation": 1,
        "melvor": {
          "seriesId": "altMagicPotion",
          "name": "Alt. Magic Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 35,
          "effect": "-15% Magic Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "altMagicPotionIV",
      "name": "炼制异术丹·四阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 477,
      "masteryXp": 477,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "soulCharm": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 477,
        "masteryXp": 477,
        "cultivation": 1,
        "melvor": {
          "seriesId": "altMagicPotion",
          "name": "Alt. Magic Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 50,
          "effect": "-20% Magic Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "criticalStrikePotionI",
      "name": "炼制会心丹·一阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 594,
      "masteryXp": 594,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "zephyte": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 594,
        "masteryXp": 594,
        "cultivation": 1,
        "melvor": {
          "seriesId": "criticalStrikePotion",
          "name": "Critical Strike Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "I",
          "charges": 10,
          "effect": "+5% Melee critical hit chance, +5% Ranged critical hit chance, and +5% Magic critical hit chance",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "criticalStrikePotionII",
      "name": "炼制会心丹·二阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 594,
      "masteryXp": 594,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "zephyte": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 594,
        "masteryXp": 594,
        "cultivation": 1,
        "melvor": {
          "seriesId": "criticalStrikePotion",
          "name": "Critical Strike Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "II",
          "charges": 15,
          "effect": "+10% Melee critical hit chance, +10% Ranged critical hit chance, and +10% Magic critical hit chance",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "criticalStrikePotionIII",
      "name": "炼制会心丹·三阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 594,
      "masteryXp": 594,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "zephyte": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 594,
        "masteryXp": 594,
        "cultivation": 1,
        "melvor": {
          "seriesId": "criticalStrikePotion",
          "name": "Critical Strike Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "III",
          "charges": 25,
          "effect": "+15% Melee critical hit chance, +15% Ranged critical hit chance, and +15% Magic critical hit chance",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "criticalStrikePotionIV",
      "name": "炼制会心丹·四阶",
      "unlockLevel": 118,
      "baseSeconds": 2,
      "skillXp": 594,
      "masteryXp": 594,
      "cultivation": 1,
      "ingredients": {
        "wurmtayleHerb": 1,
        "zephyte": 1
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 594,
        "masteryXp": 594,
        "cultivation": 1,
        "melvor": {
          "seriesId": "criticalStrikePotion",
          "name": "Critical Strike Potion",
          "realm": "melvor",
          "dlc": "Throne of the Herald Expansion",
          "tier": "IV",
          "charges": 35,
          "effect": "+20% Melee critical hit chance, +20% Ranged critical hit chance, and +20% Magic critical hit chance",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "harvesterSPotionI",
      "name": "炼制采收丹·一阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 1340,
      "masteryXp": 1340,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "abyssalStone": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1340,
        "masteryXp": 1340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "harvesterSPotion",
          "name": "Harvester's Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "-2% Harvesting Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "harvesterSPotionII",
      "name": "炼制采收丹·二阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 1340,
      "masteryXp": 1340,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "abyssalStone": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1340,
        "masteryXp": 1340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "harvesterSPotion",
          "name": "Harvester's Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "-4% Harvesting Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "harvesterSPotionIII",
      "name": "炼制采收丹·三阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 1340,
      "masteryXp": 1340,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "abyssalStone": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1340,
        "masteryXp": 1340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "harvesterSPotion",
          "name": "Harvester's Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "-6% Harvesting Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "harvesterSPotionIV",
      "name": "炼制采收丹·四阶",
      "unlockLevel": 1,
      "baseSeconds": 2,
      "skillXp": 1340,
      "masteryXp": 1340,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "abyssalStone": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1340,
        "masteryXp": 1340,
        "cultivation": 1,
        "melvor": {
          "seriesId": "harvesterSPotion",
          "name": "Harvester's Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "-8% Harvesting Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "corruptedFighterPotionI",
      "name": "炼制腐化斗士丹·一阶",
      "unlockLevel": 4,
      "baseSeconds": 2,
      "skillXp": 1718,
      "masteryXp": 1718,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "crimsonBiter": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1718,
        "masteryXp": 1718,
        "cultivation": 1,
        "melvor": {
          "seriesId": "corruptedFighterPotion",
          "name": "Corrupted Fighter Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+2% Corruption Abyssal XP",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "corruptedFighterPotionII",
      "name": "炼制腐化斗士丹·二阶",
      "unlockLevel": 4,
      "baseSeconds": 2,
      "skillXp": 1718,
      "masteryXp": 1718,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "crimsonBiter": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1718,
        "masteryXp": 1718,
        "cultivation": 1,
        "melvor": {
          "seriesId": "corruptedFighterPotion",
          "name": "Corrupted Fighter Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+4% Corruption Abyssal XP",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "corruptedFighterPotionIII",
      "name": "炼制腐化斗士丹·三阶",
      "unlockLevel": 4,
      "baseSeconds": 2,
      "skillXp": 1718,
      "masteryXp": 1718,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "crimsonBiter": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1718,
        "masteryXp": 1718,
        "cultivation": 1,
        "melvor": {
          "seriesId": "corruptedFighterPotion",
          "name": "Corrupted Fighter Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+6% Corruption Abyssal XP",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "corruptedFighterPotionIV",
      "name": "炼制腐化斗士丹·四阶",
      "unlockLevel": 4,
      "baseSeconds": 2,
      "skillXp": 1718,
      "masteryXp": 1718,
      "cultivation": 1,
      "ingredients": {
        "gloomsproutHerb": 1,
        "crimsonBiter": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1718,
        "masteryXp": 1718,
        "cultivation": 1,
        "melvor": {
          "seriesId": "corruptedFighterPotion",
          "name": "Corrupted Fighter Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+8% Corruption Abyssal XP",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "piecesFinderPotionI",
      "name": "炼制残片搜寻丹·一阶",
      "unlockLevel": 7,
      "baseSeconds": 2,
      "skillXp": 2226,
      "masteryXp": 2226,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 1,
        "nightopal": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2226,
        "masteryXp": 2226,
        "cultivation": 1,
        "melvor": {
          "seriesId": "piecesFinderPotion",
          "name": "Pieces Finder Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% AP from Combat",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "piecesFinderPotionII",
      "name": "炼制残片搜寻丹·二阶",
      "unlockLevel": 7,
      "baseSeconds": 2,
      "skillXp": 2226,
      "masteryXp": 2226,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 1,
        "nightopal": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2226,
        "masteryXp": 2226,
        "cultivation": 1,
        "melvor": {
          "seriesId": "piecesFinderPotion",
          "name": "Pieces Finder Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% AP from Combat",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "piecesFinderPotionIII",
      "name": "炼制残片搜寻丹·三阶",
      "unlockLevel": 7,
      "baseSeconds": 2,
      "skillXp": 2226,
      "masteryXp": 2226,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 1,
        "nightopal": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2226,
        "masteryXp": 2226,
        "cultivation": 1,
        "melvor": {
          "seriesId": "piecesFinderPotion",
          "name": "Pieces Finder Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% AP from Combat",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "piecesFinderPotionIV",
      "name": "炼制残片搜寻丹·四阶",
      "unlockLevel": 7,
      "baseSeconds": 2,
      "skillXp": 2226,
      "masteryXp": 2226,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 1,
        "nightopal": 2
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2226,
        "masteryXp": 2226,
        "cultivation": 1,
        "melvor": {
          "seriesId": "piecesFinderPotion",
          "name": "Pieces Finder Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% AP from Combat",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lacerationPotionI",
      "name": "炼制撕裂丹·一阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 1942,
      "masteryXp": 1942,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 2,
        "abyssalBatwing": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1942,
        "masteryXp": 1942,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lacerationPotion",
          "name": "Laceration Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+10% chance to apply Laceration when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lacerationPotionII",
      "name": "炼制撕裂丹·二阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 1942,
      "masteryXp": 1942,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 2,
        "abyssalBatwing": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1942,
        "masteryXp": 1942,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lacerationPotion",
          "name": "Laceration Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+20% chance to apply Laceration when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lacerationPotionIII",
      "name": "炼制撕裂丹·三阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 1942,
      "masteryXp": 1942,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 2,
        "abyssalBatwing": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1942,
        "masteryXp": 1942,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lacerationPotion",
          "name": "Laceration Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+30% chance to apply Laceration when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "lacerationPotionIV",
      "name": "炼制撕裂丹·四阶",
      "unlockLevel": 10,
      "baseSeconds": 2,
      "skillXp": 1942,
      "masteryXp": 1942,
      "cultivation": 1,
      "ingredients": {
        "nightgleamHerb": 2,
        "abyssalBatwing": 5
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 1942,
        "masteryXp": 1942,
        "cultivation": 1,
        "melvor": {
          "seriesId": "lacerationPotion",
          "name": "Laceration Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+40% chance to apply Laceration when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gloomgrowthPotionI",
      "name": "炼制幽生丹·一阶",
      "unlockLevel": 13,
      "baseSeconds": 2,
      "skillXp": 2525,
      "masteryXp": 2525,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "gloomResin": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2525,
        "masteryXp": 2525,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gloomgrowthPotion",
          "name": "Gloomgrowth Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+20% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gloomgrowthPotionII",
      "name": "炼制幽生丹·二阶",
      "unlockLevel": 13,
      "baseSeconds": 2,
      "skillXp": 2525,
      "masteryXp": 2525,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "gloomResin": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2525,
        "masteryXp": 2525,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gloomgrowthPotion",
          "name": "Gloomgrowth Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+25% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gloomgrowthPotionIII",
      "name": "炼制幽生丹·三阶",
      "unlockLevel": 13,
      "baseSeconds": 2,
      "skillXp": 2525,
      "masteryXp": 2525,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "gloomResin": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2525,
        "masteryXp": 2525,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gloomgrowthPotion",
          "name": "Gloomgrowth Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+30% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "gloomgrowthPotionIV",
      "name": "炼制幽生丹·四阶",
      "unlockLevel": 13,
      "baseSeconds": 2,
      "skillXp": 2525,
      "masteryXp": 2525,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "gloomResin": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2525,
        "masteryXp": 2525,
        "cultivation": 1,
        "melvor": {
          "seriesId": "gloomgrowthPotion",
          "name": "Gloomgrowth Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+40% base primary resource quantity gained in Farming for Abyssal Realm only and +50% Farming Interval",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blightedTouchPotionI",
      "name": "炼制凋触丹·一阶",
      "unlockLevel": 16,
      "baseSeconds": 2,
      "skillXp": 2815,
      "masteryXp": 2815,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "blightPowder": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2815,
        "masteryXp": 2815,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blightedTouchPotion",
          "name": "Blighted Touch Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+2% chance to ignore Blight and +2% chance to apply Blight when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blightedTouchPotionII",
      "name": "炼制凋触丹·二阶",
      "unlockLevel": 16,
      "baseSeconds": 2,
      "skillXp": 2815,
      "masteryXp": 2815,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "blightPowder": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2815,
        "masteryXp": 2815,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blightedTouchPotion",
          "name": "Blighted Touch Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+4% chance to ignore Blight and +4% chance to apply Blight when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blightedTouchPotionIII",
      "name": "炼制凋触丹·三阶",
      "unlockLevel": 16,
      "baseSeconds": 2,
      "skillXp": 2815,
      "masteryXp": 2815,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "blightPowder": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2815,
        "masteryXp": 2815,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blightedTouchPotion",
          "name": "Blighted Touch Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+6% chance to ignore Blight and +6% chance to apply Blight when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "blightedTouchPotionIV",
      "name": "炼制凋触丹·四阶",
      "unlockLevel": 16,
      "baseSeconds": 2,
      "skillXp": 2815,
      "masteryXp": 2815,
      "cultivation": 1,
      "ingredients": {
        "blightblossomHerb": 2,
        "blightPowder": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2815,
        "masteryXp": 2815,
        "cultivation": 1,
        "melvor": {
          "seriesId": "blightedTouchPotion",
          "name": "Blighted Touch Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+8% chance to ignore Blight and +8% chance to apply Blight when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalMinerPotionI",
      "name": "炼制深渊采矿丹·一阶",
      "unlockLevel": 19,
      "baseSeconds": 2,
      "skillXp": 3669,
      "masteryXp": 3669,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 2,
        "azurianFragment": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3669,
        "masteryXp": 3669,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalMinerPotion",
          "name": "Abyssal Miner Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+0.10% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalMinerPotionII",
      "name": "炼制深渊采矿丹·二阶",
      "unlockLevel": 19,
      "baseSeconds": 2,
      "skillXp": 3669,
      "masteryXp": 3669,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 2,
        "azurianFragment": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3669,
        "masteryXp": 3669,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalMinerPotion",
          "name": "Abyssal Miner Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+0.20% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalMinerPotionIII",
      "name": "炼制深渊采矿丹·三阶",
      "unlockLevel": 19,
      "baseSeconds": 2,
      "skillXp": 3669,
      "masteryXp": 3669,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 2,
        "azurianFragment": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3669,
        "masteryXp": 3669,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalMinerPotion",
          "name": "Abyssal Miner Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+0.30% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalMinerPotionIV",
      "name": "炼制深渊采矿丹·四阶",
      "unlockLevel": 19,
      "baseSeconds": 2,
      "skillXp": 3669,
      "masteryXp": 3669,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 2,
        "azurianFragment": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3669,
        "masteryXp": 3669,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalMinerPotion",
          "name": "Abyssal Miner Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+0.40% chance to receive an Abyssal Gem while Mining \"Abyssal Rock\" and \"Outcrop\" Nodes",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "shadeveilPotionI",
      "name": "炼制影幕丹·一阶",
      "unlockLevel": 22,
      "baseSeconds": 2,
      "skillXp": 2675,
      "masteryXp": 2675,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 4,
        "rawSteamswimmer": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2675,
        "masteryXp": 2675,
        "cultivation": 1,
        "melvor": {
          "seriesId": "shadeveilPotion",
          "name": "Shadeveil Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+15% Global critical hit chance and +15% chance to apply Shadeveil when critically hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "shadeveilPotionII",
      "name": "炼制影幕丹·二阶",
      "unlockLevel": 22,
      "baseSeconds": 2,
      "skillXp": 2675,
      "masteryXp": 2675,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 4,
        "rawSteamswimmer": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2675,
        "masteryXp": 2675,
        "cultivation": 1,
        "melvor": {
          "seriesId": "shadeveilPotion",
          "name": "Shadeveil Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+15% Global critical hit chance and +25% chance to apply Shadeveil when critically hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "shadeveilPotionIII",
      "name": "炼制影幕丹·三阶",
      "unlockLevel": 22,
      "baseSeconds": 2,
      "skillXp": 2675,
      "masteryXp": 2675,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 4,
        "rawSteamswimmer": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2675,
        "masteryXp": 2675,
        "cultivation": 1,
        "melvor": {
          "seriesId": "shadeveilPotion",
          "name": "Shadeveil Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% Global critical hit chance and +35% chance to apply Shadeveil when critically hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "shadeveilPotionIV",
      "name": "炼制影幕丹·四阶",
      "unlockLevel": 22,
      "baseSeconds": 2,
      "skillXp": 2675,
      "masteryXp": 2675,
      "cultivation": 1,
      "ingredients": {
        "shadefrondHerb": 4,
        "rawSteamswimmer": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 2675,
        "masteryXp": 2675,
        "cultivation": 1,
        "melvor": {
          "seriesId": "shadeveilPotion",
          "name": "Shadeveil Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% Global critical hit chance and +50% chance to apply Shadeveil when critically hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalCombinationPotionI",
      "name": "炼制深渊合符丹·一阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 3491,
      "masteryXp": 3491,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "abyssalEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3491,
        "masteryXp": 3491,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalCombinationPotion",
          "name": "Abyssal Combination Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalCombinationPotionII",
      "name": "炼制深渊合符丹·二阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 3491,
      "masteryXp": 3491,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "abyssalEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3491,
        "masteryXp": 3491,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalCombinationPotion",
          "name": "Abyssal Combination Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalCombinationPotionIII",
      "name": "炼制深渊合符丹·三阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 3491,
      "masteryXp": 3491,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "abyssalEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3491,
        "masteryXp": 3491,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalCombinationPotion",
          "name": "Abyssal Combination Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalCombinationPotionIV",
      "name": "炼制深渊合符丹·四阶",
      "unlockLevel": 25,
      "baseSeconds": 2,
      "skillXp": 3491,
      "masteryXp": 3491,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "abyssalEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3491,
        "masteryXp": 3491,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalCombinationPotion",
          "name": "Abyssal Combination Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% chance to gain +8 additional resource in Runecrafting for Abyssal Combo Runes (Cannot be doubled)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fearPotionI",
      "name": "炼制恐惧丹·一阶",
      "unlockLevel": 28,
      "baseSeconds": 2,
      "skillXp": 4563,
      "masteryXp": 4563,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "petrifiedEye": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 4563,
        "masteryXp": 4563,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fearPotion",
          "name": "Fear Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to ignore Fear and +2% chance to apply Fear when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fearPotionII",
      "name": "炼制恐惧丹·二阶",
      "unlockLevel": 28,
      "baseSeconds": 2,
      "skillXp": 4563,
      "masteryXp": 4563,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "petrifiedEye": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 4563,
        "masteryXp": 4563,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fearPotion",
          "name": "Fear Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to ignore Fear and +4% chance to apply Fear when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fearPotionIII",
      "name": "炼制恐惧丹·三阶",
      "unlockLevel": 28,
      "baseSeconds": 2,
      "skillXp": 4563,
      "masteryXp": 4563,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "petrifiedEye": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 4563,
        "masteryXp": 4563,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fearPotion",
          "name": "Fear Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to ignore Fear and +6% chance to apply Fear when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "fearPotionIV",
      "name": "炼制恐惧丹·四阶",
      "unlockLevel": 28,
      "baseSeconds": 2,
      "skillXp": 4563,
      "masteryXp": 4563,
      "cultivation": 1,
      "ingredients": {
        "fearmallowHerb": 4,
        "petrifiedEye": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 4563,
        "masteryXp": 4563,
        "cultivation": 1,
        "melvor": {
          "seriesId": "fearPotion",
          "name": "Fear Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+25% chance to ignore Fear and +8% chance to apply Fear when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalConsumablePotionI",
      "name": "炼制深渊消耗丹·一阶",
      "unlockLevel": 31,
      "baseSeconds": 2,
      "skillXp": 3933,
      "masteryXp": 3933,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "mysticiteFragment": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3933,
        "masteryXp": 3933,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalConsumablePotion",
          "name": "Abyssal Consumable Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+3 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalConsumablePotionII",
      "name": "炼制深渊消耗丹·二阶",
      "unlockLevel": 31,
      "baseSeconds": 2,
      "skillXp": 3933,
      "masteryXp": 3933,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "mysticiteFragment": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3933,
        "masteryXp": 3933,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalConsumablePotion",
          "name": "Abyssal Consumable Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+5 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalConsumablePotionIII",
      "name": "炼制深渊消耗丹·三阶",
      "unlockLevel": 31,
      "baseSeconds": 2,
      "skillXp": 3933,
      "masteryXp": 3933,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "mysticiteFragment": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3933,
        "masteryXp": 3933,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalConsumablePotion",
          "name": "Abyssal Consumable Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+8 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "abyssalConsumablePotionIV",
      "name": "炼制深渊消耗丹·四阶",
      "unlockLevel": 31,
      "baseSeconds": 2,
      "skillXp": 3933,
      "masteryXp": 3933,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "mysticiteFragment": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 3933,
        "masteryXp": 3933,
        "cultivation": 1,
        "melvor": {
          "seriesId": "abyssalConsumablePotion",
          "name": "Abyssal Consumable Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+12 additional quantity of primary resource gained in Crafting for Abyssal Consumables (Cannot be doubled)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "witheringPotionI",
      "name": "炼制枯萎丹·一阶",
      "unlockLevel": 34,
      "baseSeconds": 2,
      "skillXp": 5148,
      "masteryXp": 5148,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "witheringBones": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5148,
        "masteryXp": 5148,
        "cultivation": 1,
        "melvor": {
          "seriesId": "witheringPotion",
          "name": "Withering Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+10% chance to ignore Wither and +10% chance to apply Wither when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "witheringPotionII",
      "name": "炼制枯萎丹·二阶",
      "unlockLevel": 34,
      "baseSeconds": 2,
      "skillXp": 5148,
      "masteryXp": 5148,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "witheringBones": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5148,
        "masteryXp": 5148,
        "cultivation": 1,
        "melvor": {
          "seriesId": "witheringPotion",
          "name": "Withering Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+20% chance to ignore Wither and +20% chance to apply Wither when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "witheringPotionIII",
      "name": "炼制枯萎丹·三阶",
      "unlockLevel": 34,
      "baseSeconds": 2,
      "skillXp": 5148,
      "masteryXp": 5148,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "witheringBones": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5148,
        "masteryXp": 5148,
        "cultivation": 1,
        "melvor": {
          "seriesId": "witheringPotion",
          "name": "Withering Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+30% chance to ignore Wither and +30% chance to apply Wither when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "witheringPotionIV",
      "name": "炼制枯萎丹·四阶",
      "unlockLevel": 34,
      "baseSeconds": 2,
      "skillXp": 5148,
      "masteryXp": 5148,
      "cultivation": 1,
      "ingredients": {
        "witherlymeHerb": 8,
        "witheringBones": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5148,
        "masteryXp": 5148,
        "cultivation": 1,
        "melvor": {
          "seriesId": "witheringPotion",
          "name": "Withering Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+40% chance to ignore Wither and +40% chance to apply Wither when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silentThiefPotionI",
      "name": "炼制静默窃行丹·一阶",
      "unlockLevel": 37,
      "baseSeconds": 2,
      "skillXp": 6179,
      "masteryXp": 6179,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 8,
        "blightedRoots": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 6179,
        "masteryXp": 6179,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silentThiefPotion",
          "name": "Silent Thief Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+50 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silentThiefPotionII",
      "name": "炼制静默窃行丹·二阶",
      "unlockLevel": 37,
      "baseSeconds": 2,
      "skillXp": 6179,
      "masteryXp": 6179,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 8,
        "blightedRoots": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 6179,
        "masteryXp": 6179,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silentThiefPotion",
          "name": "Silent Thief Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+60 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silentThiefPotionIII",
      "name": "炼制静默窃行丹·三阶",
      "unlockLevel": 37,
      "baseSeconds": 2,
      "skillXp": 6179,
      "masteryXp": 6179,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 8,
        "blightedRoots": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 6179,
        "masteryXp": 6179,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silentThiefPotion",
          "name": "Silent Thief Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+75 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silentThiefPotionIV",
      "name": "炼制静默窃行丹·四阶",
      "unlockLevel": 37,
      "baseSeconds": 2,
      "skillXp": 6179,
      "masteryXp": 6179,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 8,
        "blightedRoots": 10
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 6179,
        "masteryXp": 6179,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silentThiefPotion",
          "name": "Silent Thief Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+100 Stealth while Thieving from Abyssal Realm NPCs and +10% chance to avoid the stun interval and damage in Thieving when failing a pickpocket attempt for Abyssal Realm only",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silencePotionI",
      "name": "炼制沉默丹·一阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 9365,
      "masteryXp": 9365,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 16,
        "silentsnapScales": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 9365,
        "masteryXp": 9365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silencePotion",
          "name": "Silence Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+10% chance to ignore Silence and +10% chance to apply Silence when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silencePotionII",
      "name": "炼制沉默丹·二阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 9365,
      "masteryXp": 9365,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 16,
        "silentsnapScales": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 9365,
        "masteryXp": 9365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silencePotion",
          "name": "Silence Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+20% chance to ignore Silence and +20% chance to apply Silence when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silencePotionIII",
      "name": "炼制沉默丹·三阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 9365,
      "masteryXp": 9365,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 16,
        "silentsnapScales": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 9365,
        "masteryXp": 9365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silencePotion",
          "name": "Silence Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+30% chance to ignore Silence and +30% chance to apply Silence when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "silencePotionIV",
      "name": "炼制沉默丹·四阶",
      "unlockLevel": 40,
      "baseSeconds": 2,
      "skillXp": 9365,
      "masteryXp": 9365,
      "cultivation": 1,
      "ingredients": {
        "whispertallowHerb": 16,
        "silentsnapScales": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 9365,
        "masteryXp": 9365,
        "cultivation": 1,
        "melvor": {
          "seriesId": "silencePotion",
          "name": "Silence Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+40% chance to ignore Silence and +40% chance to apply Silence when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "echoingLurePotionI",
      "name": "炼制回响诱饵丹·一阶",
      "unlockLevel": 43,
      "baseSeconds": 2,
      "skillXp": 5193,
      "masteryXp": 5193,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "rawWhisperfish": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5193,
        "masteryXp": 5193,
        "cultivation": 1,
        "melvor": {
          "seriesId": "echoingLurePotion",
          "name": "Echoing Lure Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "echoingLurePotionII",
      "name": "炼制回响诱饵丹·二阶",
      "unlockLevel": 43,
      "baseSeconds": 2,
      "skillXp": 5193,
      "masteryXp": 5193,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "rawWhisperfish": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5193,
        "masteryXp": 5193,
        "cultivation": 1,
        "melvor": {
          "seriesId": "echoingLurePotion",
          "name": "Echoing Lure Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "echoingLurePotionIII",
      "name": "炼制回响诱饵丹·三阶",
      "unlockLevel": 43,
      "baseSeconds": 2,
      "skillXp": 5193,
      "masteryXp": 5193,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "rawWhisperfish": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5193,
        "masteryXp": 5193,
        "cultivation": 1,
        "melvor": {
          "seriesId": "echoingLurePotion",
          "name": "Echoing Lure Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "echoingLurePotionIV",
      "name": "炼制回响诱饵丹·四阶",
      "unlockLevel": 43,
      "baseSeconds": 2,
      "skillXp": 5193,
      "masteryXp": 5193,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "rawWhisperfish": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 5193,
        "masteryXp": 5193,
        "cultivation": 1,
        "melvor": {
          "seriesId": "echoingLurePotion",
          "name": "Echoing Lure Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% chance to catch +1 random Fish from the same Fishing Area (Cannot be doubled)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "soulsnapPotionI",
      "name": "炼制摄魂丹·一阶",
      "unlockLevel": 46,
      "baseSeconds": 2,
      "skillXp": 11740,
      "masteryXp": 11740,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "greaterSoul": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11740,
        "masteryXp": 11740,
        "cultivation": 1,
        "melvor": {
          "seriesId": "soulsnapPotion",
          "name": "Soulsnap Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to double Soul drops from enemies",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "soulsnapPotionII",
      "name": "炼制摄魂丹·二阶",
      "unlockLevel": 46,
      "baseSeconds": 2,
      "skillXp": 11740,
      "masteryXp": 11740,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "greaterSoul": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11740,
        "masteryXp": 11740,
        "cultivation": 1,
        "melvor": {
          "seriesId": "soulsnapPotion",
          "name": "Soulsnap Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to double Soul drops from enemies",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "soulsnapPotionIII",
      "name": "炼制摄魂丹·三阶",
      "unlockLevel": 46,
      "baseSeconds": 2,
      "skillXp": 11740,
      "masteryXp": 11740,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "greaterSoul": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11740,
        "masteryXp": 11740,
        "cultivation": 1,
        "melvor": {
          "seriesId": "soulsnapPotion",
          "name": "Soulsnap Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to double Soul drops from enemies",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "soulsnapPotionIV",
      "name": "炼制摄魂丹·四阶",
      "unlockLevel": 46,
      "baseSeconds": 2,
      "skillXp": 11740,
      "masteryXp": 11740,
      "cultivation": 1,
      "ingredients": {
        "echosnapHerb": 16,
        "greaterSoul": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11740,
        "masteryXp": 11740,
        "cultivation": 1,
        "melvor": {
          "seriesId": "soulsnapPotion",
          "name": "Soulsnap Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% chance to double Soul drops from enemies",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "darkRitualPotionI",
      "name": "炼制暗仪丹·一阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 12180,
      "masteryXp": 12180,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "obzurianBar": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12180,
        "masteryXp": 12180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "darkRitualPotion",
          "name": "Dark Ritual Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "darkRitualPotionII",
      "name": "炼制暗仪丹·二阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 12180,
      "masteryXp": 12180,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "obzurianBar": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12180,
        "masteryXp": 12180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "darkRitualPotion",
          "name": "Dark Ritual Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "darkRitualPotionIII",
      "name": "炼制暗仪丹·三阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 12180,
      "masteryXp": 12180,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "obzurianBar": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12180,
        "masteryXp": 12180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "darkRitualPotion",
          "name": "Dark Ritual Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "darkRitualPotionIV",
      "name": "炼制暗仪丹·四阶",
      "unlockLevel": 49,
      "baseSeconds": 2,
      "skillXp": 12180,
      "masteryXp": 12180,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "obzurianBar": 40
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12180,
        "masteryXp": 12180,
        "cultivation": 1,
        "melvor": {
          "seriesId": "darkRitualPotion",
          "name": "Dark Ritual Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+25% Cost Reduction for Summoning, excluding Shards, for Abyssal Realm only",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "eldritchCursePotionI",
      "name": "炼制异咒丹·一阶",
      "unlockLevel": 52,
      "baseSeconds": 2,
      "skillXp": 11570,
      "masteryXp": 11570,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "eldritchTendril": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11570,
        "masteryXp": 11570,
        "cultivation": 1,
        "melvor": {
          "seriesId": "eldritchCursePotion",
          "name": "Eldritch Curse Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to ignore Eldritch Curse and +5% chance to apply Eldritch Curse when attacking",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "eldritchCursePotionII",
      "name": "炼制异咒丹·二阶",
      "unlockLevel": 52,
      "baseSeconds": 2,
      "skillXp": 11570,
      "masteryXp": 11570,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "eldritchTendril": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11570,
        "masteryXp": 11570,
        "cultivation": 1,
        "melvor": {
          "seriesId": "eldritchCursePotion",
          "name": "Eldritch Curse Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to ignore Eldritch Curse and +10% chance to apply Eldritch Curse when attacking",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "eldritchCursePotionIII",
      "name": "炼制异咒丹·三阶",
      "unlockLevel": 52,
      "baseSeconds": 2,
      "skillXp": 11570,
      "masteryXp": 11570,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "eldritchTendril": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11570,
        "masteryXp": 11570,
        "cultivation": 1,
        "melvor": {
          "seriesId": "eldritchCursePotion",
          "name": "Eldritch Curse Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to ignore Eldritch Curse and +15% chance to apply Eldritch Curse when attacking",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "eldritchCursePotionIV",
      "name": "炼制异咒丹·四阶",
      "unlockLevel": 52,
      "baseSeconds": 2,
      "skillXp": 11570,
      "masteryXp": 11570,
      "cultivation": 1,
      "ingredients": {
        "eldrarootHerb": 32,
        "eldritchTendril": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 11570,
        "masteryXp": 11570,
        "cultivation": 1,
        "melvor": {
          "seriesId": "eldritchCursePotion",
          "name": "Eldritch Curse Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% chance to ignore Eldritch Curse and +20% chance to apply Eldritch Curse when attacking",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidStabilisationPotionI",
      "name": "炼制虚空稳定丹·一阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 10833,
      "masteryXp": 10833,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10833,
        "masteryXp": 10833,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidStabilisationPotion",
          "name": "Void Stabilisation Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "-5% cost to produce Abyssal Realm Items in Herblore",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidStabilisationPotionII",
      "name": "炼制虚空稳定丹·二阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 10833,
      "masteryXp": 10833,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10833,
        "masteryXp": 10833,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidStabilisationPotion",
          "name": "Void Stabilisation Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "-10% cost to produce Abyssal Realm Items in Herblore",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidStabilisationPotionIII",
      "name": "炼制虚空稳定丹·三阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 10833,
      "masteryXp": 10833,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10833,
        "masteryXp": 10833,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidStabilisationPotion",
          "name": "Void Stabilisation Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "-15% cost to produce Abyssal Realm Items in Herblore",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidStabilisationPotionIV",
      "name": "炼制虚空稳定丹·四阶",
      "unlockLevel": 55,
      "baseSeconds": 2,
      "skillXp": 10833,
      "masteryXp": 10833,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 20
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 10833,
        "masteryXp": 10833,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidStabilisationPotion",
          "name": "Void Stabilisation Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "-15% cost to produce Abyssal Realm Items in Herblore and +1 additional quantity of primary resource gained in Herblore for Abyssal Realm only (cannot be doubled)",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidburstPotionI",
      "name": "炼制虚爆丹·一阶",
      "unlockLevel": 58,
      "baseSeconds": 2,
      "skillXp": 12140,
      "masteryXp": 12140,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12140,
        "masteryXp": 12140,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidburstPotion",
          "name": "Voidburst Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "I",
          "charges": 1,
          "effect": "+5% chance to ignore Voidburst and +5% chance to apply Voidburst when hitting with an attack",
          "masteryLevel": 1,
          "xpToTier": 0
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidburstPotionII",
      "name": "炼制虚爆丹·二阶",
      "unlockLevel": 58,
      "baseSeconds": 2,
      "skillXp": 12140,
      "masteryXp": 12140,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12140,
        "masteryXp": 12140,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidburstPotion",
          "name": "Voidburst Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "II",
          "charges": 2,
          "effect": "+10% chance to ignore Voidburst and +10% chance to apply Voidburst when hitting with an attack",
          "masteryLevel": 20,
          "xpToTier": 4470
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidburstPotionIII",
      "name": "炼制虚爆丹·三阶",
      "unlockLevel": 58,
      "baseSeconds": 2,
      "skillXp": 12140,
      "masteryXp": 12140,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12140,
        "masteryXp": 12140,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidburstPotion",
          "name": "Voidburst Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "III",
          "charges": 3,
          "effect": "+15% chance to ignore Voidburst and +15% chance to apply Voidburst when hitting with an attack",
          "masteryLevel": 50,
          "xpToTier": 101333
        }
      }
    },
    {
      "skillId": "alchemy",
      "outputId": "voidburstPotionIV",
      "name": "炼制虚爆丹·四阶",
      "unlockLevel": 58,
      "baseSeconds": 2,
      "skillXp": 12140,
      "masteryXp": 12140,
      "cultivation": 1,
      "ingredients": {
        "voidbloomHerb": 32,
        "voidEssence": 80
      },
      "options": {
        "outputQuantity": 1,
        "skillXp": 12140,
        "masteryXp": 12140,
        "cultivation": 1,
        "melvor": {
          "seriesId": "voidburstPotion",
          "name": "Voidburst Potion",
          "realm": "abyssal",
          "dlc": "Into the Abyss Expansion",
          "tier": "IV",
          "charges": 4,
          "effect": "+20% chance to ignore Voidburst and +20% chance to apply Voidburst when hitting with an attack",
          "masteryLevel": 90,
          "xpToTier": 5346332
        }
      }
    }
  ]
});

  function cloneRows(value) {
    return Object.freeze(value.slice());
  }

  function source() {
    return DATA.SOURCE;
  }

  function tierMastery() {
    return DATA.TIER_MASTERY;
  }

  function ingredientRows() {
    return cloneRows(DATA.INGREDIENTS);
  }

  function seriesRows() {
    return cloneRows(DATA.SERIES);
  }

  function potionRows() {
    return cloneRows(DATA.POTION_ITEMS);
  }

  function recipeRows() {
    return cloneRows(DATA.RECIPE_ROWS);
  }

  return deepFreeze({
    SOURCE: DATA.SOURCE,
    BASE_SECONDS: DATA.BASE_SECONDS,
    TIER_MASTERY: DATA.TIER_MASTERY,
    INGREDIENTS: DATA.INGREDIENTS,
    SERIES: DATA.SERIES,
    POTION_ITEMS: DATA.POTION_ITEMS,
    RECIPE_ROWS: DATA.RECIPE_ROWS,
    source,
    tierMastery,
    ingredientRows,
    seriesRows,
    potionRows,
    recipeRows
  });
});
