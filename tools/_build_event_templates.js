'use strict';
/*
 * 把原版「碎片 + 配方」编译成统一模板表 content/event-templates.js。
 *
 * 运行时只填 {a}/{b}/{c}/{you}/{gift}/…；新事件也按同一格式手写合并。
 * 原版对标：先跑 _build_event_slots.js，再跑本脚本。
 *
 * token → 模板占位：
 *   a|b|c|gift|young_pet|pet_form|linggen|office|baby|sword|craft
 *   insight / rescue_suffix / lit:… → 直接写入字面量
 *   or:lo-hi → 展开为多条 templates[]
 * 原版碎片里的「你」（玩家第二人称）编译为 {you}，由运行时填 NPC/玩家名。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const Texts = require(path.join(ROOT, 'content/original-event-texts.js'));
const Slots = require(path.join(ROOT, 'content/original-event-slots.js'));
const OUT = path.join(ROOT, 'content/event-templates.js');
const H5_PATH = path.join(ROOT, 'content/h5-event-templates.json');

const INSIGHT =
  (Slots && Slots.INSIGHT_TEXT) || '时产生了顿悟，突破成功率增加5%';
const RESCUE =
  (Slots && Slots.RESCUE_SUFFIX) || '所救';

/** 自研事件：直接写完整模板，与原版编译结果合并（同 id 时自研覆盖）。 */
function loadH5Overrides() {
  if (!fs.existsSync(H5_PATH)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(H5_PATH, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch (err) {
    console.error('h5-event-templates.json parse failed', err.message);
    process.exitCode = 1;
    return {};
  }
}

function needsFromTemplate(template) {
  const needs = [];
  const seen = {};
  const re = /\{([a-z_]+)\}/g;
  let m;
  while ((m = re.exec(template))) {
    const key = m[1];
    if (seen[key]) continue;
    seen[key] = true;
    needs.push(key);
  }
  return needs;
}

/** 原版「你」= 玩家视角；统一成 {you}，禁止残留第二人称进大事记。 */
function injectYouPlaceholder(template) {
  if (typeof template !== 'string' || !template) return template;
  if (template.indexOf('你') < 0) return template;
  return template.split('你').join('{you}');
}

function normalizeTemplateText(template) {
  return injectYouPlaceholder(template);
}

function recipeToBranches(recipe, parts) {
  if (!Array.isArray(recipe) || !recipe.length) return null;
  if (!Array.isArray(parts) || !parts.length) return null;

  // Expand or:lo-hi into parallel branches
  let branches = [[]];
  for (let i = 0; i < recipe.length; i++) {
    const tok = recipe[i];
    if (typeof tok === 'string' && /^or:(\d+)-(\d+)$/.test(tok)) {
      const lo = RegExp.$1 | 0;
      const hi = RegExp.$2 | 0;
      const low = Math.min(lo, hi);
      const high = Math.max(lo, hi);
      const next = [];
      for (let b = 0; b < branches.length; b++) {
        for (let idx = low; idx <= high; idx++) {
          next.push(branches[b].concat([idx]));
        }
      }
      branches = next;
      continue;
    }
    for (let b = 0; b < branches.length; b++) {
      branches[b].push(tok);
    }
  }

  const templates = [];
  for (let b = 0; b < branches.length; b++) {
    const seq = branches[b];
    let out = '';
    let ok = true;
    for (let i = 0; i < seq.length; i++) {
      const tok = seq[i];
      if (typeof tok === 'number') {
        if (tok < 0 || tok >= parts.length) {
          ok = false;
          break;
        }
        out += parts[tok];
        continue;
      }
      if (tok === 'a' || tok === 'b' || tok === 'c' || tok === 'gift' ||
          tok === 'young_pet' || tok === 'pet_form' || tok === 'linggen' ||
          tok === 'office' || tok === 'baby' || tok === 'sword' ||
          tok === 'craft') {
        out += '{' + tok + '}';
        continue;
      }
      if (tok === 'insight') {
        out += INSIGHT;
        continue;
      }
      if (tok === 'rescue_suffix') {
        out += RESCUE;
        continue;
      }
      if (typeof tok === 'string' && tok.indexOf('lit:') === 0) {
        out += tok.slice(4);
        continue;
      }
      ok = false;
      break;
    }
    if (ok && out) templates.push(normalizeTemplateText(out));
  }
  return templates.length ? templates : null;
}

function compileOriginal() {
  if (typeof Texts.ensureReady === 'function') Texts.ensureReady();
  const byId = {};
  const recipeMap = Slots.recipes || {};
  Object.keys(recipeMap).forEach(function (key) {
    const recipe = Slots.recipeFor(key);
    const parts = Texts.getParts(key);
    const templates = recipeToBranches(recipe, parts);
    if (!templates || !templates.length) return;
    const needs = needsFromTemplate(templates[0]);
    // union needs across variants
    for (let i = 1; i < templates.length; i++) {
      needsFromTemplate(templates[i]).forEach(function (n) {
        if (needs.indexOf(n) < 0) needs.push(n);
      });
    }
    const row = {
      source: 'original',
      needs: needs
    };
    if (templates.length === 1) row.template = templates[0];
    else row.templates = templates;
    byId[String(key | 0)] = row;
  });
  return byId;
}

function mergeH5(byId, h5) {
  Object.keys(h5).forEach(function (key) {
    const row = h5[key];
    if (!row || typeof row !== 'object') return;
    let template = typeof row.template === 'string' ? row.template : null;
    let templates = Array.isArray(row.templates) ? row.templates.slice() : null;
    if (template) template = normalizeTemplateText(template);
    if (templates) {
      templates = templates.map(normalizeTemplateText).filter(Boolean);
      if (!templates.length) templates = null;
    }
    if (!template && !(templates && templates.length)) return;
    const needs = needsFromTemplate(template || templates[0]);
    byId[String(key)] = {
      source: 'h5',
      needs: needs,
      template: template || undefined,
      templates: templates || undefined
    };
    if (!byId[String(key)].template) delete byId[String(key)].template;
    if (!byId[String(key)].templates) delete byId[String(key)].templates;
  });
  return byId;
}

function main() {
  const byId = mergeH5(compileOriginal(), loadH5Overrides());
  const keys = Object.keys(byId).sort(function (a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
  const ordered = {};
  keys.forEach(function (k) {
    ordered[k] = byId[k];
  });

  const body = `/*
 * event-templates.js —— 统一事件文案模板（运行时只填占位符）
 * 由 tools/_build_event_templates.js 生成。
 *   - 原版：从 original-event-texts + original-event-slots 编译
 *   - 自研：编辑 content/h5-event-templates.json 后重新生成
 *
 * 占位符：{a}{b}{c}{you}{gift}{young_pet}{pet_form}{linggen}{office}{baby}{sword}{craft}{loc}
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EventTemplates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const byId = Object.freeze(${JSON.stringify(ordered, null, 2)});

  function entryFor(eventId) {
    if (eventId == null || eventId === '') return null;
    const row = byId[String(eventId)];
    return row && typeof row === 'object' ? row : null;
  }

  function templatesFor(eventId) {
    const row = entryFor(eventId);
    if (!row) return null;
    if (Array.isArray(row.templates) && row.templates.length) {
      return row.templates.slice();
    }
    if (typeof row.template === 'string' && row.template) {
      return [row.template];
    }
    return null;
  }

  function pickTemplate(eventId, random) {
    const list = templatesFor(eventId);
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    const roll = typeof random === 'function' ? random() : Math.random();
    return list[Math.floor(roll * list.length) % list.length];
  }

  function needsPeer(eventId) {
    const row = entryFor(eventId);
    if (!row || !Array.isArray(row.needs)) return false;
    return row.needs.indexOf('b') >= 0 || row.needs.indexOf('c') >= 0;
  }

  function needsGift(eventId) {
    const row = entryFor(eventId);
    if (!row || !Array.isArray(row.needs)) return false;
    return row.needs.indexOf('gift') >= 0;
  }

  function fillTemplate(template, values) {
    if (typeof template !== 'string' || !template) return null;
    const v = values && typeof values === 'object' ? values : {};
    let out = template;
    const re = /\{([a-z_]+)\}/g;
    let missing = false;
    out = out.replace(re, function (_m, key) {
      const val = v[key];
      if (val == null || val === '') {
        missing = true;
        return '';
      }
      return String(val);
    });
    return missing ? null : out;
  }

  function has(eventId) {
    return !!entryFor(eventId);
  }

  return Object.freeze({
    byId: byId,
    entryFor: entryFor,
    templatesFor: templatesFor,
    pickTemplate: pickTemplate,
    needsPeer: needsPeer,
    needsGift: needsGift,
    fillTemplate: fillTemplate,
    has: has
  });
});
`;

  fs.writeFileSync(OUT, body, 'utf8');
  const originalCount = keys.filter(function (k) {
    return byId[k].source === 'original';
  }).length;
  const h5Count = keys.filter(function (k) {
    return byId[k].source === 'h5';
  }).length;
  console.log(
    'wrote', OUT,
    'total=', keys.length,
    'original=', originalCount,
    'h5=', h5Count
  );
}

main();
