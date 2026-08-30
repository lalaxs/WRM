# -*- coding: utf-8 -*-
"""Pin level_exp1max + level_feel via dns.init late ADRP slots."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()
DELTA = 0x400

# Re-decode every ADRP+LDR in dns.init 0x13bdd78..0x13be288 that loads a field handle used by InitArray
rva0, end = 0x13BDD78, 0x13BE288
off0 = rva0 - DELTA

# Build map: at each InitArray, what absolute address was loaded into the handle reg
# Track register values from ADRP+LDR

reg_addr = {}
last_len = None
for i in range(0, end - rva0, 4):
    w = struct.unpack_from("<I", SO, off0 + i)[0]
    pc = rva0 + i
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        reg_addr[rd] = ("page", page)
    if (w & 0xFFC00000) == 0xF9400000:
        rt = w & 0x1F
        rn = (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        base = reg_addr.get(rn)
        if base and base[0] == "page":
            addr = base[1] + imm
            reg_addr[rt] = ("abs", addr)
            # print(hex(pc), f"x{rt} = {hex(addr)}")
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        if pc + (imm << 2) == 0x1EBDCAC:
            # find x1 source
            for k in range(1, 8):
                w2 = struct.unpack_from("<I", SO, off0 + i - 4 * k)[0]
                if (w2 & 0xFFC00000) == 0xF9400000 and (w2 & 0x1F) == 1:
                    rn = (w2 >> 5) & 0x1F
                    src = reg_addr.get(rn)
                    print(f"InitArray len={last_len} handle_reg=x{rn} src={src}")
                    break

# Resolve late ones with widened slot table from prior script approach inline
# Load slot_to_hash quickly
import re

DUMP = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\dump.cs").read_text(encoding="utf-8", errors="replace")
RAW = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\script.json").read_text(encoding="utf-8")
m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)
hash_to_blob = {
    hx: (int(size), int(off, 16))
    for size, hx, off in re.findall(
        r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
        m.group(1),
    )
}
field_addr = {
    int(a): hx
    for a, hx in re.findall(
        r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
        RAW,
    )
}
slot_to_hash = {}
for base in range(0x3A0000, 0x3C0000, 8):
    if base + 24 > len(SO):
        break
    if struct.unpack_from("<Q", SO, base + 8)[0] != 0x403:
        continue
    slot = struct.unpack_from("<Q", SO, base)[0]
    fld = struct.unpack_from("<Q", SO, base + 16)[0]
    hx = field_addr.get(fld)
    if hx:
        slot_to_hash[slot] = hx

# From InitArray scan: print resolution for each abs addr +0x4000
targets = [
    ("level_feel?", 0x2B1C5F8),  # reused x26 - wait level_yang was first use of x26
]
# After first use of x26 for level_yang, second InitArray len10 also via x26 - SAME handle?
# That would mean level_feel uses SAME field data as level_yang - unlikely.
# Looking at scan: both via x26 - register not reloaded, so SAME PrivateImplementationDetails field!
# That can't be right for two different static arrays unless they copy same init data.

# Actually for second use, they LDR x1,[x26,#0] again - same handle means same initializer BLOB
# but two different arrays get the same initial values. Possible!

print("\nlevel_yang blob also used for level_feel if same handle:")
hx = slot_to_hash.get(0x2B1C5F8 + 0x4000)
print(hx[:16] if hx else None, hash_to_blob.get(hx) if hx else None)

# Resolve 0x2b1c7d0 (level_speed), and find handle for level_exp1max / tag_r
# From earlier ADRP at 0x13be034 -> 0x2b1d6c0 and 0x13be098 -> 0x2b1d6a0
for name, addr in [
    ("slot_2b1c7d0_level_speed", 0x2B1C7D0),
    ("slot_2b1d6c0", 0x2B1D6C0),
    ("slot_2b1d6a0", 0x2B1D6A0),
    ("slot_2b1d538", 0x2B1D538),
]:
    hx = slot_to_hash.get(addr + 0x4000) or slot_to_hash.get(addr)
    if not hx:
        print(name, "unresolved")
        continue
    size, o = hash_to_blob[hx]
    blob = META[o : o + size]
    ints = list(struct.unpack("<" + "i" * (size // 4), blob))
    floats = list(struct.unpack("<" + "f" * (size // 4), blob))
    print(name, "sz", size, "ints", ints, "fl", [round(f, 5) for f in floats])
