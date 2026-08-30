# -*- coding: utf-8 -*-
from __future__ import annotations

import re
from pathlib import Path

raw = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\script.json").read_text(encoding="utf-8")
i = raw.find('"ScriptMetadata"')
j = raw.find('"ScriptMetadataMethod"')
print("ScriptMetadata at", i, "ScriptMetadataMethod at", j)
chunk = raw[i:j]
print("chunk len", len(chunk))
addrs = [int(m.group(1)) for m in re.finditer(r'"Address"\s*:\s*(\d+)', chunk)]
print("count", len(addrs))
if addrs:
    print("min", hex(min(addrs)), "max", hex(max(addrs)))
    print("sample", [hex(a) for a in addrs[:15]])

pat = re.compile(r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"([^"]+)"')
interesting = []
for m in pat.finditer(chunk):
    name = m.group(2)
    low = name.lower()
    if (
        "dns" in low
        or "fieldrva" in low
        or "privateimplementation" in low
        or "fami_act" in low
        or "jobmax" in low
        or "$$field" in low
    ):
        interesting.append((int(m.group(1)), name))
print("interesting", len(interesting))
for a, n in interesting[:50]:
    print(hex(a), n)

# Also scan whole file for PrivateImplementation
print("\nwhole-file PrivateImplementation count", raw.lower().count("privateimplementation"))
print("whole-file jobmax", raw.count("jobmax"))
print("whole-file fami_act1day", raw.count("fami_act1day"))
