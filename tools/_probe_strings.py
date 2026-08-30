# -*- coding: utf-8 -*-
"""Search ScriptString / metadata for job titles, DES keys, ciphertext."""
from __future__ import annotations

import json
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DELTA = 0x400

strings = SJ["ScriptString"]
print(f"ScriptString count={len(strings)}")

# Chinese / job related
needles = [
    "掌门", "长老", "真传", "外门", "内门", "弟子", "宗主", "执事",
    "女修", "修炼", "外门弟子", "内门弟子", "核心", "散修", "峰主",
    "堂主", "护法", "亲传", "记名", "杂役", "供奉", "长老院",
    "Decrypt", "Encrypt", "DES", "sKey", "key", "helps", "npclog",
    "events", "doevent", "rejob", "releader",
]
print("\n=== needle hits in ScriptString ===")
for n in needles:
    hits = [s for s in strings if n in (s.get("Value") or "")]
    print(f"{n}: {len(hits)}")
    for h in hits[:8]:
        v = h["Value"]
        if len(v) > 120:
            v = v[:120] + "..."
        print(f"  @{h['Address']}: {v!r}")

# Any CJK in ScriptString?
print("\n=== ScriptString with CJK (sample up to 80) ===")
cjk = []
for s in strings:
    v = s.get("Value") or ""
    if re.search(r"[\u4e00-\u9fff]", v):
        cjk.append(s)
print(f"total CJK strings: {len(cjk)}")
for s in cjk[:80]:
    v = s["Value"]
    if len(v) > 100:
        v = v[:100] + "..."
    print(f"  @{s['Address']}: {v!r}")

# Base64-looking long strings (possible DES ciphertext)
print("\n=== long base64-ish ScriptString (len>=24) sample ===")
b64re = re.compile(r"^[A-Za-z0-9+/=]{24,}$")
b64s = [s for s in strings if b64re.match(s.get("Value") or "")]
print(f"count={len(b64s)}")
for s in b64s[:40]:
    print(f"  @{s['Address']} len={len(s['Value'])}: {s['Value'][:80]}")

# Search metadata UTF-16LE for job titles
print("\n=== metadata UTF-16LE / UTF-8 CJK job search ===")
for n in ["掌门", "长老", "真传", "外门弟子", "内门弟子", "散修", "女修"]:
    u8 = n.encode("utf-8")
    u16 = n.encode("utf-16le")
    print(f"{n}: utf8={META.find(u8)} utf16={META.find(u16)} so_u8={SO.find(u8)} so_u16={SO.find(u16)}")

# Dump more of DecryptDES callers from prior incomplete run
METHODS = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
SORTED = sorted(((m["Address"], m["Name"]) for m in SJ["ScriptMethod"]), key=lambda x: x[0])

def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for a, n in SORTED:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"

def find_bls_to(target: int, lo=0x1000000, hi=0x2200000):
    hits = []
    for off in range(lo - DELTA, hi - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        if (w & 0xFC000000) != 0x94000000:
            continue
        pc = off + DELTA
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        if pc + (imm26 << 2) == target:
            hits.append(pc)
    return hits

print("\n=== DecryptDES callers (wide) ===")
for pc in find_bls_to(METHODS["dns$$DecryptDES"]):
    print(hex(pc), enclosing(pc))

print("\n=== EncryptDES callers (wide) ===")
for pc in find_bls_to(METHODS["dns$$EncryptDES"]):
    print(hex(pc), enclosing(pc))

print("\n=== UnBase64 callers (wide) ===")
for pc in find_bls_to(METHODS["dns$$UnBase64String"]):
    print(hex(pc), enclosing(pc))

# Map BSS slots used by rejob/releader to dns field offsets
# BSS base appears 0x2b1c000; field static = offset from dns TypeInfo static_fields
# From pin scripts npclog @ 0x2B1C788 → field 0x110 means static_fields base = 0x2B1C788 - 0x110 = 0x2B1C678?
print("\n=== rejob/releader BSS -> dns field offset guess ===")
# npclog field 0x110 at 0x2B1C788
base = 0x2B1C788 - 0x110
print(f"static_fields base guess {hex(base)}")
for name, slots in [
    ("releader", [0x2b1c728, 0x2b1c608]),
    ("rejob", [0x2b1c780, 0x2b1c648, 0x2b1c858, 0x2b1c710, 0x2b1c6c8, 0x2b1c708]),
    ("DecryptDES", [0x2b1c578, 0x2b1c808, 0x2b1c5a0, 0x2b1c880, 0x2b1c798, 0x2b1c638, 0x2b1c660, 0x2b1c658]),
]:
    print(name)
    for s in slots:
        print(f"  {hex(s)} -> field+{hex(s-base)}")

# Look at dns fields in dump for string[] near those offsets
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
start = DUMP.find("public class dns")
chunk = DUMP[start:start+8000]
print("\n=== dns class header fields (string-related) ===")
for line in chunk.splitlines():
    if "string" in line.lower() or "[]" in line and ("job" in line.lower() or "leader" in line.lower() or "name" in line.lower() or "fami" in line.lower()):
        print(line)
# print all fields with offsets
print("\n=== all dns static fields with offsets ===")
for line in chunk.splitlines():
    if "// 0x" in line and ("public static" in line or "private static" in line):
        print(line.strip())
