# -*- coding: utf-8 -*-
"""Final feasibility notes: MethodInfo refs to DecryptDES + DES roundtrip proof."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
SO = (ROOT / "tools/il2cpp_input/arm64/libil2cpp.so").read_bytes()
SJ = json.loads((ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
DELTA = 0x400

dec = next(m for m in SJ["ScriptMethod"] if m["Name"] == "dns$$DecryptDES")
enc = next(m for m in SJ["ScriptMethod"] if m["Name"] == "dns$$EncryptDES")
print("DecryptDES", hex(dec["Address"]), "EncryptDES", hex(enc["Address"]))

# Search for code pointers (absolute VA) to these methods in SO data
for label, addr in [("DecryptDES", dec["Address"]), ("EncryptDES", enc["Address"]),
                    ("rejob", next(m["Address"] for m in SJ["ScriptMethod"] if m["Name"]=="dns$$rejob")),
                    ("releader", next(m["Address"] for m in SJ["ScriptMethod"] if m["Name"]=="dns$$releader"))]:
    needle = struct.pack("<Q", addr)
    hits = []
    start = 0
    while True:
        i = SO.find(needle, start)
        if i < 0:
            break
        hits.append(i)
        start = i + 1
        if len(hits) >= 20:
            break
    print(f"{label} ptr hits in SO: {len(hits)} first={[hex(h+DELTA) for h in hits[:8]]}")

# Also search relative: some tables store Offset not VA
for label, addr in [("DecryptDES", dec["Address"]), ("EncryptDES", enc["Address"])]:
    needle = struct.pack("<I", addr)
    # only in likely metadata/codeptr regions - count
    count = SO.count(needle)
    print(f"{label} as uint32 count={count}")

# DES roundtrip proof (stdlib only via pyDes-less: use openssl if available, else pure)
print("\n=== DES-CBC Key=IV=8ascii Base64 roundtrip (matches typical C# snippet) ===")
try:
    from Crypto.Cipher import DES
    from Crypto.Util.Padding import pad, unpad
    import base64
    key = b"12345678"
    pt = "掌门".encode("utf-8")
    cipher = DES.new(key, DES.MODE_CBC, iv=key)
    ct = cipher.encrypt(pad(pt, 8))
    b64 = base64.b64encode(ct).decode()
    cipher2 = DES.new(key, DES.MODE_CBC, iv=key)
    out = unpad(cipher2.decrypt(base64.b64decode(b64)), 8).decode("utf-8")
    print("pycryptodome OK:", b64, "->", out)
except Exception as e:
    print("pycryptodome unavailable:", e)
    # openssl
    import subprocess, tempfile, os, base64
    key = b"12345678"
    pt = "掌门".encode("utf-8")
    # PKCS7 pad
    padlen = 8 - (len(pt) % 8)
    pt_padded = pt + bytes([padlen]) * padlen
    try:
        r = subprocess.run(
            ["openssl", "enc", "-des-cbc", "-K", key.hex(), "-iv", key.hex(), "-nosalt"],
            input=pt_padded, capture_output=True, check=True,
        )
        b64 = base64.b64encode(r.stdout).decode()
        r2 = subprocess.run(
            ["openssl", "enc", "-d", "-des-cbc", "-K", key.hex(), "-iv", key.hex(), "-nosalt"],
            input=r.stdout, capture_output=True, check=True,
        )
        out = r2.stdout[:-r2.stdout[-1]].decode("utf-8")
        print("openssl OK:", b64, "->", out)
    except Exception as e2:
        print("openssl failed:", e2)
        print("NOTE: algorithm is standard DES; no in-repo ciphertext to decrypt.")

# Summary evidence file
summary = """
## Static unpack verdict evidence

### Present in repo
- tools/il2cpp_input/arm64/libil2cpp.so
- tools/il2cpp_input/global-metadata.dat
- tools/il2cpp_output/dump.cs, script.json
- tools/il2cpp_input/assets/** is EMPTY (only Managed/Metadata dirs, no unity3d/sharedassets)

### Absent
- APK / split APKs
- assets/bin/Data/*.assets, sharedassets*, resources.assets, level*, globalgamemanagers
- StreamingAssets
- Lua / plaintext event JSON from original

### String evidence
- 掌门/长老/真传/外门/内门/弟子 etc: ZERO hits in metadata UTF-8/UTF-16 and SO
- ScriptString pure-CJK set is tiny (UI/calendar/errors only)
- npclog: int[170] IDs recoverable (already in core/dns.js)
- UI hierarchy paths exist: config/content/text*, helpconfig6/13 (Transform paths, not ciphertext)

### Crypto
- dns.EncryptDES / DecryptDES RVA 0x13BF5B8 / 0x13BFB7C — classic DES+Base64 pattern (sKey param)
- ZERO direct BL call sites to EncryptDES/DecryptDES in entire SO (invoke via MethodInfo/blr or rare paths)
- No obvious hardcoded 8-byte game DES key isolated from ScriptString

### rejob / releader
- RVA 0x13BE614 / 0x13BE5A8 — index into runtime string tables / literals
- Do NOT call DecryptDES directly
- Returned Chinese job titles are NOT stored as IL2CPP string literals in metadata

### Implication
Cannot statically recover rejob/releader labels or npclog narrative templates from current artifacts.
Need full Unity data files from APK and/or runtime Frida dump.
"""
Path(r"D:\ZM\xiuxian-idle-h5\tools\_static_unpack_verdict.txt").write_text(summary, encoding="utf-8")
print(summary)
print("wrote tools/_static_unpack_verdict.txt")
