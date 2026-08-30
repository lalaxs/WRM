# -*- coding: utf-8 -*-
"""Probe DES/rejob/releader/string decrypt for static unpack feasibility."""
from __future__ import annotations

import json
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
DELTA = 0x400  # VA/RVA to file offset for this build

METHODS = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
# also keep list sorted for enclosing
SORTED = sorted(((m["Address"], m["Name"]) for m in SJ["ScriptMethod"]), key=lambda x: x[0])


def enclosing(pc: int) -> str:
    prev = ("?", 0)
    for a, n in SORTED:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"


def disasm(rva: int, size: int, label: str = ""):
    print(f"\n==== {label or hex(rva)} size=0x{size:x} ====")
    off0 = rva - DELTA
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, off0 + i)[0]
        s = None
        if (w & 0x7F800000) == 0x52800000:  # MOVZ
            rd = w & 0x1F
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            hw = (w >> 21) & 3
            s = f"MOVZ {'xw'[rd<31]}{rd},#{imm}" + (f" LSL {hw*16}" if hw else "")
        elif (w & 0x7F800000) == 0x72A00000:  # MOVK
            rd = w & 0x1F
            imm = ((w >> 5) & 0xFFFF) << (((w >> 21) & 3) * 16)
            hw = (w >> 21) & 3
            s = f"MOVK x{rd},#{imm>> (hw*16) if hw else imm}" + (f" LSL {hw*16}" if hw else "")
        elif (w & 0x9F000000) == 0x90000000:  # ADRP
            rd = w & 0x1F
            immhi = (w >> 5) & 0x7FFFF
            immlo = (w >> 29) & 3
            imm = ((immhi << 2) | immlo) << 12
            if imm & (1 << 32):
                imm -= 1 << 33
            page = (pc & ~0xFFF) + imm
            s = f"ADRP x{rd},#{hex(page)}"
        elif (w & 0xFFC00000) == 0x91000000:  # ADD imm
            rd, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            sh = (w >> 22) & 1
            if sh:
                imm <<= 12
            s = f"ADD x{rd},x{rn},#{hex(imm)}"
        elif (w & 0xFFC00000) == 0xF9400000:  # LDR x
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 8
            s = f"LDR x{rt},[x{rn},#{hex(imm)}]"
        elif (w & 0xFFC00000) == 0xB9400000:  # LDR w
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 4
            s = f"LDR w{rt},[x{rn},#{hex(imm)}]"
        elif (w & 0xFFC00000) == 0x39400000:  # LDRB
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = (w >> 10) & 0xFFF
            s = f"LDRB w{rt},[x{rn},#{hex(imm)}]"
        elif (w & 0xFC000000) == 0x94000000:  # BL
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            tgt = pc + (imm26 << 2)
            s = f"BL {hex(tgt)}  ; {enclosing(tgt)}"
        elif (w & 0xFC000000) == 0x14000000:  # B
            imm26 = w & 0x3FFFFFF
            if imm26 & (1 << 25):
                imm26 -= 1 << 26
            s = f"B {hex(pc + (imm26 << 2))}"
        elif (w & 0xFF000010) == 0x54000000:  # B.cond
            imm19 = (w >> 5) & 0x7FFFF
            if imm19 & 0x40000:
                imm19 -= 0x80000
            s = f"B.{w & 0xF:x} {hex(pc + imm19 * 4)}"
        elif (w & 0x7F80001F) == 0x7100001F:  # CMP imm
            s = f"CMP w{(w>>5)&0x1F},#{(w>>10)&0xFFF}"
        elif (w & 0xFFFFFC1F) == 0xD65F0000:
            s = "RET"
        elif (w & 0xFFE0FC00) == 0x2A0003E0:
            s = f"MOV w{w&0x1F},w{(w>>16)&0x1F}"
        elif (w & 0xFFC00000) == 0xF9000000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 8
            s = f"STR x{rt},[x{rn},#{hex(imm)}]"
        elif (w & 0xFFC00000) == 0xB9000000:
            rt, rn = w & 0x1F, (w >> 5) & 0x1F
            imm = ((w >> 10) & 0xFFF) * 4
            s = f"STR w{rt},[x{rn},#{hex(imm)}]"
        if s:
            print(hex(pc), s)


def find_bls_to(target: int, lo=0x13A0000, hi=0x1500000):
    hits = []
    for off in range(lo - DELTA, hi - DELTA, 4):
        w = struct.unpack_from("<I", SO, off)[0]
        if (w & 0xFC000000) != 0x94000000:
            continue
        pc = off + DELTA
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        if pc + (imm26 << 2) == target:
            hits.append(pc)
    return hits


def dump_literals_near(rva: int, size: int):
    """Resolve ADRP+ADD/LDR literal candidates; print nearby metadata/so strings if any."""
    print(f"\n==== literal pages near {hex(rva)} ====")
    off0 = rva - DELTA
    pages = []
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, off0 + i)[0]
        if (w & 0x9F000000) == 0x90000000:
            rd = w & 0x1F
            immhi = (w >> 5) & 0x7FFFF
            immlo = (w >> 29) & 3
            imm = ((immhi << 2) | immlo) << 12
            if imm & (1 << 32):
                imm -= 1 << 33
            page = (pc & ~0xFFF) + imm
            pages.append((pc, rd, page))
            # peek next ADD
            if i + 4 < size:
                w2 = struct.unpack_from("<I", SO, off0 + i + 4)[0]
                if (w2 & 0xFFC00000) == 0x91000000 and ((w2 >> 5) & 0x1F) == rd:
                    imm2 = (w2 >> 10) & 0xFFF
                    if (w2 >> 22) & 1:
                        imm2 <<= 12
                    addr = page + imm2
                    print(hex(pc), f"ADRP+ADD -> {hex(addr)} (x{rd})")
                    # try read as pointer in so (unlikely for string lit which is Il2CppString*)
                if (w2 & 0xFFC00000) == 0xF9400000 and ((w2 >> 5) & 0x1F) == rd:
                    imm2 = ((w2 >> 10) & 0xFFF) * 8
                    addr = page + imm2
                    print(hex(pc), f"ADRP+LDR -> {hex(addr)} (x{rd})")
                    # read 8-byte at file offset if mapped
                    fo = addr - DELTA
                    if 0 <= fo < len(SO) - 8:
                        val = struct.unpack_from("<Q", SO, fo)[0]
                        print("   qword", hex(val))


# --- method sizes from next method ---
def method_size(name: str) -> int:
    addr = METHODS[name]
    nxt = None
    for a, n in SORTED:
        if a > addr:
            nxt = a
            break
    return (nxt - addr) if nxt else 0x400


for name in [
    "dns$$releader",
    "dns$$rejob",
    "dns$$EncryptDES",
    "dns$$DecryptDES",
    "dns$$UnBase64String",
    "dns$$ToBase64String",
    "dns$$relevel",
    "dns$$rereward",
    "dns$$sexs",
    "dns$$relvcolors",
]:
    if name in METHODS:
        print(f"{name} RVA={hex(METHODS[name])} size~{hex(method_size(name))}")

for name in ["dns$$releader", "dns$$rejob", "dns$$DecryptDES", "dns$$EncryptDES", "dns$$UnBase64String"]:
    disasm(METHODS[name], min(method_size(name), 0x600), name)
    dump_literals_near(METHODS[name], min(method_size(name), 0x200))

print("\n==== callers of DecryptDES ====")
for pc in find_bls_to(METHODS["dns$$DecryptDES"]):
    print(hex(pc), enclosing(pc))

print("\n==== callers of EncryptDES ====")
for pc in find_bls_to(METHODS["dns$$EncryptDES"]):
    print(hex(pc), enclosing(pc))

print("\n==== callers of UnBase64String ====")
for pc in find_bls_to(METHODS["dns$$UnBase64String"]):
    print(hex(pc), enclosing(pc))

print("\n==== callers of rejob / releader ====")
for tgt_name in ["dns$$rejob", "dns$$releader"]:
    print("--", tgt_name)
    for pc in find_bls_to(METHODS[tgt_name]):
        print(hex(pc), enclosing(pc))

# Search metadata for ASCII key-like strings near DES usage patterns
print("\n==== metadata ASCII candidates (len 8/16/24/32 printable) around DES keywords ====")
for needle in [b"DecryptDES", b"EncryptDES", b"DESCrypto", b"sKey", b"TripleDES", b"Rijndael", b"AES"]:
    idx = 0
    while True:
        i = META.find(needle, idx)
        if i < 0:
            break
        print(hex(i), needle, META[max(0, i - 32) : i + 64])
        idx = i + 1

# Search so/meta for common chinese job titles plaintext (should be absent if encrypted)
print("\n==== plaintext Chinese job title search in SO/META ====")
needles = ["掌门", "长老", "真传", "外门", "内门", "弟子", "宗主", "执事", "女修", "修炼"]
for n in needles:
    b = n.encode("utf-8")
    so_i = SO.find(b)
    meta_i = META.find(b)
    print(f"{n}: so={hex(so_i) if so_i>=0 else None} meta={hex(meta_i) if meta_i>=0 else None}")

# Find root$$GetString or similar
print("\n==== ScriptMethod names containing GetString / Decrypt / LoadText / helps ====")
for a, n in SORTED:
    low = n.lower()
    if any(k in low for k in ["getstring", "decrypt", "encrypt", "loadtext", "textasset", "assetbundle", "helps", "npclog", "mydic"]):
        if n.startswith(("dns$$", "root$$", "mydic", "person$$", "savestring", "My")) or "Decrypt" in n or "Encrypt" in n or "GetString" in n and ("root" in n or "dns" in n or "SR$$" not in n and "System." not in n and "Unity" not in n and "Text." not in n and "Xml" not in n and "Data." not in n and "Resources." not in n and "Newtonsoft" not in n and "TMPro" not in n):
            print(hex(a), n)

print("\n==== Assembly-CSharp-ish GetString (filter) ====")
for a, n in SORTED:
    if "GetString" in n and "System." not in n and "UnityEngine" not in n and "Microsoft." not in n and "Newtonsoft" not in n and "TMPro" not in n and "SR$$" not in n and "Res$$" not in n and "Xml" not in n and "Data." not in n and "Text." not in n and "Encoding" not in n and "Logger" not in n and "Android" not in n:
        print(hex(a), n)
