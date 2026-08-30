# -*- coding: utf-8 -*-
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
DELTA = 0x400

def decode_adrp(pc, w):
    immlo = (w >> 29) & 3
    immhi = (w >> 5) & 0x7FFFF
    imm = (immhi << 2) | immlo
    if imm & (1 << 20):
        imm -= 1 << 21
    page = (pc & ~0xFFF) + (imm << 12)
    rd = w & 0x1F
    return rd, page

for pc in [0x13BE098, 0x13BE034, 0x13BE0EC, 0x13BDFF8 - 4]:
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    print(hex(pc), hex(w), "ADRP?" , (w & 0x9F000000) == 0x90000000)
    if (w & 0x9F000000) == 0x90000000:
        rd, page = decode_adrp(pc, w)
        print("  x%d page %s" % (rd, hex(page)))
    # also show next few
    for k in range(0, 4):
        p = pc + 4 * k
        ww = struct.unpack_from("<I", SO, p - DELTA)[0]
        if (ww & 0x9F000000) == 0x90000000:
            rd, page = decode_adrp(p, ww)
            print(hex(p), "ADRP x%d,%s" % (rd, hex(page)))
        if (ww & 0xFFC00000) == 0xF9400000:
            rt, rn = ww & 0x1F, (ww >> 5) & 0x1F
            imm = ((ww >> 10) & 0xFFF) * 8
            print(hex(p), "LDR x%d,[x%d,#%s] => %s" % (rt, rn, hex(imm), hex(page + imm) if (ww & 0x9F000000) != 0x90000000 else "?"))

print("\n=== precise for exp1max site ===")
adrp_rd = None
page = None
for p in range(0x13BE090, 0x13BE0B0, 4):
    ww = struct.unpack_from("<I", SO, p - DELTA)[0]
    if (ww & 0x9F000000) == 0x90000000:
        adrp_rd, page = decode_adrp(p, ww)
        print(hex(p), "ADRP x%d,%s" % (adrp_rd, hex(page)))
    elif (ww & 0xFFC00000) == 0xF9400000:
        rt, rn = ww & 0x1F, (ww >> 5) & 0x1F
        imm = ((ww >> 10) & 0xFFF) * 8
        absaddr = hex(page + imm) if page is not None and rn == adrp_rd else "??"
        print(hex(p), "LDR x%d,[x%d,#%s] abs=%s" % (rt, rn, hex(imm), absaddr))
    else:
        print(hex(p), hex(ww))

# Check slot 0x2b1c6a0 + 0x4000 for 48A9B8
# And what is at registration for 0x2b1d6a0+0x4000
print("\n=== compare slots 0x2b1c6a0 vs 0x2b1d6a0 ===")
from pathlib import Path
import re
RAW = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\script.json").read_text(encoding="utf-8")
DUMP = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\dump.cs").read_text(encoding="utf-8", errors="replace")
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()
field_addr = {}
for mm in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    field_addr[int(mm.group(1))] = mm.group(2)
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

for bss in [0x2B1C6A0, 0x2B1D6A0, 0x2B216A0, 0x2B206A0]:
    for d in [0, 0x4000, -0x4000]:
        hx = slot_to_hash.get(bss + d)
        if hx and hx in hash_to_blob:
            size, o = hash_to_blob[hx]
            ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size]))
            print(hex(bss), "+", hex(d), "meta", hex(o), "size", size, ints[:10])
