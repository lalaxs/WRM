'use strict';
/*
 * 从 original-event-texts 碎片推断槽位配方，合并手写覆盖，写出 content/original-event-slots.js。
 *
 * 原则：有碎片就必须有配方；运行时只走配方，不再启发式猜槽。
 * token：数字 = parts[i]；a/b/c = 人名；gift/young_pet/pet_form/linggen/
 * office/baby/sword/craft/insight/rescue_suffix；lit:文字；or:lo-hi = 随机抽一段。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const Texts = require(path.join(ROOT, 'content/original-event-texts.js'));
const OUT = path.join(ROOT, 'content/original-event-slots.js');

/** 手写覆盖：优先于推断 */
const OVERRIDES = Object.freeze({
  53: ['a', 0, 'b', 'or:1-4', 5],
  54: ['a', 0, 1, 'b'],
  66: ['a', 0, 'b', 1, 'c', 2, 'c', 3, 'b', 4, 'a', 5],
  77: ['a', 0, 'sword'],
  81: ['a', 0, 'young_pet', 1],
  83: ['a', 0, 'pet_form'],
  93: ['a', 0, 'b', 1, 'b', 2],
  113: ['a', 0, 'b', 1, 'b', 2],
  150: ['a', 0, 'b', 1, 'b', 2],
  160: ['a', 0, 'b', 'lit:与', 'c', 1, 'c', 2],
  162: ['a', 0, 'b', 1, 'b', 2],
  212: ['a', 0, 'b', 1, 'office'],
  229: ['a', 0, 'gift', 1, 'b'],
  230: [0, 'b', 1, 'gift', 2],
  237: ['a', 0, 'b', 1, 'b', 2],
  251: ['a', 0, 'gift', 1, 'b'],
  293: ['a', 0, 'b', 2, 'b', 3],
  316: ['a', 'lit:与', 'b', 0, 'b', 1, 'b', 2],
  323: ['a', 'lit:与', 'b', 0, 'gift'],
  326: ['a', 'lit:与', 'b', 0, 'b', 1, 'gift', 2, 'a'],
  329: ['a', 0, 'b', 1, 'a', 2, 'c'],
  333: ['a', 0, 'b', 1, 'b', 2, 'b', 3],
  338: ['a', 0, 'b', 1, 'b', 2],
  341: ['a', 'lit:与', 'b', 0, 'gift'],
  349: ['a', 'lit:与', 'b', 0],
  350: ['a', 'lit:与', 'b', 0, 'b', 1, 'gift', 2, 'a'],
  353: ['a', 'lit:与', 'b', 0],
  368: ['a', 'lit:将', 'gift', 1, 'b', 0],
  370: ['a', 0, 'linggen', 1],
  384: ['a', 0, 'linggen'],
  392: ['a', 0, 'b', 1, 'b', 2],
  393: ['a', 0, 'b', 1, 'a', 2, 'b', 3],
  394: ['a', 0, 'b', 1, 'a', 2, 'b', 3],
  395: ['b', 0, 'c', 1, 'a', 2, 'a'],
  396: ['b', 0, 'c', 1, 'a'],
  410: ['a', 0, 'gift'],
  411: ['a', 0, 1],
  412: ['a', 0, 'insight'],
  413: ['a', 0, 'insight'],
  414: ['a', 0, 'insight'],
  415: ['a', 0, 'insight'],
  416: ['a', 0, 'insight'],
  417: ['a', 0, 'insight'],
  459: ['a', 0, 'baby'],
  496: ['a', 0, 'b', 1, 'c', 2, 'b', 3, 'a', 4, 'c', 5],
  500: ['a', 0, 'b', 1, 'b', 2, 'c', 3, 'c', 4, 'a', 5],
  505: ['a', 0, 'b', 1, 'a', 2, 'gift', 3, 'b'],
  515: ['a', 0, 'b', 1, 'a', 2, 'b', 3],
  536: ['a', 0, 'b', 1, 'b', 2, 'b', 3, 'b', 4],
  561: ['a', 0, 'b', 1, 2, 'b', 3],
  563: ['a', 0, 'young_pet'],
  564: ['pet_form', 0, 'a', 1],
  565: [0, 'young_pet', 1, 'a', 2],
  571: ['pet_form', 0, 'a', 1, 'a', 2, 'pet_form', 3],
  574: ['a', 0, 'b', 1, 'b', 2],
  582: ['a', 0, 'b', 1, 'b', 2]
});

const ACTIVITY_INSIGHT = /^在(炼丹|弹琴|练剑|观星|超度亡魂|对月修炼|修炼)$/;

function partsNeedPeer(parts) {
  if (!parts || !parts.length) return false;
  if (parts.length >= 2) {
    if (/孵化出了一只$/.test(parts[0] || '')) return false;
    if (/洗髓丹令之成为了$/.test(parts[0] || '')) return false;
    if (ACTIVITY_INSIGHT.test(parts[0] || '') && /顿悟/.test(parts[1] || '')) {
      return false;
    }
    if (/在尚是一只$/.test(parts[0] || '') && parts[1] === '时为') return false;
    if (/^满怀激动的找到了$/.test(parts[0] || '')) return false;
    if (parts[0] === '接替' && parts[1] === '成为') return true;
    return true;
  }
  const p0 = parts[0] || '';
  if (/^一起/.test(p0)) return true;
  if (/^(告诉|和|与)/.test(p0)) return true;
  if (/(救了|结识了|所救|与之结识)$/.test(p0)) return true;
  if (/想要和|一起修炼|一起游历|两人/.test(p0)) return true;
  if (/^作为.+赠与$/.test(p0)) return true;
  if (/^被正在|被恰好路过的$|舍身救了身中情毒的$|送给了$/.test(p0)) {
    return true;
  }
  if (/^(探望了|赠与了|拒绝了他的请求|和弟子)$/.test(p0)) return true;
  if (/摸.+请求$/.test(p0)) return true;
  return false;
}

function inferRecipe(parts) {
  if (!Array.isArray(parts) || !parts.length) return null;
  const n = parts.length;
  const p0 = parts[0] || '';
  const pLast = parts[n - 1] || '';

  if (n === 1) {
    if (/的灵宠成功化形为$/.test(p0)) return ['a', 0, 'pet_form'];
    if (/救了一只$/.test(p0)) return ['a', 0, 'young_pet'];
    if (ACTIVITY_INSIGHT.test(p0)) return ['a', 0, 'insight'];
    if (p0 === '捡到了') return ['a', 0, 'gift'];
    if (/本命剑蕴养出了$/.test(p0)) return ['a', 0, 'sword'];
    if (/服用了洗髓丹成为了$/.test(p0)) return ['a', 0, 'linggen'];
    if (/起名为$/.test(p0)) return ['a', 0, 'baby'];
    if (/^一起/.test(p0) || /两人/.test(p0)) {
      if (/(获得了?|得到了)$/.test(p0)) {
        return ['a', 'lit:与', 'b', 0, 'gift'];
      }
      return ['a', 'lit:与', 'b', 0];
    }
    if (/(获得了?|得到了)$/.test(p0)) return ['a', 0, 'gift'];
    if (/买到了$/.test(p0)) return ['a', 0, 'gift'];
    if (/炼制出了一炉$/.test(p0)) return ['a', 0, 'craft'];
    if (/成功突破到$/.test(p0)) return ['a', 0, 'lit:更高境界'];
    if (/^被正在/.test(p0)) return ['a', 0, 'b', 'rescue_suffix'];
    if (/被恰好路过的$/.test(p0)) return ['a', 0, 'b', 'rescue_suffix'];
    if (p0 === '所救') return ['a', 'lit:被', 'b', 0];
    if (/(救了|结识了|与之结识)$/.test(p0)) return ['a', 0, 'b'];
    if (/舍身救了身中情毒的$/.test(p0)) return ['a', 0, 'b'];
    if (/^(探望了|赠与了|送给了)$/.test(p0) || /送给了$/.test(p0)) {
      return ['a', 0, 'b'];
    }
    if (p0 === '赠与了') return ['a', 0, 'gift', 'lit:给', 'b'];
    if (/将名贵的花卉送给了$/.test(p0)) return ['a', 0, 'b'];
    if (/^作为.+赠与$/.test(p0)) return ['a', 0, 'b', 'gift'];
    if (/^，/.test(p0)) return ['a', 'lit:拜访', 'b', 0];
    if (/^(心法|身法)$/.test(p0)) return ['a', 'lit:传授了', 0];
    if (/^如何/.test(p0) || /分布$/.test(p0)) return ['a', 'lit:告知了', 0];
    if (/在一起时(看到了|遇到了)$/.test(p0)) {
      return ['a', 'lit:与', 'b', 0, 'gift'];
    }
    if (partsNeedPeer(parts)) return ['a', 0, 'b'];
    return ['a', 0];
  }

  // 救援多地点变体：遇险，为 | loc… | 所救 → 只抽一个地点
  if (n >= 4 && /遇险/.test(p0) && /所救$/.test(pLast)) {
    return ['a', 0, 'b', 'or:1-' + (n - 2), n - 1];
  }

  if (n === 3 && p0 === '弟子' && parts[1] === '将' && /礼物/.test(parts[2] || '')) {
    return [0, 'b', 1, 'gift', 2];
  }

  if (n === 2) {
    if (/孵化出了一只$/.test(p0)) return ['a', 0, 'young_pet', 1];
    if (p0 === '接替' && parts[1] === '成为') return ['a', 0, 'b', 1, 'office'];
    if (/洗髓丹令之成为了$/.test(p0)) return ['a', 0, 'linggen', 1];
    if (/^满怀激动的找到了$/.test(p0)) return ['pet_form', 0, 'a', 1];
    if (ACTIVITY_INSIGHT.test(p0) && /顿悟/.test(parts[1] || '')) {
      return ['a', 0, 1];
    }
    if (/救了$/.test(p0) && /遇险的$/.test(parts[1] || '')) {
      return ['a', 0, 1, 'b'];
    }
    if (partsNeedPeer(parts)) return ['a', 0, 'b', 1];
    return ['a', 0, 1];
  }

  if (n === 3) {
    if (/在尚是一只$/.test(p0) && parts[1] === '时为' && /所救$/.test(parts[2] || '')) {
      return [0, 'young_pet', 1, 'a', 2];
    }
    if (/(找到|见到|爱上|和|对|送给|赠与)$/.test(parts[1] || '')) {
      return ['a', 0, 'b', 1, 'b', 2];
    }
    if (partsNeedPeer(parts)) return ['a', 0, 'b', 1, 2];
    return ['a', 0, 1, 2];
  }

  // 多段默认：首段后插 b；中间动词收尾后再插 b（「的冷待和」+「对他」除外）
  const out = ['a', 0];
  if (partsNeedPeer(parts) || /对$|爱上$|见到$|找到$|和$|与$/.test(p0)) {
    out.push('b');
  }
  for (let i = 1; i < n; i++) {
    out.push(i);
    if (i >= n - 1) continue;
    const pi = parts[i] || '';
    const pj = parts[i + 1] || '';
    if (/和$/.test(pi) && /^(对|他|她|其)/.test(pj)) continue;
    if (/获得了$/.test(pi) && /^点/.test(pj)) continue;
    if (/(找到|见到|爱上|告诉|送给|赠与|救了|结识了|对|和|与|恰在|令|诬告|爱慕)$/.test(pi)) {
      out.push('b');
    }
  }
  return out;
}

function allIds() {
  if (typeof Texts.allIds === 'function') return Texts.allIds();
  return Object.keys(Texts.partsById || {});
}

function main() {
  if (typeof Texts.ensureReady === 'function') Texts.ensureReady();

  const recipes = {};
  let inferred = 0;
  let overridden = 0;
  let skipped = 0;

  Object.keys(OVERRIDES).forEach(function (id) {
    const row = OVERRIDES[id];
    if (!Array.isArray(row)) {
      skipped++;
      return;
    }
    recipes[String(id)] = row.slice();
    overridden++;
  });

  allIds().forEach(function (id) {
    const key = String(id | 0);
    if (recipes[key]) return;
    const parts = Texts.getParts(id);
    if (!parts || !parts.length) {
      skipped++;
      return;
    }
    const recipe = inferRecipe(parts);
    if (!recipe) {
      skipped++;
      return;
    }
    recipes[key] = recipe;
    inferred++;
  });

  const sortedKeys = Object.keys(recipes).sort(function (a, b) {
    return (a | 0) - (b | 0);
  });
  const ordered = {};
  sortedKeys.forEach(function (k) {
    ordered[k] = recipes[k];
  });

  const missing = allIds().filter(function (id) {
    const parts = Texts.getParts(id);
    return parts && parts.length && !recipes[String(id | 0)];
  });
  if (missing.length) {
    console.error('ERROR: still missing recipes for', missing.length, missing.slice(0, 20));
    process.exitCode = 1;
  }

  // 审计：文本碎片以「对/找到/送给…」收尾后，下一段前必须有人名/礼物槽
  const gapNeed = /(找到|见到|爱上|告诉|送给|赠与|救了|结识了|对|恰在|令|诬告|爱慕)$/;
  const gapSkipAnd = /和$/;
  const slotTok = /^(a|b|c|gift|young_pet|pet_form|linggen|office|baby|sword|craft)$/;
  const gaps = [];
  sortedKeys.forEach(function (key) {
    const parts = Texts.getParts(key);
    const recipe = recipes[key];
    if (!parts || !recipe) return;
    for (let i = 0; i < recipe.length; i++) {
      const tok = recipe[i];
      if (typeof tok !== 'number') continue;
      const frag = parts[tok] || '';
      const next = recipe[i + 1];
      if (typeof next !== 'number') continue;
      const nxt = parts[next] || '';
      if (gapSkipAnd.test(frag) && /^(对|他|她|其)/.test(nxt)) continue;
      if (/获得了$/.test(frag) && /^点/.test(nxt)) continue;
      if (/救了$/.test(frag) && /^遇险/.test(nxt)) continue;
      if (gapNeed.test(frag) || (/和$|与$/.test(frag) && !/^(对|他|她|其)/.test(nxt))) {
        gaps.push(key + '@' + tok);
      }
    }
  });
  if (gaps.length) {
    console.error('ERROR: part-gap without name/gift slot:', gaps.length, gaps.slice(0, 40));
    process.exitCode = 1;
  }

  const body = `/*
 * original-event-slots.js —— 原版事件插槽配方（对标 doevent temp 参数序）
 * 由 tools/_build_event_slots.js 生成；手写覆盖见该脚本 OVERRIDES。
 * 仅构建中间产物：再经 tools/_build_event_templates.js 编译为 event-templates。
 * 游戏运行时不加载。
 *
 * token：
 *   number / a|b|c / gift / young_pet / pet_form / linggen / office /
 *   baby / sword / craft / insight / rescue_suffix / lit:… / or:lo-hi
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalEventSlots = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const INSIGHT_TEXT = '时产生了顿悟，突破成功率增加5%';
  const RESCUE_SUFFIX = '所救';

  const recipes = Object.freeze(${JSON.stringify(ordered, null, 2)});

  function recipeFor(eventId) {
    if (eventId == null || eventId === '') return null;
    const row = recipes[String(eventId | 0)];
    return Array.isArray(row) ? row.slice() : null;
  }

  function recipeNeedsPeer(recipe) {
    if (!Array.isArray(recipe)) return false;
    return recipe.indexOf('b') >= 0 || recipe.indexOf('c') >= 0;
  }

  function hasRecipe(eventId) {
    return Array.isArray(recipes[String(eventId | 0)]);
  }

  return Object.freeze({
    INSIGHT_TEXT: INSIGHT_TEXT,
    RESCUE_SUFFIX: RESCUE_SUFFIX,
    recipes: recipes,
    recipeFor: recipeFor,
    recipeNeedsPeer: recipeNeedsPeer,
    hasRecipe: hasRecipe
  });
});
`;

  fs.writeFileSync(OUT, body, 'utf8');
  console.log(
    'wrote',
    OUT,
    'recipes=',
    sortedKeys.length,
    'override=',
    overridden,
    'inferred=',
    inferred,
    'skipped=',
    skipped,
    'missing=',
    missing.length
  );
}

main();
