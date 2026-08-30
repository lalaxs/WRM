# -*- coding: utf-8 -*-
"""Resolve constants + getexps xrefs + root.addday exp1 paths + confirm dns.exp / level_exp1max."""
from __future__ import annotations

import struct
from pathlib import Path

from capstone import CS_ARCH_ARM64, CS_MODE_ARM, Cs

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
OUT = ROOT / "tools/_pin_daily_exp1_part2_out.txt"
DELTA = 0x4000
md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)

lines: list[str] = []


def log(s: str = "") -> None:
    lines.append(s)
    print(s)


def so_off(rva: int) -> int:
    return rva - DELTA


def f32(bits: int) -> float:
    return struct.unpack("<f", struct.pack("<I", bits & 0xFFFFFFFF))[0]


# Float literals from ADRP pages used in get_exp1s / getexps
# adrp x8, #0x72a000; ldr sN, [x8, #imm]
consts = {
    "get_exp1s_s2": 0x72A000 + 0x614,
    "get_exp1s_s4": 0x72A000 + 0x618,
    "getexps_tag2": 0x72A000 + 0x5C8,
    "getexps_tag19_and_level": 0x72A000 + 0x6BC,
}
log("=== float consts (VA as used in ADRP+LDR; file = VA-DELTA if in so) ===")
for name, va in consts.items():
    # These may be in .data of so or absolute - try so_off
    off = va - DELTA
    if 0 <= off < len(SO):
        val = struct.unpack_from("<f", SO, off)[0]
        raw = struct.unpack_from("<I", SO, off)[0]
        log(f"{name} VA {hex(va)} file {hex(off)} = {val} raw={hex(raw)}")
    else:
        log(f"{name} VA {hex(va)} OUT OF SO range")

# Also try without delta (if absolute mapped differently)
log("\n=== try raw file offset = VA (no delta) ===")
for name, va in consts.items():
    if 0 <= va < len(SO):
        val = struct.unpack_from("<f", SO, va)[0]
        log(f"{name} file={hex(va)} = {val}")

# ELF: find PT_LOAD mapping for 0x72a000
log("\n=== ELF program headers ===")
assert SO[:4] == b"\x7fELF"
e_phoff = struct.unpack_from("<Q", SO, 0x20)[0]
e_phentsize = struct.unpack_from("<H", SO, 0x36)[0]
e_phnum = struct.unpack_from("<H", SO, 0x38)[0]
for i in range(e_phnum):
    off = e_phoff + i * e_phentsize
    p_type, p_flags = struct.unpack_from("<II", SO, off)
    p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_align = struct.unpack_from("<QQQQQQ", SO, off + 8)
    if p_type == 1:  # PT_LOAD
        log(f"LOAD flags={p_flags:#x} off={hex(p_offset)} vaddr={hex(p_vaddr)} filesz={hex(p_filesz)} memsz={hex(p_memsz)} delta={hex(p_vaddr-p_offset)}")
        if p_vaddr <= 0x72A614 < p_vaddr + p_memsz:
            file_off = p_offset + (0x72A614 - p_vaddr)
            val = struct.unpack_from("<f", SO, file_off)[0]
            log(f"  -> 0x72A614 file {hex(file_off)} = {val}")
            for name, va in consts.items():
                fo = p_offset + (va - p_vaddr)
                v = struct.unpack_from("<f", SO, fo)[0]
                log(f"  {name} = {v}")

# Immediate float 0x42c80000
log(f"\n0x42c80000 as float = {f32(0x42c80000)}")

# Disasm root.addday around first set_exp1 more carefully with float ops
log("\n==== root.addday dual-cult path @ 0x13ec4f0..0x13ec620 ====")
code = SO[so_off(0x13EC4F0) : so_off(0x13EC620)]
for insn in md.disasm(code, 0x13EC4F0):
    log(f"0x{insn.address:08x}: {insn.mnemonic:8s} {insn.op_str}")

# Other two set_exp1 sites - short context
for start in (0x13EC740, 0x13EC880):
    log(f"\n==== root.addday @ {hex(start)} ====")
    code = SO[so_off(start) : so_off(start) + 0x100]
    for insn in md.disasm(code, start):
        log(f"0x{insn.address:08x}: {insn.mnemonic:8s} {insn.op_str}")

# getexps xrefs with names
log("\n==== getexps / set_expsx xrefs ====")


def find_bl(target, lo=0x13B0000, hi=0x1450000, limit=30):
    hits = []
    for off in range(so_off(lo), so_off(hi), 4):
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


for h in find_bl(0x13CB3FC):
    log(f"getexps called from {hex(h)}")

# set_expsx
log("\nset_expsx @ 0x13CD91C")
for insn in md.disasm(SO[so_off(0x13CD914) : so_off(0x13CD924)], 0x13CD914):
    log(f"0x{insn.address:08x}: {insn.mnemonic:8s} {insn.op_str}")

# Who writes _expsx / calls getexps nearby
log("\n==== STR to person+0x188 (_expsx) in game range ====")
count = 0
for off in range(so_off(0x13B0000), so_off(0x1450000), 4):
    w = struct.unpack_from("<I", SO, off)[0]
    # STR St, [Xn, #0x188]  => BD00xxxx with imm=0x188/4=0x62
    if (w & 0xFFC00000) == 0xBD000000 and ((w >> 10) & 0xFFF) == (0x188 // 4):
        log(f"STRS @{hex(off+DELTA)} rt=s{w&0x1F} rn=x{(w>>5)&0x1F}")
        count += 1
        if count >= 25:
            break

# Confirm dns.exp table values from metadata candidate
# From dns-tables: level_exp1max candidate at 0x48A9B8
log("\n==== metadata blobs size 40 (10 ints) near known ====")
for meta_off in (0x48A9B8, 0x48B5D8, 0x48A660, 0x48ACE8):
    blob = META[meta_off : meta_off + 40]
    ints = list(struct.unpack("<10i", blob))
    floats = list(struct.unpack("<10f", blob))
    log(f"meta {hex(meta_off)} ints={ints}")
    log(f"  floats={[round(f,4) for f in floats]}")

# Find dns.exp init - field 0x230
# Search dns.init for store to static+0x230
log("\n==== dns.init stores to +0x230 (exp) / +0x160 (level_exp1max) / +0x120 ====")
# Use existing map if any - scan InitArray lens near dns.init
rva0, end = 0x13BDD78, 0x13BE288
reg_page = {}
last_len = None
for i in range(0, end - rva0, 4):
    w = struct.unpack_from("<I", SO, so_off(rva0) + i)[0]
    pc = rva0 + i
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        reg_page[rd] = (pc & ~0xFFF) + (imm << 12)
    if (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        if rn in reg_page:
            reg_page[rt] = reg_page[rn] + imm  # abuse: store abs in same dict as page
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    # STR xN, [xM, #0x230] etc on static fields
    if (w & 0xFFC00000) == 0xF9000000:
        imm = ((w >> 10) & 0xFFF) * 8
        if imm in (0x120, 0x160, 0x230, 0x260):
            log(f"{hex(pc)} STR [x{(w>>5)&0x1F},#{hex(imm)}] len_hint={last_len}")

# person field 0x21 - dump surrounding bools from dump offsets
log("\n=== person+0x21 context: likely packed flags after cc ===")
log("fields: cc@0x24, _fly@0x28 — 0x10..0x23 may be generated backing for props")

# Read get_live body
log("\n==== get_live / get_d / get_leave ====")
for name, rva in [("get_d", 0x13CAA44), ("get_live", 0x13CAB40), ("get_leave", 0x13CADB0)]:
    code = SO[so_off(rva) : so_off(rva) + 0x40]
    log(f"-- {name} --")
    for insn in md.disasm(code, rva):
        log(f"0x{insn.address:08x}: {insn.mnemonic:8s} {insn.op_str}")
        if insn.mnemonic == "ret":
            break

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {OUT}")
