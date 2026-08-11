(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.MaterialContent = api;
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

  function loadHerbloreParityContent() {
    if (typeof HerbloreParityContent !== 'undefined') {
      return HerbloreParityContent;
    }
    if (typeof require === 'function') {
      try {
        return require('./herblore-parity.js');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  const HERBLORE_PARITY = loadHerbloreParityContent();

  function qualityByTier(tier) {
    const value = Number(tier) || 1;
    if (value >= 8) return 'red';
    if (value >= 6) return 'orange';
    if (value >= 4) return 'purple';
    if (value >= 2) return 'blue';
    return 'green';
  }

  function makePrompt(name, visualFamily, detail) {
    return '简约扁平矢量，透明背景，无文字，手游背包格可读，' +
      name + '，' + visualFamily + '，' + detail;
  }

  const rows = [];
  const rowIds = new Set();
  const recipes = [];

  function addItem(row) {
    if (!row || typeof row.id !== 'string' || row.id.length === 0 ||
        rowIds.has(row.id)) {
      return;
    }
    rowIds.add(row.id);
    const tier = Number(row.tier) || 1;
    const category = row.category || 'material';
    const visualFamily = row.visualFamily || row.materialType || category;
    const detail = row.artDetail || row.description || row.name;
    const item = {
      id: row.id,
      name: row.name,
      category,
      sellValue: Number.isSafeInteger(row.sellValue)
        ? row.sellValue
        : category === 'equipment' ? 10 + tier * 4
          : category === 'consumable' ? 5 + tier * 2
            : Math.max(1, tier),
      stackable: row.stackable !== false,
      icon: row.icon || '📦',
      description: row.description || row.name,
      quality: row.quality || qualityByTier(tier),
      tier,
      materialType: row.materialType || category,
      visualFamily,
      iconPromptKey: row.iconPromptKey || row.id,
      artPrompt: row.artPrompt || makePrompt(row.name, visualFamily, detail),
      artPriority: row.artPriority || (tier <= 2 ? 'P0' : tier <= 5 ? 'P1' : 'P2'),
      equipmentSlot: row.equipmentSlot || null,
      sourceTags: row.sourceTags || [],
      useTags: row.useTags || []
    };
    [
      'melvorName', 'potionTier', 'charges', 'melvor'
    ].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        item[key] = row[key];
      }
    });
    rows.push(item);
  }

  function addRecipe(skillId, outputId, name, unlockLevel, baseSeconds, ingredients, options) {
    recipes.push({
      skillId,
      outputId,
      name,
      unlockLevel,
      baseSeconds,
      ingredients,
      options: options || {}
    });
  }

  const baseMiningResources = [
    ['copperOre', '铜矿石', 'ore', 1, 'ore-copper', '温润红铜色矿石块', '🪨'],
    ['tinOre', '锡矿石', 'ore', 1, 'ore-tin', '浅灰银色锡矿石块', '🪨'],
    ['ironOre', '铁矿石', 'ore', 2, 'ore-iron', '深灰铁矿石块', '🪨'],
    ['silverOre', '银矿石', 'ore', 3, 'ore-silver', '亮银色矿石块', '🪨'],
    ['goldOre', '金矿石', 'ore', 4, 'ore-gold', '金黄色矿石块', '🪨'],
    ['mithrilOre', '秘银矿', 'ore', 4, 'ore-mithril', '冷蓝银色轻矿石', '🪨'],
    ['adamantOre', '精金矿', 'ore', 5, 'ore-adamant', '金白色坚硬矿石', '🪨'],
    ['jadeShard', '灵玉矿', 'ore', 5, 'ore-jade', '青玉色灵矿碎块', '🪨'],
    ['darkIronOre', '玄铁矿', 'ore', 6, 'ore-darkIron', '黑色矿石带暗红裂纹', '🪨'],
    ['crystalOre', '玄晶矿', 'ore', 7, 'ore-crystal', '半透明晶质矿石', '🪨'],
    ['topaz', '黄玉', 'gem', 1, 'gem-topaz', '暖黄色圆润宝石', '💎'],
    ['sapphire', '蓝宝', 'gem', 2, 'gem-sapphire', '深蓝色圆润宝石', '💎'],
    ['ruby', '红宝', 'gem', 3, 'gem-ruby', '红色圆润宝石', '💎'],
    ['emerald', '翠玉', 'gem', 4, 'gem-emerald', '翠绿色圆润宝石', '💎'],
    ['diamond', '金钻', 'gem', 5, 'gem-diamond', '浅金白钻石晶体', '💎'],
    ['darkCrystal', '暗晶', 'gem', 6, 'gem-darkCrystal', '紫黑色晶体', '💎'],
    ['lingshi', '灵石', 'currency', 1, 'currency-lingshi', '淡青灵石晶币', '💠']
  ];

  const miningResources = [
    ['coalOre', '灵炭矿', 'fuel', 3, 'mining-fuel', '黑色灵炭矿块，带暖橙色裂隙', '⛏️'],
    ['runeOre', '符纹矿', 'ore', 7, 'ore-rune', '深蓝矿石表面有发光符纹', '🪨'],
    ['dragoniteOre', '龙纹矿', 'ore', 8, 'ore-dragon', '赤金矿石带龙鳞纹路', '🪨'],
    ['voidOre', '太虚矿', 'ore', 9, 'ore-void', '紫黑矿石边缘有虚空裂光', '🪨'],
    ['spiritEssence', '灵髓', 'essence', 1, 'essence-light', '蓝白灵气水滴晶核', '💧'],
    ['pureSpiritEssence', '纯灵髓', 'essence', 6, 'essence-pure', '透明灵髓结晶，中心发白光', '💧'],
    ['onyx', '墨曜玉', 'gem', 6, 'gem-onyx', '黑色圆润玉石，边缘紫光', '⚫'],
    ['azureJade', '青霄玉', 'gem', 7, 'gem-azure', '青蓝玉石，像云气凝成', '💎'],
    ['windCrystal', '风魄晶', 'gem', 8, 'gem-wind', '浅青晶体，周围有旋风纹', '💎'],
    ['voidheartGem', '虚心晶', 'gem', 9, 'gem-voidheart', '紫黑心形晶核，中心发亮', '💎']
  ];

  baseMiningResources.concat(miningResources).forEach(function (row) {
    addItem({
      id: row[0],
      name: row[1],
      materialType: row[2],
      tier: row[3],
      visualFamily: row[4],
      artDetail: row[5],
      icon: row[6],
      description: row[1] + '，用于炼材、炼器与高阶丹符。',
      sourceTags: ['gathering:mining'],
      useTags: ['forging', 'alchemy', 'talisman']
    });
  });

  const bars = [
    ['bronze', 'bronzeBar', '灵铜锭', 1, { copperOre: 1, tinOre: 1 }, '温润铜色金属锭'],
    ['iron', 'ironBar', '寒铁锭', 2, { ironOre: 1 }, '深灰寒铁锭，边缘泛蓝'],
    ['steel', 'steelBar', '百炼钢锭', 3, { ironOre: 1, coalOre: 2 }, '银灰钢锭，带锤炼层纹'],
    ['silver', 'silverBar', '银髓锭', 3, { silverOre: 1 }, '亮银金属锭，柔和反光'],
    ['gold', 'goldBar', '赤金锭', 4, { goldOre: 1 }, '赤金色金属锭'],
    ['mithril', 'mithrilBar', '秘银锭', 4, { mithrilOre: 1, coalOre: 4 }, '冷蓝银色轻金属锭'],
    ['adamant', 'adamantBar', '精金锭', 5, { adamantOre: 1, coalOre: 6 }, '金白高阶金属锭'],
    ['jade', 'jadeBar', '灵玉锭', 5, { jadeShard: 2, coalOre: 4 }, '青玉与金属融合的器胚'],
    ['darkIron', 'darkIronBar', '玄铁锭', 6, { darkIronOre: 1, coalOre: 8 }, '黑色玄铁锭，表面暗红纹'],
    ['crystal', 'crystalBar', '玄晶锭', 7, { crystalOre: 1, pureSpiritEssence: 2 }, '半透明晶质锭'],
    ['rune', 'runeBar', '符纹锭', 7, { runeOre: 1, coalOre: 8 }, '带符纹的深蓝金属锭'],
    ['dragonite', 'dragoniteBar', '龙纹锭', 8, { dragoniteOre: 1, runeOre: 2, coalOre: 12 }, '赤金龙纹金属锭'],
    ['void', 'voidBar', '太虚锭', 9, { voidOre: 1, darkCrystal: 2, pureSpiritEssence: 3 }, '紫黑虚空金属锭']
  ];

  bars.forEach(function (bar) {
    addItem({
      id: bar[1],
      name: bar[2],
      materialType: 'bar',
      tier: bar[3],
      visualFamily: 'bar-' + bar[0],
      artDetail: bar[5],
      icon: '▰',
      description: bar[2] + '，炼器体系的通用金属材料。',
      sourceTags: ['production:forging'],
      useTags: ['forging', 'jewelry']
    });
    addRecipe('forging', bar[1], '熔炼' + bar[2], Math.max(1, (bar[3] - 1) * 10 + 1),
      6 + bar[3] * 3, bar[4]);
  });

  const gearTemplates = [
    ['DaggerBlank', '短刃胚', 'weapon_part', 1, '短小锋利的武器胚'],
    ['SwordBlank', '飞剑胚', 'weapon_part', 1, '细长飞剑形器胚'],
    ['HeavyBladeBlank', '重剑胚', 'weapon_part', 2, '宽厚重剑器胚'],
    ['BracerBlank', '护腕胚', 'armor_part', 2, '一对护腕器胚'],
    ['CrownBlank', '法冠胚', 'armor_part', 2, '额冠形防具胚'],
    ['BootBlank', '踏云履胚', 'armor_part', 2, '靴履形防具胚'],
    ['ShieldCore', '护符盾核', 'armor_part', 3, '圆形护符盾核心'],
    ['ArmorPlate', '法甲片', 'armor_part', 3, '层叠法甲片']
  ];

  bars.slice(0, 10).forEach(function (bar) {
    const prefix = bar[0];
    const barId = bar[1];
    const baseTier = bar[3];
    const materialName = bar[2].replace('锭', '');
    gearTemplates.forEach(function (template) {
      const id = prefix + template[0];
      const outputName = materialName + template[1];
      const quantity = template[3];
      const ingredients = {};
      ingredients[barId] = quantity;
      addItem({
        id,
        name: outputName,
        materialType: template[2],
        tier: baseTier,
        visualFamily: template[2] + '-' + prefix,
        artDetail: materialName + template[4],
        icon: template[2] === 'weapon_part' ? '⚔️' : '🛡️',
        description: outputName + '，后续可接入完整装备打造与强化。',
        sourceTags: ['production:forging'],
        useTags: ['forging', 'equipment']
      });
      addRecipe('forging', id, '锻造' + outputName,
        Math.max(1, (baseTier - 1) * 10 + template[3]),
        8 + baseTier * 4 + template[3],
        ingredients);
    });
  });

  const gems = [
    ['topaz', '黄玉', 1],
    ['sapphire', '蓝玉', 2],
    ['ruby', '赤玉', 3],
    ['emerald', '翠玉', 4],
    ['diamond', '金钻', 5],
    ['onyx', '墨曜玉', 6],
    ['azureJade', '青霄玉', 7],
    ['windCrystal', '风魄晶', 8],
    ['voidheartGem', '虚心晶', 9]
  ];

  gems.forEach(function (gem, index) {
    const ringId = 'spirit' + gem[0].charAt(0).toUpperCase() + gem[0].slice(1) + 'Ring';
    const pendantId = 'spirit' + gem[0].charAt(0).toUpperCase() + gem[0].slice(1) + 'Pendant';
    const metal = index < 5 ? (index === 0 ? 'silverBar' : 'goldBar')
      : index < 7 ? 'jadeBar' : 'voidBar';
    const level = 10 + index * 8;
    [
      [ringId, gem[1] + '灵戒', 'accessory', '圆环形饰品镶嵌' + gem[1]],
      [pendantId, gem[1] + '法坠', 'accessory', '垂坠形饰品镶嵌' + gem[1]]
    ].forEach(function (jewel) {
      const ingredients = {};
      ingredients[metal] = 1;
      ingredients[gem[0]] = 1;
      addItem({
        id: jewel[0],
        name: jewel[1],
        category: 'equipment',
        materialType: 'jewelry',
        tier: gem[2],
        visualFamily: 'jewelry-' + gem[0],
        artDetail: jewel[3],
        icon: jewel[0].indexOf('Ring') >= 0 ? '💍' : '🔮',
        equipmentSlot: 'accessory',
        description: jewel[1] + '，宝石与贵金属结合的饰品。',
        sourceTags: ['production:forging'],
        useTags: ['equipment']
      });
      addRecipe('forging', jewel[0], '制作' + jewel[1], level, 10 + gem[2] * 5, ingredients);
    });
  });

  const herbPairs = [
    ['garumSeed', '嘉露种子', 'garumHerb', '嘉露草', 1, '圆叶淡绿草药'],
    ['sourweedSeed', '酸藤种子', 'sourweedHerb', '酸藤草', 2, '卷曲酸藤叶'],
    ['mantalymeSeed', '蔓陀灵种', 'mantalymeHerb', '蔓陀灵草', 3, '紫绿蔓生草药'],
    ['lemontyleSeed', '柠叶灵种', 'lemontyleHerb', '柠叶灵草', 4, '黄绿细叶草药'],
    ['oxilymeSeed', '青氧灵种', 'oxilymeHerb', '青氧灵草', 5, '青蓝发光草药'],
    ['poraxxSeed', '破厄灵种', 'poraxxHerb', '破厄灵草', 6, '红紫药草'],
    ['pigtayleSeed', '尾叶灵种', 'pigtayleHerb', '尾叶灵草', 7, '尾羽状草药'],
    ['barrentoeSeed', '荒趾灵种', 'barrentoeHerb', '荒趾灵草', 8, '灰绿耐旱草药']
  ];

  herbPairs.forEach(function (pair) {
    addItem({
      id: pair[0],
      name: pair[1],
      materialType: 'seed',
      tier: pair[4],
      visualFamily: 'seed-herb-' + pair[4],
      artDetail: pair[1] + '，小布袋与一颗发光种子',
      icon: '🌱',
      description: pair[1] + '，可作为灵田药草种植槽位。',
      sourceTags: ['gathering:herb'],
      useTags: ['farming']
    });
    addItem({
      id: pair[2],
      name: pair[3],
      materialType: 'herb',
      tier: pair[4],
      visualFamily: 'herb-' + pair[4],
      artDetail: pair[5],
      icon: '🌿',
      description: pair[3] + '，用于炼制技能丹符。',
      sourceTags: ['gathering:herb'],
      useTags: ['alchemy', 'talisman']
    });
  });

  const battleMaterials = [
    ['brokenFang', '断裂兽牙', 1, 'battle-fang', '白色断牙，带一点裂纹'],
    ['beastBone', '妖兽骨', 2, 'battle-bone', '骨片与灵纹'],
    ['spiritClaw', '灵兽爪', 3, 'battle-claw', '弯曲利爪'],
    ['monsterCore', '妖丹', 4, 'battle-core', '圆形内丹，发橙光'],
    ['spiritScale', '灵鳞', 5, 'battle-scale', '青金鳞片'],
    ['fiendBlood', '煞血', 6, 'battle-blood', '暗红血珠'],
    ['soulShard', '残魂晶', 7, 'battle-soul', '幽蓝魂晶碎片'],
    ['voidMarrow', '虚空髓', 8, 'battle-void', '紫色骨髓晶'],
    ['tribulationAsh', '天劫灰', 9, 'battle-ash', '金紫灰烬']
  ];

  battleMaterials.forEach(function (row) {
    addItem({
      id: row[0],
      name: row[1],
      materialType: 'battle_drop',
      tier: row[2],
      visualFamily: row[3],
      artDetail: row[4],
      icon: '✦',
      description: row[1] + '，战斗战利品，可用于炼器、炼丹与符箓。',
      sourceTags: ['combat:tier' + row[2]],
      useTags: ['forging', 'alchemy', 'talisman']
    });
  });

  const runeCharms = [
    ['airCharm', '清风符', 1, 'rune-air', '淡青纸符，中心是一缕风旋', 1, 4, { spiritEssence: 1 }, 6],
    ['waterCharm', '凝水符', 1, 'rune-water', '水蓝纸符，中心是一滴圆润水珠', 1, 4, { spiritEssence: 1 }, 6],
    ['earthCharm', '厚土符', 1, 'rune-earth', '土黄纸符，中心是一块方正岩纹', 1, 4, { spiritEssence: 1 }, 6],
    ['fireCharm', '赤焰符', 1, 'rune-fire', '赤红纸符，中心是一簇简洁火焰', 1, 4, { spiritEssence: 1 }, 6],
    ['mindCharm', '凝神符', 2, 'rune-mind', '淡紫纸符，中心是闭合灵眼纹', 8, 6,
      { spiritEssence: 2, garumHerb: 1 }, 5],
    ['bodyCharm', '护体符', 2, 'rune-body', '青绿纸符，中心是护盾轮廓', 12, 7,
      { spiritEssence: 2, beastBone: 1 }, 5],
    ['cosmicCharm', '星轨符', 3, 'rune-cosmic', '深蓝纸符，中心是三颗星点轨迹', 18, 9,
      { spiritEssence: 3, topaz: 1 }, 5],
    ['chaosCharm', '乱灵符', 3, 'rune-chaos', '紫红纸符，中心是断裂旋涡', 24, 10,
      { spiritEssence: 3, monsterCore: 1 }, 4],
    ['natureCharm', '生息符', 4, 'rune-nature', '嫩绿纸符，中心是单片灵叶', 32, 12,
      { spiritEssence: 4, mantalymeHerb: 1 }, 4],
    ['lawCharm', '律令符', 5, 'rune-law', '金白纸符，中心是方正规印', 40, 14,
      { pureSpiritEssence: 1, silverBar: 1 }, 3],
    ['deathCharm', '断魂符', 6, 'rune-death', '灰黑纸符，中心是断裂魂火', 50, 17,
      { pureSpiritEssence: 2, soulShard: 1 }, 3],
    ['bloodCharm', '血契符', 7, 'rune-blood', '暗红纸符，中心是一滴血珠', 60, 20,
      { pureSpiritEssence: 2, fiendBlood: 1 }, 2],
    ['soulCharm', '魂印符', 8, 'rune-soul', '幽蓝纸符，中心是魂印圆环', 70, 24,
      { pureSpiritEssence: 3, soulShard: 2 }, 2],
    ['mistCharm', '雾隐符', 2, 'rune-combo-mist', '淡青水雾纸符，中心是柔和雾团', 14, 8,
      { airCharm: 2, waterCharm: 2, spiritEssence: 1 }, 4],
    ['mudCharm', '泥沼符', 2, 'rune-combo-mud', '棕蓝纸符，中心是泥沼水纹', 16, 8,
      { waterCharm: 2, earthCharm: 2, spiritEssence: 1 }, 4],
    ['dustCharm', '尘卷符', 2, 'rune-combo-dust', '米黄纸符，中心是卷起尘旋', 18, 8,
      { airCharm: 2, earthCharm: 2, spiritEssence: 1 }, 4],
    ['lavaCharm', '熔岩符', 3, 'rune-combo-lava', '橙黑纸符，中心是熔岩裂纹', 28, 11,
      { earthCharm: 2, fireCharm: 2, spiritEssence: 2 }, 3],
    ['smokeCharm', '烟岚符', 3, 'rune-combo-smoke', '灰红纸符，中心是升起烟缕', 30, 11,
      { airCharm: 2, fireCharm: 2, spiritEssence: 2 }, 3],
    ['steamCharm', '蒸云符', 3, 'rune-combo-steam', '白蓝纸符，中心是蒸汽云纹', 32, 11,
      { waterCharm: 2, fireCharm: 2, spiritEssence: 2 }, 3]
  ];

  runeCharms.forEach(function (row) {
    addItem({
      id: row[0],
      name: row[1],
      materialType: 'rune_charm',
      tier: row[2],
      visualFamily: row[3],
      artDetail: row[4],
      icon: '📜',
      description: row[1] + '，符修流派施放符法时消耗的基础符咒资源。',
      sourceTags: ['production:talisman'],
      useTags: ['talisman', 'rune_combat']
    });
    addRecipe('talisman', row[0], '绘制' + row[1], row[5], row[6], row[7], {
      outputQuantity: row[8]
    });
  });

  const utilityItems = [
    ['runecraftingPouch', '符材袋', 'bag', 3, 'bag-skill', '小型符材袋，青色布袋', 'forging'],
    ['artisanPouch', '百工袋', 'bag', 5, 'bag-artisan', '工具袋与细小器具', 'forging'],
    ['spiritUrn', '聚灵瓶', 'urn', 2, 'urn-spirit', '圆肚小瓶，装有灵光', 'talisman'],
    ['soulUrn', '养魂瓶', 'urn', 6, 'urn-soul', '深蓝魂瓶', 'talisman'],
    ['imbuedThread', '灌灵丝', 'imbued_material', 4, 'imbued-thread', '发光丝线卷', 'talisman'],
    ['imbuedPlate', '淬灵片', 'imbued_material', 6, 'imbued-plate', '发光金属薄片', 'forging']
  ];

  utilityItems.forEach(function (row) {
    addItem({
      id: row[0],
      name: row[1],
      materialType: row[2],
      tier: row[3],
      visualFamily: row[4],
      artDetail: row[5],
      icon: '📦',
      description: row[1] + '，制造体系中的功能材料。',
      sourceTags: ['production:' + row[6]],
      useTags: ['forging', 'talisman']
    });
  });
  addRecipe('forging', 'runecraftingPouch', '缝制符材袋', 24, 18,
    { bronzeBar: 1, spiritEssence: 4 });
  addRecipe('forging', 'artisanPouch', '缝制百工袋', 44, 28,
    { bronzeBar: 1, beastBone: 2, spiritEssence: 2 });
  addRecipe('talisman', 'spiritUrn', '绘制聚灵瓶', 18, 14,
    { airCharm: 2, spiritEssence: 3 });
  addRecipe('talisman', 'soulUrn', '绘制养魂瓶', 58, 32,
    { soulCharm: 2, soulShard: 1, pureSpiritEssence: 2 });
  addRecipe('talisman', 'imbuedThread', '灌灵丝', 35, 20,
    { spiritEssence: 2, windCrystal: 1 });
  addRecipe('forging', 'imbuedPlate', '淬灵片', 55, 30,
    { darkIronBar: 1, onyx: 1 });

  if (HERBLORE_PARITY) {
    HERBLORE_PARITY.ingredientRows().forEach(addItem);
    HERBLORE_PARITY.potionRows().forEach(addItem);
    HERBLORE_PARITY.recipeRows().forEach(function (recipe) {
      addRecipe(
        recipe.skillId,
        recipe.outputId,
        recipe.name,
        recipe.unlockLevel,
        recipe.baseSeconds,
        recipe.ingredients,
        recipe.options
      );
    });
  }

  const GATHERING_EXTENSIONS = deepFreeze({
    mining: [
      {
        id: 'coal',
        name: '灵炭矿脉',
        unlockLevel: 30,
        time: 10,
        xp: 45,
        capMin: 9,
        capMax: 20,
        drops: [
          { itemId: 'coalOre', w: 100, q: 1 },
          { itemId: 'topaz', w: 6, q: 1 },
          { itemId: 'lingshi', w: 12, q: 1 }
        ]
      },
      {
        id: 'essence',
        name: '灵髓矿脉',
        unlockLevel: 2,
        time: 3,
        xp: 7,
        capMin: 20,
        capMax: 35,
        drops: [
          { itemId: 'spiritEssence', w: 100, q: 2 },
          { itemId: 'lingshi', w: 4, q: 1 }
        ]
      },
      {
        id: 'rune',
        name: '符纹矿脉',
        unlockLevel: 80,
        time: 18,
        xp: 150,
        capMin: 3,
        capMax: 8,
        drops: [
          { itemId: 'runeOre', w: 100, q: 1 },
          { itemId: 'onyx', w: 8, q: 1 },
          { itemId: 'pureSpiritEssence', w: 10, q: 1 }
        ]
      },
      {
        id: 'dragonite',
        name: '龙纹矿脉',
        unlockLevel: 92,
        time: 24,
        xp: 190,
        capMin: 2,
        capMax: 6,
        drops: [
          { itemId: 'dragoniteOre', w: 100, q: 1 },
          { itemId: 'azureJade', w: 6, q: 1 },
          { itemId: 'windCrystal', w: 3, q: 1 }
        ]
      },
      {
        id: 'void',
        name: '太虚矿隙',
        unlockLevel: 100,
        time: 30,
        xp: 240,
        capMin: 1,
        capMax: 4,
        drops: [
          { itemId: 'voidOre', w: 100, q: 1 },
          { itemId: 'voidheartGem', w: 5, q: 1 },
          { itemId: 'pureSpiritEssence', w: 15, q: 1 }
        ]
      }
    ],
    herb: herbPairs.map(function (pair, index) {
      return {
        id: 'parityHerb' + (index + 1),
        name: pair[3] + '圃',
        unlockLevel: 1 + index * 10,
        time: 5 + index,
        xp: 14 + index * 12,
        capMin: Math.max(3, 12 - index),
        capMax: Math.max(6, 24 - index),
        drops: [
          { itemId: pair[2], w: 70, q: 1 },
          { itemId: pair[0], w: 16, q: 1 }
        ]
      };
    }),
    woodcutting: [],
    fishing: []
  });

  const ITEMS = deepFreeze(rows);
  const RECIPE_ROWS = deepFreeze(recipes);
  const ART_REQUIREMENTS = deepFreeze(rows.map(function (row) {
    return {
      id: row.id,
      itemId: row.id,
      name: row.name,
      category: row.category,
      materialType: row.materialType,
      tier: row.tier,
      quality: row.quality,
      visualFamily: row.visualFamily,
      iconPromptKey: row.iconPromptKey,
      flatVectorPrompt: row.artPrompt,
      priority: row.artPriority,
      sources: row.sourceTags,
      uses: row.useTags
    };
  }));

  function cloneRows(value) {
    return Object.freeze(value.slice());
  }

  function itemRows() {
    return cloneRows(ITEMS);
  }

  function recipeRows() {
    return cloneRows(RECIPE_ROWS);
  }

  function artRequirements() {
    return cloneRows(ART_REQUIREMENTS);
  }

  function gatheringExtensions() {
    return GATHERING_EXTENSIONS;
  }

  return deepFreeze({
    ITEMS,
    GATHERING_EXTENSIONS,
    RECIPE_ROWS,
    ART_REQUIREMENTS,
    itemRows,
    recipeRows,
    artRequirements,
    gatheringExtensions
  });
});
