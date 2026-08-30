# -*- coding: utf-8 -*-
"""Deeper string/crypto/resource probe; UTF-8 safe output."""
from __future__ import annotations

import json
import re
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
OUT = ROOT / "tools/_probe_strings2_out.txt"
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
DELTA = 0x400

lines = []


def p(*a):
    s = " ".join(str(x) for x in a)
    lines.append(s)
    print(s)


strings = SJ["ScriptString"]
empty = sum(1 for s in strings if not (s.get("Value") or ""))
nonempty = len(strings) - empty
p(f"ScriptString total={len(strings)} empty={empty} nonempty={nonempty}")

# CJK
cjk = [s for s in strings if re.search(r"[\u4e00-\u9fff]", s.get("Value") or "")]
p(f"CJK count={len(cjk)}")
for s in cjk:
    v = s["Value"]
    if len(v) > 150:
        v = v[:150] + "..."
    p(f"  @{s['Address']}: {v!r}")

# helps / .sa / file paths
p("\n=== path-like ScriptString ===")
for s in strings:
    v = s.get("Value") or ""
    if any(k in v for k in [".sa", "helps", "/flags", "/floats", "/ints", "Streaming", "Resources", ".bytes", "AssetBundle", "TextAsset", ".json", "npclog", "events"]):
        if len(v) < 200:
            p(f"  @{s['Address']}: {v!r}")

# metadata UTF-16/UTF-8 job titles
p("\n=== metadata/so CJK job search ===")
for n in ["掌门", "长老", "真传", "外门", "内门", "弟子", "散修", "女修", "修炼手札", "某某宗"]:
    u8, u16 = n.encode("utf-8"), n.encode("utf-16le")
    p(f"{n}: meta8={META.find(u8)} meta16={META.find(u16)} so8={SO.find(u8)} so16={SO.find(u16)}")

# dns fields
start = DUMP.find("public class dns")
# find correct dns - TypeDefIndex near 5008
idx = DUMP.find("public class dns // TypeDefIndex")
if idx < 0:
    idx = start
chunk = DUMP[idx : idx + 12000]
p("\n=== dns class fields ===")
for line in chunk.splitlines():
    if "Fields" in line or "Methods" in line:
        p(line.strip())
    if "static" in line and ("// 0x" in line or "string" in line.lower()):
        p(line.strip())
    if line.strip().startswith("// RVA") and ("rejob" in chunk[max(0, chunk.find(line)-200):chunk.find(line)+50] or False):
        pass
    if "rejob" in line or "releader" in line or "Decrypt" in line or "Encrypt" in line:
        p(line.strip())
    if line.strip() == "}" and "DecryptDES" in chunk[: chunk.find(line) + 1]:
        # end of methods maybe
        pass

# Extract dns field block more carefully
m = re.search(r"public class dns // TypeDefIndex: (\d+)(.*?)// Namespace:", DUMP, re.S)
if m:
    body = m.group(2)
    p(f"\ndns TypeDefIndex={m.group(1)}")
    fields = re.findall(r"public static (\S+) (\w+); // (0x[0-9A-F]+)", body)
    p(f"static field count={len(fields)}")
    for t, name, off in fields:
        if "string" in t.lower() or "job" in name.lower() or "leader" in name.lower() or "name" in name.lower() or "log" in name.lower() or "help" in name.lower():
            p(f"  {off} {t} {name}")
    p("-- all string/array-ish --")
    for t, name, off in fields:
        if "[" in t or "string" in t.lower() or "List" in t or "Dictionary" in t:
            p(f"  {off} {t} {name}")

# Find root methods related to helps / load / getstring
p("\n=== root methods mentioning help/load/string/event/decrypt ===")
rm = re.search(r"public class root : MonoBehaviour(.*?)// Namespace:", DUMP, re.S)
if rm:
    for m2 in re.finditer(r"// RVA: (0x[0-9A-F]+).*?\n\t(?:private|public|internal).+? (\w+)\(", rm.group(1), re.S):
        name = m2.group(2)
        if any(k in name.lower() for k in ["help", "string", "load", "save", "event", "decrypt", "encrypt", "dic", "log", "npc", "job", "text", "file", "read", "write", "get"]):
            p(f"  {m2.group(1)} {name}")

# ScriptMethod names
METHODS = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
SORTED = sorted(((m["Address"], m["Name"]) for m in SJ["ScriptMethod"]), key=lambda x: x[0])

def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for a, n in SORTED:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"

def find_bls_to(target: int, lo=0x13A0000, hi=0x1500000):
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

p("\n=== DecryptDES callers in game code range ===")
for pc in find_bls_to(METHODS["dns$$DecryptDES"]):
    p(hex(pc), enclosing(pc))
p("=== EncryptDES callers ===")
for pc in find_bls_to(METHODS["dns$$EncryptDES"]):
    p(hex(pc), enclosing(pc))
p("=== UnBase64 callers ===")
for pc in find_bls_to(METHODS["dns$$UnBase64String"]):
    p(hex(pc), enclosing(pc))
p("=== rejob callers ===")
for pc in find_bls_to(METHODS["dns$$rejob"]):
    p(hex(pc), enclosing(pc))
p("=== releader callers ===")
for pc in find_bls_to(METHODS["dns$$releader"]):
    p(hex(pc), enclosing(pc))

# Look at mydicstring.setre / get_Item - does get decrypt?
p("\n=== mydicstring.get_Item disasm ===")
rva = METHODS.get("mydicstring$$get_Item")
if rva:
    size = 0x80
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        if (w & 0xFC000000) == 0x94000000:
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            tgt = pc + (imm26 << 2)
            p(hex(pc), f"BL {hex(tgt)}", enclosing(tgt))
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            p(hex(pc), "RET")
            break

# Search dump for helps load / File.Read / PersistentDataPath
p("\n=== dump hits for helps_key / PersistentData / DecryptDES usage context ===")
for pat in ["helps_key", "helps_value", ".sa", "DecryptDES", "EncryptDES", "PersistentDataPath", "Resources.Load", "AssetBundle", "TextAsset", "StreamingAssets"]:
    hits = [i for i, line in enumerate(DUMP.splitlines()) if pat in line]
    p(f"{pat}: {len(hits)} lines", f"first={hits[0]+1 if hits else None}")

# Inspect dns.cctor for string array init
p("\n=== dns$$.cctor size and BLs ===")
rva = METHODS["dns$$.cctor"]
# size until next
nxt = None
for a, n in SORTED:
    if a > rva:
        nxt = a
        break
size = min((nxt - rva) if nxt else 0x800, 0x2000)
p(f"cctor {hex(rva)} size={hex(size)}")
bls = []
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) == 0x94000000:
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        tgt = pc + (imm26 << 2)
        bls.append((pc, tgt, enclosing(tgt)))
p(f"BL count={len(bls)}")
for pc, tgt, enc in bls[:40]:
    p(hex(pc), hex(tgt), enc)

# StringLiteral table in metadata - check if encrypted (high entropy)
# Il2Cpp metadata header
p("\n=== metadata header ===")
magic = META[:4]
p("magic", magic, struct.unpack_from("<I", META, 4)[0])

# Sample nonempty ScriptString entropy / look
p("\n=== sample nonempty ScriptString (first 30) ===")
shown = 0
for s in strings:
    v = s.get("Value") or ""
    if not v:
        continue
    p(f"  @{s['Address']}: {v[:100]!r}")
    shown += 1
    if shown >= 30:
        break

# Base64 long
b64re = re.compile(r"^[A-Za-z0-9+/=]{32,}$")
b64s = [s for s in strings if b64re.match(s.get("Value") or "")]
p(f"\nbase64-ish count={len(b64s)}")
for s in b64s[:20]:
    p(f"  len={len(s['Value'])} {s['Value'][:60]}")

OUT.write_text("\n".join(lines), encoding="utf-8")
p(f"\nWrote {OUT}")
