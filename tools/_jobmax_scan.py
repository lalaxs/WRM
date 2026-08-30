# -*- coding: utf-8 -*-
"""Map array inits around jobmax store and fami_act1day field handle."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()
DELTA = 0x400


def scan_method(rva: int, end: int, label: str) -> None:
    print(f"\n==== {label} {hex(rva)}..{hex(end)} ====")
    off = rva - DELTA
    last_len = None
    pending = None
    for i in range(0, end - rva, 4):
        w = struct.unpack_from("<I", SO, off + i)[0]
        pc = rva + i
        if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
            last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        if (w & 0xFC000000) == 0x94000000:
            imm = w & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            tgt = pc + (imm << 2)
            if tgt == 0x1EBDCAC and last_len is not None:
                pending = last_len
                print(hex(pc), "InitArray len", last_len)
        if (w & 0xFFC00000) == 0xF9000000:
            imm = ((w >> 10) & 0xFFF) * 8
            if 0x200 <= imm <= 0x300 or imm in (256, 264, 272, 584, 592, 560, 568, 576):
                print(hex(pc), f"STR x,[xn,#{imm}] pending_len={pending}")
        if (w & 0xFFC00000) == 0xF8000000 and ((w >> 10) & 3) in (1, 3):
            imm9 = (w >> 12) & 0x1FF
            if imm9 & 0x100:
                imm9 -= 0x200
            if 0xB0 <= abs(imm9) <= 0x300:
                print(hex(pc), f"STRidx #{imm9} pending_len={pending}")


scan_method(0x13BECC4, 0x13BEF04, "rereward")
scan_method(0x13BDD78, 0x13BE288, "dns.init full to next")

# For fami_act1day: decode field handle load path - after ArrayNew, which ADRP/LDR feeds x1
# At 0x13bdf38: LDR x1,[x27,#0]; x27 from 0x2b1c670
# Check if 0x2b1c670 appears in a usage list near CodeRegistration

# Match by comparing Field$ token order in dns.init's local metadata usage
# Read instructions that load field handles in init - the ADRP+LDR targets that are NOT zero on disk

print("\n=== non-zero loads from 0x2b1c/0x2b1d in dns.init ===")
rva, end = 0x13BDD78, 0x13BE288
off0 = rva - DELTA
for i in range(0, end - rva, 4):
    w = struct.unpack_from("<I", SO, off0 + i)[0]
    pc = rva + i
    if (w & 0x9F000000) != 0x90000000:
        continue
    rd = w & 0x1F
    immlo = (w >> 29) & 3
    immhi = (w >> 5) & 0x7FFFF
    imm = (immhi << 2) | immlo
    if imm & (1 << 20):
        imm -= 1 << 21
    page = (pc & ~0xFFF) + (imm << 12)
    # next LDR
    if i + 4 >= end - rva:
        continue
    w2 = struct.unpack_from("<I", SO, off0 + i + 4)[0]
    if (w2 & 0xFFC00000) == 0xF9400000 and ((w2 >> 5) & 0x1F) == rd:
        imm12 = ((w2 >> 10) & 0xFFF) * 8
        addr = page + imm12
        foff = addr  # try as file offset directly and as VA-DELTA
        for d, label in ((0, "va=file"), (DELTA, "va-delta")):
            fo = addr - d
            if 0 <= fo < len(SO) - 8:
                val = struct.unpack_from("<Q", SO, fo)[0]
                if val != 0:
                    print(hex(pc), "->", hex(addr), label, "val", hex(val))
