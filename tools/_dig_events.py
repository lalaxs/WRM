# -*- coding: utf-8 -*-
"""Dig doevent/dayevent/randomlevel/creatpersonf/level fields."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
DELTA = 0x400

# Build root method map
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


print("mday init at", enclosing(0x142B4F0))
print("addday mday use at", enclosing(0x13EB900))

# Method sizes = next - this
METHOD_SIZE = {}
for i, (rva, name) in enumerate(ROOT_METHODS):
    nxt = ROOT_METHODS[i + 1][0] if i + 1 < len(ROOT_METHODS) else rva + 0x1000
    METHOD_SIZE[name] = (rva, min(nxt - rva, 0x8000))


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
        tag = {0x80: "events", 0x148: "mday", 0xE8: "persons", 0xA0: "ints"}.get(imm, "")
        return f"LDR x{rt},[x{rn},#{hex(imm)}]{(' //'+tag) if tag else ''}"
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
        tgt = pc + (imm << 2)
        return f"BL {hex(tgt)} ({enclosing(tgt) if 0x13B0000 <= tgt <= 0x1450000 else '?'})"
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
    return None


def dis_method(name, max_lines=250, interesting_only=False):
    rva, size = METHOD_SIZE[name]
    print(f"\n==== {name} {hex(rva)} size={hex(size)} ====")
    n = 0
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        s = decode(pc, w)
        if not s:
            continue
        if interesting_only:
            keep = any(
                k in s
                for k in (
                    "MOVZ",
                    "BL ",
                    "CMP",
                    "RET",
                    "events",
                    "mday",
                    "persons",
                    "0x80",
                    "0x110",
                    "LDR w",
                )
            )
            if not keep:
                continue
        print(hex(pc), s)
        n += 1
        if n >= max_lines:
            print("...truncated")
            break


# sizes
for name in ["dayevent", "doevent", "randomlevel", "creatpersonf", "addday", "ondayevent", "varinit", "Start"]:
    if name in METHOD_SIZE:
        print(name, hex(METHOD_SIZE[name][0]), "len", hex(METHOD_SIZE[name][1]))

dis_method("randomlevel", 120)
dis_method("ondayevent", 40)
dis_method("creatpersonf", 180)

# doevent: focus on early part + switch on temp[0]
dis_method("doevent", 300)

# dayevent: search for npclog static field / array index / creatperson / doevent-ish
print("\n==== dayevent interesting immediates & BLs ====")
rva, size = METHOD_SIZE["dayevent"]
imm_hist = {}
bls = []
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x7F800000) == 0x52800000:
        imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
        if imm < 600:
            imm_hist[imm] = imm_hist.get(imm, 0) + 1
    if (w & 0xFC000000) == 0x94000000:
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        tgt = pc + (imm26 << 2)
        bls.append((pc, tgt, enclosing(tgt) if 0x13B0000 <= tgt <= 0x1450000 else "?"))

print("MOVZ imm freq (top):", sorted(imm_hist.items(), key=lambda x: -x[1])[:40])
print("Unique BL targets in dayevent:")
seen = set()
for pc, tgt, enc in bls:
    if tgt in seen:
        continue
    seen.add(tgt)
    print(f"  {hex(pc)} -> {hex(tgt)} {enc}")

# Search dayevent for dns.npclog static load (bss known 0x2b1c788 from prior)
print("\n==== dayevent ADRP pages ====")
pages = set()
for i in range(0, size, 4):
    pc = rva + i
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    if (w & 0x9F000000) == 0x90000000:
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        page = (pc & ~0xFFF) + (imm << 12)
        pages.add(page)
print(sorted(hex(p) for p in pages))

# Find loads of 0x2b1c788 (npclog) anywhere in root range
print("\n==== npclog BSS 0x2b1c788 loads in root methods ====")
# ADRP to 0x2b1c000 + LDR #0x788
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    pc = off + DELTA
    if (w & 0xFFC00000) != 0xF9400000:
        continue
    imm = ((w >> 10) & 0xFFF) * 8
    if imm != 0x788:
        continue
    # check previous ADRP
    for k in range(1, 6):
        w2 = struct.unpack_from("<I", SO, off - 4 * k)[0]
        pc2 = pc - 4 * k
        if (w2 & 0x9F000000) == 0x90000000:
            immlo = (w2 >> 29) & 3
            immhi = (w2 >> 5) & 0x7FFFF
            immx = (immhi << 2) | immlo
            if immx & (1 << 20):
                immx -= 1 << 21
            page = (pc2 & ~0xFFF) + (immx << 12)
            if page == 0x2B1C000:
                print(hex(pc), "in", enclosing(pc))
                break
