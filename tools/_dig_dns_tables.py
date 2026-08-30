# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
SCRIPT = ROOT / "tools/il2cpp_output/script.json"
DELTA = 0x400

# Field-handle slots loaded in dns.init prologue
SLOTS = {
    "x19": 0x2B1C620,
    "x20": 0x2B1C558,
    "x21": 0x2B1C570,
    "x22": 0x2B1C7B0,
    "x26": 0x2B1C5F8,
    "x29": 0x2B1C720,
    "x28": 0x2B1C580,
    "x27": 0x2B1C670,
    "x25": 0x2B1C788,
    "later1": 0x2B1C7D0,
    "later2": 0x2B1D6C0,
    "later3": 0x2B1D6A0,
    "later4": 0x2B1D538,
}


def main() -> None:
    want = set(SLOTS.values())
    print("looking for", {k: hex(v) for k, v in SLOTS.items()})

    # Stream-parse ScriptMetadata / ScriptMetadataMethod with regex on raw file
    raw = SCRIPT.read_text(encoding="utf-8")
    # All Address/Name pairs
    hits = []
    for m in re.finditer(
        r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"([^"]+)"',
        raw,
    ):
        addr = int(m.group(1))
        if addr in want or (0x2B1C000 <= addr <= 0x2B1E800):
            hits.append((addr, m.group(2)))

    print("hits in broad range", len(hits))
    by_addr = {a: n for a, n in hits}
    for k, a in SLOTS.items():
        print(k, hex(a), by_addr.get(a, "<MISSING>"))

    # Also print nearby names for context
    print("\n--- sorted hits ---")
    for a, n in sorted(hits, key=lambda x: x[0])[:80]:
        print(hex(a), n)

    # Find dns$$init method address confirmation
    m = re.search(r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"dns\$\$init"', raw)
    if m:
        print("\ndns$$init Address", hex(int(m.group(1))))


if __name__ == "__main__":
    main()
