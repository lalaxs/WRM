# -*- coding: utf-8 -*-
"""Extract dns.init array blobs from global-metadata FieldRVA data."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DUMP = ROOT / "tools/il2cpp_output/dump.cs"
DELTA = 0x400

# Parse Assembly-CSharp PrivateImplementationDetails (TypeDefIndex 5114 block)
text = DUMP.read_text(encoding="utf-8", errors="replace")
# Take only the game PID block around line content with AF0E7211
m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    text,
    re.S,
)
block = m.group(1)
entries = re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    block,
)
print("PID entries", len(entries))


def dump_blob(name: str, size: int, off_hex: str) -> list:
    off = int(off_hex, 16)
    blob = META[off : off + size]
    if size % 4 == 0:
        ints = list(struct.unpack("<" + "i" * (size // 4), blob))
        floats = list(struct.unpack("<" + "f" * (size // 4), blob))
    else:
        ints, floats = [], []
    print(f"\n{name} size={size} meta={off_hex}")
    print("  ints:", ints)
    if any(abs(f) > 1e-6 and abs(f) < 1e6 for f in floats):
        print("  floats:", [round(f, 5) for f in floats])
    return ints


# Known unique sizes from dns.init
wanted_sizes = {16, 32, 36, 40, 52, 84, 88, 680}
for size, hx, off in entries:
    size = int(size)
    if size in wanted_sizes:
        dump_blob(hx[:16], size, off)

# Also dump ALL size 40 and 84/88/36/16/32 in order of appearance - help mapping
print("\n\n===== ALL relevant in declaration order =====")
for size, hx, off in entries:
    size = int(size)
    if size in (16, 32, 36, 40, 52, 84, 88, 680):
        off_i = int(off, 16)
        ints = list(struct.unpack("<" + "i" * (size // 4), META[off_i : off_i + size]))
        print(f"sz{size:3d} @{off} {ints}")

# Check BSS slots content
print("\n===== dns.init field-handle slots on disk =====")
slots = {
    "x19": 0x2B1C620,
    "x20": 0x2B1C558,
    "x21": 0x2B1C570,
    "x22": 0x2B1C7B0,
    "x26": 0x2B1C5F8,
    "x29": 0x2B1C720,
    "x28": 0x2B1C580,
    "x27": 0x2B1C670,
    "x25": 0x2B1C788,
}
for k, a in slots.items():
    for d in (0, DELTA):
        off = a - d
        if 0 <= off < len(SO) - 8:
            v = struct.unpack_from("<Q", SO, off)[0]
            print(k, "VA", hex(a), "delta", hex(d), "->", hex(v))
