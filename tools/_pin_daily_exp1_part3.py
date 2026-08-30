# -*- coding: utf-8 -*-
"""Pin lg_exp / dns.exp blobs + person.addday callers + exp1max usage."""
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
OUT = ROOT / "tools/_pin_daily_exp1_part3_out.txt"
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

log("=== size 32 int blobs (8 ints, plausible lg_exp) ===")
for hx, (sz, o) in sorted(hash_to_blob.items(), key=lambda x: x[1][1]):
    if sz != 32:
        continue
    ints = list(struct.unpack("<8i", META[o : o + 32]))
    if all(-10 <= x <= 1000 for x in ints) and max(ints) > 5:
        log(f"{hex(o)} {ints}")

log("\n=== size 40 int blobs (10 ints) ===")
for hx, (sz, o) in sorted(hash_to_blob.items(), key=lambda x: x[1][1]):
    if sz != 40:
        continue
    ints = list(struct.unpack("<10i", META[o : o + 40]))
    if max(ints) >= 50 and min(ints) >= 0 and max(ints) < 10_000_000:
        log(f"{hex(o)} {ints}")

# Known from dns-tables: level_speed handle 0x2b1c7d0
# Search InitArray near lg_exp by disasm getexps's class static load path already known 0x260
# Find who writes dns.static_fields+0x260 via scanning stores after loading static_fields

log("\n=== person.addday callers ===")
hits = []
for off in range(0x13B0000 - DELTA, 0x1450000 - DELTA, 4):
    w = struct.unpack_from("<I", SO, off)[0]
    if (w & 0xFC000000) != 0x94000000:
        continue
    imm = w & 0x3FFFFFF
    if imm & (1 << 25):
        imm -= 1 << 26
    pc = off + DELTA
    if pc + (imm << 2) == 0x13CDA80:
        hits.append(pc)
log([hex(h) for h in hits])

# Build enclosing from dump person+root
NAME = {}
for chunk_start in ("public class person", "public class root"):
    start = DUMP.find(chunk_start)
    chunk = DUMP[start : start + 200000]
    for mm in re.finditer(
        r"// RVA: (0x[0-9A-Fa-f]+).*?\n\t(?:private|public|internal|protected).+? ([A-Za-z_][A-Za-z0-9_]*)\(",
        chunk,
        re.S,
    ):
        NAME[int(mm.group(1), 16)] = mm.group(2)


def enc(pc: int) -> str:
    best = None
    for rva, name in NAME.items():
        if rva <= pc and (best is None or rva > best[0]):
            best = (rva, name)
    return f"{best[1]}@{hex(best[0])}" if best else "?"


for h in hits:
    log(f"  {hex(h)} {enc(h)}")
    for insn in md.disasm(SO[h - DELTA - 0x30 : h - DELTA + 0x8], h - 0x30):
        log(f"    0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")

log("\n=== get_exp1max callers (non set_exp1) ===")
for h in [0x13E90C0, 0x13F0A0C, 0x13FFDAC]:
    log(f"-- {hex(h)} {enc(h)} --")
    for insn in md.disasm(SO[h - DELTA - 0x50 : h - DELTA + 0x60], h - 0x50):
        log(f"0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")

# Resolve lg_exp via dns.init InitArray len=8
log("\n=== dns.init InitArray len=8 candidates (lg_exp?) ===")
rva0, end = 0x13BDD78, 0x13C0500
reg_abs = {}
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
    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        last_len = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
    if (w & 0xFC000000) == 0x94000000:
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        if pc + (imm << 2) == 0x1EBDCAC and last_len in (8, 10):
            # find handle
            for k in range(1, 10):
                w2 = struct.unpack_from("<I", SO, rva0 - DELTA + i - 4 * k)[0]
                if (w2 & 0xFFC00000) == 0xF9400000 and (w2 & 0x1F) == 1:
                    rn = (w2 >> 5) & 0x1F
                    src = reg_abs.get(rn)
                    log(f"{hex(pc)} InitArray len={last_len} handle_src={src}")
                    if src and src[0] == "abs":
                        # slot may be src[1] or src[1]+0x4000 depending on mapping
                        for key in (src[1], src[1] + 0x4000, src[1] - 0x4000):
                            hx = slot_to_hash.get(key)
                            if hx:
                                sz, o = hash_to_blob[hx]
                                ints = list(struct.unpack("<" + "i" * (sz // 4), META[o : o + sz]))
                                floats = list(struct.unpack("<" + "f" * (sz // 4), META[o : o + sz]))
                                log(f"  resolved key={hex(key)} meta={hex(o)} ints={ints}")
                                log(f"  floats={[round(f,4) for f in floats]}")
                    break

# Default _expsx: search creatperson / .ctor stores of 0x188
log("\n=== sample MOV+STR patterns to 0x188 near person factory ===")
# Scan person methods for fmov/mov immediate then str to 0x188 — already know only set_expsx writes
# Search float immediate stores: mov wN, #imm; fmov; str to somewhere in creatperson
for rva_name, rva in [("creatpersonf search window", 0x13F0C00)]:
    pass

# From root.addday path 0x13ec77c: same Δ = exps for both exp and exp1 when not dual-cult
log("\n=== SUMMARY CONSTANTS ===")
log("tag2 mult const = 1.05")
log("level factor = 0.2")
log("get_exp1s: 0.05 * skill? + sday/7300 + 1; speeds product; *2 if par==-2")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Wrote", OUT)
