'use strict';

const fs = require('fs');
const path = require('path');
const T = require('../content/techniques.js');

const itemsPath = path.join(__dirname, '../content/items.js');
let src = fs.readFileSync(itemsPath, 'utf8');

const nameEntries = Object.values(T.TECHNIQUES).map(function (t) {
  return "    '" + t.bookItemId + "': '" + t.name + "秘卷'";
}).join(',\n');

const bookEntries = Object.values(T.TECHNIQUES).map(function (t) {
  return "    '" + t.bookItemId + "': '" + t.id + "'";
}).join(',\n');

const iconEntries = Object.values(T.TECHNIQUES).map(function (t) {
  return "    '" + t.bookItemId + "': '📕'";
}).join(',\n');

src = src.replace(
  /    'techniqueBook:[^']+': '[^']*秘卷'(?:,\n    'techniqueBook:[^']+': '[^']*秘卷')*/,
  nameEntries
);

src = src.replace(
  /  const TECHNIQUE_BOOKS = \{[\s\S]*?\n  \};/,
  '  const TECHNIQUE_BOOKS = {\n' + bookEntries + '\n  };'
);

src = src.replace(
  /    'techniqueBook:[^']+': '📕'(?:,\n    'techniqueBook:[^']+': '📕')*/,
  iconEntries
);

fs.writeFileSync(itemsPath, src);
console.log('items ok', Object.keys(T.TECHNIQUES).length);

const combatPath = path.join(__dirname, '../content/combat.js');
let combat = fs.readFileSync(combatPath, 'utf8');
const allIds = T.ROADMAP_IDS.concat(['pillGuard']);
const allLiteral = allIds.map(function (id) {
  return "'" + id + "'";
}).join(', ');

combat = combat.replace(
  /  const ALL_TECHNIQUE_IDS = \[[\s\S]*?\];/,
  '  const ALL_TECHNIQUE_IDS = [\n    ' + allLiteral + '\n  ];'
);

const tier9 = "      techniqueIds: ALL_TECHNIQUE_IDS";
const midPools = [
  {
    tier: 3,
    ids: [
      'bindingTalisman', 'battleHeart', 'thunderSeal', 'clearTruthArt',
      'hiddenEdge', 'heartGuardArt', 'flowingLightThirteen', 'flyingSwordChase',
      'clearSpringArt', 'bonePoisonMist', 'woodVitalityArt', 'fourSymbolsWard',
      'spiritLockMechanism', 'lifeFeedback', 'beastEcho', 'beastWarSpirit',
      'purifyingMelody', 'tearingSevenStrings', 'springRiverHarmony',
      'spiritResonance', 'drunkenRedDust', 'longSleeveDance',
      'endlessSwordHeart', 'myriadPoisonTrue', 'heavenlyCalculation',
      'spiritCompanion', 'killingToneBone', 'confusingHeartTrue'
    ]
  },
  {
    tier: 4,
    ids: [
      'eightDirectionsSword', 'endlessCycleArt', 'supremeMysticSword',
      'myriadSwordsSky', 'witheredSpring', 'woodSharedLife', 'starfallArray',
      'heavenlyNetLock', 'mechanismMastery', 'hundredBeastRush',
      'myriadBeastHeart', 'highMountainsFlowingWater', 'lingeringSound',
      'allBeingsFavor', 'redDustMirror', 'swordReturnOrigin', 'pillGuard'
    ]
  },
  {
    tier: 5,
    ids: ['blackTortoiseWard', 'lastStandArt', 'starfallArray', 'pillGuard']
  }
];

combat = combat.replace(
  /techniqueIds: \['bindingTalisman', 'battleHeart', 'thunderSeal'\]/,
  'techniqueIds: [' + midPools[0].ids.map(function (id) {
    return "'" + id + "'";
  }).join(', ') + ']'
);
combat = combat.replace(
  /techniqueIds: \['beastEcho', 'swordHeart'\]/,
  'techniqueIds: [' + midPools[1].ids.map(function (id) {
    return "'" + id + "'";
  }).join(', ') + ']'
);
combat = combat.replace(
  /techniqueIds: \['starfallArray', 'pillGuard'\]/,
  'techniqueIds: [' + midPools[2].ids.map(function (id) {
    return "'" + id + "'";
  }).join(', ') + ']'
);

fs.writeFileSync(combatPath, combat);
console.log('combat ok');
