# -*- coding: utf-8 -*-
"""Dig showinfo/addinfohistory for eventt string build + person.addday four-value decay."""
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
    return (addrs[i + 1] if i + 1 < len(addrs) else addr + 0x1000) - addr


def bl_callees(va: int, size: int) -> dict[str, int]:
    data = SO[va - OFF : va - OFF + size]
    cals: dict[str, int] = {}
    for i in range(0, size, 4):
        insn = struct.unpack_from("<I", data, i)[0]
        if (insn & 0xFC000000) != 0x94000000:
            continue
        imm26 = insn & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        t = (va + i) + imm26 * 4
        nm = by_addr.get(t, {}).get("Name", f"?@{hex(t)}")
        cals[nm] = cals.get(nm, 0) + 1
    return cals


def float_touches(va: int, size: int) -> list[str]:
    PERSON = {
        0x34: "slove",
        0x38: "slust",
        0x44: "dlove",
        0x48: "dlust",
        0xD4: "desire",
        0xE8: "_feel",
        0xEC: "_love",
        0xF0: "_lust",
    }
    data = SO[va - OFF : va - OFF + size]
    out = []
    for i in range(0, size, 4):
        insn = struct.unpack_from("<I", data, i)[0]
        top = insn & 0xFFC00000
        if top not in (0xBD400000, 0xBD000000):
            continue
        off = ((insn >> 10) & 0xFFF) * 4
        if off in PERSON:
            op = "LDRS" if top == 0xBD400000 else "STRS"
            out.append(f"0x{va+i:x} {op} {PERSON[off]}")
    return out


def main() -> None:
    for name in [
        "showinfo",
        "showinfo0",
        "addinfohistory",
        "showhistory",
        "addhistory",
        "addevent",
        "addday",
    ]:
        for m in by_name.get(name, []):
            print(f"\n==== {m['Name']} @{hex(m['Address'])} len {hex(method_len(m['Address']))} ====")
            cals = bl_callees(m["Address"], method_len(m["Address"]))
            for nm, n in sorted(cals.items(), key=lambda x: -x[1])[:40]:
                print(f"  {n:4d} {nm}")

    # person.addday four-value logic
    for m in by_name.get("addday", []):
        if m["Name"].startswith("person$$"):
            print(f"\n==== FLOAT {m['Name']} ====")
            for line in float_touches(m["Address"], method_len(m["Address"])):
                print(" ", line)
            cals = bl_callees(m["Address"], method_len(m["Address"]))
            for nm, n in sorted(cals.items(), key=lambda x: -x[1])[:30]:
                print(f"  {n:4d} {nm}")

    # Search string literals containing eventt near metadata - find which methods load 'eventt' prefix
    # Heuristic: scan showinfo for MOVZ small and String.Concat / Format
    for name in ["showinfo", "addinfohistory", "showinfo0"]:
        m = by_name[name][0]
        va, size = m["Address"], method_len(m["Address"])
        data = SO[va - OFF : va - OFF + size]
        print(f"\n==== {name} interesting BL + CMP ====")
        for i in range(0, size, 4):
            insn = struct.unpack_from("<I", data, i)[0]
            pc = va + i
            if (insn & 0xFC000000) == 0x94000000:
                imm26 = insn & 0x3FFFFFF
                if imm26 & (1 << 25):
                    imm26 -= 1 << 26
                t = pc + imm26 * 4
                nm = by_addr.get(t, {}).get("Name", "")
                if any(
                    x in nm
                    for x in (
                        "Concat",
                        "Format",
                        "Append",
                        "GetString",
                        "Substring",
                        "ToString",
                        "String",
                        "personstring",
                        "get_Item",
                        "doevent",
                    )
                ):
                    print(f"0x{pc:x} BL {nm}")
            elif (insn & 0x7F800000) == 0x71000000:
                imm12 = (insn >> 10) & 0xFFF
                if imm12 in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10):
                    pass  # too noisy
            elif (insn & 0x7F800000) == 0x52800000:
                val = ((insn >> 5) & 0xFFFF) << (((insn >> 21) & 3) * 16)
                if val in range(1, 12):
                    # variant loop hints
                    pass

    # Dump act1 / mydo related
    print("\n=== root.mydo / act labels from af already known ===")
    print("act1=增进感情 act2=一起修炼 act3=闲适度过 act4=试图逃离 act5=教导")


if __name__ == "__main__":
    main()
