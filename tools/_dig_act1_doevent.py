# -*- coding: utf-8 -*-
"""Read-only dig: act1event / addeventlove / randomaddlove / doevent field touches."""
from __future__ import annotations

import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
OFF = 0x4000
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))

by_addr = {m["Address"]: m for m in SJ["ScriptMethod"]}
by_name: dict[str, list] = {}
for m in SJ["ScriptMethod"]:
    by_name.setdefault(m["Name"].split("$$")[-1], []).append(m)
addrs = sorted(by_addr)


def method_len(addr: int) -> int:
    i = addrs.index(addr)
    nxt = addrs[i + 1] if i + 1 < len(addrs) else addr + 0x1000
    return nxt - addr


PERSON_FIELDS = {
    0x2C: "act1day",
    0x30: "sday",
    0x34: "slove",
    0x38: "slust",
    0x3C: "bday",
    0x40: "bdayl",
    0x44: "dlove",
    0x48: "dlust",
    0x4C: "_age",
    0x74: "_fami",
    0x78: "tags",
    0x80: "history",
    0xA0: "flags",
    0xD4: "desire",
    0xE4: "act1",
    0xE8: "_feel",
    0xEC: "_love",
    0xF0: "_lust",
    0xF4: "ma",
    0xF8: "fa",
    0xFC: "mo",
    0x100: "par",
    0x128: "frs",
    0x138: "ens",
}


def dis_range(va: int, size: int, label: str = "", max_lines: int = 600) -> None:
    print(f"\n==== {label} 0x{va:x} size=0x{size:x} ====")
    data = SO[va - OFF : va - OFF + size]
    lines = 0
    i = 0
    while i < size and lines < max_lines:
        insn = struct.unpack_from("<I", data, i)[0]
        pc = va + i
        out = None
        if (insn & 0xFC000000) == 0x94000000:
            imm26 = insn & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            target = pc + imm26 * 4
            name = by_addr.get(target, {}).get("Name", "?")
            out = f"0x{pc:x} BL 0x{target:x} ({name})"
        elif (insn & 0xFF000010) == 0x54000000:
            imm19 = (insn >> 5) & 0x7FFFF
            if imm19 & (1 << 18):
                imm19 -= 1 << 19
            target = pc + imm19 * 4
            out = f"0x{pc:x} B.cond{insn & 0xF} 0x{target:x}"
        elif (insn & 0xFC000000) == 0x14000000:
            imm26 = insn & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            target = pc + imm26 * 4
            out = f"0x{pc:x} B 0x{target:x}"
        else:
            op = None
            off = rn = rt = None
            top = insn & 0xFFC00000
            if top == 0xF9400000:
                op, scale = "LDR", 8
            elif top == 0xF9000000:
                op, scale = "STR", 8
            elif top == 0xB9400000:
                op, scale = "LDRW", 4
            elif top == 0xB9000000:
                op, scale = "STRW", 4
            elif top == 0xBD400000:
                op, scale = "LDRS", 4
            elif top == 0xBD000000:
                op, scale = "STRS", 4
            if op:
                off = ((insn >> 10) & 0xFFF) * scale
                rn = (insn >> 5) & 0x1F
                rt = insn & 0x1F
                note = ""
                if off in PERSON_FIELDS:
                    note = " //person." + PERSON_FIELDS[off]
                # always print float/int person-ish offsets and all BL/B
                if note or op in ("LDRS", "STRS") or (0x20 <= off <= 0x190):
                    out = f"0x{pc:x} {op} x{rt},[x{rn},#{off}]{note}"
            elif (insn & 0x7F800000) == 0x52800000:
                hw = (insn >> 21) & 3
                imm16 = (insn >> 5) & 0xFFFF
                rd = insn & 0x1F
                val = imm16 << (hw * 16)
                if val <= 2500:
                    out = f"0x{pc:x} MOVZ w{rd},#{val}"
            elif (insn & 0x7F800000) == 0x71000000:
                imm12 = (insn >> 10) & 0xFFF
                rn = (insn >> 5) & 0x1F
                if imm12 <= 2500:
                    out = f"0x{pc:x} CMP w{rn},#{imm12}"
        if out:
            print(out)
            lines += 1
        i += 4


def find_bls_to(target: int, within_name: str) -> list[int]:
    m = by_name[within_name][0]
    va = m["Address"]
    size = method_len(va)
    data = SO[va - OFF : va - OFF + size]
    hits = []
    for i in range(0, size, 4):
        insn = struct.unpack_from("<I", data, i)[0]
        if (insn & 0xFC000000) != 0x94000000:
            continue
        imm26 = insn & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        t = (va + i) + imm26 * 4
        if t == target:
            hits.append(va + i)
    return hits


def main() -> None:
    for name in [
        "act1event",
        "addeventlove",
        "randomaddlove",
        "addlove",
        "doevent",
        "get_love",
        "set_love",
        "get_lust",
        "set_lust",
        "get_feel",
        "set_feel",
        "refreshpbtlove",
    ]:
        for m in by_name.get(name, []):
            print(
                f"{name} @{hex(m['Address'])} len {hex(method_len(m['Address']))} :: {m['Signature']}"
            )

    act = by_name["act1event"][0]["Address"]
    print("\n=== addday BL -> act1event ===", [hex(x) for x in find_bls_to(act, "addday")])

    # whole-file BL xrefs to act1event (scan all method bodies — heavy but ok)
    print("\n=== all ScriptMethod BL -> act1event (caller names) ===")
    callers = {}
    for m in SJ["ScriptMethod"]:
        va = m["Address"]
        size = min(method_len(va), 0x20000)
        data = SO[va - OFF : va - OFF + size]
        for i in range(0, size, 4):
            insn = struct.unpack_from("<I", data, i)[0]
            if (insn & 0xFC000000) != 0x94000000:
                continue
            imm26 = insn & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            t = (va + i) + imm26 * 4
            if t == act:
                callers.setdefault(m["Name"], []).append(hex(va + i))
    for k, v in sorted(callers.items()):
        print(k, v[:12], ("..." if len(v) > 12 else ""), f"n={len(v)}")

    dis_range(act, method_len(act), "act1event")
    dis_range(
        by_name["addeventlove"][0]["Address"],
        method_len(by_name["addeventlove"][0]["Address"]),
        "addeventlove",
    )
    dis_range(
        by_name["randomaddlove"][0]["Address"],
        method_len(by_name["randomaddlove"][0]["Address"]),
        "randomaddlove",
    )
    for m in by_name.get("addlove", []):
        dis_range(m["Address"], method_len(m["Address"]), m["Name"])

    # doevent: focus field touches + GetString-ish + CMP event ids
    doe = by_name["doevent"][0]["Address"]
    dis_range(doe, method_len(doe), "doevent", max_lines=800)


if __name__ == "__main__":
    main()
