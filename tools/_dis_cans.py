# -*- coding: utf-8 -*-
"""Disassemble cans / scan for fami_act1day & jobmax usage immediates."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
DELTA = 0x400


def dis(rva: int, size: int, label: str) -> None:
    print(f"\n==== {label} {hex(rva)} ====")
    off = rva - DELTA
    for i in range(0, size, 4):
        w = struct.unpack_from("<I", SO, off + i)[0]
        pc = rva + i
        s = None
        if (w & 0x7F800000) == 0x52800000:
            rd = w & 0x1F
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            s = f"MOVZ w{rd},#{imm}"
        elif (w & 0x7F800000) == 0x72800000:
            rd = w & 0x1F
            imm = (w >> 5) & 0xFFFF
            hw = (w >> 21) & 3
            s = f"MOVK w{rd},#{imm} LSL{hw*16}"
        elif (w & 0x9F000000) == 0x90000000:
            rd = w & 0x1F
            immlo = (w >> 29) & 3
            immhi = (w >> 5) & 0x7FFFF
            imm = (immhi << 2) | immlo
            if imm & (1 << 20):
                imm -= 1 << 21
            page = (pc & ~0xFFF) + (imm << 12)
            s = f"ADRP x{rd},{hex(page)}"
        elif (w & 0xFFC00000) == 0xF9400000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 8
            s = f"LDR x{rt},[x{rn},#{imm}]"
        elif (w & 0xFFC00000) == 0xB9400000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 4
            s = f"LDR w{rt},[x{rn},#{imm}]"
        elif (w & 0xFFC00000) == 0x39400000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            s = f"LDRB w{rt},[x{rn},#{imm}]"
        elif (w & 0xFC000000) == 0x94000000:
            imm = w & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            s = f"BL {hex(pc + (imm << 2))}"
        elif (w & 0xFF000010) == 0x54000000:
            imm = (w >> 5) & 0x7FFFF
            if imm & 0x40000:
                imm -= 0x80000
            cond = w & 0xF
            s = f"B.{cond:x} {hex(pc + imm * 4)}"
        elif (w & 0xFC000000) == 0x14000000:
            imm = w & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            s = f"B {hex(pc + (imm << 2))}"
        elif (w & 0x7FE0FC00) == 0x6B00001F:
            s = f"CMP w{(w>>5)&0x1F},w{(w>>16)&0x1F}"
        elif (w & 0x7F80001F) == 0x7100001F:
            rn = (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            s = f"CMP w{rn},#{imm}"
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            s = "RET"
        elif (w & 0xFFE0FC00) == 0x2A0003E0:
            s = f"MOV w{w&0x1F},w{(w>>16)&0x1F}"
        elif (w & 0xFFE0FC00) == 0xAA0003E0:
            s = f"MOV x{w&0x1F},x{(w>>16)&0x1F}"
        elif (w & 0xFFC00000) == 0x91000000:
            rd, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            if (w >> 22) & 1:
                imm <<= 12
            s = f"ADD x{rd},x{rn},#{imm}"
        elif (w & 0xFFC00000) == 0xD1000000:
            rd, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            s = f"SUB x{rd},x{rn},#{imm}"
        elif (w & 0xFFE0FC00) == 0x1A9F07E0:
            s = f"CSET w{w&0x1F}, cond"
        if s:
            print(hex(pc), s)


dis(0x13F892C, 0x120, "cans")

# Find jobmax static field load: offset 0x248 = 584
# Search methods that LDR from static_fields+#584
print("\n=== scan nearby dns methods for jobmax/fami loads ===")
# retjob already known
dis(0x13EFDD4, 0x200, "retjob head")
