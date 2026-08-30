# -*- coding: utf-8 -*-
import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
for target in [0x2B1D6A0, 0x2B1D6C0, 0x2B1D538, 0x2B216A0, 0x2B216C0, 0x2B1C7D0]:
    needle = struct.pack("<Q", target)
    idxs = []
    st = 0
    while len(idxs) < 6:
        i = SO.find(needle, st)
        if i < 0:
            break
        idxs.append(i)
        st = i + 1
    print(hex(target), [hex(i) for i in idxs])
    for i in idxs[:3]:
        ctx = [hex(struct.unpack_from("<Q", SO, i + k)[0]) for k in (-16, -8, 0, 8, 16)]
        print(" ", ctx)
