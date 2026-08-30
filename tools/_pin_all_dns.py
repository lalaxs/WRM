# -*- coding: utf-8 -*-
"""Pin remaining dns tables via Field$ registration triples."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
DELTA = 0x400

m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)
entries = re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
)
hash_to_blob = {}
for size, hx, off in entries:
    size = int(size)
    o = int(off, 16)
    hash_to_blob[hx] = (size, o)

field_addr = {}
pat = re.compile(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"'
)
for mm in pat.finditer(RAW):
    field_addr[int(mm.group(1))] = mm.group(2)

# triples at 0x3b0700: (slot, 0x403, Field$addr)
slot_to_hash = {}
base = 0x3B0700
for i in range(0, 0xA00, 8):
    v = struct.unpack_from("<Q", SO, base + i)[0]
    if v == 0x403 and i >= 8:
        slot = struct.unpack_from("<Q", SO, base + i - 8)[0]
        fld = struct.unpack_from("<Q", SO, base + i + 8)[0]
        hx = field_addr.get(fld)
        if hx:
            slot_to_hash[slot] = hx


def dump_slot(name: str, bss: int) -> None:
    shadow = bss + 0x4000
    hx = slot_to_hash.get(shadow)
    print(f"\n=== {name} bss={hex(bss)} shadow={hex(shadow)} ===")
    if not hx:
        print("  NO HASH")
        return
    size, off = hash_to_blob[hx]
    blob = META[off : off + size]
    print(f"  hash={hx[:16]} size={size} meta={hex(off)}")
    if size % 4 == 0:
        ints = list(struct.unpack("<" + "i" * (size // 4), blob))
        floats = list(struct.unpack("<" + "f" * (size // 4), blob))
        print("  ints:", ints)
        if any(0.0001 < abs(f) < 1e8 for f in floats):
            print("  floats:", [round(f, 6) for f in floats])


# Resolve dns.init BSS slots by re-reading prologue
rva = 0x13BDD78
off0 = rva - DELTA
# known from prior disasm
known = {
    "x19_savetime": 0x2B1C620,
    "x20": 0x2B1C558,
    "x21_waittime": 0x2B1C570,
    "x22_fitem": 0x2B1C7B0,
    "x26_level_yang": 0x2B1C5F8,
    "x29_fami_yang": 0x2B1C720,
    "x28_lgr": 0x2B1C580,
    "x27_fami_act1day": 0x2B1C670,
    "x25_npclog": 0x2B1C788,
}
# later loads in dns.init for level_feel/speed/tag_r/exp1max
# From earlier: after fami_act1day, uses x26 again for level_feel handle,
# then ADRP loads for others. Re-scan InitArray field handle regs.

print("Scanning dns.init field-handle LDRs before each InitArray...")
last_len = None
for i in range(0, 0x510, 4):
    w = struct.unpack_from("<I", SO, off0 + i)[0]
    pc = rva + i
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        if pc + (imm << 2) == 0x1EBDCAC:
            # look back for LDR x1,[xN,#0]
            for k in range(1, 6):
                w2 = struct.unpack_from("<I", SO, off0 + i - 4 * k)[0]
                if (w2 & 0xFFC00000) == 0xF9400000 and (w2 & 0x1F) == 1:
                    rn = (w2 >> 5) & 0x1F
                    print(f"  InitArray len={last_len} via x{rn} at {hex(pc)}")
                    break

for name, bss in known.items():
    dump_slot(name, bss)

# jobmax already known; also dump level_exp1max via rereward/dns stores
# Find BSS for level_feel (after fami, uses x26), level_speed, tag_r, level_exp1max
# From dns.init later ADRP+LDR:
# 0x13bdfe4 ADRP+LDR -> 0x2b1c7d0
# 0x13be034 -> 0x2b1d6c0
# 0x13be098 -> 0x2b1d6a0
dump_slot("later_0x2b1c7d0", 0x2B1C7D0)
dump_slot("later_0x2b1d6c0", 0x2B1D6C0)
dump_slot("later_0x2b1d6a0", 0x2B1D6A0)

# rereward jobmax slot 0x2b1c730, danger etc
dump_slot("jobmax", 0x2B1C730)

# Find mday init - search root for InitArray then store to +0x148
print("\n=== search mday stores (instance+0x148) ===")
# harder; search methods that create long int arrays
# Look for InitArray len that matches calendar - often 30 or 360
for length in (30, 31, 360, 365, 12, 24):
    hits = []
    for off in range(0x13B0000, 0x1500000, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            if imm == length:
                # check nearby InitArray
                for k in range(1, 8):
                    w2 = struct.unpack_from("<I", SO, off + 4 * k)[0]
                    if (w2 & 0xFC000000) == 0x94000000:
                        imm2 = w2 & 0x3FFFFFF
                        if imm2 & (1 << 25):
                            imm2 -= 1 << 26
                        tgt = off + DELTA + 4 * k + (imm2 << 2)
                        if tgt == 0x1EBDCAC:
                            hits.append(hex(off + DELTA))
                            break
    if hits:
        print(f"len {length} InitArray at", hits[:10])
