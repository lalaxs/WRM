/*
 * original-event-bindings.js —— H5 action → 原版 eventId 池 + 轻量效果
 * 由 tools/_build_event_bindings.py 从 af-extracted.json 生成。
 *
 * 完全还原约定（本阶段）：
 *   - 世界日事件优先原版 eventt；无池动作走 ACTION_ALIASES
 *   - 「是否同意」提问 ID 改抽拒绝 ID；收徒提问直接跳过
 *   - NPC↔NPC 只用 feel → npcAffinities；玩家↔NPC 写 8 维
 *   - breakthrough_delta：文案百分比直接加到突破判定
 *   - wash_root：洗髓丹升一档灵根
 *   - 不做元阳；不做同意 UI
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalEventBindings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pools = Object.freeze({
  "meet": [
    0,
    5,
    7,
    9,
    10,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    138,
    329
  ],
  "talk": [
    112,
    113,
    301,
    312,
    315,
    561
  ],
  "gift": [
    38,
    39,
    40,
    41,
    42,
    47,
    50,
    138,
    162,
    180,
    229,
    230,
    251,
    305,
    306,
    311,
    326,
    330,
    350,
    368,
    382,
    442,
    483,
    493,
    505,
    536
  ],
  "rare_gift": [
    100,
    122
  ],
  "birthday": [
    92,
    93,
    227,
    228,
    229,
    230,
    442,
    514,
    569
  ],
  "date": [
    193,
    227,
    271,
    273,
    277,
    278,
    279,
    304,
    320,
    321,
    322,
    323,
    324,
    326,
    341,
    342,
    344,
    346,
    350
  ],
  "confess_npc": [
    119,
    293,
    318,
    339,
    561
  ],
  "partner_npc": [
    33,
    38,
    43,
    44,
    45,
    46,
    147,
    148,
    149,
    150,
    151,
    152,
    153,
    154,
    155,
    461,
    462,
    463,
    471,
    472,
    492
  ],
  "breakup": [
    34,
    35,
    36,
    37,
    473,
    474
  ],
  "jealousy": [
    153
  ],
  "quarrel": [
    462
  ],
  "rival": [
    138,
    139,
    140,
    379,
    380,
    390,
    391,
    494
  ],
  "aid": [
    24,
    25,
    26,
    28,
    30,
    53,
    54,
    56,
    69,
    71,
    117,
    148,
    159,
    313,
    356,
    395,
    396,
    433,
    505,
    506,
    509,
    515,
    545,
    563,
    565
  ],
  "rescue": [
    24,
    25,
    26,
    28,
    30,
    53,
    54,
    56,
    69,
    71,
    159,
    313,
    356,
    395,
    396,
    433,
    505,
    506,
    509,
    545,
    563,
    565
  ],
  "crisis_save": [
    24,
    25,
    26,
    28,
    30,
    53,
    54,
    56,
    69,
    71,
    159,
    313,
    356,
    395,
    396,
    433,
    505,
    506,
    509,
    545,
    563,
    565
  ],
  "crisis_meet": [
    53,
    54,
    363,
    505
  ],
  "market": [
    19,
    30,
    31,
    53,
    105,
    130,
    232,
    273,
    274,
    279,
    307,
    323,
    324,
    326,
    344,
    409
  ],
  "mentor": [
    0,
    1,
    38,
    44,
    102,
    110,
    119,
    120,
    122,
    123,
    126,
    133,
    134,
    135,
    230,
    439,
    465,
    469,
    475,
    477
  ],
  "treasure": [
    449,
    450,
    451,
    452
  ],
  "first_sight": [
    33,
    508,
    542
  ],
  "cultivate_together": [
    9,
    57,
    58,
    112,
    113,
    136,
    137,
    211,
    238,
    301,
    312,
    316,
    332,
    386
  ],
  "character_beat": [
    9,
    13,
    14,
    22,
    23,
    24,
    25,
    33,
    53,
    57,
    58,
    66,
    81,
    83,
    84,
    88,
    112,
    113,
    136,
    137,
    148,
    199,
    201,
    205,
    211,
    212,
    213,
    214,
    215,
    221,
    246,
    260,
    270,
    293,
    301,
    312,
    315,
    316,
    332,
    349,
    352,
    353,
    354,
    355,
    356,
    369,
    383,
    386,
    398,
    402,
    406,
    411,
    416,
    417,
    418,
    419,
    423,
    424,
    433,
    435,
    438,
    445,
    446,
    447,
    454,
    456,
    459,
    463,
    465,
    467,
    468,
    469,
    472,
    481,
    495,
    502,
    503,
    504,
    505,
    509,
    511,
    512,
    516,
    525,
    563,
    571,
    573,
    574
  ],
  "breakthrough": [
    23,
    33,
    84,
    199,
    205,
    260,
    369,
    402,
    406,
    419,
    438,
    463,
    465,
    467,
    468,
    469,
    472,
    504,
    571
  ]
});
  const effects = Object.freeze({
  "23": {
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "32": {
    "breakthrough_delta": 0.1,
    "buff": "breakthrough_up"
  },
  "33": {
    "breakthrough_delta": -0.05,
    "buff": "breakthrough_down"
  },
  "34": {
    "untag": "dao-companion"
  },
  "35": {
    "untag": "dao-companion"
  },
  "36": {
    "untag": "dao-companion"
  },
  "37": {
    "untag": "dao-companion"
  },
  "59": {
    "sublevel": 1
  },
  "71": {
    "tag": "dao-companion"
  },
  "72": {
    "tag": "dao-companion"
  },
  "73": {
    "tag": "dao-companion"
  },
  "84": {
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "86": {
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "91": {
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "119": {
    "love": 5
  },
  "139": {
    "status": "dead"
  },
  "140": {
    "sublevel": 1
  },
  "149": {
    "tag": "dao-companion"
  },
  "151": {
    "tag": "dao-companion"
  },
  "153": {
    "lust": 4,
    "tag": "dao-companion"
  },
  "155": {
    "tag": "dao-companion"
  },
  "157": {
    "status": "injured"
  },
  "161": {
    "status": "injured"
  },
  "173": {
    "status": "injured"
  },
  "199": {
    "breakthrough_delta": -0.1,
    "buff": "breakthrough_down"
  },
  "205": {
    "breakthrough_delta": -0.1,
    "buff": "breakthrough_down"
  },
  "207": {
    "status": "dead"
  },
  "216": {
    "status": "injured"
  },
  "222": {
    "status": "injured"
  },
  "260": {
    "breakthrough_delta": 0.01,
    "buff": "breakthrough_up"
  },
  "293": {
    "sublevel": 3
  },
  "318": {
    "love": 6
  },
  "339": {
    "love": 6
  },
  "359": {
    "status": "injured"
  },
  "360": {
    "status": "injured"
  },
  "365": {
    "status": "injured"
  },
  "367": {
    "feel": 4
  },
  "368": {
    "buff": "tribulation_down",
    "feel": 4
  },
  "369": {
    "feel": 8,
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "370": {
    "feel": 8,
    "wash_root": true
  },
  "371": {
    "feel": 2
  },
  "372": {
    "feel": 4,
    "restore_qi": true
  },
  "373": {
    "feel": 2,
    "restore_qi": true
  },
  "374": {
    "feel": 4
  },
  "375": {
    "feel": 3
  },
  "376": {
    "status": "injured"
  },
  "384": {
    "wash_root": true
  },
  "393": {
    "status": "injured"
  },
  "394": {
    "status": "injured"
  },
  "397": {
    "status": "injured"
  },
  "398": {
    "sublevel": 1
  },
  "400": {
    "status": "injured"
  },
  "402": {
    "breakthrough_delta": 1.0,
    "buff": "breakthrough_up"
  },
  "406": {
    "breakthrough_delta": 0.1,
    "buff": "breakthrough_up"
  },
  "419": {
    "breakthrough_delta": 0.15,
    "buff": "breakthrough_up"
  },
  "431": {
    "status": "injured"
  },
  "432": {
    "status": "injured"
  },
  "438": {
    "breakthrough_delta": 0.05,
    "buff": "breakthrough_up"
  },
  "441": {
    "status": "injured"
  },
  "451": {
    "status": "injured"
  },
  "461": {
    "tag": "dao-companion"
  },
  "463": {
    "breakthrough_delta": -0.05,
    "buff": "breakthrough_down"
  },
  "465": {
    "breakthrough_delta": -0.1,
    "buff": "breakthrough_down"
  },
  "467": {
    "breakthrough_delta": 0.3,
    "buff": "breakthrough_up"
  },
  "468": {
    "breakthrough_delta": -0.05,
    "buff": "breakthrough_down"
  },
  "469": {
    "breakthrough_delta": -0.1,
    "buff": "breakthrough_down"
  },
  "472": {
    "breakthrough_delta": -0.05,
    "buff": "breakthrough_down"
  },
  "473": {
    "untag": "dao-companion"
  },
  "474": {
    "untag": "dao-companion"
  },
  "492": {
    "tag": "dao-companion"
  },
  "497": {
    "tag": "dao-companion"
  },
  "504": {
    "breakthrough_delta": -0.05,
    "buff": "breakthrough_down"
  },
  "515": {
    "feel": 5
  },
  "558": {
    "status": "injured"
  },
  "559": {
    "status": "injured"
  },
  "560": {
    "status": "injured"
  },
  "561": {
    "love": 6
  },
  "571": {
    "breakthrough_delta": -0.1,
    "buff": "breakthrough_down"
  },
  "147": {},
  "211": {},
  "238": {},
  "117": {},
  "68": {},
  "76": {},
  "81": {
    "hatch_pet": true
  },
  "83": {
    "form_pet": true
  },
  "212": {
    "promote": true
  },
  "213": {
    "ascend": true
  },
  "459": {
    "birth": true
  },
  "516": {
    "ascend": true
  },
  "574": {
    "ascend": true
  }
});
  const consentReject = Object.freeze({
  "32": 33,
  "146": 147,
  "210": 211,
  "237": 238,
  "116": 117,
  "67": 68,
  "75": 76
});
  const consentSkip = Object.freeze([60]);
  const actionAliases = Object.freeze({
  "spar": [
    "aid",
    "breakthrough"
  ],
  "market": [
    "meet",
    "talk",
    "gift"
  ],
  "debate": [
    "talk",
    "mentor"
  ],
  "mentor": [
    "talk",
    "gift",
    "aid"
  ],
  "treasure": [
    "rare_gift",
    "meet",
    "character_beat"
  ],
  "first_sight": [
    "meet",
    "crisis_meet",
    "partner_npc"
  ],
  "quarrel": [
    "rival",
    "breakup",
    "jealousy"
  ],
  "duel": [
    "rival",
    "aid",
    "breakthrough"
  ]
});

  function poolFor(action) {
    if (!action) return null;
    const list = pools[action];
    if (Array.isArray(list) && list.length) return list;
    const alts = actionAliases[action];
    if (!Array.isArray(alts)) return null;
    for (let i = 0; i < alts.length; i++) {
      const alt = pools[alts[i]];
      if (Array.isArray(alt) && alt.length) return alt;
    }
    return null;
  }

  function resolveConsentEventId(eventId) {
    const id = eventId | 0;
    if (consentSkip.indexOf(id) >= 0) return null;
    if (Object.prototype.hasOwnProperty.call(consentReject, String(id))) {
      return consentReject[String(id)] | 0;
    }
    if (Object.prototype.hasOwnProperty.call(consentReject, id)) {
      return consentReject[id] | 0;
    }
    return id;
  }

  function isConsentQuestion(eventId) {
    const id = eventId | 0;
    return Object.prototype.hasOwnProperty.call(consentReject, String(id)) ||
      Object.prototype.hasOwnProperty.call(consentReject, id) ||
      consentSkip.indexOf(id) >= 0;
  }

  function pickEventId(action, random) {
    const list = poolFor(action);
    if (!list) return null;
    const roll = typeof random === 'function' ? random() : Math.random();
    let id = list[Math.floor(roll * list.length) % list.length];
    id = resolveConsentEventId(id);
    return id == null ? null : id;
  }

  function effectFor(eventId) {
    if (eventId == null || eventId === '') return null;
    const resolved = resolveConsentEventId(eventId);
    if (resolved == null) return null;
    const row = effects[String(resolved | 0)];
    return row && typeof row === 'object' ? row : null;
  }

  return Object.freeze({
    pools: pools,
    effects: effects,
    consentReject: consentReject,
    consentSkip: consentSkip,
    actionAliases: actionAliases,
    poolFor: poolFor,
    pickEventId: pickEventId,
    resolveConsentEventId: resolveConsentEventId,
    isConsentQuestion: isConsentQuestion,
    effectFor: effectFor
  });
});
