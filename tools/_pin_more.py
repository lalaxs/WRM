# -*- coding: utf-8 -*-
"""Continue pinning level_yang/exp1max/tag_r and find mday."""
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
hash_to_blob = {}
for size, hx, off in re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
):
    hash_to_blob[hx] = (int(size), int(off, 16))

field_addr = {}
for mm in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    field_addr[int(mm.group(1))] = mm.group(2)

# Scan wider registration region for slot->hash
slot_to_hash = {}
for base in range(0x3A0000, 0x3C0000, 0x100):
    for i in range(0, 0x100, 8):
        off = base + i
        if off + 24 > len(SO):
            break
        if struct.unpack_from("<Q", SO, off + 8)[0] != 0x403:
            continue
        slot = struct.unpack_from("<Q", SO, off)[0]
        fld = struct.unpack_from("<Q", SO, off + 16)[0]
        hx = field_addr.get(fld)
        if hx:
            slot_to_hash[slot] = hx

print("slot_to_hash size", len(slot_to_hash))

# Try all known BSS +/- deltas
candidates = [
    0x2B1C5F8,  # level_yang handle
    0x2B1C620,
    0x2B1C570,
    0x2B1C580,
    0x2B1C7D0,  # level_speed confirmed
    0x2B1D6C0,
    0x2B1D6A0,
    0x2B1D538,
]
for bss in candidates:
    for d in (0, 0x4000, -0x4000, 0x1000, 0x8000):
        hx = slot_to_hash.get(bss + d)
        if hx and hx in hash_to_blob:
            size, o = hash_to_blob[hx]
            ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size])) if size % 4 == 0 else []
            floats = list(struct.unpack("<" + "f" * (size // 4), META[o : o + size])) if size % 4 == 0 else []
            print(hex(bss), "+d", hex(d), "sz", size, "ints", ints[:12], "fl", [round(f, 4) for f in floats[:8]] if any(abs(f) > 1e-6 for f in floats[:4]) else None)
            break
    else:
        print(hex(bss), "unresolved")

# Dump ALL size-40 and size-52 PID blobs (level_exp1max / tag_r / level_yang / level_feel)
print("\n=== all size 40/52 ===")
for hx, (size, o) in sorted(hash_to_blob.items(), key=lambda x: x[1][1]):
    if size not in (40, 52, 32, 16):
        continue
    ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size]))
    floats = list(struct.unpack("<" + "f" * (size // 4), META[o : o + size]))
    fl = [round(f, 5) for f in floats]
    looks_float = sum(1 for f in floats if 0.00001 < abs(f) < 1e7) >= size // 8
    print(f"sz{size} @{hex(o)} {hx[:12]} {'FLOAT '+str(fl) if looks_float else 'INT '+str(ints)}")

# Find root.mday initialization - search for store to offset 0x148 on instance
# mday might be new int[N] without InitializeArray (filled in loop)
print("\n=== ArrayNew with interesting lengths near dayevent ===")
dayevent = 0x13ED240
for off in range(dayevent - DELTA - 0x2000, dayevent - DELTA + 0x3000, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        if imm in (12, 24, 30, 31, 360, 365, 720, 100, 170, 200):
            # next few BL?
            print(hex(off + DELTA), "MOVZ w1,#", imm)

# retjob / releader sizes
for name, rva, size in [
    ("retjob", 0x13EFDD4, 0x37C),
    ("releader", 0x13BE5A8, 0x6C),
    ("rejob", 0x13BE614, 0x1F0),
    ("renextlv", None, None),
]:
    if rva:
        print(f"\n{name} string/imm loads:")
        off = rva - DELTA
        for i in range(0, size, 4):
            w = struct.unpack_from("<I", SO, off + i)[0]
            pc = rva + i
            if (w & 0x7F800000) == 0x52800000:
                imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
                if imm < 50:
                    print(hex(pc), "MOVZ", imm)
