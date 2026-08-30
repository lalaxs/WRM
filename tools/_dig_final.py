# -*- coding: utf-8 -*-
"""Finalize: events list usage, person.addday cultivation, waittime0 string invoke, creatpersonf MI."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
DELTA = 0x400

start = DUMP.find("public class root")
chunk = DUMP[start : start + 250000]
ROOT_METHODS = []
for m in re.finditer(r"// RVA: (0x[0-9A-F]+).*?\n\t(?:private|public|internal).+? (\w+)\(", chunk, re.S):
    ROOT_METHODS.append((int(m.group(1), 16), m.group(2)))
ROOT_METHODS.sort()


def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for rva, name in ROOT_METHODS:
        if rva > pc:
            break
        prev = (name, rva)
    return f"{prev[0]}@{hex(prev[1])}"


# events List field 0x80 LDR/STR with enclosing
print("=== root.events (0x80) accesses ===")
imm = 0x80 // 8
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    if (w & 0xFFC00000) == 0xF9400000 and ((w >> 10) & 0xFFF) == imm:
        # filter: likely instance (not ADRP page+0x80)
        # heuristic: previous insn not ADRP to static page only — print all in root methods
        if 0x13B0000 <= pc <= 0x1450000:
            print("LDR", hex(pc), enclosing(pc))
    if (w & 0xFFC00000) == 0xF9000000 and ((w >> 10) & 0xFFF) == imm:
        print("STR", hex(pc), enclosing(pc))

# person.addday
print("\n=== person.addday disasm ===")
# from script: person$$addday 0x13cda80
rva = 0x13CDA80
for i in range(0, 0x200, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    s = None
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        immv = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        s = f"MOVZ w{rd},#{immv}"
    elif (w & 0xFFC00000) == 0xB9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        immv = ((w >> 10) & 0xFFF) * 4
        tags = {0x88: "exp", 0x90: "exp1", 0x98: "level_l", 0x9C: "level_s", 0x4C: "age"}
        s = f"LDR w{rt},[x{rn},#{hex(immv)}]{(' //'+tags[immv]) if immv in tags else ''}"
    elif (w & 0xFFC00000) == 0xB9000000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        immv = ((w >> 10) & 0xFFF) * 4
        tags = {0x88: "exp", 0x90: "exp1", 0x98: "level_l", 0x9C: "level_s"}
        s = f"STR w{rt},[x{rn},#{hex(immv)}]{(' //'+tags[immv]) if immv in tags else ''}"
    elif (w & 0xFC000000) == 0x94000000:
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        s = f"BL {hex(pc + (imm26 << 2))}"
    elif (w & 0xFFFFFC1F) == 0xD65F0000:
        s = "RET"
    elif (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        immv = ((w >> 10) & 0xFFF) * 8
        s = f"LDR x{rt},[x{rn},#{hex(immv)}]"
    elif (w & 0x7F80001F) == 0x7100001F:
        s = f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}"
    elif (w & 0xFF000010) == 0x54000000:
        immb = (w >> 5) & 0x7FFFF
        if immb & 0x40000:
            immb -= 0x80000
        s = f"B.{w&0xF:x} {hex(pc + immb * 4)}"
    if s:
        print(hex(pc), s)

# get_exp1 / level_exp1max usage near person getters
print("\n=== person get_exp1 / get_level_l bodies ===")
for name, rva in [("get_exp1", 0x13CBB20), ("get_level_l", 0x13CBBF8), ("set_exp1", 0x13CBB28), ("get_exp", 0x13CBA50)]:
    print(f"--- {name} ---")
    for i in range(0, 0x40, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        if (w & 0xFFC00000) == 0xB9400000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            immv = ((w >> 10) & 0xFFF) * 4
            print(hex(pc), f"LDR w{rt},[x{rn},#{hex(immv)}]")
        elif (w & 0xFFC00000) == 0xBD400000:  # LDR float
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            immv = ((w >> 10) & 0xFFF) * 4
            print(hex(pc), f"LDR s{rt},[x{rn},#{hex(immv)}]")
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            print(hex(pc), "RET")
            break
        elif (w & 0xFC000000) == 0x94000000:
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            print(hex(pc), f"BL {hex(pc+(imm26<<2))}")

# Find who BLs get_exp1 / set_exp1 / get_level_l in cultivation-looking methods
print("\n=== xrefs to person get/set exp1/level (sample) ===")


def xref(target, limit=15):
    hits = []
    for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        if (w & 0xFC000000) != 0x94000000:
            continue
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        pc = off + DELTA
        if pc + (imm26 << 2) == target:
            hits.append(pc)
            if len(hits) >= limit:
                break
    return hits


for name, rva in [
    ("get_exp1", 0x13CBB20),
    ("set_exp1", 0x13CBB28),
    ("get_level_l", 0x13CBBF8),
    ("set_level_l", 0x13CBC00),
    ("get_level_s", 0x13CBCCC),
    ("set_level_s", 0x13CBCD4),
    ("get_exp", 0x13CBA50),
    ("set_exp", 0x13CBA58),
]:
    hits = xref(rva, 12)
    print(name, len(hits), [(hex(h), enclosing(h)) for h in hits])

# Search encrypted-string decrypt sites that load literal "dayevent" via metadata token?
# Scan for UTF16/ASCII dayevent in SO
print("\n=== SO ascii dayevent ===")
for needle in [b"dayevent", b"doevent", b"randomlevel", b"creatpersonf"]:
    i = SO.find(needle)
    print(needle, hex(i + DELTA) if i >= 0 else None)

# waittime0 body - how it invokes by name
print("\n=== waittime0 / getpost invoke mechanism ===")
# find waittime0 MoveNext state machine
mm = re.search(r"root\.<waittime0>d__248.*?// RVA: (0x[0-9A-F]+)", DUMP, re.S)
print("waittime0 state machine hint", mm.group(1) if mm else None)
# root.waittime0
mm = re.search(r"// RVA: (0x[0-9A-F]+).*?\n\tprivate IEnumerator waittime0", DUMP)
print("waittime0", mm.group(1) if mm else None)

# Disasm small ondayevent already done - calls sendg
# Look at addday end for dayevent invoke via string
print("\n=== addday BL targets unique ===")
rva, size = 0x13E9948, 0x38F8
seen = {}
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm26 = w & 0x3FFFFFF
    if imm26 & (1 << 25):
        imm26 -= 1 << 26
    tgt = pc + (imm26 << 2)
    enc = enclosing(tgt) if 0x13B0000 <= tgt <= 0x1450000 else "?"
    seen[tgt] = enc
for tgt, enc in sorted(seen.items()):
    if enc.startswith("?"):
        continue
    print(hex(tgt), enc)

# randomlevel return: look for RET and w0
print("\n=== randomlevel tail ===")
for pc in range(0x13EF824, 0x13EF9CC, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0xFFFFFC1F) == 0xD65F0000:
        print(hex(pc), "RET")
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        immv = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        if rd == 0 or immv in (0, 1, 2, 3):
            print(hex(pc), f"MOVZ w{rd},#{immv}")

# Confirm dns tag_r / calendar: dump slot 0x2b1d6c0 from earlier notes
print("\n=== resolve dns.init len13 Field$ 0x2b1d6c0 ===")
# From disasm ADRP x8,0x2b1d000; LDR x8,[x8,#0x6c0] => 0x2b1d6c0
# reuse slot map quickly
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
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

for bss in [0x2B1D6C0, 0x2B1EF78]:
    hx = slot_to_hash.get(bss + 0x4000)
    print(hex(bss), "shadow", hx[:16] if hx else None, hash_to_blob.get(hx) if hx else None)
    if hx and hx in hash_to_blob:
        size, o = hash_to_blob[hx]
        ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size]))
        print("  ints", ints)
