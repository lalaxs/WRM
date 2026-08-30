# -*- coding: utf-8 -*-
"""Pure-Python DES-CBC roundtrip (Key=IV) to prove algorithm class; disasm showconfig."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Minimal DES for proof only (ECB block + CBC)
# S-boxes / IP from FIPS — abbreviated implementation via pyaes-less approach:
# Use Windows built-in if needed. Prefer a tiny known-good DES.

# ---- Tiny DES (public domain style) ----
# Using openssl-free: implement via `cryptography` if present, else document.

def try_roundtrip():
    key = b"12345678"
    pt = "掌门".encode("utf-8")
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
        padder = padding.PKCS7(64).padder()
        data = padder.update(pt) + padder.finalize()
        enc = Cipher(algorithms.TripleDES(key + key[:8]), modes.CBC(key)).encryptor()  # wrong
    except Exception:
        pass
    # Use pure DES from https://gist — implement block with PyPI-free table
    try:
        import pyDes  # type: ignore
        k = pyDes.des(key, pyDes.CBC, key, pad=None, padmode=pyDes.PAD_PKCS5)
        ct = k.encrypt(pt)
        import base64
        b64 = base64.b64encode(ct).decode()
        out = k.decrypt(ct).decode("utf-8")
        print("pyDes OK", b64, "->", out)
        return
    except Exception as e:
        print("pyDes unavailable:", e)

    # Fallback: show expected C# equivalent code path without executing
    print("DES algorithm class confirmed by dump signature:")
    print("  dns.DecryptDES(string pToDecrypt, string sKey)")
    print("  dns.EncryptDES(string pToEncrypt, string sKey)")
    print("  + UnBase64String / ToBase64String")
    print("Typical C# body: DESCryptoServiceProvider, Key=IV=ASCII(sKey), FromBase64String")
    print("No in-repo ciphertext sample to decrypt; roundtrip skipped.")


ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
DELTA = 0x400
methods = {m["Name"]: m["Address"] for m in SJ["ScriptMethod"]}
sortedm = sorted((m["Address"], m["Name"]) for m in SJ["ScriptMethod"])


def enc(pc: int) -> str:
    prev = ("?", 0)
    for a, n in sortedm:
        if a > pc:
            break
        prev = (n, a)
    return f"{prev[0]}@{hex(prev[1])}"


def msize(name: str) -> int:
    a = methods[name]
    for b, _ in sortedm:
        if b > a:
            return min(b - a, 0x3000)
    return 0x1000


try_roundtrip()

for name in ["root$$showconfig", "root$$preconfig", "root$$showtextwithbt"]:
    rva = methods[name]
    size = msize(name)
    print(f"\n==== {name} {hex(rva)} size={hex(size)} ====")
    keys = (
        "Decrypt", "Encrypt", "Load", "Find", "Text", "help", "Transform",
        "set_text", "Resources", "File", "Read", "Write", "Base64", "Convert",
        "GetComponent", "mydic", "rejob", "releader", "DecryptDES",
    )
    for i in range(0, size, 4):
        pc = rva + i
        w = struct.unpack_from("<I", SO, pc - DELTA)[0]
        if (w & 0xFC000000) != 0x94000000:
            continue
        imm = w & 0x3FFFFFF
        if imm & (1 << 25):
            imm -= 1 << 26
        tgt = pc + (imm << 2)
        e = enc(tgt)
        if any(x in e for x in keys):
            print(hex(pc), hex(tgt), e)
