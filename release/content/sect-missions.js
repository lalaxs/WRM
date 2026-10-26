(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectMissionContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function deliver(family, amount, label) {
    return {
      kind: 'deliver',
      family: family,
      amount: amount,
      label: label
    };
  }

  function combat(label) {
    return {
      kind: 'combat',
      auto: true,
      label: label || '击败附近妖兽'
    };
  }

  function mission(id, sectId, name, description, steps, rewards, options) {
    const opts = options || {};
    return {
      id: id,
      sectId: sectId,
      name: name,
      description: description,
      steps: steps,
      rewards: rewards || { contribution: 12, reputation: 6, lingshi: 30 },
      minRealm: Math.max(0, Math.floor(Number(opts.minRealm) || 0)),
      maxRealm: Math.max(
        0,
        Math.floor(Number.isFinite(opts.maxRealm) ? opts.maxRealm : 99)
      )
    };
  }

  const REWARDS_A = Object.freeze({
    contribution: 12,
    reputation: 6,
    lingshi: 30
  });
  const REWARDS_B = Object.freeze({
    contribution: 18,
    reputation: 9,
    lingshi: 45
  });

  // 上交认真实可采集材料；aliases 兼容旧存档散装物资。
  const DELIVER_FAMILIES = deepFreeze({
    herb: {
      id: 'herb',
      label: '药材',
      hint: '前往生活技能「采药」采集（如嘉露草、酸藤草等）',
      aliases: Object.freeze(['yaocai', 'herbBundle']),
      items: Object.freeze([
        Object.freeze({ id: 'garumHerb', name: '嘉露草', tier: 1 }),
        Object.freeze({ id: 'sourweedHerb', name: '酸藤草', tier: 2 }),
        Object.freeze({ id: 'mantalymeHerb', name: '蔓陀灵草', tier: 3 }),
        Object.freeze({ id: 'lemontyleHerb', name: '柠叶灵草', tier: 4 }),
        Object.freeze({ id: 'oxilymeHerb', name: '青氧灵草', tier: 5 }),
        Object.freeze({ id: 'poraxxHerb', name: '破厄灵草', tier: 6 }),
        Object.freeze({ id: 'pigtayleHerb', name: '尾叶灵草', tier: 7 }),
        Object.freeze({ id: 'barrentoeHerb', name: '荒趾灵草', tier: 8 })
      ])
    },
    ore: {
      id: 'ore',
      label: '灵矿',
      hint: '前往生活技能「采矿」采集（如铜矿石、铁矿石等）',
      aliases: Object.freeze(['lingkuang', 'oreBundle']),
      items: Object.freeze([
        Object.freeze({ id: 'copperOre', name: '铜矿石', tier: 1 }),
        Object.freeze({ id: 'tinOre', name: '锡矿石', tier: 1 }),
        Object.freeze({ id: 'ironOre', name: '铁矿石', tier: 2 }),
        Object.freeze({ id: 'silverOre', name: '银矿石', tier: 3 }),
        Object.freeze({ id: 'coalOre', name: '灵炭矿', tier: 3 }),
        Object.freeze({ id: 'goldOre', name: '金矿石', tier: 4 }),
        Object.freeze({ id: 'mithrilOre', name: '秘银矿', tier: 4 }),
        Object.freeze({ id: 'adamantOre', name: '精金矿', tier: 5 }),
        Object.freeze({ id: 'jadeShard', name: '灵玉矿', tier: 5 }),
        Object.freeze({ id: 'darkIronOre', name: '玄铁矿', tier: 6 }),
        Object.freeze({ id: 'crystalOre', name: '玄晶矿', tier: 7 }),
        Object.freeze({ id: 'runeOre', name: '符纹矿', tier: 7 }),
        Object.freeze({ id: 'dragoniteOre', name: '龙纹矿', tier: 8 }),
        Object.freeze({ id: 'voidOre', name: '太虚矿', tier: 9 })
      ])
    },
    food: {
      id: 'food',
      label: '食材',
      hint: '前往生活技能「钓鱼」或「伐木」获取（如灵鲤、灵桃等）',
      aliases: Object.freeze(['shicai', 'foodBundle']),
      items: Object.freeze([
        Object.freeze({ id: 'spiritCarp', name: '灵鲤', tier: 1 }),
        Object.freeze({ id: 'spiritShrimp', name: '灵虾', tier: 1 }),
        Object.freeze({ id: 'spiritPeach', name: '灵桃', tier: 1 }),
        Object.freeze({ id: 'spiritRice', name: '灵米', tier: 1 }),
        Object.freeze({ id: 'silverTrout', name: '银鳟', tier: 2 }),
        Object.freeze({ id: 'greenBass', name: '青鲈', tier: 2 }),
        Object.freeze({ id: 'darkCatfish', name: '玄鲶', tier: 3 }),
        Object.freeze({ id: 'sunsetSalmon', name: '霞鲑', tier: 3 }),
        Object.freeze({ id: 'thunderEel', name: '雷鳗', tier: 4 }),
        Object.freeze({ id: 'spiritLobster', name: '灵龙虾', tier: 5 }),
        Object.freeze({ id: 'swordfish', name: '剑鱼', tier: 6 }),
        Object.freeze({ id: 'dragonFish', name: '龙鱼', tier: 7 })
      ])
    }
  });

  const MISSIONS = deepFreeze([
    mission(
      'taixuan-ore-1',
      'taixuan-sword',
      '剑冢矿材',
      '上交灵矿，供剑冢修缮。',
      [deliver('ore', 3, '上交灵矿')],
      REWARDS_A
    ),
    mission(
      'taixuan-bandit-1',
      'taixuan-sword',
      '山门试炼',
      '击败附近妖修，证明剑意。',
      [combat('击败附近对手')],
      REWARDS_A
    ),
    mission(
      'taixuan-wolf-1',
      'taixuan-sword',
      '清山狼患',
      '清理山门附近的妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_B,
      { minRealm: 1 }
    ),
    mission(
      'taixuan-combo-1',
      'taixuan-sword',
      '外门勤务',
      '先补矿材，再击败试炼对手。',
      [
        deliver('ore', 2, '上交灵矿'),
        combat('击败附近对手')
      ],
      REWARDS_B,
      { minRealm: 2 }
    ),

    mission(
      'baicao-herb-1',
      'baicao-valley',
      '药圃供奉',
      '采集药材上交谷中药圃。',
      [deliver('herb', 4, '上交药材')],
      REWARDS_A
    ),
    mission(
      'baicao-hare-1',
      'baicao-valley',
      '驱兽护田',
      '清剿侵扰药田的妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_A
    ),
    mission(
      'baicao-wolf-1',
      'baicao-valley',
      '药径巡守',
      '巡守药径，击退侵扰妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_B,
      { minRealm: 1 }
    ),
    mission(
      'baicao-combo-1',
      'baicao-valley',
      '谷门差事',
      '上交药材并清剿田边妖兽。',
      [
        deliver('herb', 3, '上交药材'),
        combat('击败附近妖兽')
      ],
      REWARDS_B,
      { minRealm: 2 }
    ),

    mission(
      'tiangong-ore-1',
      'tiangong-pavilion',
      '器库补给',
      '为炼器堂补充灵矿。',
      [deliver('ore', 4, '上交灵矿')],
      REWARDS_A
    ),
    mission(
      'tiangong-wolf-1',
      'tiangong-pavilion',
      '山野试器',
      '以实战检验器修胆色。',
      [combat('击败附近妖兽')],
      REWARDS_A
    ),
    mission(
      'tiangong-bandit-1',
      'tiangong-pavilion',
      '护路差遣',
      '清剿滋扰商路的对手。',
      [combat('击败附近对手')],
      REWARDS_B,
      { minRealm: 1 }
    ),
    mission(
      'tiangong-combo-1',
      'tiangong-pavilion',
      '锻前筹备',
      '备齐矿材并完成一次山野试炼。',
      [
        deliver('ore', 3, '上交灵矿'),
        combat('击败附近妖兽')
      ],
      REWARDS_B,
      { minRealm: 2 }
    ),

    mission(
      'beast-food-1',
      'spirit-beast-mountain',
      '饲灵差遣',
      '为灵兽园准备食材。',
      [deliver('food', 4, '上交食材')],
      REWARDS_A
    ),
    mission(
      'beast-hare-1',
      'spirit-beast-mountain',
      '护幼驱兽',
      '驱散威胁幼兽的妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_A
    ),
    mission(
      'beast-wolf-1',
      'spirit-beast-mountain',
      '山门巡猎',
      '巡猎山门，击败侵扰妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_B,
      { minRealm: 1 }
    ),
    mission(
      'beast-combo-1',
      'spirit-beast-mountain',
      '饲育勤务',
      '备齐食材并清剿侵扰兽园的野兽。',
      [
        deliver('food', 3, '上交食材'),
        combat('击败附近妖兽')
      ],
      REWARDS_B,
      { minRealm: 2 }
    ),

    mission(
      'qingyin-herb-1',
      'qingyin-palace',
      '清心供奉',
      '上交药材，以备清心安神。',
      [deliver('herb', 3, '上交药材')],
      REWARDS_A
    ),
    mission(
      'qingyin-bandit-1',
      'qingyin-palace',
      '音途护行',
      '清剿滋扰音途的对手。',
      [combat('击败附近对手')],
      REWARDS_A
    ),
    mission(
      'qingyin-hare-1',
      'qingyin-palace',
      '宫门清野',
      '清理宫门附近的妖兽。',
      [combat('击败附近妖兽')],
      REWARDS_B,
      { minRealm: 1 }
    ),
    mission(
      'qingyin-combo-1',
      'qingyin-palace',
      '礼宾差事',
      '备齐药材并完成一次清野。',
      [
        deliver('herb', 2, '上交药材'),
        combat('击败附近对手')
      ],
      REWARDS_B,
      { minRealm: 2 }
    )
  ]);

  const BY_ID = Object.create(null);
  const BY_SECT = Object.create(null);
  MISSIONS.forEach(function (row) {
    BY_ID[row.id] = row;
    if (!BY_SECT[row.sectId]) BY_SECT[row.sectId] = [];
    BY_SECT[row.sectId].push(row);
  });
  deepFreeze(BY_ID);
  Object.keys(BY_SECT).forEach(function (sectId) {
    deepFreeze(BY_SECT[sectId]);
  });
  deepFreeze(BY_SECT);

  function get(missionId) {
    if (typeof missionId !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(BY_ID, missionId)
      ? BY_ID[missionId]
      : null;
  }

  function listForSect(sectId) {
    if (typeof sectId !== 'string') return [];
    return BY_SECT[sectId] || [];
  }

  function list() {
    return MISSIONS;
  }

  function getDeliverFamily(familyId) {
    if (typeof familyId !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(DELIVER_FAMILIES, familyId)
      ? DELIVER_FAMILIES[familyId]
      : null;
  }

  return Object.freeze({
    BOARD_SIZE: 3,
    REFRESH_SECONDS: 1800,
    MISSIONS: MISSIONS,
    DELIVER_FAMILIES: DELIVER_FAMILIES,
    get: get,
    list: list,
    listForSect: listForSect,
    getDeliverFamily: getDeliverFamily
  });
});
