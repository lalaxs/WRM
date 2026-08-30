# -*- coding: utf-8 -*-
"""Find LDRS/STRS to slove/dlove/slust/dlust/desire across game methods."""
from __future__ import annotations

import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
OFF = 0x4000
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
by_addr = {m["Address"]: m for m in SJ["ScriptMethod"]}
addrs = sorted(by_addr)


def method_len(addr: int) -> int:
    i = addrs.index(addr)
    return (addrs[i + 1] if i + 1 < len(addrs) else addr + 0x1000) - addr


TARGETS = {
    0x34: "slove",
    0x38: "slust",
    0x44: "dlove",
    0x48: "dlust",
    0xD4: "desire",
    0xE8: "_feel",
    0xEC: "_love",
    0xF0: "_lust",
}

# Scan only Assembly-CSharp-ish range: root/person methods ~0x13ba000-0x1440000
LO, HI = 0x13BA000, 0x1445000
hits = {name: [] for name in TARGETS.values()}

for m in SJ["ScriptMethod"]:
    va = m["Address"]
    if not (LO <= va < HI):
        continue
    size = min(method_len(va), 0x30000)
    data = SO[va - OFF : va - OFF + size]
    for i in range(0, size, 4):
        insn = struct.unpack_from("<I", data, i)[0]
        top = insn & 0xFFC00000
        if top not in (0xBD400000, 0xBD000000):  # LDRS / STRS
            continue
        off = ((insn >> 10) & 0xFFF) * 4
        if off not in TARGETS:
            continue
        op = "LDRS" if top == 0xBD400000 else "STRS"
        name = TARGETS[off]
        hits[name].append((hex(va + i), op, m["Name"]))

for name, lst in hits.items():
    print(f"\n=== {name} float touches n={len(lst)} ===")
    # summarize by method
    bym = {}
    for pc, op, meth in lst:
        bym.setdefault(meth, {"LDRS": 0, "STRS": 0, "pcs": []})
        bym[meth][op] += 1
        if len(bym[meth]["pcs"]) < 3:
            bym[meth]["pcs"].append(f"{pc}:{op}")
    for meth, info in sorted(bym.items(), key=lambda x: -(x[1]["LDRS"] + x[1]["STRS"]))[:25]:
        print(f"  {meth} LDRS={info['LDRS']} STRS={info['STRS']} eg={info['pcs']}")

# Who references string 'eventt' - find in stringliteral and xref is hard; instead find methods that call il2cpp string concat near doevent
print("\n=== doevent BL unique callees ===")
doe = next(m for m in SJ["ScriptMethod"] if m["Name"].endswith("doevent"))
va = doe["Address"]
size = method_len(va)
data = SO[va - OFF : va - OFF + size]
cals = {}
for i in range(0, size, 4):
    insn = struct.unpack_from("<I", data, i)[0]
    if (insn & 0xFC000000) != 0x94000000:
        continue
    imm26 = insn & 0x3FFFFFF
    if imm26 & (1 << 25):
        imm26 -= 1 << 26
    t = (va + i) + imm26 * 4
    nm = by_addr.get(t, {}).get("Name", f"?@{hex(t)}")
    cals[nm] = cals.get(nm, 0) + 1
for nm, n in sorted(cals.items(), key=lambda x: -x[1]):
    print(n, nm)

# Look for showinfo / showevent / reevent that might build text
print("\n=== methods with 'event' in name (root) ===")
for m in SJ["ScriptMethod"]:
    if "$$" not in m["Name"]:
        continue
    cls, short = m["Name"].split("$$", 1)
    if cls != "root":
        continue
    if "event" in short.lower() or short in ("showinfo", "showinfo0", "addinfohistory", "getstring", "restring"):
        print(hex(m["Address"]), short, hex(method_len(m["Address"])))
