# -*- coding: utf-8 -*-
import re
from pathlib import Path

raw = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_output\script.json").read_text(encoding="utf-8")
slots = {
    "x19": 0x2B1C620,
    "x20": 0x2B1C558,
    "x21": 0x2B1C570,
    "x22": 0x2B1C7B0,
    "x26": 0x2B1C5F8,
    "x29": 0x2B1C720,
    "x28": 0x2B1C580,
    "x27": 0x2B1C670,
    "x25": 0x2B1C788,
}
for name, a in slots.items():
    dec = str(a)
    print(name, hex(a), "count", raw.count(dec), "addr_key", raw.find('"Address": ' + dec))

# Decode tokens at Field$ and map field index via fieldRefs in metadata
# usage 5 = FieldInfo, index = token & 0x1fffffff
import struct

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()

targets = {
    "30s": 0x2BD9598,
    "sparse": 0x2BD9670,
    "yang22": 0x2BD9660,
}
for n, a in targets.items():
    tok = struct.unpack_from("<I", SO, a)[0]
    print(n, hex(a), "token", hex(tok), "idx", tok & 0x1FFFFFFF)
