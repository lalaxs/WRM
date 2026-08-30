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

for bss in [0x2B1D6A0, 0x2B1D6C0, 0x2B1C7D0, 0x2B1EF78]:
    fo = bss - DELTA
    v = struct.unpack_from("<Q", SO, fo)[0]
    print(hex(bss), "raw", hex(v))

field_addr = {}
for mm in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    field_addr[int(mm.group(1))] = mm.group(2)
print("field count", len(field_addr))

m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)

print("\n=== size-40 blobs ===")
target_hx = None
for size, hx, off in re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
):
    size = int(size)
    o = int(off, 16)
    if o == 0x48A9B8:
        target_hx = hx
    if size != 40:
        continue
    ints = list(struct.unpack("<" + "i" * 10, META[o : o + 40]))
    floats = list(struct.unpack("<" + "f" * 10, META[o : o + 40]))
    addrs = [hex(a) for a, h in field_addr.items() if h == hx]
    looks_f = sum(1 for f in floats if 0.01 < abs(f) < 1e6) >= 5
    print(hex(o), "FLOAT" if looks_f else "INT", [round(f, 4) for f in floats] if looks_f else ints, "Field$", addrs)

print("\ntarget 48A9B8 hash", target_hx)
addrs = [a for a, h in field_addr.items() if h == target_hx]
print("Field$ addrs", [hex(a) for a in addrs])
for base in range(0x3A0000, 0x3C0000, 8):
    if struct.unpack_from("<Q", SO, base + 8)[0] != 0x403:
        continue
    fld = struct.unpack_from("<Q", SO, base + 16)[0]
    if fld in addrs:
        slot = struct.unpack_from("<Q", SO, base)[0]
        print("slot", hex(slot), "bss-candidate", hex(slot - 0x4000))

# Also: maybe InitArray handle is NOT Field$ BSS but a RuntimeFieldHandle object
# whose first field points to Field$. Check what 0x2b1d6a0 points to in SO image
fo = 0x2B1D6A0 - DELTA
ptr = struct.unpack_from("<Q", SO, fo)[0]
print("\nhandle ptr", hex(ptr))
# If ptr looks like an address in SO image, read it
if 0x10000 < ptr < 0x3000000:
    fo2 = ptr - DELTA if ptr > DELTA else None
    if fo2 and 0 <= fo2 < len(SO) - 16:
        print("pointee", [hex(struct.unpack_from("<Q", SO, fo2 + i)[0]) for i in range(0, 32, 8)])

# Compare: for confirmed level_speed handle 0x2b1c7d0
fo = 0x2B1C7D0 - DELTA
ptr = struct.unpack_from("<Q", SO, fo)[0]
print("level_speed handle ptr", hex(ptr))
if 0x10000 < ptr < 0x3000000:
    fo2 = ptr - DELTA
    if 0 <= fo2 < len(SO) - 16:
        print("pointee", [hex(struct.unpack_from("<Q", SO, fo2 + i)[0]) for i in range(0, 32, 8)])
