# -*- coding: utf-8 -*-
"""Trace config/content text loading and DecryptDES usage."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
DELTA = 0x400
OUT = ROOT / "tools/_probe_content_out.txt"
lines = []

def p(*a):
    s = " ".join(str(x) for x in a)
    lines.append(s)
    print(s)

METHODS = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
SORTED = sorted(((m["Address"], m["Name"]) for m in SJ["ScriptMethod"]), key=lambda x: x[0])
STR_BY_VAL = {}
for s in SJ["ScriptString"]:
    v = s.get("Value") or ""
    if v:
        STR_BY_VAL.setdefault(v, []).append(s["Address"])

def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for a, n in SORTED:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"

# Find references to config/content strings via ScriptString addresses in SO
# String literal handles are often in .data; search for the VA as qword
p("=== config/content related ScriptString ===")
content_strs = []
for s in SJ["ScriptString"]:
    v = s.get("Value") or ""
    if "config" in v.lower() or "helpconfig" in v.lower() or v.startswith("text"):
        if len(v) < 80:
            content_strs.append(s)
            p(f"  @{s['Address']} {hex(s['Address'])}: {v!r}")

# Search SO for pointers to these string literal VAs (as little-endian qwords)
p("\n=== pointer xrefs in SO to content string VAs (sample) ===")
for s in content_strs:
    v = s["Value"]
    if not (v.startswith("config/") or v.startswith("helpconfig") or v in ("helps", "helps0", "helps1")):
        continue
    needle = struct.pack("<Q", s["Address"])
    idx = 0
    hits = []
    while True:
        i = SO.find(needle, idx)
        if i < 0:
            break
        hits.append(i + DELTA)  # as VA-ish
        idx = i + 1
        if len(hits) > 5:
            break
    p(f"{v!r}: ptr hits VA-ish {[hex(h) for h in hits]}")

# Disasm DecryptDES focusing on System.Security calls
p("\n=== DecryptDES BL targets (crypto stack) ===")
rva = METHODS["dns$$DecryptDES"]
size = 0x5C8
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) == 0x94000000:
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        tgt = pc + (imm26 << 2)
        enc = enclosing(tgt)
        if "Marshal" not in enc and "Init" not in enc and "?@0x0" not in enc:
            p(hex(pc), "BL", hex(tgt), enc)
        elif "Crypt" in enc or "DES" in enc or "Convert" in enc or "Encoding" in enc or "Stream" in enc or "Transform" in enc or "FromBase64" in enc:
            p(hex(pc), "BL", hex(tgt), enc)

# Print ALL BLs in DecryptDES with enclosing (filtered noise less)
p("\n=== DecryptDES all unique BL targets ===")
tgts = {}
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm26 = w & 0x3FFFFFF
    if imm26 & (1 << 25):
        imm26 -= 1 << 26
    tgt = pc + (imm26 << 2)
    tgts[tgt] = tgts.get(tgt, 0) + 1
for tgt, c in sorted(tgts.items(), key=lambda x: -x[1]):
    p(f"  {c}x {hex(tgt)} {enclosing(tgt)}")

# Find root methods that reference Resources.Load
p("\n=== game methods with Load/Resources/config/help in name ===")
for a, n in SORTED:
    low = n.lower()
    if n.startswith(("root$$", "dns$$", "person$$", "mydic", "cfile", "android")):
        if any(k in low for k in ("load", "help", "config", "text", "decrypt", "encrypt", "resource", "bundle", "read", "file", "sa", "save", "getstring", "content")):
            p(hex(a), n)

# Wide scan BL DecryptDES again and write results clearly
p("\n=== ALL BL to DecryptDES in SO code ===")
dec = METHODS["dns$$DecryptDES"]
enc = METHODS["dns$$EncryptDES"]
count_d = count_e = 0
for off in range(0, len(SO) - 4, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm26 = w & 0x3FFFFFF
    if imm26 & (1 << 25):
        imm26 -= 1 << 26
    tgt = pc + (imm26 << 2)
    if tgt == dec:
        p("DecryptDES from", hex(pc), enclosing(pc))
        count_d += 1
    elif tgt == enc:
        p("EncryptDES from", hex(pc), enclosing(pc))
        count_e += 1
p(f"totals Decrypt={count_d} Encrypt={count_e}")

# Search for BLR (indirect) near loading helps - harder
# Look at mydicstring.setre - parse JSON keys/values maybe decrypt
for name in ["mydicstring$$setre", "mydicstring$$get_Item", "mydicint$$setre", "mydicint$$get_Item"]:
    if name not in METHODS:
        p("missing", name)
        continue
    rva = METHODS[name]
    p(f"\n=== {name} {hex(rva)} BLs ===")
    for i in range(0, 0x200, 4):
        pc = rva + i
        if pc - DELTA >= len(SO):
            break
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        if (w & 0xFC000000) == 0x94000000:
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            tgt = pc + (imm26 << 2)
            p(hex(pc), hex(tgt), enclosing(tgt))
        if (w & 0xFFFFFC1F) == 0xD65F0000:
            break

# Find string 'config/content/text0' usage via metadata init pattern:
# In many builds, code does: adrp; ldr [page, #off] where off points to literal pointer slot
# Instead: search ScriptMetadata for the string
p("\n=== ScriptMetadata entries mentioning content/config ===")
for m in SJ.get("ScriptMetadata", []):
    name = m.get("Name") or ""
    if "config" in name.lower() or "content" in name.lower() or "help" in name.lower():
        p(m)

OUT.write_text("\n".join(lines), encoding="utf-8")
p("wrote", OUT)
