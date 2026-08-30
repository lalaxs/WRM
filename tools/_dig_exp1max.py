# -*- coding: utf-8 -*-
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

print("=== around level_exp1max store ===")
for pc in range(0x13BE080, 0x13BE100, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    s = None
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        s = f"MOVZ w{rd},#{imm}"
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
        s = f"LDR x{rt},[x{rn},#{hex(imm)}]"
    elif (w & 0xFFC00000) == 0xF9000000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        s = f"STR x{rt},[x{rn},#{hex(imm)}]"
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

field_addr = {}
for mm in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    field_addr[int(mm.group(1))] = mm.group(2)
print("fields", len(field_addr))

hash_to_blob = {}
m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)
for size, hx, off in re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
):
    hash_to_blob[hx] = (int(size), int(off, 16))

slot_to_hash = {}
for base in range(0x3A0000, 0x3C0000, 8):
    if struct.unpack_from("<Q", SO, base + 8)[0] != 0x403:
        continue
    slot = struct.unpack_from("<Q", SO, base)[0]
    fld = struct.unpack_from("<Q", SO, base + 16)[0]
    hx = field_addr.get(fld)
    if hx:
        slot_to_hash[slot] = hx


def resolve(bss: int) -> None:
    hx = slot_to_hash.get(bss + 0x4000)
    print(hex(bss), "->", (hx[:12] if hx else None), end=" ")
    if hx and hx in hash_to_blob:
        size, o = hash_to_blob[hx]
        ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size]))
        print("size", size, "meta", hex(o), ints)
    else:
        print("unresolved")


# Collect handles from ADRP+LDR in the exp1max region
print("\n=== resolve candidate BSS ===")
for bss in [
    0x2B1D6A0,
    0x2B1D6C0,
    0x2B1D538,
    0x2B1C7D0,
    0x2B1EF78,
    0x2B1C788,
]:
    resolve(bss)

# From disasm: find exact handle used before InitArray for len10
print("\n=== scan InitArray len10 in dns.init ===")
last_len = None
last_handle = None
rva0 = 0x13BDD78
for i in range(0, 0x600, 4):
    pc = rva0 + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        # peek next LDR
        w2 = struct.unpack_from("<I", SO, pc + 4 - DELTA)[0]
        if (w2 & 0xFFC00000) == 0xF9400000 and ((w2 >> 5) & 0x1F) == rd:
            imm2 = ((w2 >> 10) & 0xFFF) * 8
            last_handle = page + imm2
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        if pc + (imm << 2) == 0x1EBDCAC:
            print(hex(pc), "InitArray len", last_len, "handle", hex(last_handle) if last_handle else None)
            if last_handle:
                resolve(last_handle)
