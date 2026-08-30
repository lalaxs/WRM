# -*- coding: utf-8 -*-
"""Disassemble retjob for returned job ints by realm."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
DELTA = 0x400
rva, size = 0x13EFDD4, 0x37C
off = rva - DELTA
print("retjob immediates and branches")
for i in range(0, size, 4):
    w = struct.unpack_from("<I", SO, off + i)[0]
    pc = rva + i
    if (w & 0x7F800000) == 0x52800000:
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        print(hex(pc), f"MOVZ w{w&0x1F},#{imm}")
    elif (w & 0x7F80001F) == 0x7100001F:
        print(hex(pc), f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}")
    elif (w & 0xFF000010) == 0x54000000:
        imm19 = (w >> 5) & 0x7FFFF
        if imm19 & 0x40000:
            imm19 -= 0x80000
        print(hex(pc), f"B.cond{(w&0xf)} -> {hex(pc+imm19*4)}")
    elif (w & 0xFFE0FC00) == 0x2A0003E0:
        print(hex(pc), f"MOV w{w&0x1F},w{(w>>16)&0x1F}")
    elif (w & 0xFFFFFC1F) == 0xD65F0000:
        print(hex(pc), "RET")
