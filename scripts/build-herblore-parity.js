'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = process.argv[2] || '/tmp/melvor_herblore_parity_raw.json';
const OUTPUT_JSON_PATH = path.join(SOURCE_ROOT, 'content', 'herblore-parity.json');
const OUTPUT_PATH = path.join(SOURCE_ROOT, 'content', 'herblore-parity.js');

const TIER_MASTERY = Object.freeze({
  I: { masteryLevel: 1, xpToTier: 0, numericTier: 1 },
  II: { masteryLevel: 20, xpToTier: 4470, numericTier: 2 },
  III: { masteryLevel: 50, xpToTier: 101333, numericTier: 3 },
  IV: { masteryLevel: 90, xpToTier: 5346332, numericTier: 4 }
});
const TIER_NAMES = Object.freeze({
  I: '一阶',
  II: '二阶',
  III: '三阶',
  IV: '四阶'
});
const TIER_QUALITY = Object.freeze({
  I: 'green',
  II: 'blue',
  III: 'purple',
  IV: 'orange'
});

const POTION_LOCAL_NAMES = Object.freeze({
  'Bird Nest Potion': '巢羽丹',
  'Melee Accuracy Potion': '近战精准丹',
  'Melee Evasion Potion': '近战闪避丹',
  'Barrier Touch Potion': '屏障触媒丹',
  'Ranged Assistance Potion': '远程助攻丹',
  'Hinder Potion': '迟滞丹',
  'Controlled Heat Potion': '控火丹',
  'Magic Assistance Potion': '法术助攻丹',
  'Generous Cook Potion': '丰厨丹',
  'Regeneration Potion': '回元丹',
  'Seeing Gold Potion': '见金丹',
  'Famished Potion': '饥食丹',
  'Fishermans Potion': '渔夫丹',
  'Crystallization Potion': '晶化丹',
  'Unholy Potion': '秽祷丹',
  'Skilled Fletching Potion': '巧弓丹',
  'Ranged Strength Potion': '远程强击丹',
  'Gentle Hands Potion': '巧手丹',
  'Secret Stardust Potion': '秘星尘丹',
  'Crafting Potion': '巧作丹',
  'Lucky Herb Potion': '幸运灵草丹',
  'Perfect Swing Potion': '完美挥镐丹',
  'Necromancer Potion': '唤灵丹',
  'Divine Potion': '神佑丹',
  'Melee Strength Potion': '近战强击丹',
  'Performance Enhancing Potion': '身法强化丹',
  'Elemental Potion': '元素丹',
  'Magic Damage Potion': '法伤丹',
  'Lethal Toxins Potion': '剧毒丹',
  'Herblore Potion': '百草丹',
  'Cursed Potion': '诅咒丹',
  'Generous Harvest Potion': '丰收丹',
  'Barrier Igniter Potion': '屏障燃灼丹',
  'Diamond Luck Potion': '钻运丹',
  'Crystal Sanction Potion': '晶裁丹',
  'Damage Reduction Potion': '减伤丹',
  'Area Control Potion': '控域丹',
  'Alchemic Practice Potion': '炼丹熟习丹',
  'Adaptive Defence Potion': '应变防御丹',
  'Gem Detector Potion': '寻宝石丹',
  'Slayer Bounty Potion': '猎妖赏金丹',
  'Multicooker Potion': '复烹丹',
  'Holy Bulwark Potion': '圣壁丹',
  'Star Seeker Potion': '寻星丹',
  'Traps Potion': '陷阱丹',
  'Adaptive Accuracy Potion': '应变精准丹',
  'Reaper Potion': '收割丹',
  'Blacksmith Potion': '锻匠丹',
  'Enkindled Yields Potion': '引火丰产丹',
  'Penetration Potion': '穿透丹',
  'Alt. Magic Potion': '异术丹',
  'Critical Strike Potion': '会心丹',
  "Harvester's Potion": '采收丹',
  'Corrupted Fighter Potion': '腐化斗士丹',
  'Pieces Finder Potion': '残片搜寻丹',
  'Laceration Potion': '撕裂丹',
  'Gloomgrowth Potion': '幽生丹',
  'Blighted Touch Potion': '凋触丹',
  'Abyssal Miner Potion': '深渊采矿丹',
  'Shadeveil Potion': '影幕丹',
  'Abyssal Combination Potion': '深渊合符丹',
  'Fear Potion': '恐惧丹',
  'Abyssal Consumable Potion': '深渊消耗丹',
  'Withering Potion': '枯萎丹',
  'Silent Thief Potion': '静默窃行丹',
  'Silence Potion': '沉默丹',
  'Echoing Lure Potion': '回响诱饵丹',
  'Soulsnap Potion': '摄魂丹',
  'Dark Ritual Potion': '暗仪丹',
  'Eldritch Curse Potion': '异咒丹',
  'Void Stabilisation Potion': '虚空稳定丹',
  'Voidburst Potion': '虚爆丹'
});

const INGREDIENT_LOCAL_NAMES = Object.freeze({
  'Abyssal Batwing': '深渊蝠翼',
  'Abyssal Essence': '深渊精粹',
  'Abyssal Stone': '深渊石',
  Ash: '灰烬',
  'Azurian Fragment': '湛蓝碎片',
  'Barrentoe Herb': '荒趾灵草',
  'Barrier Gem': '屏障宝石',
  'Big Bones': '巨骨',
  'Bitterlyme Herb': '苦莱姆草',
  'Bitterlyme Seeds': '苦莱姆种子',
  'Blight Powder': '凋零粉',
  'Blightblossom Herb': '凋花草',
  'Blighted Roots': '凋蚀根',
  'Body Rune': '护体符',
  Bones: '白骨',
  Bowstring: '弓弦',
  Carrot: '胡萝卜',
  Charcoal: '木炭',
  Compost: '堆肥',
  'Crimson Biter': '绯咬鱼',
  'Crystal Binding Dust': '缚晶尘',
  'Cursed Dust': '诅咒尘',
  Diamond: '金钻',
  'Dragon Bones': '龙骨',
  'Echosnap Herb': '回响草',
  Ectoplasm: '灵质',
  'Elderwood Logs': '古木原木',
  'Eldraroot Herb': '长老根草',
  'Eldritch Tendril': '异界触须',
  'Eroding Barrier Gem': '蚀障宝石',
  Eyeball: '眼球',
  'Fearmallow Herb': '惧锦葵',
  Feathers: '羽毛',
  'Garum Herb': '嘉露草',
  'Gloom Resin': '幽暗树脂',
  'Gloomsprout Herb': '幽芽草',
  'Gold Ore': '金矿石',
  Goo: '黏液',
  'Greater Soul': '大魂',
  'Holy Dust': '圣尘',
  'Infernal Bones': '炼狱骨',
  'Iridium Bar': '铱金锭',
  'Jungle Spores': '丛林孢子',
  'Large Horn': '巨角',
  Leather: '皮革',
  'Lemontyle Herb': '柠叶灵草',
  'Magic Bones': '魔骨',
  'Mahogany Logs': '桃花心木',
  'Mantalyme Herb': '蔓陀灵草',
  'Meteorite Ore': '陨铁矿',
  'Moonwort Herb': '月苔草',
  'Mysticite Fragment': '秘晶碎片',
  'Nightgleam Herb': '夜辉草',
  Nightopal: '夜欧泊',
  'Obzurian Bar': '黑曜锭',
  Onyx: '墨曜玉',
  'Oxilyme Herb': '青氧灵草',
  'Petrified Eye': '石化眼',
  'Pigtayle Herb': '尾叶灵草',
  'Poraxx Herb': '破厄灵草',
  'Potato Seeds': '土豆种子',
  Pumpkin: '南瓜',
  'Pure Crystal Binding Dust': '纯缚晶尘',
  'Raw Beef': '生牛肉',
  'Raw Chicken': '生鸡肉',
  'Raw Crab': '生蟹',
  'Raw Ghost Fish': '生幽灵鱼',
  'Raw Poison Fish': '生毒鱼',
  'Raw Steamswimmer': '生汽游鱼',
  'Raw Whisperfish': '生低语鱼',
  Ruby: '红宝',
  'Shadefrond Herb': '影叶草',
  'Silentsnap Scales': '静咬鳞',
  'Silver Bar': '银髓锭',
  'Snape Grass': '蛇草',
  'Snowcress Herb': '雪芥草',
  'Soul Rune': '魂印符',
  'Sourweed Herb': '酸藤草',
  Stardust: '星尘',
  'Static Jellyfish': '静电水母',
  'Strawberry Seeds': '草莓种子',
  Swordfish: '剑鱼',
  'Unholy Dust': '秽尘',
  'Void Essence': '虚空精粹',
  'Voidbloom Herb': '虚空花草',
  'Whispertallow Herb': '低语脂草',
  Wildflower: '野花',
  'Withering Bones': '枯萎骨',
  'Witherlyme Herb': '枯莱姆草',
  'Wurmtayle Herb': '虫尾草',
  Zephyte: '风辉石'
});

const INGREDIENT_ID_OVERRIDES = Object.freeze({
  'Garum Herb': 'garumHerb',
  'Sourweed Herb': 'sourweedHerb',
  'Mantalyme Herb': 'mantalymeHerb',
  'Lemontyle Herb': 'lemontyleHerb',
  'Oxilyme Herb': 'oxilymeHerb',
  'Poraxx Herb': 'poraxxHerb',
  'Pigtayle Herb': 'pigtayleHerb',
  'Barrentoe Herb': 'barrentoeHerb',
  'Body Rune': 'bodyCharm',
  'Soul Rune': 'soulCharm',
  Ruby: 'ruby',
  Diamond: 'diamond',
  Onyx: 'onyx',
  Swordfish: 'swordfish',
  'Silver Bar': 'silverBar',
  'Gold Ore': 'goldOre'
});

function camelId(name) {
  const words = String(name)
    .replace(/&/g, ' and ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  return words.map(function (word, index) {
    const lower = word.toLowerCase();
    return index === 0
      ? lower
      : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join('');
}

function ingredientId(name) {
  return INGREDIENT_ID_OVERRIDES[name] || camelId(name);
}

function inferMaterialType(name) {
  if (/Herb$/.test(name)) return 'herb';
  if (/Seeds$/.test(name)) return 'seed';
  if (/Logs$/.test(name)) return 'wood';
  if (/Bar$/.test(name)) return 'bar';
  if (/Ore$/.test(name)) return 'ore';
  if (/Rune$/.test(name)) return 'rune_charm';
  if (/Gem$|Onyx$|Ruby$|Diamond$|opal$|Zephyte$/.test(name)) return 'gem';
  if (/Bones$/.test(name)) return 'bone';
  if (/Dust$|Powder$|Ash$/.test(name)) return 'powder';
  if (/Raw |Fish$|Crab$|Chicken$|Beef$|Jellyfish$/.test(name)) {
    return 'food_material';
  }
  if (/Essence$|Soul$|Ectoplasm$/.test(name)) return 'essence';
  if (/Roots$|Spores$|Grass$|Wildflower$|Pumpkin$|Carrot$/.test(name)) {
    return 'plant_material';
  }
  return 'alchemy_material';
}

function inferSourceTags(type) {
  if (type === 'herb' || type === 'seed' || type === 'plant_material') {
    return ['gathering:herb'];
  }
  if (type === 'wood') return ['gathering:woodcutting'];
  if (type === 'ore' || type === 'gem') return ['gathering:mining'];
  if (type === 'bar') return ['production:forging'];
  if (type === 'food_material') return ['gathering:fishing'];
  if (type === 'rune_charm') return ['production:talisman'];
  return ['combat:drop'];
}

function inferIcon(type) {
  if (type === 'herb' || type === 'plant_material') return '🌿';
  if (type === 'seed') return '🌱';
  if (type === 'wood') return '🪵';
  if (type === 'bar') return '▰';
  if (type === 'ore') return '🪨';
  if (type === 'gem') return '💎';
  if (type === 'rune_charm') return '📜';
  if (type === 'food_material') return '🐟';
  if (type === 'bone') return '🦴';
  if (type === 'powder') return '✦';
  return '📦';
}

function inferTier(name, index) {
  if (/Abyssal|Gloom|Blight|Shade|Fear|Wither|Whisper|Echo|Eldra|Void|Obzurian|Eldritch|Silentsnap|Mysticite/.test(name)) {
    return 7 + Math.min(2, Math.floor(index / 20));
  }
  if (/Dragon|Infernal|Magic|Meteorite|Iridium|Zephyte|Pure|Eroding/.test(name)) {
    return 6;
  }
  if (/Diamond|Onyx|Large|Cursed|Holy|Unholy|Crystal/.test(name)) return 5;
  if (/Ruby|Gold|Big|Stardust|Ectoplasm/.test(name)) return 4;
  if (/Silver|Swordfish|Raw Poison|Static|Elderwood/.test(name)) return 3;
  return 2;
}

function artPriority(tier) {
  return tier <= 2 ? 'P0' : tier <= 5 ? 'P1' : 'P2';
}

function ingredientRecord(name, index) {
  const id = ingredientId(name);
  const materialType = inferMaterialType(name);
  const tier = inferTier(name, index);
  const localName = INGREDIENT_LOCAL_NAMES[name] || name;
  return {
    id,
    melvorName: name,
    name: localName,
    category: 'material',
    materialType,
    tier,
    quality: tier >= 8 ? 'red' : tier >= 6 ? 'orange' : tier >= 4 ? 'purple' : 'blue',
    icon: inferIcon(materialType),
    visualFamily: 'herblore-' + materialType,
    artDetail: localName,
    description: localName + '，对标 Herblore 药剂体系的炼丹辅材。',
    sourceTags: inferSourceTags(materialType),
    useTags: ['alchemy'],
    iconPromptKey: 'herbloreIngredient:' + id
  };
}

function normalizeIngredient(raw) {
  if (!raw || !raw.name) return null;
  return {
    itemId: ingredientId(raw.name),
    melvorName: raw.name,
    localName: INGREDIENT_LOCAL_NAMES[raw.name] || raw.name,
    quantity: raw.quantity
  };
}

function potionTag(effect) {
  const text = String(effect || '').toLowerCase();
  if (/attack|damage|evasion|accuracy|poison|stun|burn|curse|critical|lifesteal/.test(text)) {
    return 'combat_effect';
  }
  if (/woodcutting|mining|smithing|cooking|fishing|farming|herblore|crafting|fletching|runecrafting|thieving|agility|astrology|firemaking|summoning/.test(text)) {
    return 'skill_boost';
  }
  return 'utility_effect';
}

function buildData(rawRows) {
  if (!Array.isArray(rawRows)) {
    throw new TypeError('raw herblore parity data must be an array');
  }
  const ingredients = new Map();
  rawRows.forEach(function (row) {
    ['herb', 'secondary'].forEach(function (key) {
      const source = row && row[key];
      if (source && source.name && !ingredients.has(ingredientId(source.name))) {
        ingredients.set(ingredientId(source.name), source.name);
      }
    });
  });
  const ingredientRows = Array.from(ingredients.values())
    .sort(function (left, right) {
      return ingredientId(left) < ingredientId(right) ? -1 : 1;
    })
    .map(ingredientRecord);

  const series = rawRows.map(function (row) {
    if (!row || typeof row.melvorName !== 'string') {
      throw new TypeError('herblore row is missing melvorName');
    }
    const seriesId = camelId(row.melvorName);
    const localName = POTION_LOCAL_NAMES[row.melvorName] || row.melvorName;
    const herb = normalizeIngredient(row.herb);
    const secondary = normalizeIngredient(row.secondary);
    if (!herb || !Number.isSafeInteger(herb.quantity) || herb.quantity < 1) {
      throw new TypeError(row.melvorName + ' is missing herb ingredient');
    }
    if (!Array.isArray(row.tiers) || row.tiers.length !== 4) {
      throw new TypeError(row.melvorName + ' must have four tiers');
    }
    const tiers = row.tiers.map(function (tier) {
      const mastery = TIER_MASTERY[tier.tier];
      if (!mastery) throw new TypeError(row.melvorName + ' has unknown tier');
      return {
        tier: tier.tier,
        numericTier: mastery.numericTier,
        itemId: seriesId + tier.tier,
        name: localName + '·' + TIER_NAMES[tier.tier],
        charges: tier.charges,
        effect: tier.effect,
        quality: TIER_QUALITY[tier.tier],
        masteryLevel: mastery.masteryLevel,
        xpToTier: mastery.xpToTier,
        iconPromptKey: 'herblorePotion:' + seriesId
      };
    });
    return {
      id: seriesId,
      melvorName: row.melvorName,
      localName,
      realm: row.realm,
      dlc: row.dlc,
      unlockLevel: row.level,
      xp: row.xp,
      baseSeconds: 2,
      herb,
      secondary: secondary && Number.isSafeInteger(secondary.quantity)
        ? secondary
        : null,
      tiers
    };
  });

  const potionItems = [];
  const recipeRows = [];
  series.forEach(function (entry) {
    entry.tiers.forEach(function (tier) {
      const ingredients = {};
      ingredients[entry.herb.itemId] = entry.herb.quantity;
      if (entry.secondary) {
        ingredients[entry.secondary.itemId] = entry.secondary.quantity;
      }
      const tag = potionTag(tier.effect);
      potionItems.push({
        id: tier.itemId,
        name: tier.name,
        melvorName: entry.melvorName,
        category: 'consumable',
        materialType: 'potion',
        potionTier: tier.tier,
        tier: tier.numericTier,
        quality: tier.quality,
        charges: tier.charges,
        icon: '🧪',
        visualFamily: entry.realm === 'abyssal'
          ? 'potion-abyssal'
          : 'potion-herblore',
        artDetail: entry.localName + '，' + TIER_NAMES[tier.tier] + '药瓶',
        description: tier.name + '，充能 ' + tier.charges + '。对标效果：' + tier.effect + '。',
        sourceTags: ['production:alchemy'],
        useTags: ['potion', tag],
        iconPromptKey: tier.iconPromptKey,
        melvor: {
          seriesId: entry.id,
          name: entry.melvorName,
          realm: entry.realm,
          dlc: entry.dlc,
          tier: tier.tier,
          charges: tier.charges,
          effect: tier.effect
        }
      });
      recipeRows.push({
        skillId: 'alchemy',
        outputId: tier.itemId,
        name: '炼制' + tier.name,
        unlockLevel: entry.unlockLevel,
        baseSeconds: 2,
        skillXp: entry.xp,
        masteryXp: entry.xp,
        cultivation: 1,
        ingredients,
        options: {
          outputQuantity: 1,
          skillXp: entry.xp,
          masteryXp: entry.xp,
          cultivation: 1,
          melvor: {
            seriesId: entry.id,
            name: entry.melvorName,
            realm: entry.realm,
            dlc: entry.dlc,
            tier: tier.tier,
            charges: tier.charges,
            effect: tier.effect,
            masteryLevel: tier.masteryLevel,
            xpToTier: tier.xpToTier
          }
        }
      });
    });
  });

  return {
    SOURCE: {
      system: 'Melvor Idle Herblore',
      capturedDate: '2026-07-29',
      sourceUrls: [
        'https://wiki.melvoridle.com/w/Herblore',
        'https://wiki.melvoridle.com/w/Potions'
      ],
      note: 'Full Herblore potion-series parity snapshot parsed from the official wiki.'
    },
    BASE_SECONDS: 2,
    TIER_MASTERY,
    INGREDIENTS: ingredientRows,
    SERIES: series,
    POTION_ITEMS: potionItems,
    RECIPE_ROWS: recipeRows
  };
}

function renderModule() {
  // Thin UMD loader is hand-maintained at content/herblore-parity.js.
  // Build only refreshes the JSON artifact.
  return null;
}

const rawRows = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const data = buildData(rawRows);
fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(data), 'utf8');
const thinExists = fs.existsSync(OUTPUT_PATH);
console.log(
  'wrote ' + path.relative(SOURCE_ROOT, OUTPUT_JSON_PATH) +
  ' with ' + data.SERIES.length + ' series, ' +
  data.POTION_ITEMS.length + ' potion items, ' +
  data.RECIPE_ROWS.length + ' recipes' +
  (thinExists
    ? ' (thin loader left at content/herblore-parity.js)'
    : ' (WARNING: thin loader content/herblore-parity.js missing)')
);
