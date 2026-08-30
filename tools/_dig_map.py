# -*- coding: utf-8 -*-
"""Accurate method map from script.json + verify addday->dayevent calls + doevent temp usage."""
from __future__ import annotations

import json
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
DELTA = 0x400

# Parse all root$$ methods with addresses
methods = []
for m in re.finditer(r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"root\$\$([^"]+)"', RAW):
    methods.append((int(m.group(1)), m.group(2)))
methods.sort()
print("root methods", len(methods))

# Build size map
sizes = {}
for i, (rva, name) in enumerate(methods):
    nxt = methods[i + 1][0] if i + 1 < len(methods) else rva + 0x1000
    sizes[rva] = (name, nxt - rva)


def enclosing(pc: int) -> str:
    prev = ("?", 0, 0)
    for rva, name in methods:
        if rva > pc:
            break
        prev = (name, rva, sizes[rva][1])
    return f"{prev[0]}@{hex(prev[1])}(+{hex(prev[2])})"


# Print methods near dayevent
print("\n=== methods near dayevent/doevent/randomlevel ===")
for rva, name in methods:
    if 0x13E9000 <= rva <= 0x13FC000:
        print(hex(rva), name, "len", hex(sizes[rva][1]))

# addday BL targets with accurate enclosing
print("\n=== addday BL -> accurate ===")
rva0 = 0x13E9948
_, addday_len = sizes[rva0][0], sizes[rva0][1]
# find addday size from map
for rva, name in methods:
    if name == "addday" and rva == 0x13E9948:
        addday_len = sizes[rva][1]
seen = {}
for i in range(0, addday_len, 4):
    pc = rva0 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    tgt = pc + (imm << 2)
    if 0x13B0000 <= tgt <= 0x1500000:
        seen.setdefault(tgt, []).append(pc)
for tgt, pcs in sorted(seen.items()):
    print(hex(tgt), enclosing(tgt), "from", [hex(p) for p in pcs[:3]])

# dayevent BL targets
print("\n=== dayevent BL -> accurate ===")
day_rva = 0x13ED240
day_len = sizes[day_rva][1]
print("dayevent len", hex(day_len), enclosing(day_rva))
seen = {}
for i in range(0, day_len, 4):
    pc = day_rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    tgt = pc + (imm << 2)
    if 0x13B0000 <= tgt <= 0x1500000:
        seen.setdefault(tgt, []).append(pc)
for tgt, pcs in sorted(seen.items()):
    enc = enclosing(tgt)
    # filter noise? print all root methods
    if "root" in enc or True:
        name = enc.split("@")[0]
        if name not in ("?",):
            print(hex(tgt), enc, "x", len(pcs))

# Who calls doevent entry specifically
print("\n=== BL to doevent entry 0x13fa734 ===")
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    if pc + (imm << 2) == 0x13FA734:
        hits.append(pc)
print([hex(h) for h in hits], [enclosing(h) for h in hits])

print("\n=== BL to dayevent entry 0x13ed240 ===")
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    if pc + (imm << 2) == 0x13ED240:
        hits.append(pc)
print([hex(h) for h in hits], [enclosing(h) for h in hits])

print("\n=== BL to randomlevel entry ===")
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    if pc + (imm << 2) == 0x13EF824:
        hits.append(pc)
print([hex(h) for h in hits], [enclosing(h) for h in hits])

print("\n=== BL to creatpersonf entry ===")
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    if pc + (imm << 2) == 0x13EF9CC:
        hits.append(pc)
print([hex(h) for h in hits], [enclosing(h) for h in hits])

# Context around addday's calls into dayevent range
print("\n=== addday call sites into dayevent range ===")
for tgt, pcs in sorted(seen.items()) if False else []:
    pass
# recompute addday targets in dayevent range
for i in range(0, addday_len, 4):
    pc = rva0 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    tgt = pc + (imm << 2)
    if day_rva <= tgt < day_rva + day_len:
        print("from", hex(pc), "->", hex(tgt), enclosing(tgt))
        # ctx
        for p in range(pc - 0x20, pc + 0x10, 4):
            w2 = struct.unpack_from("<I", SO, p - DELTA)[0]
            if (w2 & 0x7F800000) == 0x52800000:
                rd = w2 & 0x1F
                immv = ((w2 >> 5) & 0xFFFF) << (((w2 >> 21) & 3) * 16)
                print(" ", hex(p), f"MOVZ w{rd},#{immv}")
            if (w2 & 0xFC000000) == 0x94000000:
                imm2 = w2 & 0x3FFFFFF
                if imm2 & (1 << 25):
                    imm2 -= 1 << 26
                print(" ", hex(p), f"BL {hex(p+(imm2<<2))}")

# doevent: first loads of temp[0] - parameter is in x1 typically for instance method
print("\n=== doevent first 0x80 bytes raw interesting ===")
for i in range(0, 0x100, 4):
    pc = 0x13FA734 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        immv = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        print(hex(pc), f"MOVZ w{rd},#{immv}")
    if (w & 0xFFC00000) == 0xB9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        immv = ((w >> 10) & 0xFFF) * 4
        print(hex(pc), f"LDR w{rt},[x{rn},#{immv}]")
    if (w & 0x7F80001F) == 0x7100001F:
        print(hex(pc), f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}")

# Check GetString method - events STR there suggests encrypted resource loading
print("\n=== GetString method info ===")
for rva, name in methods:
    if "GetString" in name or name == "GetString":
        print(hex(rva), name, hex(sizes[rva][1]))

# Look at H5 npc-simulation level_exp1max usage for comparison later
print("\ndone")
