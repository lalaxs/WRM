# -*- coding: utf-8 -*-
"""Map dns.init array creates to static field stores (incl. pre/post-index)."""
from __future__ import annotations

import struct
from pathlib import Path

SO = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\arm64\libil2cpp.so").read_bytes()
META = Path(r"D:\ZM\xiuxian-idle-h5\tools\il2cpp_input\global-metadata.dat").read_bytes()
DELTA = 0x400

FIELDS = {
    0xB8: "savetime",
    0xC0: "waittime",
    0xE0: "fitem",
    0xE8: "level_yang",
    0xF0: "fami_yang",
    0xF8: "lgr",
    0x100: "fami_act1day",
    0x108: "level_feel",
    0x110: "npclog",
    0x120: "level_speed",
    0x130: "tag_r",
    0x158: "act4day",
    0x160: "level_exp1max",
}

# size -> list of (meta_off, ints) for game PID
from collections import defaultdict

pid_blobs = defaultdict(list)
# reuse extracted unique-size blobs of interest
CANDIDATES = {
    4: [
        (0x48A388, [1, 0, 6, 7]),
        (0x48A3A0, "floats 0.25..2"),
        (0x48A3B8, [0, 720, 1, 18]),
        (0x48A550, [8, 7, 6, 11]),
        (0x48A568, [20, 16, 12, 17]),
        (0x48A5B0, [700, 800, 900, 900]),
        (0x48A6C0, [160, 180, 200, 220]),
        (0x48A710, [365, 730, 1725, 3650]),
        (0x48A7D0, [8000, 10000, 12000, 14000]),
        (0x48A7E8, [30, 25, 20, 25]),
        (0x48A8A0, [5000, 6000, 7000, 7000]),
        (0x48A910, [40, 35, 30, 35]),
        (0x48A970, [10, 9, 8, 13]),
        (0x48AAB8, [1000000, 1100000, 1200000, 1300000]),
        (0x48ADB0, [2, 0, 2, 3]),
        (0x48ADC8, [2, 0, 6, 7]),
        (0x48AE28, [3, 0, 2, 3]),
        (0x48B6E8, [400, 450, 500, 500]),
        (0x48B700, [250, 280, 300, 300]),
        (0x48B7E0, [0, 150, 1, 3]),
        (0x48B8F8, [1, 0, 2, 3]),
        (0x48B910, [15, 13, 11, 16]),
    ],
    8: [
        (0x48A360, [4, 0, 4, 5, 6, 7, 8, 9]),
        (0x48A3D0, "float probs"),
        (0x48A638, "float times 30..36000"),
        (0x48A6D8, "float times 60..36000"),
        (0x48A748, "float small"),
        (0x48A7A8, [4, 5, 6, 13, 14, 15, 16, 18]),
        (0x48A858, [60, 300, 1200, 2400, 4500, 9000, 18000, 36000]),
        (0x48A948, [4, 40, 400, 4000, 40000, 400000, 4000000, 40000000]),
        (0x48AE60, [-20, -15, -10, -7, -3, -1, 0, 0]),
        (0x48B180, [180, 150, 130, 100, 90, 80, 70, 60]),
        (0x48B808, [180, 150, 130, 100, 100, 100, 100, 100]),
        (0x48B978, [0, 1, 2, 3, 4, 5, 6, 7]),
    ],
    9: [
        (0x48B1C0, [0, 1, 2, 4, 8, 16, 24, 40, 80]),
        (0x48B238, [-1] * 9),
    ],
    10: [
        (0x48A4E0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        (0x48A580, [0, 1, 2, 3, 4, 5, 6, 7, 8, 19]),
        (0x48A608, [100, 95, 90, 85, 80, 75, 70, 65, 60, 65]),
        (0x48A660, [1, 2, 3, 4, 5, 6, 7, 8, 9, 9]),
        (0x48A690, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        (0x48A9B8, [10, 21, 81, 126, 252, 648, 1004, 4320, 14400, 14400]),
        (0x48AB00, [1000, 2180, 8100, 12600, 25200, 64800, 100400, 432000, 2000000, 2000000]),
        (0x48ABC0, [-3, -2, -1, -1, -30, -20, -10, -10, -10, -3]),
        (0x48ACB8, [20, 22, 24, 26, 28, 30, 32, 34, 36, 38]),
        (0x48B5D8, "float 1.0..2.6"),
        (0x48B6A8, [100] * 10),
        (0x48B770, [150, 155, 160, 165, 170, 175, 180, 185, 190, 190]),
        (0x48B840, "float 0.1..1e7"),
        (0x48B898, [0, 1, 2, 3, 4, 5, 10, 20, 30, 0]),
        (0x48B9A0, [60, 58, 56, 54, 52, 50, 48, 46, 44, 50]),
    ],
    13: [
        (0x48AA48, [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]),
        (0x48AA80, "float tag_r?"),
        (0x48B718, "float D34C4"),
    ],
    21: [
        (0x48A8B8, [30, 30, 30, 20, 30, 30, 100, 30, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30]),
        (0x48ACE8, [0, 5, 0, 0, 7, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13]),
    ],
    22: [
        (0x48AC58, [2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
    ],
    170: [
        (0x48AEA0, "level_feel event ids"),
    ],
}

rva0, size = 0x13BDD78, 0x47C
off0 = rva0 - DELTA
last_len = None
pending_arrays = []  # stack of lens after InitArray
events = []

for i in range(0, size, 4):
    w = struct.unpack_from("<I", SO, off0 + i)[0]
    pc = rva0 + i

    if (w & 0x7F800000) == 0x52800000 and (w & 0x1F) == 1:
        imm = (w >> 5) & 0xFFFF
        hw = (w >> 21) & 3
        last_len = imm << (hw * 16)

    if (w & 0xFC000000) == 0x94000000:
        imm26 = w & 0x3FFFFFF
        if imm26 & (1 << 25):
            imm26 -= 1 << 26
        tgt = pc + (imm26 << 2)
        if tgt == 0x1EBDCAC and last_len is not None:
            pending_arrays.append(last_len)
            events.append(("init", last_len, hex(pc)))

    # pre/post-index STR 64: 1111 1000 00 imm9 xx Rn Rt where xx=01 post, 11 pre
    if (w & 0xFFC00000) == 0xF8000000:
        op = (w >> 10) & 3
        if op in (1, 3):  # post or pre
            imm9 = (w >> 12) & 0x1FF
            if imm9 & 0x100:
                imm9 -= 0x200
            name = FIELDS.get(imm9, f"off_{hex(imm9)}")
            arr = pending_arrays[-1] if pending_arrays else None
            events.append(("store_idx", imm9, name, arr, hex(pc)))

    # unsigned STR
    if (w & 0xFFC00000) == 0xF9000000:
        imm = ((w >> 10) & 0xFFF) * 8
        name = FIELDS.get(imm, f"off_{hex(imm)}")
        # STR of array happens AFTER InitArray; the array len is last pending
        # but note: store of len21 happens before next new - still last pending
        arr = pending_arrays[-1] if pending_arrays else None
        events.append(("store", imm, name, arr, hex(pc)))

    if (w & 0xFFC00000) == 0xB9000000:
        imm = ((w >> 10) & 0xFFF) * 4
        name = FIELDS.get(imm, f"off_{hex(imm)}")
        if imm in FIELDS:
            events.append(("store_w", imm, name, None, hex(pc)))

print("=== event stream ===")
for e in events:
    print(e)

print("\n=== confirmed field -> length ===")
field_len = {}
for e in events:
    if e[0] in ("store", "store_idx") and e[2] in FIELDS.values():
        field_len[e[2]] = e[3]
for k, v in field_len.items():
    print(f"  {k}: len={v}")
    if v in CANDIDATES:
        print(f"    candidates: {CANDIDATES[v]}")
