# -*- coding: utf-8 -*-
"""Trace af/lf/rejob string sources + indirect DecryptDES + DES key literals."""
from __future__ import annotations

import json
import re
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
DELTA = 0x400
OUT = []

def p(*a):
    s = " ".join(str(x) for x in a)
    OUT.append(s)
    print(s)

METHODS = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
SORTED = sorted(((m["Address"], m["Name"]) for m in SJ["ScriptMethod"]), key=lambda x: x[0])

def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for a, n in SORTED:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"

def method_size(name: str) -> int:
    addr = METHODS[name]
    for a, n in SORTED:
        if a > addr:
            return a - addr
    return 0x400

# Map static field BSS: npclog field 0x110 @ 0x2B1C788
STATIC_BASE = 0x2B1C788 - 0x110
FIELD_NAMES = {
    0x0: "af", 0x8: "lf", 0x10: "root0", 0x18: "myurl", 0x20: "myurl0", 0x28: "myurl1",
    0x30: "namel", 0x38: "namef3", 0x40: "namef4", 0x48: "soulname",
    0x110: "npclog",
}

def field_at(bss: int) -> str:
    off = bss - STATIC_BASE
    return FIELD_NAMES.get(off, f"field+{hex(off)}")

# Full rejob/releader with field names
for name in ["dns$$releader", "dns$$rejob", "dns$$relevel", "dns$$rereward", "dns$$rename"]:
    rva = METHODS[name]
    size = min(method_size(name), 0x400)
    p(f"\n==== {name} {hex(rva)} size={hex(size)} ====")
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        s = None
        if (w & 0x9F000000) == 0x90000000:
            rd = w & 0x1F
            immhi = (w >> 5) & 0x7FFFF
            immlo = (w >> 29) & 3
            imm = ((immhi << 2) | immlo) << 12
            if imm & (1 << 32):
                imm -= 1 << 33
            page = (pc & ~0xFFF) + imm
            # peek LDR
            w2 = struct.unpack_from("<I", SO, pc - DELTA + 4)[0]
            if (w2 & 0xFFC00000) == 0xF9400000 and ((w2 >> 5) & 0x1F) == rd:
                imm2 = ((w2 >> 10) & 0xFFF) * 8
                addr = page + imm2
                s = f"ADRP+LDR x{rd} -> {hex(addr)} [{field_at(addr)}]"
        elif (w & 0xFC000000) == 0x94000000:
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            tgt = pc + (imm26 << 2)
            helper = {0x1EBDCAC: "InitArray/il2cpp", 0x1295A70: "ArrayNew?", 0x1295978: "InitMethod?"}.get(tgt, enclosing(tgt))
            s = f"BL {hex(tgt)} ; {helper}"
        elif (w & 0x7F800000) == 0x52800000:
            rd = w & 0x1F
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            s = f"MOVZ w{rd},#{imm}"
        elif (w & 0x7F80001F) == 0x7100001F:
            s = f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}"
        elif (w & 0xFF000010) == 0x54000000:
            imm19 = (w >> 5) & 0x7FFFF
            if imm19 & 0x40000:
                imm19 -= 0x80000
            s = f"B.{w&0xf:x} {hex(pc+imm19*4)}"
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            s = "RET"
        elif (w & 0xFFC00000) == 0xF9400000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 8
            s = f"LDR x{rt},[x{rn},#{hex(imm)}]"
        if s and any(k in s for k in ("ADRP", "BL", "MOVZ", "CMP", "B.", "RET")):
            p(hex(pc), s)

# Wide scan for BL to DecryptDES across whole SO executable-ish range
p("\n==== wide BL to DecryptDES / EncryptDES / UnBase64 ====")
targets = {
    METHODS["dns$$DecryptDES"]: "DecryptDES",
    METHODS["dns$$EncryptDES"]: "EncryptDES",
    METHODS["dns$$UnBase64String"]: "UnBase64",
    METHODS["dns$$ToBase64String"]: "ToBase64",
}
# scan from 0x100000 to end-ish of likely code (first 25MB of file maps to VA)
code_end = min(len(SO) + DELTA, 0x2200000)
for off in range(0x100000 - DELTA, code_end - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    pc = off + DELTA
    imm26 = w & 0x3FFFFFF
    if imm26 & (1 << 25):
        imm26 -= 1 << 26
    tgt = pc + (imm26 << 2)
    if tgt in targets:
        p(hex(pc), "->", targets[tgt], enclosing(pc))

# Also search ADRP literal pools referenced by DecryptDES for string content
# DecryptDES loads BSS 0x2b1c578 etc - those are STRING LITERAL caches (Il2CppString**)
# Resolve via ScriptMetadata / string literal index pattern

# Search ScriptString for 8-char keys typical of DES
p("\n==== ScriptString len==8 printable (DES key candidates) ====")
for s in SJ["ScriptString"]:
    v = s.get("Value") or ""
    if len(v) == 8 and v.isascii() and v.isprintable() and not v.startswith(" ") and re.match(r"^[\w!@#$%^&*+=?-]+$", v):
        p(repr(v))

# Common Unity DES sample keys
for key in [b"12345678", b"87654321", b"abcdefgh", b"ABCDEFGH", b"xiuxian1", b"password", b"00000000"]:
    p(f"key {key!r} in meta={META.find(key)} so={SO.find(key)}")

# af/lf usage: find stores to static+0 / +8
p("\n==== stores to dns.af (static+0) / lf (static+8) ====")
# ADRP to 0x2b1c000 then STR to #0x678(=af?) 
# STATIC_BASE = 0x2B1C678
p("STATIC_BASE", hex(STATIC_BASE))
af_bss = STATIC_BASE + 0x0
lf_bss = STATIC_BASE + 0x8
# Find ADRP pages covering these + STR/LDR
for label, bss in [("af", af_bss), ("lf", lf_bss)]:
    page = bss & ~0xFFF
    off_in_page = bss - page
    hits = 0
    for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        pc = off + DELTA
        if (w & 0x9F000000) != 0x90000000:
            continue
        rd = w & 0x1F
        immhi = (w >> 5) & 0x7FFFF
        immlo = (w >> 29) & 3
        imm = ((immhi << 2) | immlo) << 12
        if imm & (1 << 32):
            imm -= 1 << 33
        if (pc & ~0xFFF) + imm != page:
            continue
        # next few instr LDR/STR with matching imm
        for j in range(4, 20, 4):
            w2 = struct.unpack_from("<I", SO, off + j)[0]
            if (w2 & 0xFFC00000) in (0xF9400000, 0xF9000000) and ((w2 >> 5) & 0x1F) == rd:
                imm2 = ((w2 >> 10) & 0xFFF) * 8
                if imm2 == off_in_page:
                    op = "LDR" if (w2 & 0xFFC00000) == 0xF9400000 else "STR"
                    p(label, op, hex(pc), enclosing(pc))
                    hits += 1
                    break
    p(label, "hits", hits)

# Search string literals that look like URLs
p("\n==== URL-like ScriptString ====")
for s in SJ["ScriptString"]:
    v = s.get("Value") or ""
    if "http" in v.lower() or ".com" in v or ".cn" in v or "api" in v.lower() and len(v) < 120:
        if any(k in v for k in ("http", "www", ".com", ".cn", "api")):
            p(repr(v[:150]))

# Check assets presence
assets = ROOT / "tools/il2cpp_input/assets"
p("\n==== assets tree file count ====")
files = list(assets.rglob("*")) if assets.exists() else []
p("entries", len(files))
for f in files:
    if f.is_file():
        p("FILE", f, f.stat().st_size)

# Look for sharedassets / data.unity3d elsewhere
p("\n==== search repo for unity data ====")
for pat in ["*.unity3d", "sharedassets*", "level0", "data.unity3d", "*.assets", "globalgamemanagers*"]:
    found = list(ROOT.rglob(pat))
    p(pat, len(found), [str(x) for x in found[:5]])

(ROOT / "tools/_probe_trace_out.txt").write_text("\n".join(OUT), encoding="utf-8")
p("wrote tools/_probe_trace_out.txt")
