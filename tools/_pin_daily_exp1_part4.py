# -*- coding: utf-8 -*-
"""Confirm lg_exp=0x48B180 via static+0x260 store; find default expsx; dns.exp table."""
from __future__ import annotations

import re
import struct
from pathlib import Path

from capstone import CS_ARCH_ARM64, CS_MODE_ARM, Cs

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")
OUT = ROOT / "tools/_pin_daily_exp1_part4_out.txt"
DELTA = 0x4000
md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)

lines: list[str] = []


def log(s: str = "") -> None:
    lines.append(s)
    print(s)


m = re.search(
    r"internal sealed class <PrivateImplementationDetails> // TypeDefIndex: 5114\n\{(.*?)\n\}",
    DUMP,
    re.S,
)
hash_to_blob = {
    hx: (int(size), int(off, 16))
    for size, hx, off in re.findall(
        r"__StaticArrayInitTypeSize=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
        m.group(1),
    )
}
field_addr = {
    int(a): hx
    for a, hx in re.findall(
        r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
        RAW,
    )
}
# Also reverse: meta offset -> hash
meta_to_hash = {off: hx for hx, (sz, off) in hash_to_blob.items()}

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

# Find Field$ for meta 0x48B180 and 0x48AB00
for meta_off, label in [
    (0x48B180, "lg_exp_candidate"),
    (0x48B808, "lg_exp_alt"),
    (0x48A9B8, "level_exp1max_candidate"),
    (0x48AB00, "dns_exp_candidate_100xish"),
    (0x48A608, "lvup_rate"),
]:
    hx = meta_to_hash.get(meta_off)
    log(f"{label} meta {hex(meta_off)} hx={hx[:16] if hx else None}...")
    if not hx:
        continue
    # find slots pointing to this hash
    slots = [s for s, h in slot_to_hash.items() if h == hx]
    log(f"  slots: {[hex(s) for s in slots]}")

# Broader InitArray scan in dns.init + rereward for len 8 and 10
log("\n=== InitArray len 8/10 in 0x13bdd78..0x13c3000 ===")
rva0, end = 0x13BDD78, 0x13C3000
reg_abs: dict = {}
last_len = None
for i in range(0, end - rva0, 4):
    w = struct.unpack_from("<I", SO, rva0 - DELTA + i)[0]
    pc = rva0 + i
    if (w & 0x9F000000) == 0x90000000:
        rd = w & 0x1F
        immlo = (w >> 29) & 3
        immhi = (w >> 5) & 0x7FFFF
        imm = (immhi << 2) | immlo
        if imm & (1 << 20):
            imm -= 1 << 21
        reg_abs[rd] = ("page", (pc & ~0xFFF) + (imm << 12))
    if (w & 0xFFC00000) == 0xF9400000:
        rt, rn = w & 0x1F, (w >> 5) & 0x1F
        imm = ((w >> 10) & 0xFFF) * 8
        base = reg_abs.get(rn)
        if base and base[0] == "page":
            reg_abs[rt] = ("abs", base[1] + imm)
        elif base and base[0] == "abs":
            # chained? rare
            pass
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        tgt = pc + (imm << 2)
        if tgt == 0x1EBDCAC and last_len in (8, 10):
            handle = None
            for k in range(1, 12):
                w2 = struct.unpack_from("<I", SO, rva0 - DELTA + i - 4 * k)[0]
                if (w2 & 0xFFC00000) == 0xF9400000 and (w2 & 0x1F) == 1:
                    rn = (w2 >> 5) & 0x1F
                    handle = reg_abs.get(rn)
                    break
                if (w2 & 0xFFC00000) == 0xF9400000:
                    # ldr x1, [xn]
                    pass
            log(f"{hex(pc)} len={last_len} handle={handle}")
            if handle and handle[0] == "abs":
                for key in (handle[1], handle[1] + 0x4000, handle[1] - 0x4000, handle[1] + 0x8000, handle[1] - 0x8000):
                    hx = slot_to_hash.get(key)
                    if hx and hx in hash_to_blob:
                        sz, o = hash_to_blob[hx]
                        ints = list(struct.unpack("<" + "i" * (sz // 4), META[o : o + sz]))
                        log(f"  -> key {hex(key)} meta {hex(o)} {ints}")

# Find stores to static_fields+0x260 by pattern:
# after dns class cctor-ish, look for add xN, xM, #0x260; str
log("\n=== ADD/STR imm 0x260 / 0x230 near dns.init ===")
for pc in range(0x13BDD78, 0x13C4000, 4):
    w = struct.unpack_from("<I", SO, pc - DELTA)[0]
    # ADD Xd, Xn, #0x260 (imm12)
    if (w & 0xFFC00000) == 0x91000000:
        imm = (w >> 10) & 0xFFF
        if imm in (0x120, 0x160, 0x230, 0x260, 0x240):
            log(f"{hex(pc)} ADD x{w&0x1F}, x{(w>>5)&0x1F}, #{hex(imm)}")
    # STR Xt, [Xn, #imm]
    if (w & 0xFFC00000) == 0xF9000000:
        imm = ((w >> 10) & 0xFFF) * 8
        if imm in (0x120, 0x160, 0x230, 0x260, 0x240):
            log(f"{hex(pc)} STR x{w&0x1F}, [x{(w>>5)&0x1F}, #{hex(imm)}]")

# Default expsx: scan creatperson for float stores to #0x188
log("\n=== creatperson region float STR #0x188 / nearby fmov ===")
# person.creatperson @ from dump
mm = re.search(r"// RVA: (0x[0-9A-Fa-f]+).*?\n\tpublic void creatperson\(", DUMP)
log(f"creatperson RVA hint from first match search: {mm.group(1) if mm else None}")
# use 0x13F0150 from earlier enclosing
for rva, size in [(0x13F0150, 0x1800), (0x13F892C, 0x200)]:
    code = SO[rva - DELTA : rva - DELTA + size]
    for insn in md.disasm(code, rva):
        if "#0x188" in insn.op_str or (insn.mnemonic in ("fmov", "mov") and "0x3f" in insn.op_str.lower()):
            if "#0x188" in insn.op_str or "w8" in insn.op_str:
                log(f"0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")

# Search all BL to set_expsx
log("\n=== set_expsx callers ===")
hits = []
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    pc = off + DELTA
    if pc + (imm << 2) == 0x13CD91C:
        hits.append(pc)
log([hex(h) for h in hits])
for h in hits[:15]:
    # look back for float materialization
    log(f"-- {hex(h)} --")
    for insn in md.disasm(SO[h - DELTA - 0x40 : h - DELTA + 4], h - 0x40):
        log(f"0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")

# Confirm level_exp1max via get_exp1max already uses static+0x160
# Confirm dns.exp via addday load static+0x230 — resolve that array's init
log("\n=== blob 0x48AB00 vs 0x48A9B8 ratio ===")
a = list(struct.unpack("<10i", META[0x48A9B8 : 0x48A9B8 + 40]))
b = list(struct.unpack("<10i", META[0x48AB00 : 0x48AB00 + 40]))
log(f"level_exp1max? {a}")
log(f"dns.exp?       {b}")
log(f"ratios {[round(b[i]/a[i],3) if a[i] else None for i in range(10)]}")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Wrote", OUT)
