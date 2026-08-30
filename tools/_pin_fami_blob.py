# -*- coding: utf-8 -*-
"""Pin fami_act1day blob via Field$ ScriptMetadata address xref from dns.init."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DELTA = 0x400

# Field$ addresses for the two size-84 candidates
want = {
    "475F94223FD7257AC1C772CB9E4B0B30F5053BF6BD261D8F353EE005A67DF4B0": "30s",
    "8B536A9D5349E6A46CABE1EFB1B47BA28887C3A61D64A21E150C94B3F21AADE6": "sparse",
    "844ED3181ACBAA37A4B16D2D359C2C1A52262B42D378E2A045B61240127810D2": "fami_yang_22",
    "AF0E7211D4402B9449065AB9AF646C113CFB8F08CCA2240EC26A59C35D0E69B3": "npclog_170",
    "BD316EEA2CE73C822453B69945A0607808D55E812771A5E77BA9572AD9AA0DA1": "fitem_9",
}

found = {}
for m in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    hx = m.group(2)
    if hx in want:
        found[hx] = int(m.group(1))
        print(want[hx], hex(int(m.group(1))), hx[:16])

# dns.init field-handle BSS slots (pointers to FieldInfo slots)
slots = {
    "savetime/x19": 0x2B1C620,
    "waittime/x20": 0x2B1C558,  # wait - x20 was 1368 -> 0x2b1c558; but wait used x21 for 2nd?
    "x21": 0x2B1C570,
    "x22_fitem": 0x2B1C7B0,
    "x26": 0x2B1C5F8,
    "x29_fami_yang": 0x2B1C720,
    "x28_lgr": 0x2B1C580,
    "x27_fami_act1day": 0x2B1C670,
    "x25_npclog": 0x2B1C788,
}

# On disk these are 0. Metadata usages that PATCH these addresses are listed
# in ScriptMetadata with the Address EQUAL to the slot. We already saw range
# starts at 0x2bab990 - so maybe image base differs.
# Try: slot VA might be file_offset + some base.
# Check if any Field$ VA appears as POINTER value anywhere near dns.init literals.

print("\nSearch SO for Field$ addresses as absolute pointers...")
for hx, addr in found.items():
    needle = struct.pack("<Q", addr)
    idxs = []
    start = 0
    while len(idxs) < 5:
        i = SO.find(needle, start)
        if i < 0:
            break
        idxs.append(i)
        start = i + 1
    print(want[hx], hex(addr), "ptr xrefs", [hex(i) for i in idxs])

# Also try address-DELTA as stored
print("\nSearch as file-offset-like...")
for hx, addr in found.items():
    for d in (0, DELTA):
        needle = struct.pack("<Q", addr - d)
        i = SO.find(needle)
        print(want[hx], "addr-d", hex(addr - d), "first", hex(i) if i >= 0 else None)

# Dump both blobs clearly for report
print("\n=== fami_act1day candidates (len 21) ===")
for off, label in [(0x48A8B8, "A_30s"), (0x48ACE8, "B_sparse")]:
    ints = list(struct.unpack("<" + "i" * 21, META[off : off + 84]))
    print(label, ints)

print("\n=== uniquely mapped ===")
print("fami_yang", list(struct.unpack("<" + "i" * 22, META[0x48AC58 : 0x48AC58 + 88])))
print("fitem", list(struct.unpack("<" + "i" * 9, META[0x48B1C0 : 0x48B1C0 + 36])))
print("act4day", 30.0)
