# -*- coding: utf-8 -*-
"""Focused dig: set_love / slove-dlove / doevent string/name logic / missing eventt."""
from __future__ import annotations

import json
import re
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


PERSON = {
    0x34: "slove",
    0x38: "slust",
    0x44: "dlove",
    0x48: "dlust",
    0xD4: "desire",
    0xE8: "_feel",
    0xEC: "_love",
    0xF0: "_lust",
    0x2C: "act1day",
    0xE4: "act1",
    0x80: "history",
}


def dis(va: int, size: int, label: str, max_lines: int = 400) -> None:
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
            t = pc + imm26 * 4
            out = f"0x{pc:x} BL 0x{t:x} ({by_addr.get(t, {}).get('Name', '?')})"
        elif (insn & 0xFF000010) == 0x54000000:
            imm19 = (insn >> 5) & 0x7FFFF
            if imm19 & (1 << 18):
                imm19 -= 1 << 19
            out = f"0x{pc:x} B.cond{insn & 0xF} 0x{pc + imm19 * 4:x}"
        elif (insn & 0xFC000000) == 0x14000000:
            imm26 = insn & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            out = f"0x{pc:x} B 0x{pc + imm26 * 4:x}"
        else:
            top = insn & 0xFFC00000
            mp = {
                0xF9400000: ("LDR", 8),
                0xF9000000: ("STR", 8),
                0xB9400000: ("LDRW", 4),
                0xB9000000: ("STRW", 4),
                0xBD400000: ("LDRS", 4),
                0xBD000000: ("STRS", 4),
            }
            if top in mp:
                op, sc = mp[top]
                off = ((insn >> 10) & 0xFFF) * sc
                rn = (insn >> 5) & 0x1F
                rt = insn & 0x1F
                note = f" //{PERSON[off]}" if off in PERSON else ""
                if note or op.endswith("S") or off in PERSON:
                    out = f"0x{pc:x} {op} x{rt},[x{rn},#{off}]{note}"
            elif (insn & 0x7F800000) == 0x52800000:
                val = ((insn >> 5) & 0xFFFF) << (((insn >> 21) & 3) * 16)
                if val <= 600:
                    out = f"0x{pc:x} MOVZ w{insn & 0x1F},#{val}"
            elif (insn & 0x7F800000) == 0x71000000:
                imm12 = (insn >> 10) & 0xFFF
                if imm12 <= 600:
                    out = f"0x{pc:x} CMP w{(insn >> 5) & 0x1F},#{imm12}"
        if out:
            print(out)
            lines += 1
        i += 4


def collect_movz_event_ids(va: int, size: int) -> list[int]:
    """Collect immediate constants that look like event IDs written into history arrays."""
    data = SO[va - OFF : va - OFF + size]
    ids = []
    i = 0
    while i < size:
        insn = struct.unpack_from("<I", data, i)[0]
        if (insn & 0x7F800000) == 0x52800000:
            hw = (insn >> 21) & 3
            if hw == 0:
                val = (insn >> 5) & 0xFFFF
                if 1 <= val <= 600:
                    ids.append(val)
        i += 4
    return ids


def main() -> None:
    for name in ["set_love", "get_love", "addlove", "set_lust", "get_lust", "addeventlove", "addevent"]:
        for m in by_name.get(name, []):
            dis(m["Address"], method_len(m["Address"]), m["Name"])

    # act1event event-id immediates (unique sorted)
    act = by_name["act1event"][0]["Address"]
    ids = collect_movz_event_ids(act, method_len(act))
    from collections import Counter

    c = Counter(ids)
    print("\n=== act1event MOVZ immediates 1..600 top ===")
    for v, n in c.most_common(80):
        print(v, n)

    doe = by_name["doevent"][0]["Address"]
    dis(doe, method_len(doe), "doevent_full", max_lines=900)

    # Search all TextAsset dumps + af for missing keys
    miss = [218, 219, 220, 566, 567, 568]
    print("\n=== search missing event keys in unity_dump / content ===")
    roots = [
        ROOT / "tools/il2cpp_input/apk_extract/unity_dump",
        ROOT / "tools/il2cpp_output",
        ROOT / "content",
    ]
    pats = []
    for eid in miss:
        pats.extend(
            [
                f"eventt{eid}",
                f"eventt{eid}0",
                f"\"{eid}\"",
                f"npclog.*{eid}",
            ]
        )
    for base in roots:
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix.lower() not in {".txt", ".json", ".js", ".md", ".csv"}:
                continue
            if p.stat().st_size > 20_000_000:
                continue
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for eid in miss:
                for key in (f"eventt{eid}0", f"eventt{eid}1", f"eventt{eid}"):
                    if key in text:
                        # exclude false positive eventt220 = id22 v0 when key is eventt220 without trailing digit after full id
                        print(f"HIT {key} in {p}")

    # Also list all eventt keys whose parsed id is in miss (with extract logic)
    af = json.loads(
        (ROOT / "tools/il2cpp_input/apk_extract/unity_dump/TextAsset_af_26.txt").read_text(
            encoding="utf-8"
        )
    )
    print("\n=== af keys that could map to missing ids ===")
    for k in sorted(af):
        if not k.startswith("eventt"):
            continue
        suf = k[6:]
        if not suf.isdigit():
            continue
        # parse both ways
        if len(suf) >= 2:
            eid_last = int(suf[:-1])
            if eid_last in miss:
                print(k, "-> id", eid_last, "variant", suf[-1], "=", af[k][:40])
        if int(suf) in miss:
            print(k, "-> whole", int(suf), "=", af[k][:40])

    # Count max parts length among events (for 3+ name slots)
    parts = {}
    for k, v in af.items():
        if not k.startswith("eventt"):
            continue
        suf = k[6:]
        if not suf.isdigit() or len(suf) < 2:
            continue
        eid = str(int(suf[:-1]))
        var = int(suf[-1])
        parts.setdefault(eid, {})[var] = v
    long = [(eid, len(vs), max(vs)) for eid, vs in parts.items()]
    long.sort(key=lambda x: -x[1])
    print("\n=== eventt part-count histogram (top long) ===")
    from collections import Counter as C2

    hist = C2(len(vs) for vs in parts.values())
    print(dict(sorted(hist.items())))
    print("longest:", long[:25])
    for eid, n, mx in long[:15]:
        print(eid, "parts", n, "maxVar", mx, "joined=", "".join(parts[eid][i] for i in sorted(parts[eid]))[:60])

    # help strings for love/lust/feel/desire
    print("\n=== help_* related keys in af ===")
    for k in sorted(af):
        if any(x in k.lower() for x in ("love", "lust", "feel", "desire", "好感", "爱意", "欲望", "亲密", "slove", "act")):
            val = af[k]
            if isinstance(val, str):
                print(k, ":", val[:120].replace("\n", " | "))


if __name__ == "__main__":
    main()
