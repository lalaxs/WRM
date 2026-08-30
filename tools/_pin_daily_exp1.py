# -*- coding: utf-8 -*-
"""Pin person daily Δexp1 formula. DELTA = RVA - file_offset = 0x4000 (RX)."""
from __future__ import annotations

import re
import struct
from collections import Counter
from pathlib import Path

from capstone import CS_ARCH_ARM64, CS_MODE_ARM, Cs

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
OUT = ROOT / "tools/_pin_daily_exp1_out.txt"

DELTA = 0x4000  # correct RX delta; dump.cs Offset = RVA - 0x4000
md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
md.detail = False

# Known method RVAs from dump.cs
METHODS = {
    "person.get_exp1max": (0x13CBA9C, 0x84),
    "person.get_exp1": (0x13CBB20, 0x8),
    "person.set_exp1": (0x13CBB28, 0x40),
    "person.get_level_l": (0x13CBBF8, 0x8),
    "person.set_level_l": (0x13CBC00, 0xCC),
    "person.get_exp1s": (0x13CD924, 0x15C),
    "person.getexps": (0x13CB3FC, 0x1F4),
    "person.getlvups": (0x13CB754, 0x194),
    "person.getlvupd": (0x13CAF2C, 0x140),
    "person.addday": (0x13CDA80, 0x4D4),
    "person.lvup": (0x13CED7C, 0x800),  # size guess; refine later
    "root.addday": (0x13E9948, 0x38F8),
}

# person field tags (instance offsets)
PERSON_F = {
    0x88: "_exp",
    0x90: "_exp1",
    0x94: "_ftype",
    0x98: "_level_l",
    0x9C: "_level_s",
    0xC8: "lvups",
    0xCC: "lvupd",
    0xD0: "exps",
    0x188: "_expsx",
    0x4C: "_age",
    0x70: "_job",
    0x74: "_fami",
    0xE8: "_feel",
    0xEC: "_love",
    0xF0: "_lust",
    0x44: "dlove",
    0x48: "dlust",
    0x34: "slove",
    0x38: "slust",
}
DNS_F = {
    0x120: "level_speed",
    0x160: "level_exp1max",
    0x230: "exp",
    0x240: "lvup",
    0x108: "level_feel",
    0xE8: "level_yang",
    0x130: "tag_r",
}

# Build person+root method name map for BL annotation
PERSON_CHUNK = DUMP[DUMP.find("public class person") : DUMP.find("public class person") + 80000]
ROOT_CHUNK = DUMP[DUMP.find("public class root") : DUMP.find("public class root") + 250000]
NAME_BY_RVA = {}
for chunk in (PERSON_CHUNK, ROOT_CHUNK):
    for m in re.finditer(
        r"// RVA: (0x[0-9A-Fa-f]+).*?\n\t(?:private|public|internal|protected).+? ([A-Za-z_][A-Za-z0-9_]*)\(",
        chunk,
        re.S,
    ):
        NAME_BY_RVA[int(m.group(1), 16)] = m.group(2)

# Also pull dns methods
DNS_START = DUMP.find("public class dns")
DNS_CHUNK = DUMP[DNS_START : DNS_START + 30000]
for m in re.finditer(
    r"// RVA: (0x[0-9A-Fa-f]+).*?\n\t(?:private|public|internal|protected|static).+? ([A-Za-z_][A-Za-z0-9_]*)\(",
    DNS_CHUNK,
    re.S,
):
    NAME_BY_RVA[int(m.group(1), 16)] = "dns." + m.group(2)

# common il2cpp helpers / unity often appear — leave as hex if unknown

lines: list[str] = []


def log(s: str = "") -> None:
    lines.append(s)
    print(s)


def so_off(rva: int) -> int:
    return rva - DELTA


def disasm(rva: int, size: int, title: str) -> list[tuple[int, str, bytes]]:
    log(f"\n==== {title} @ {hex(rva)} len {hex(size)} ====")
    code = SO[so_off(rva) : so_off(rva) + size]
    out = []
    for insn in md.disasm(code, rva):
        note = ""
        op = insn.op_str
        # annotate BL targets
        if insn.mnemonic == "bl":
            try:
                tgt = int(insn.op_str.lstrip("#"), 16)
                name = NAME_BY_RVA.get(tgt)
                if name:
                    note = f"  ; {name}"
                else:
                    note = f"  ; ?@{hex(tgt)}"
            except Exception:
                pass
        # annotate LDR/STR with known fields
        if insn.mnemonic in ("ldr", "str", "ldrs", "strs", "ldrsw") or insn.mnemonic.startswith("ldur") or insn.mnemonic.startswith("stur"):
            # look for #0xNN
            m = re.search(r"#(0x[0-9a-fA-F]+|#?\d+)", op)
            # better: [xn, #imm]
            m2 = re.search(r"\[(x\d+|sp),\s*#(0x[0-9a-fA-F]+|\d+)\]", op)
            if m2:
                imm_s = m2.group(2)
                imm = int(imm_s, 16) if imm_s.startswith("0x") else int(imm_s)
                tag = PERSON_F.get(imm) or DNS_F.get(imm)
                if tag:
                    note += f"  ; {tag}"
        text = f"0x{insn.address:08x}: {insn.mnemonic:8s} {insn.op_str}{note}"
        log(text)
        out.append((insn.address, f"{insn.mnemonic} {insn.op_str}{note}", insn.bytes))
        if insn.mnemonic == "ret" and title.startswith("person.get"):
            break
    return out


def find_xrefs(target: int, lo: int = 0x13B0000, hi: int = 0x1450000, limit: int = 40) -> list[int]:
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


def enclosing(pc: int) -> str:
    # nearest method start from NAME_BY_RVA
    best = None
    for rva, name in NAME_BY_RVA.items():
        if rva <= pc and (best is None or rva > best[0]):
            best = (rva, name)
    if not best:
        return "?"
    return f"{best[1]}@{hex(best[0])}"


log(f"DELTA={hex(DELTA)} verify dump Offset for addday: RVA 0x13CDA80 Offset should be 0x13C9A80")
log(f"file bytes at so_off: {SO[so_off(0x13CDA80):so_off(0x13CDA80)+4].hex()}")

# Disassemble core getters/setters and addday
for name, (rva, size) in METHODS.items():
    if name in ("root.addday", "person.lvup"):
        continue  # handle specially
    disasm(rva, size, name)

# person.lvup: find size from next method
lvup_rva = 0x13CED7C
# next method after lvup in dump
nexts = sorted(r for r in NAME_BY_RVA if r > lvup_rva)
lvup_size = min(0xC00, (nexts[0] - lvup_rva) if nexts else 0x800)
disasm(lvup_rva, lvup_size, "person.lvup")

# Focus: BL sites to set_exp1 / get_exp1s / get_exp1max inside person.addday and root.addday
log("\n==== XREFS set_exp1 / get_exp1s / get_exp1max / get_exp1 / lvup ====")
for label, rva in [
    ("set_exp1", 0x13CBB28),
    ("get_exp1", 0x13CBB20),
    ("get_exp1s", 0x13CD924),
    ("get_exp1max", 0x13CBA9C),
    ("lvup", 0x13CED7C),
    ("getexps", 0x13CB3FC),
]:
    hits = find_xrefs(rva)
    log(f"\n{label} @{hex(rva)} xrefs={len(hits)}")
    for h in hits:
        log(f"  {hex(h)}  {enclosing(h)}")

# Disasm windows around set_exp1 calls inside person.addday
log("\n==== person.addday windows around set_exp1 / lvup / set_exp ====")
addday_hits = [h for h in find_xrefs(0x13CBB28) if 0x13CDA80 <= h < 0x13CDA80 + 0x4D4]
addday_hits += [h for h in find_xrefs(0x13CED7C) if 0x13CDA80 <= h < 0x13CDA80 + 0x4D4]
addday_hits += [h for h in find_xrefs(0x13CBA58) if 0x13CDA80 <= h < 0x13CDA80 + 0x4D4]
for h in sorted(set(addday_hits)):
    disasm(h - 0x80, 0x120, f"addday_win@{hex(h)}")

# root.addday windows around set_exp1 / get_exp1s
log("\n==== root.addday windows around set_exp1 / get_exp1s ====")
for tgt_name, tgt in [("set_exp1", 0x13CBB28), ("get_exp1s", 0x13CD924)]:
    hits = [h for h in find_xrefs(tgt, lo=0x13E9948, hi=0x13E9948 + 0x38F8, limit=20) if 0x13E9948 <= h < 0x13E9948 + 0x38F8]
    log(f"root.addday calls {tgt_name}: {len(hits)} -> {[hex(h) for h in hits]}")
    for h in hits:
        disasm(h - 0xA0, 0x160, f"root.addday_win_{tgt_name}@{hex(h)}")

# Scan get_exp1s body for level_speed (dns+0x120) and _level_l
log("\n==== Scan get_exp1s / get_exp1max for dns static field loads ====")
# Heuristic: ADRP + LDR of dns class static fields often via Il2CppClass static_fields
# Look for imm offsets 0x120 / 0x160 in these methods
for name, (rva, size) in [
    ("get_exp1s", (0x13CD924, 0x15C)),
    ("get_exp1max", (0x13CBA9C, 0x84)),
    ("getexps", (0x13CB3FC, 0x1F4)),
    ("person.addday", (0x13CDA80, 0x4D4)),
]:
    code = SO[so_off(rva) : so_off(rva) + size]
    found = []
    for insn in md.disasm(code, rva):
        if "#0x120" in insn.op_str or "#0x160" in insn.op_str or "#288" in insn.op_str or "#352" in insn.op_str:
            found.append(f"0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")
        if "#0x90" in insn.op_str or "#0x98" in insn.op_str or "#0xd0" in insn.op_str:
            found.append(f"0x{insn.address:x}: {insn.mnemonic} {insn.op_str}")
    log(f"{name} field-imm hits ({len(found)}):")
    for f in found:
        log("  " + f)

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"\nWrote {OUT}")
