# -*- coding: utf-8 -*-
"""Deep-dig root.mday / dayevent / doevent / creatpersonf / level fields."""
from __future__ import annotations

import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
DELTA = 0x400

KNOWN = {
    0x13ED240: "dayevent",
    0x13FA734: "doevent",
    0x13EF824: "randomlevel",
    0x13E9948: "addday",
    0x13EF9CC: "creatpersonf",
    0x13F1F3C: "creatpersonen",
    0x13F21D4: "creatpersonfr",
    0x13F2430: "creatpersonb",
    0x13F1834: "creatpersonm",
    0x13F0150: "creatperson",
    0x13F2340: "creatpersonwithm",
    0x13F892C: "cans",
    0x1422498: "ondayevent",
    0x13E4920: "varinit",
    0x13FD36C: "newgame",
    0x13FD41C: "startgame",
    0x13D6B2C: "act1event",
    0x13F91DC: "addeventlove",
    0x1EBDCAC: "InitializeArray",
    0x140B630: "getpe?",
}


def bl_target(pc: int, w: int) -> int | None:
    if (w & 0xFC000000) != 0x94000000:
        return None
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    return pc + (imm << 2)


def find_field_x(field_off: int, scan_start=0x13B0000, scan_end=0x1450000):
    assert field_off % 8 == 0
    imm = field_off // 8
    ldr, stre = [], []
    for off in range(scan_start - DELTA, scan_end - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        pc = off + DELTA
        if (w & 0xFFC00000) == 0xF9400000 and ((w >> 10) & 0xFFF) == imm:
            ldr.append(pc)
        if (w & 0xFFC00000) == 0xF9000000 and ((w >> 10) & 0xFFF) == imm:
            stre.append(pc)
    return stre, ldr


def decode_line(pc: int, w: int) -> str | None:
    if (w & 0x7F800000) == 0x52800000:
        rd = w & 0x1F
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        return f"MOVZ w{rd},#{imm}"
    if (w & 0x7F800000) == 0x72800000:
        rd = w & 0x1F
        imm = (w >> 5) & 0xFFFF
        hw = (w >> 21) & 3
        return f"MOVK w{rd},#{imm} LSL{hw * 16}"
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
    tgt = bl_target(pc, w)
    if tgt is not None:
        return f"BL {hex(tgt)} ({KNOWN.get(tgt, '?')})"
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
        return f"CMP w{(w >> 5) & 0x1F},#{(w >> 10) & 0xFFF}"
    if (w & 0xFFFFFC1F) == 0xD65F0000:
        return "RET"
    if (w & 0xFFE0FC00) == 0x2A0003E0:
        return f"MOV w{w & 0x1F},w{(w >> 16) & 0x1F}"
    if (w & 0xFFE0FC00) == 0xAA0003E0:
        return f"MOV x{w & 0x1F},x{(w >> 16) & 0x1F}"
    if (w & 0xFFC00000) == 0x91000000:
        rd, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = (w >> 10) & 0xFFF
        if (w >> 22) & 1:
            imm <<= 12
        return f"ADD x{rd},x{rn},#{imm}"
    return None


def ctx(pc0: int, before=0x50, after=0x30) -> None:
    print(f"\n--- @{hex(pc0)} ---")
    for pc in range(pc0 - before, pc0 + after, 4):
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        s = decode_line(pc, w)
        if s:
            mark = " <<<" if pc == pc0 else ""
            print(hex(pc), s + mark)


def xref_to(target: int, scan_start=0x13B0000, scan_end=0x1450000):
    hits = []
    for off in range(scan_start - DELTA, scan_end - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        pc = off + DELTA
        tgt = bl_target(pc, w)
        if tgt == target:
            hits.append(pc)
    return hits


print("=== mday field 0x148 accesses ===")
str_hits, ldr_hits = find_field_x(0x148)
print("STR count", len(str_hits), [hex(x) for x in str_hits])
print("LDR count", len(ldr_hits), [hex(x) for x in ldr_hits[:50]])

for pc in str_hits:
    ctx(pc)

print("\n=== events field 0x80 STR (init?) ===")
estr, eldr = find_field_x(0x80)
print("STR", [hex(x) for x in estr[:20]])

print("\n=== xrefs to dayevent / doevent / randomlevel / creatpersonf ===")
for name, rva in [
    ("dayevent", 0x13ED240),
    ("doevent", 0x13FA734),
    ("randomlevel", 0x13EF824),
    ("creatpersonf", 0x13EF9CC),
    ("creatpersonfr", 0x13F21D4),
    ("creatpersonen", 0x13F1F3C),
    ("creatperson", 0x13F0150),
    ("addday", 0x13E9948),
]:
    hits = xref_to(rva)
    print(f"{name} ({hex(rva)}): {len(hits)} calls -> {[hex(h) for h in hits[:25]]}")

# Which method contains each creatpersonf call? Approximate by nearest known method start.
ROOT_METHODS = []
import re

for m in re.finditer(
    r"// RVA: (0x[0-9A-F]+).*?\n\t(?:private|public|internal|protected).+? (\w+)\(",
    DUMP[DUMP.find("public class root") : DUMP.find("public class root") + 200000],
    re.S,
):
    ROOT_METHODS.append((int(m.group(1), 16), m.group(2)))
ROOT_METHODS.sort()


def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for rva, name in ROOT_METHODS:
        if rva > pc:
            break
        prev = (name, rva)
    return f"{prev[0]}@{hex(prev[1])}"


print("\n=== creatpersonf call sites with enclosing method ===")
for h in xref_to(0x13EF9CC):
    print(hex(h), "in", enclosing(h))

print("\n=== doevent call sites with enclosing ===")
for h in xref_to(0x13FA734):
    print(hex(h), "in", enclosing(h))

print("\n=== randomlevel call sites ===")
for h in xref_to(0x13EF824):
    print(hex(h), "in", enclosing(h))
    ctx(h, 0x30, 0x20)

# --- Resolve mday InitArray blob ---
print("\n=== resolve mday InitArray at 0x142b4f0 ===")
# Walk back to capture ADRP/LDR that feeds Field$ into x1 before InitArray
for pc in range(0x142b3c0, 0x142b500, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    s = decode_line(pc, w)
    if s:
        print(hex(pc), s)

# Also dump size-52 (13*4) PID blobs
print("\n=== all size-52 (int[13]) PID blobs ===")
import re as _re

m = _re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    _re.S,
)
for size, hx, off in _re.findall(
    r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
    m.group(1),
):
    size = int(size)
    o = int(off, 16)
    if size == 52:
        ints = list(struct.unpack("<" + "i" * 13, META[o : o + 52]))
        print(hex(o), hx[:16], ints)

# Wider BL xref (maybe thunks / different encoding) — scan entire so for BL to targets
print("\n=== wide BL xref scan ===")


def xref_wide(target: int):
    hits = []
    for off in range(0, len(SO) - 4, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        pc = off + DELTA
        tgt = bl_target(pc, w)
        if tgt == target:
            hits.append(pc)
    return hits


for name, rva in [
    ("dayevent", 0x13ED240),
    ("doevent", 0x13FA734),
    ("randomlevel", 0x13EF824),
    ("creatpersonf", 0x13EF9CC),
    ("addday", 0x13E9948),
]:
    hits = xref_wide(rva)
    print(f"{name}: {len(hits)} -> {[hex(h) for h in hits[:30]]}")

# Inspect LDR sites of mday — which methods read it
print("\n=== mday LDR enclosing methods ===")
_, ldr_hits = find_field_x(0x148)
for h in ldr_hits:
    print(hex(h), "in", enclosing(h))
    ctx(h, 0x28, 0x28)
