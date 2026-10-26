(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.BasicAttackContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PLAYER_STYLES = Object.freeze({
    sword: Object.freeze({ id: 'basic:sword', name: '剑光斩', glyph: '剑' }),
    blade: Object.freeze({ id: 'basic:blade', name: '裂刃斩', glyph: '刃' }),
    spear: Object.freeze({ id: 'basic:spear', name: '穿云刺', glyph: '枪' }),
    staff: Object.freeze({ id: 'basic:staff', name: '振法击', glyph: '杖' }),
    unarmed: Object.freeze({ id: 'basic:unarmed', name: '碎空拳', glyph: '拳' })
  });

  const ENEMY_FORMS = Object.freeze({
    beast: Object.freeze({ id: 'basic:enemy:beast', name: '撕咬', glyph: '咬' }),
    construct: Object.freeze({
      id: 'basic:enemy:construct', name: '砸击', glyph: '砸'
    }),
    insect: Object.freeze({ id: 'basic:enemy:insect', name: '螫刺', glyph: '刺' }),
    plant: Object.freeze({ id: 'basic:enemy:plant', name: '缠绞', glyph: '缠' }),
    mire: Object.freeze({ id: 'basic:enemy:mire', name: '淤击', glyph: '淤' }),
    spirit: Object.freeze({ id: 'basic:enemy:spirit', name: '魂噬', glyph: '噬' }),
    remnant: Object.freeze({
      id: 'basic:enemy:remnant', name: '残袭', glyph: '残'
    }),
    avian: Object.freeze({ id: 'basic:enemy:avian', name: '俯冲', glyph: '冲' }),
    default: Object.freeze({
      id: 'basic:enemy:default', name: '扑击', glyph: '扑'
    })
  });

  // 与美术规范「类型」对齐的敌人形象。
  const ENEMY_FORM_BY_ID = Object.freeze({
    thornHare: 'beast',
    grayWolf: 'beast',
    wanderingBandit: 'beast',
    caveWarden: 'construct',
    breathSerpent: 'beast',
    ironClawBeast: 'beast',
    stonePuppet: 'construct',
    rogueCultivator: 'beast',
    altarGuardian: 'construct',
    earthVeinApe: 'beast',
    sandScorpion: 'insect',
    fireCrow: 'avian',
    swordRogue: 'insect',
    ruinElder: 'beast',
    scarletCoreBeast: 'beast',
    soulMoth: 'insect',
    ghostVine: 'plant',
    mireFiend: 'mire',
    towerKeeper: 'insect',
    infantSoulShade: 'spirit',
    thunderBird: 'avian',
    lightningSpirit: 'spirit',
    armoredFiend: 'beast',
    thunderJudge: 'beast',
    heavenlyThunderRoc: 'avian',
    riftCrawler: 'insect',
    voidMoth: 'insect',
    spaceBandit: 'beast',
    riftWarden: 'remnant',
    voidDevourer: 'insect',
    starHound: 'beast',
    meteorGolem: 'construct',
    abyssCultivator: 'beast',
    palaceMarshal: 'construct',
    unityTitan: 'beast',
    daoWraith: 'spirit',
    lawBeast: 'beast',
    skyDemon: 'beast',
    daoGateKeeper: 'construct',
    myriadLawAvatar: 'beast',
    cloudGeneral: 'avian',
    tribulationSpirit: 'spirit',
    immortalShadow: 'spirit',
    tribulationHerald: 'spirit',
    ninefoldTribulation: 'spirit'
  });

  function playerStyleFromWeaponName(weaponName) {
    const name = typeof weaponName === 'string' ? weaponName : '';
    if (name.indexOf('枪') >= 0) return 'spear';
    if (name.indexOf('杖') >= 0) return 'staff';
    if (name.indexOf('刃') >= 0) return 'blade';
    if (name.indexOf('剑') >= 0) return 'sword';
    return 'unarmed';
  }

  function playerBasicAttack(weaponName) {
    return PLAYER_STYLES[playerStyleFromWeaponName(weaponName)];
  }

  function enemyForm(enemyId) {
    if (typeof enemyId === 'string' &&
        Object.prototype.hasOwnProperty.call(ENEMY_FORM_BY_ID, enemyId)) {
      return ENEMY_FORM_BY_ID[enemyId];
    }
    return 'default';
  }

  function enemyBasicAttack(enemyId) {
    return ENEMY_FORMS[enemyForm(enemyId)] || ENEMY_FORMS.default;
  }

  function isBasicAttackId(id) {
    return typeof id === 'string' && id.indexOf('basic:') === 0;
  }

  return Object.freeze({
    PLAYER_STYLES: PLAYER_STYLES,
    ENEMY_FORMS: ENEMY_FORMS,
    ENEMY_FORM_BY_ID: ENEMY_FORM_BY_ID,
    playerStyleFromWeaponName: playerStyleFromWeaponName,
    playerBasicAttack: playerBasicAttack,
    enemyForm: enemyForm,
    enemyBasicAttack: enemyBasicAttack,
    isBasicAttackId: isBasicAttackId
  });
});
