# -*- coding: utf-8 -*-
"""Pin remaining: dns calendar, mday creators, doevent events-list, level props, creatpersonf calls via MethodInfo."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
DELTA = 0x400

# --- dns.init len-13 ---
print("=== dns.init region InitArray len13 @0x13be020 ===")
for pc in range(0x13BE000, 0x13BE080, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    s = None
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        s = f"MOVZ w{rd},#{imm}"
    elif (w & 0xFFC00000) == 0xF9000000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        s = f"STR x{rt},[x{rn},#{hex(imm)}]"
    elif (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        s = f"LDR x{rt},[x{rn},#{hex(imm)}]"
    elif (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        s = f"ADRP x{rd},{hex(page)}"
    elif (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        s = f"BL {hex(pc + (imm << 2))}"
    elif (w & 0xFFC00000) == 0x91000000:
        rd, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = (w >> 10) & 0xFFF
        if (w >> 22) & 1:
            imm <<= 12
        s = f"ADD x{rd},x{rn},#{imm}"
    if s:
        print(hex(pc), s)

# --- Find ALL stores that write to root instance +0x148 via ADD xN, xThis, #0x148 then STR ---
print("\n=== ADD #0x148 / #328 then nearby STR (alt mday store) ===")
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    # ADD xd, xn, #328 (0x148)
    if (w & 0xFFC00000) == 0x91000000:
        imm = (w >> 10) & 0xFFF
        if (w >> 22) & 1:
            imm <<= 12
        if imm == 0x148:
            print(hex(pc), f"ADD x{w&0x1F},x{(w>>5)&0x1F},#0x148")

# --- MethodInfo table around 0x4eb690: decode neighboring method ptrs ---
print("\n=== MethodInfo ptr cluster around dayevent ===")
# script.json said dayevent ptr at file? We found SO offset = 0x4eb690 - DELTA = 0x4eb290?
# Earlier search used SO.find(pat) and reported hex(i+DELTA) so VA-like 0x4eb690
base = 0x4EB690 - DELTA
for i in range(-0x40, 0x80, 8):
    off = base + i
    if off < 0:
        continue
    v = struct.unpack_from("<Q", SO, off)[0]
    print(hex(off + DELTA), hex(v))

# --- Search invoke patterns: load MethodInfo then BL il2cpp_runtime_invoke ---
# Find xrefs TO methodinfo addresses (literal pools containing RVA)
print("\n=== pointers to MethodInfo slots (who references dayevent MI) ===")
# The value at 0x4eb690 is the method RVA 0x13ed240 as uint32 in a MethodInfo struct
# Search for references to address 0x4eb690 (as ADRP+ADD target)
mi_va = 0x4EB690
hits = []
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        if page != (mi_va & ~0xFFF):
            continue
        # look ahead for ADD with page offset
        for k in range(1, 5):
            w2 = struct.unpack_from("<I", SO, off + 4 * k)[0]
            if (w2 & 0xFFC00000) != 0x91000000:
                continue
            if ((w2 >> 5) & 0x1F) != rd:
                continue
            imm12 = (w2 >> 10) & 0xFFF
            if (w2 >> 22) & 1:
                imm12 <<= 12
            if page + imm12 == mi_va:
                hits.append(pc)
                break
print("ADRP+ADD to dayevent MI:", [hex(h) for h in hits[:20]], "count", len(hits))

# --- doevent: does it touch events List (0x80)? ---
print("\n=== doevent field touches ===")
rva0, end = 0x13FA734, 0x13FA734 + 0x14B8
for off in range(rva0 - DELTA, end - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    if (w & 0xFFC00000) in (0xF9400000, 0xF9000000):
        imm = ((w >> 10) & 0xFFF) * 8
        if imm in (0x80, 0x148, 0xE8, 0x198, 0x1A8, 0x110):
            op = "LDR" if (w & 0xFFC00000) == 0xF9400000 else "STR"
            names = {
                0x80: "events",
                0x148: "mday",
                0xE8: "persons",
                0x198: "loglist",
                0x1A8: "hislist",
                0x110: "historylistall",
            }
            print(hex(pc), op, names[imm])

# --- dayevent field touches ---
print("\n=== dayevent field touches ===")
rva0, end = 0x13ED240, 0x13ED240 + 0x1F38
for off in range(rva0 - DELTA, end - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    if (w & 0xFFC00000) in (0xF9400000, 0xF9000000):
        imm = ((w >> 10) & 0xFFF) * 8
        if imm in (0x80, 0x148, 0xE8, 0x198, 0x1A8, 0xD8, 0xE0):
            op = "LDR" if (w & 0xFFC00000) == 0xF9400000 else "STR"
            names = {
                0x80: "events",
                0x148: "mday",
                0xE8: "persons",
                0x198: "loglist",
                0x1A8: "hislist",
                0xD8: "persons4",
                0xE0: "persons3",
            }
            print(hex(pc), op, names[imm])

# --- level_l property getters RVA ---
print("\n=== level/exp property RVAs ===")
for pat in [
    r"person.*\n(?:.*\n){0,5}?\t// RVA: (0x[0-9A-F]+).*?\n\tpublic int get_level_l",
    r"// RVA: (0x[0-9A-F]+).*?\n\tpublic int get_level_l\(\)",
]:
    pass

for name in [
    "get_level_l",
    "set_level_l",
    "get_level_s",
    "set_level_s",
    "get_exp",
    "set_exp",
    "get_exp1",
    "set_exp1",
]:
    mm = re.search(rf'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"person\$\${name}"', RAW)
    if mm:
        print(name, hex(int(mm.group(1))))
    else:
        mm2 = re.search(rf'// RVA: (0x[0-9A-F]+).*?\n\tpublic .+ {name}\(', DUMP)
        # too broad
        print(name, "search dump...")

# From dump.cs near person properties
for m in re.finditer(
    r"// RVA: (0x[0-9A-F]+) Offset:.*?\n\tpublic (?:int|float|void) (get_level_l|set_level_l|get_level_s|set_level_s|get_exp|set_exp|get_exp1|set_exp1)\(",
    DUMP,
):
    print(m.group(2), m.group(1))

# --- level_exp1max static field loads ---
print("\n=== level_exp1max static offset 0x160 loads ===")
# dns static_fields + 0x160
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFFC00000) != 0xF9400000:
        continue
    if ((w >> 10) & 0xFFF) * 8 != 0x160:
        continue
    pc = off + DELTA
    # classify enclosing roughly
    print(hex(pc))

# --- creatpersonf: dump param default usage from prologue CMP/MOV ---
print("\n=== creatperson signature from metadata nearby strings ===")
idx = META.find(b"creatpersonf\x00")
print("meta", hex(idx), META[idx - 40 : idx + 80])

# --- Confirm calendar blob used in dns via Field$ at 0x13be020 ---
print("\n=== InitArray field handle at 0x13be020 site ===")
for pc in range(0x13BDFE0, 0x13BE070, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        print(hex(pc), f"ADRP x{rd},{hex(page)}")
    if (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        print(hex(pc), f"LDR x{rt},[x{rn},#{hex(imm)}] => maybe {hex(0)} ")
