# -*- coding: utf-8 -*-
"""Disassemble history.re — the original fillOriginal / name-insertion core."""
from __future__ import annotations

import json
import struct
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
OFF = 0x4000
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
by_addr = {m["Address"]: m for m in SJ["ScriptMethod"]}
addrs = sorted(by_addr)


def mlen(a: int) -> int:
    i = addrs.index(a)
    return (addrs[i + 1] if i + 1 < len(addrs) else a + 0x1000) - a


def main() -> None:
    m = next(x for x in SJ["ScriptMethod"] if x["Name"] == "history$$re")
    va = m["Address"]
    size = mlen(va)
    print("history$$re", hex(va), "len", hex(size), m["Signature"])
    data = SO[va - OFF : va - OFF + size]
    c = Counter()
    for i in range(0, size, 4):
        insn = struct.unpack_from("<I", data, i)[0]
        pc = va + i
        if (insn & 0xFC000000) == 0x94000000:
            imm = insn & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            t = pc + imm * 4
            c[by_addr.get(t, {}).get("Name", hex(t))] += 1
            nm = by_addr.get(t, {}).get("Name", hex(t))
            if any(
                x in nm
                for x in (
                    "Concat",
                    "Format",
                    "Append",
                    "GetString",
                    "ToString",
                    "get_Item",
                    "rename",
                    "tf",
                    "Contains",
                )
            ):
                print(f"0x{pc:x} BL {nm}")
        elif (insn & 0xFF000010) == 0x54000000:
            imm19 = (insn >> 5) & 0x7FFFF
            if imm19 & (1 << 18):
                imm19 -= 1 << 19
            print(f"0x{pc:x} B.cond{insn & 0xF} 0x{pc + imm19 * 4:x}")
        elif (insn & 0xFC000000) == 0x14000000:
            imm = insn & 0x3FFFFFF
            if imm & (1 << 25):
                imm -= 1 << 26
            print(f"0x{pc:x} B 0x{pc + imm * 4:x}")
        elif (insn & 0x7F800000) == 0x52800000:
            val = ((insn >> 5) & 0xFFFF) << (((insn >> 21) & 3) * 16)
            if val <= 30:
                print(f"0x{pc:x} MOVZ #{val}")
        elif (insn & 0x7F800000) == 0x71000000:
            imm12 = (insn >> 10) & 0xFFF
            if imm12 <= 30:
                print(f"0x{pc:x} CMP w{(insn >> 5) & 0x1F},#{imm12}")
        # LDR array elements from list (int[])
        elif (insn & 0xFFC00000) == 0xB9400000:
            off = ((insn >> 10) & 0xFFF) * 4
            rn = (insn >> 5) & 0x1F
            if 0x18 <= off <= 0x60:
                print(f"0x{pc:x} LDRW [x{rn},#{off}]  # maybe list[{(off-0x20)//4 if off>=0x20 else '?'}]")
    print("=== all BL counts ===")
    for n, k in c.most_common(50):
        print(f"{k:4d} {n}")

    # also rename
    for name in ["rename", "gethistoty0", "gethistoty1"]:
        for mm in [x for x in SJ["ScriptMethod"] if x["Name"].endswith("$$" + name)]:
            print(f"\n{mm['Name']} {hex(mm['Address'])} len {hex(mlen(mm['Address']))} :: {mm['Signature']}")
            cc = Counter()
            d2 = SO[mm["Address"] - OFF : mm["Address"] - OFF + mlen(mm["Address"])]
            for i in range(0, len(d2), 4):
                insn = struct.unpack_from("<I", d2, i)[0]
                if (insn & 0xFC000000) != 0x94000000:
                    continue
                imm = insn & 0x3FFFFFF
                if imm & (1 << 25):
                    imm -= 1 << 26
                t = mm["Address"] + i + imm * 4
                cc[by_addr.get(t, {}).get("Name", hex(t))] += 1
            for n, k in cc.most_common(20):
                print(f"  {k:4d} {n}")


if __name__ == "__main__":
    main()
