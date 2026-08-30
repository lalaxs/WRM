# -*- coding: utf-8 -*-
"""Find code that loads dns.fami_act1day (static+0x100) or jobmax (+0x248)."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
DELTA = 0x400

# LDR Xt, [Xn, #256] = F9408000 | Rn<<5 | Rt  where imm12=32 because 32*8=256
# imm12 = 256/8 = 32 = 0x20
# encoding: 11 111 00101 imm12 Rn Rt = 0xF9400000 | (32<<10) | (Rn<<5) | Rt
# = 0xF9408000 | (Rn<<5) | Rt

# LDR Xt,[Xn,#584] for jobmax 0x248: imm12=584/8=73=0x49
# 0xF9400000 | (73<<10) | ...

patterns = {
    "fami_act1day+0x100": 0xF9408000,  # base with imm=32; need mask imm
    "jobmax+0x248": 0xF9400000 | (73 << 10),
    "act4day via add?": None,
}

# Scan executable region roughly 0x13B0000-0x1500000 file offs
start, end = 0x13B0000, 0x1500000
hits = {k: [] for k in ("fami256", "job584", "feel264", "yang232")}

for off in range(start, min(end, len(SO) - 4), 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFFC00000) != 0xF9400000:
        continue
    imm = ((w >> 10) & 0xFFF) * 8
    rn = (w >> 5) & 0x1F
    rt = w & 0x1F
    rva = off + DELTA
    if imm == 256:
        hits["fami256"].append((hex(rva), rn, rt))
    elif imm == 584:
        hits["job584"].append((hex(rva), rn, rt))
    elif imm == 264:
        hits["feel264"].append((hex(rva), rn, rt))
    elif imm == 232:
        hits["yang232"].append((hex(rva), rn, rt))

for k, v in hits.items():
    print(k, "count", len(v), "sample", v[:15])

# Disassemble around first few fami256 hits
print("\n=== context around fami_act1day loads ===")
for rva_s, rn, rt in hits["fami256"][:8]:
    rva = int(rva_s, 16)
    off = rva - DELTA
    print(f"\n-- at {rva_s} LDR x{rt},[x{rn},#256]")
    for i in range(-16, 48, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, off + i)[0]
        # compact
        if (w & 0x7F800000) == 0x52800000:
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            print(f"  {hex(pc)} MOVZ w{w&0x1F},#{imm}")
        elif (w & 0x7F80001F) == 0x7100001F:
            print(f"  {hex(pc)} CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}")
        elif (w & 0x7FE0FC00) == 0x6B00001F:
            print(f"  {hex(pc)} CMP w{(w>>5)&0x1F},w{(w>>16)&0x1F}")
        elif (w & 0xFFC00000) == 0xF9400000:
            imm = ((w >> 10) & 0xFFF) * 8
            print(f"  {hex(pc)} LDR x{w&0x1F},[x{(w>>5)&0x1F},#{imm}]")
        elif (w & 0xFFC00000) == 0xB9400000:
            imm = ((w >> 10) & 0xFFF) * 4
            print(f"  {hex(pc)} LDR w{w&0x1F},[x{(w>>5)&0x1F},#{imm}]")
        elif (w & 0xFC000000) == 0x94000000:
            imm = w & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            print(f"  {hex(pc)} BL {hex(pc+(imm<<2))}")
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            print(f"  {hex(pc)} RET")
