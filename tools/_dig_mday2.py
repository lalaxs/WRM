# -*- coding: utf-8 -*-
"""Resolve mday blob + dig addday/dayevent/doevent usage + string invokes."""
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

# PID blobs
m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)
hash_to_blob = {}
for size, hx, off in re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
):
    hash_to_blob[hx] = (int(size), int(off, 16))

field_addr = {}
for mm in re.finditer(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    field_addr[int(mm.group(1))] = mm.group(2)

# slot registration triples
slot_to_hash = {}
for base in range(0x3A0000, 0x3C0000, 8):
    if base + 24 > len(SO):
        break
    if struct.unpack_from("<Q", SO, base + 8)[0] != 0x403:
        continue
    slot = struct.unpack_from("<Q", SO, base)[0]
    fld = struct.unpack_from("<Q", SO, base + 16)[0]
    hx = field_addr.get(fld)
    if hx:
        slot_to_hash[slot] = hx


def dump_bss(bss: int, label: str) -> None:
    print(f"\n=== {label} BSS {hex(bss)} ===")
    for d in (0, 0x4000, -0x4000, 0x1000, 0x8000, 0x2000, -0x2000):
        hx = slot_to_hash.get(bss + d)
        if hx and hx in hash_to_blob:
            size, o = hash_to_blob[hx]
            blob = META[o : o + size]
            ints = list(struct.unpack("<" + "i" * (size // 4), blob)) if size % 4 == 0 else None
            print(f"  d={hex(d)} size={size} meta={hex(o)} ints={ints}")
            return
    # raw pointer at file offset?
    fo = bss - DELTA if bss > DELTA else None
    print("  unresolved via slots; try direct Field$ addr match")
    # Sometimes BSS holds Field$ RVA directly after init
    if fo and 0 <= fo < len(SO) - 8:
        v = struct.unpack_from("<Q", SO, fo)[0]
        print(f"  raw@{hex(fo)}={hex(v)} field={field_addr.get(v)}")


# From init: ADRP x21,0x2b1e000; LDR x21,[x21,#0xf78] => 0x2b1ef78
dump_bss(0x2B1EF78, "mday Field$ handle")

# Also try matching size-52 hashes against Field$ addresses near that page
print("\n=== Field$ addresses for size-52 blobs ===")
for hx, (size, o) in hash_to_blob.items():
    if size != 52:
        continue
    addrs = [a for a, h in field_addr.items() if h == hx]
    ints = list(struct.unpack("<" + "i" * 13, META[o : o + 52]))
    print(hex(o), hx[:16], "Field$addrs", [hex(a) for a in addrs], ints)


def decode(pc, w):
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        return f"MOVZ w{rd},#{imm}"
    if (w & 0x7F800000) == 0x72800000:
        rd = w & 0x1F
        imm = (w >> 5) & 0xFFFF
        hw = (w >> 21) & 3
        return f"MOVK w{rd},#{imm} LSL{hw*16}"
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        return f"ADRP x{rd},{hex(page)}"
    if (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        return f"LDR x{rt},[x{rn},#{hex(imm)}]"
    if (w & 0xFFC00000) == 0xB9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 4
        return f"LDR w{rt},[x{rn},#{hex(imm)}]"
    if (w & 0xFFC00000) == 0xF9000000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        return f"STR x{rt},[x{rn},#{hex(imm)}]"
    if (w & 0xFFC00000) == 0xB9000000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 4
        return f"STR w{rt},[x{rn},#{hex(imm)}]"
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        return f"BL {hex(pc + (imm << 2))}"
    if (w & 0xFF000010) == 0x54000000:
        imm = (w >> 5) & 0x7FFFF
        if imm & 0x40000:
            imm -= 0x80000
        return f"B.{w & 0xF:x} {hex(pc + imm * 4)}"
    if (w & 0xFC000000) == 0x14000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        return f"B {hex(pc + (imm << 2))}"
    if (w & 0x7F80001F) == 0x7100001F:
        return f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}"
    if (w & 0x7FE0FC00) == 0x6B00001F:
        return f"CMP w{(w>>5)&0x1F},w{(w>>16)&0x1F}"
    if (w & 0xFFFFFC1F) == 0xD65F0000:
        return "RET"
    if (w & 0xFFE0FC00) == 0x2A0003E0:
        return f"MOV w{w&0x1F},w{(w>>16)&0x1F}"
    if (w & 0xFFE0FC00) == 0xAA0003E0:
        return f"MOV x{w&0x1F},x{(w>>16)&0x1F}"
    if (w & 0xFFC00000) == 0x91000000:
        rd, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = (w >> 10) & 0xFFF
        if (w >> 22) & 1:
            imm <<= 12
        return f"ADD x{rd},x{rn},#{imm}"
    if (w & 0xFFC00000) == 0xD1000000:
        rd, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = (w >> 10) & 0xFFF
        return f"SUB x{rd},x{rn},#{imm}"
    # LDR extended register (array index): 0xB8600800 family
    if (w & 0xFFE00C00) == 0xB8600800:
        return f"LDR w{w&0x1F},[x{(w>>5)&0x1F},x{(w>>16)&0x1F},sxtw #2?]"
    if (w & 0xFFE00C00) == 0xB8604800:
        return f"LDR w-index scaled"
    return None


def dis_range(rva, size, label):
    print(f"\n==== {label} {hex(rva)}..{hex(rva+size)} ====")
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        s = decode(pc, w)
        if s:
            print(hex(pc), s)


# addday mday section: around 0x13eb900, extend to understand indexing
dis_range(0x13EB8C0, 0x400, "addday mday region")

# Search metadata strings for dayevent/doevent
print("\n=== metadata string hits for dayevent/doevent/mday ===")
for needle in [b"dayevent", b"doevent", b"ondayevent", b"randomlevel", b"creatpersonf", b"mday", b"npclog"]:
    idx = 0
    hits = []
    while True:
        i = META.find(needle, idx)
        if i < 0:
            break
        # print surrounding printable
        frag = META[max(0, i - 8) : i + len(needle) + 24]
        hits.append((hex(i), frag))
        idx = i + 1
        if len(hits) >= 5:
            break
    print(needle, hits)

# script.json method entries
print("\n=== script.json Address for key methods ===")
for name in ["dayevent", "doevent", "randomlevel", "creatpersonf", "addday", "ondayevent"]:
    pat = rf'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"root::{name}"'
    mm = re.search(pat, RAW)
    if mm:
        print(name, hex(int(mm.group(1))))
    else:
        # try without namespace
        pat2 = rf'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"[^"]*{name}"'
        found = []
        for m2 in re.finditer(pat2, RAW):
            found.append((hex(int(m2.group(1))), m2.group(0)[:80]))
            if len(found) >= 3:
                break
        print(name, "alt", found[:3])

# Check if MethodInfo pointers contain the RVA (absolute VA in binary)
print("\n=== search SO for little-endian RVA constants of dayevent etc ===")
for name, rva in [
    ("dayevent", 0x13ED240),
    ("doevent", 0x13FA734),
    ("randomlevel", 0x13EF824),
    ("creatpersonf", 0x13EF9CC),
    ("addday", 0x13E9948),
]:
    pat = struct.pack("<I", rva)
    hits = []
    start = 0
    while True:
        i = SO.find(pat, start)
        if i < 0:
            break
        hits.append(hex(i + DELTA))
        start = i + 4
        if len(hits) >= 15:
            break
    print(name, "ptr hits", len(hits), hits[:15])
