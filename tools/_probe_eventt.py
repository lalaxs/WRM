# -*- coding: utf-8 -*-
import json
import re
import collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads(
    (ROOT / "tools/il2cpp_input/apk_extract/unity_dump/TextAsset_af_26.txt")
    .read_text(encoding="utf-8")
)
keys = [k for k in data if k.startswith("eventt")]
print("eventt2290 in data", "eventt2290" in data, data.get("eventt2290"))
print("eventt4960 in data", "eventt4960" in data, data.get("eventt4960"))

by_base = collections.defaultdict(list)
for k in keys:
    suf = k[len("eventt") :]
    if not suf.isdigit():
        continue
    # 最长前缀匹配 npclog：后缀末位为变体号
    if len(suf) >= 2:
        by_base[suf[:-1]].append((suf[-1], data[k]))
    by_base[suf].append(("*", data[k]))

src = (ROOT / "core/dns.js").read_text(encoding="utf-8")
i = src.find("npclog:")
lb = src.find("[", i)
rb = src.find("]", lb)
npclog = [int(x) for x in re.findall(r"\d+", src[lb:rb])]
print("npclog", len(npclog), "unique", len(set(npclog)))

hit = 0
for eid in sorted(set(npclog)):
    if str(eid) in by_base:
        hit += 1
print("coverage by strip-last", hit, "/", len(set(npclog)))

for eid in [229, 230, 496, 497, 172, 216, 39, 38]:
    parts = sorted(by_base.get(str(eid), []), key=lambda x: x[0])
    print("---", eid, "n=", len(parts))
    for v, t in parts[:8]:
        print(" ", v, t[:100])
