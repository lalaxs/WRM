# -*- coding: utf-8 -*-
import re
import struct
from pathlib import Path

ROOT = Path(r"D:\ZM\xiuxian-idle-h5")
META = (ROOT / "tools/il2cpp_input/global-metadata.dat").read_bytes()
DUMP = (ROOT / "tools/il2cpp_output/dump.cs").read_text(encoding="utf-8", errors="replace")
RAW = (ROOT / "tools/il2cpp_output/script.json").read_text(encoding="utf-8")

fa = {}
for a, h in re.findall(
    r'"Address"\s*:\s*(\d+)\s*,\s*"Name"\s*:\s*"Field\$\\u003CPrivateImplementationDetails\\u003E\.([0-9A-F]{64})"',
    RAW,
):
    fa[int(a)] = h

m = re.search(r"TypeDefIndex: 5114\n\{(.*?)\n\}", DUMP, re.S)
htob = {
    hx: (int(s), int(o, 16))
    for s, hx, o in re.findall(
        r"Size=(\d+)\s+([0-9A-F]{64})\s+/\*Metadata offset (0x[0-9A-F]+)\*/",
        m.group(1),
    )
}

for addr in [0x2BD96A8, 0x2BD97D0, 0x2BD91A0, 0x2BB9E78]:
    hx = fa.get(addr)
    print(hex(addr), (hx or "")[:20], htob.get(hx) if hx else None)
    if hx and hx in htob:
        size, o = htob[hx]
        ints = list(struct.unpack("<" + "i" * (size // 4), META[o : o + size]))
        floats = list(struct.unpack("<" + "f" * (size // 4), META[o : o + size]))
        print("  ints", ints)
        print("  fl", [round(f, 5) for f in floats])
