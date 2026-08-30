# -*- coding: utf-8 -*-
"""从 APK data.unity3d 的 TextAsset `af` 抽出职位/事件文案，写入 content/。"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AF_PATH = ROOT / "tools/il2cpp_input/apk_extract/unity_dump/TextAsset_af_26.txt"
DNS_JS = ROOT / "core/dns.js"
OUT_JOBS = ROOT / "content/original-jobs.js"
OUT_EVENTS = ROOT / "content/original-event-texts.js"
OUT_JSON = ROOT / "tools/il2cpp_output/af-extracted.json"


def load_af() -> dict:
    return json.loads(AF_PATH.read_text(encoding="utf-8"))


def load_npclog() -> list[int]:
    src = DNS_JS.read_text(encoding="utf-8")
    start = src.find("npclog:")
    lb = src.find("[", start)
    rb = src.find("]", lb)
    return [int(x) for x in re.findall(r"\d+", src[lb:rb])]


def collect_event_parts(data: dict) -> dict[str, list[str]]:
    """eventt{id}{variantDigit} → parts[id] = [v0, v1, ...]（按变体号排序拼接）。"""
    buckets: dict[str, dict[int, str]] = {}
    for key, val in data.items():
        if not key.startswith("eventt") or not isinstance(val, str):
            continue
        suf = key[len("eventt") :]
        if not suf.isdigit() or len(suf) < 2:
            # eventt0 这类极少，忽略或整段挂 id
            if suf.isdigit():
                buckets.setdefault(str(int(suf)), {})[0] = val
            continue
        eid = str(int(suf[:-1]))
        variant = int(suf[-1])
        buckets.setdefault(eid, {})[variant] = val
    out: dict[str, list[str]] = {}
    for eid, variants in buckets.items():
        parts = [variants[i] for i in sorted(variants)]
        out[eid] = parts
    return out


def main() -> None:
    data = load_af()
    npclog = load_npclog()

    fami: dict[str, str] = {}
    jobs: dict[str, dict[str, str]] = {}
    for key, val in data.items():
        if not isinstance(val, str):
            continue
        m = re.fullmatch(r"fami(\d+)", key)
        if m:
            fami[m.group(1)] = val
            continue
        m = re.fullmatch(r"job(\d+)_(\d+)", key)
        if m:
            jobs.setdefault(m.group(1), {})[m.group(2)] = val

    leaders: dict[str, str] = {}
    for fami_id, table in jobs.items():
        max_job = max(int(j) for j in table)
        leaders[fami_id] = table[str(max_job)]

    parts_by_id = collect_event_parts(data)
    # 拼接全文便于查表
    text_by_id = {eid: "".join(parts) for eid, parts in parts_by_id.items()}

    covered = [eid for eid in sorted(set(npclog)) if str(eid) in text_by_id]
    missing = [eid for eid in sorted(set(npclog)) if str(eid) not in text_by_id]

    payload = {
        "source": "APK data.unity3d TextAsset af (简体)",
        "fami": fami,
        "jobs": jobs,
        "leaders": leaders,
        "eventPartsById": parts_by_id,
        "eventTextById": text_by_id,
        "npclogCovered": covered,
        "npclogMissing": missing,
        "level_l": {k: data[k] for k in sorted(data) if k.startswith("level_l")},
        "level_s": {k: data[k] for k in sorted(data) if k.startswith("level_s")},
        "acts": {k: data[k] for k in sorted(data) if re.fullmatch(r"act\d+", k)},
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    jobs_js = """/*
 * original-jobs.js —— 原版职位/家族名（APK TextAsset af）
 * rejob(fami,job) ≈ jobs[fami][job]；releader(fami) ≈ leaders[fami]
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalJobs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const famiNames = Object.freeze(%s);
  const jobs = Object.freeze(%s);
  const leaders = Object.freeze(%s);

  function rejob(fami, job) {
    const ft = jobs[String(fami | 0)];
    if (!ft) return null;
    const title = ft[String(job | 0)];
    return typeof title === 'string' ? title : null;
  }

  function releader(fami) {
    const title = leaders[String(fami | 0)];
    return typeof title === 'string' ? title : null;
  }

  function famiName(fami) {
    const name = famiNames[String(fami | 0)];
    return typeof name === 'string' ? name : null;
  }

  return Object.freeze({
    famiNames: famiNames,
    jobs: jobs,
    leaders: leaders,
    rejob: rejob,
    releader: releader,
    famiName: famiName
  });
});
""" % (
        json.dumps(fami, ensure_ascii=False, indent=2),
        json.dumps(jobs, ensure_ascii=False, indent=2),
        json.dumps(leaders, ensure_ascii=False, indent=2),
    )
    OUT_JOBS.write_text(jobs_js, encoding="utf-8")

    events_js = """/*
 * original-event-texts.js —— 原版事件文案（APK af 的 eventt{id}{variant}）
 * get(eventId) 按变体号拼接；缺表时返回 null，由 H5 模板兜底。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalEventTexts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const partsById = Object.freeze(%s);
  const byId = Object.freeze(%s);

  function get(eventId) {
    if (eventId == null || eventId === '') return null;
    const text = byId[String(eventId | 0)];
    return typeof text === 'string' && text.length ? text : null;
  }

  function getParts(eventId) {
    if (eventId == null || eventId === '') return null;
    const parts = partsById[String(eventId | 0)];
    return Array.isArray(parts) ? parts.slice() : null;
  }

  return Object.freeze({
    byId: byId,
    partsById: partsById,
    get: get,
    getParts: getParts,
    count: Object.keys(byId).length
  });
});
""" % (
        json.dumps(parts_by_id, ensure_ascii=False, indent=2),
        json.dumps(text_by_id, ensure_ascii=False, indent=2),
    )
    OUT_EVENTS.write_text(events_js, encoding="utf-8")

    print("fami", len(fami), "jobs", len(jobs))
    print("events", len(text_by_id), "npclog", len(covered), "/", len(set(npclog)))
    print("missing", missing)
    print("wrote", OUT_JOBS.name, OUT_EVENTS.name, OUT_JSON.name)


if __name__ == "__main__":
    main()
