# -*- coding: utf-8 -*-
"""Resolve PrivateImplementationDetails Field$ blobs used by dns.init."""
from __future__ import annotations

import hashlib
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
DELTA = 0x400

# Collect all Field$PrivateImplementationDetails entries
pat = re.compile(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"'
)
fields = [(int(m.group(1)), m.group(2)) for m in pat.finditer(RAW)]
print("Field$ count", len(fields))


def try_dump(addr: int) -> None:
    for d in (0, DELTA, 0x10000):
        off = addr - d
        if 0 <= off < len(SO) - 32:
            words = [struct.unpack_from("<Q", SO, off + i)[0] for i in range(0, 32, 8)]
            print(f"  delta {hex(d)} file {hex(off)} qwords {[hex(w) for w in words]}")


# Sample first few Field$ slots
for addr, hx in fields[:5]:
    print(hex(addr), hx[:16] + "...")
    try_dump(addr)

# dns.init InitializeArray lengths in order
LENS = [4, 4, 9, 10, 22, 8, 21, 10, 170, 10, 13, 10]
# element sizes: mostly int32=4, some float64? float=4. level_speed is float[]. waittime float[]. lgr float[].
# So byte sizes: 16,16,36,40,88,32,84,40,680,40,52,40 for int/float32

# Search SO for blobs whose SHA256 matches Field$ names (Unity uses hash of content)
# Too expensive for whole SO - instead: FieldRVA data often packed in a section.
# Scan for unique length-170 int arrays with small values (level_feel)

print("\nscan int[170] candidates with small ints...")
found = 0
for off in range(0, len(SO) - 680, 4):
    # quick filter: first 8 ints in 0..100
    vals = [struct.unpack_from("<i", SO, off + i)[0] for i in range(0, 32, 4)]
    if not all(0 <= v <= 100 for v in vals):
        continue
    full = [struct.unpack_from("<i", SO, off + i)[0] for i in range(0, 680, 4)]
    if not all(0 <= v <= 200 for v in full):
        continue
    if len(set(full)) < 5:
        continue
    # hash match?
    blob = SO[off : off + 680]
    digest = hashlib.sha256(blob).hexdigest().upper()
    match = next((a for a, h in fields if h == digest), None)
    print(hex(off), "unique", len(set(full)), "head", full[:12], "sha", digest[:16], "match", hex(match) if match else None)
    found += 1
    if found >= 20:
        break
print("found", found)
