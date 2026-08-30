# -*- coding: utf-8 -*-
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
DELTA = 0x400

methods = []
for m in re.finditer(r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"root\$\$([^"]+)"', RAW):
    methods.append((int(m.group(1)), m.group(2)))
methods.sort()


def enc(pc: int) -> str:
    prev = ("?", 0)
    for rva, name in methods:
        if rva > pc:
            break
        prev = (name, rva)
    return f"{prev[0]}@{hex(prev[1])}"


print("=== npclog handle 0x2b1c788 loads ===")
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFFC00000) != 0xF9400000:
        continue
    if ((w >> 10) & 0xFFF) * 8 != 0x788:
        continue
    pc = off + DELTA
    for k in range(1, 4):
        w2 = struct.unpack_from("<I", SO, off - 4 * k)[0]
        pc2 = pc - 4 * k
        if (w2 & 0x9F000000) == 0x90000000:
            immlo = (w2 >> 29) & 3
            immhi = (w2 >> 5) & 0x7FFFF
            imm = (immhi << 2) | immlo
            if imm & (1 << 20):
                imm -= 1 << 21
            page = (pc2 & ~0xFFF) + (imm << 12)
            if page == 0x2B1C000:
                print(hex(pc), enc(pc))
                break

print("=== BL into creatpersonf body ===")
r0, ln = 0x13EF9CC, 0x408
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    tgt = pc + (imm << 2)
    if r0 <= tgt < r0 + ln:
        hits.append((pc, tgt))
print("count", len(hits))
for pc, tgt in hits[:25]:
    print(hex(pc), enc(pc), "->", hex(tgt))

print("=== BL into creatperson from addday/dayevent ===")
r0, ln = 0x13F0150, 0x16E4
hits = []
for off in range(0x13E9948 - DELTA, 0x13EF178 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    tgt = pc + (imm << 2)
    if r0 <= tgt < r0 + ln:
        hits.append((pc, tgt))
print("count", len(hits))
for pc, tgt in hits[:20]:
    print(hex(pc), enc(pc), "->", hex(tgt))

print("=== BL into creatpersonfr/en/b/m from addday/dayevent ===")
ranges = [
    ("fr", 0x13F21D4, 0x16C),
    ("en", 0x13F1F3C, 0x1D8),
    ("b", 0x13F2430, 0x284),
    ("m", 0x13F1834, 0x708),
    ("f", 0x13EF9CC, 0x408),
    ("doevent", 0x13FA734, 0x14B8),
    ("randomlevel", 0x13EF824, 0x1A8),
    ("cans", 0x13F892C, 0x104),
    ("getpe", 0x142DD74, 0x400),
]
for name, r0, ln in ranges:
    hits = []
    for off in range(0x13E9948 - DELTA, 0x13EF178 - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        if (w & 0xFC000000) != 0x94000000:
            continue
        pc = off + DELTA
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        tgt = pc + (imm << 2)
        if r0 <= tgt < r0 + ln:
            hits.append((pc, tgt))
    print(name, len(hits), [(hex(a), hex(b)) for a, b in hits[:5]])

print("=== doevent small immediates 1..30 and event-like ===")
small = {}
big = set()
for i in range(0, 0x14B8, 4):
    pc = 0x13FA734 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x7F800000) == 0x52800000:
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        if imm <= 30:
            small[imm] = small.get(imm, 0) + 1
        if 30 <= imm <= 600:
            big.add(imm)
print("small", small)
print("big", sorted(big))

# dns.exp int[] at 0x230 - player cultivation curve?
print("\n=== note dns.exp @0x230 and level_exp1max @0x160 ===")
# Find BSS for level_exp1max by scanning dns.init stores to +0x160
rva0 = 0x13BDD78
for i in range(0, 0x600, 4):
    pc = rva0 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFFC00000) == 0xF9000000:
        imm = ((w >> 10) & 0xFFF) * 8
        if imm == 0x160:
            print("dns.init STR +0x160 at", hex(pc))
    if (w & 0xFFC00000) == 0xF8000000:
        op = (w >> 10) & 3
        if op in (1, 3):
            imm9 = (w >> 12) & 0x1FF
            if imm9 & 0x100:
                imm9 -= 0x200
            if imm9 == 0x160:
                print("dns.init STR idx +0x160 at", hex(pc))
