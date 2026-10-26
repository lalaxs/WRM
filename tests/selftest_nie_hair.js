'use strict';

const HairRules = require('../nie-hair-rules.js');

function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  }
}

ok(
  HairRules.isValidPair('b', 0, 0) === true,
  'boy white front/back pair is valid'
);
ok(
  HairRules.isValidPair('b', 0, 1) === false,
  'boy white back cannot mix with other front hair'
);
ok(
  HairRules.isValidPair('b', 1, 0) === false,
  'boy other back cannot mix with white front hair'
);
ok(
  HairRules.isValidPair('b', 1, 3) === true,
  'boy non-white hairs can free-mix'
);
ok(
  HairRules.isValidPair('g', 2, 5) === true,
  'girl hairs free-mix by default'
);

const coerced = HairRules.normalizeHairParts('b', {
  hair_hou: 0,
  hair_qian: 2
});
ok(
  coerced.hair_hou === 0 && coerced.hair_qian === 0,
  'invalid white mix syncs partner to white'
);

const leaveWhite = HairRules.stepHairPart(
  'b',
  { hair_hou: 0, hair_qian: 0 },
  'hair_qian',
  1,
  5
);
ok(
  leaveWhite.hair_qian === 1 && leaveWhite.hair_hou !== 0,
  'leaving white front also leaves white back'
);

const pickWhite = HairRules.stepHairPart(
  'b',
  { hair_hou: 2, hair_qian: 3 },
  'hair_hou',
  -2,
  4
);
ok(
  pickWhite.hair_hou === 0 && pickWhite.hair_qian === 0,
  'picking white back forces white front'
);

const passed = !(process.exitCode || 0);
console.log('\n=== nie-hair ' + (passed ? '9 passed / 0 failed' : 'FAILED') + ' ===\n');
process.exit(passed ? 0 : 1);
