# -*- coding: utf-8 -*-
"""Map dns.init arrays to static field offsets + blob contents."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()
DELTA = 0x400

# Unique blobs by size from game PID (only one of each key size used in dns.init)
BLOBS = {
    88: (0x48AC58, [2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
    680: (0x48AEA0, "level_feel_ids"),
    36: (0x48B1C0, [0, 1, 2, 4, 8, 16, 24, 40, 80]),  # BD316EEA - powers of 2-ish
}


def decode(pc_off: int) -> str:
    w = struct.unpack_from("<I", SO, pc_off)[0]
    pc = pc_off + DELTA
    if (w & 0xFFC00000) == 0xF9000000:
        rt = w & 0x1F
        rn = (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        return f"STR x{rt},[x{rn},#{imm}]"
    if (w & 0xFFC00000) == 0x91000000:
        rd = w & 0x1F
        rn = (w >> 5) & 0x1F
        imm = (w >> 10) & 0xFFF
        sh = (w >> 22) & 1
        if sh:
            imm <<= 12
        return f"ADD x{rd},x{rn},#{imm}"
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        imm = (w >> 5) & 0xFFFF
        hw = (w >> 21) & 3
        return f"MOVZ w{rd},#{imm << (hw * 16)}"
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        tgt = pc + (imm << 2)
        name = {0x1EBDCAC: "InitArray", 0x1295A70: "ArrayNew", 0x1295978: "InitMethod"}.get(tgt, hex(tgt))
        return f"BL {name}"
    if (w & 0xFFE0FC00) == 0xAA0003E0:
        return f"MOV x{w & 0x1F},x{(w >> 16) & 0x1F}"
    if (w & 0xFFC00000) == 0xF9400000:
        rt = w & 0x1F
        rn = (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        return f"LDR x{rt},[x{rn},#{imm}]"
    if (w & 0xFFC00000) == 0xB9000000:
        rt = w & 0x1F
        rn = (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 4
        return f"STR w{rt},[x{rn},#{imm}]"
    return f"raw {hex(w)}"


rva = 0x13BDD78
size = 0x47C
print("dns.init full interesting ops:")
for i in range(0, size, 4):
    s = decode(rva - DELTA + i)
    if s.startswith(("STR", "MOVZ w1", "BL Init", "BL Array", "ADD x")) or "InitArray" in s or "ArrayNew" in s:
        print(hex(rva + i), s)

# Field name map from dump offsets
FIELDS = {
    0xB8: "savetime",
    0xC0: "waittime",
    0xE0: "fitem",
    0xE8: "level_yang",
    0xF0: "fami_yang",
    0xF8: "lgr",
    0x100: "fami_act1day",
    0x108: "level_feel",
    0x110: "npclog",
    0x120: "level_speed",
    0x130: "tag_r",
    0x158: "act4day",
    0x160: "level_exp1max",
    0x230: "exp",
    0x248: "jobmax",
    0x250: "danger",
}
print("\nstatic field names by offset:")
for o, n in FIELDS.items():
    print(hex(o), n)

# Dump the two size-84 candidates and size-88 as fami candidates
print("\n=== primary quota candidates ===")
for off, label in [
    (0x48AC58, "sz88 fami_act1day?"),
    (0x48A8B8, "sz84 a"),
    (0x48ACE8, "sz84 b"),
    (0x48B1C0, "sz36 BD316"),
    (0x48AA48, "sz52 monthdays"),
    (0x48A9B8, "sz40 4F818 jobmax?"),
    (0x48AB00, "sz40 6BAF exp?"),
    (0x48A608, "sz40 1EBFD danger?"),
    (0x48B9A0, "sz40 FFDAF"),
    (0x48A690, "sz40 272BC 1..10"),
    (0x48A660, "sz40 268C6 1..9,9"),
]:
    size = {0x48AC58: 88, 0x48A8B8: 84, 0x48ACE8: 84, 0x48B1C0: 36, 0x48AA48: 52}.get(off, 40)
    ints = list(struct.unpack("<" + "i" * (size // 4), META[off : off + size]))
    print(label, ints)
