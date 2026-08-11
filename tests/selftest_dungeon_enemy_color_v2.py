#!/usr/bin/env python3
"""Validate the delivered brighter dungeon-enemy color-v2 batch."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = (
    ROOT
    / "docs"
    / "art"
    / "enemy-prototypes"
    / "2026-08-01-dungeon-enemies-color-v2"
)
MANIFEST = OUTPUT / "manifest.json"
EXPECTED_IDS = {
    "mossbackSnail",
    "creviceGecko",
    "dregBeetle",
    "roundWoodlouse",
    "broadwingBat",
    "paleVeinCicada",
    "graybackMarten",
    "paleBandLeech",
    "stoneCrab",
    "grayOwl",
    "broadclawMole",
    "brownbackPangolin",
    "stonewallMussel",
    "blindEel",
    "rockwallMantis",
    "rockDeer",
    "grayCrane",
    "rockBee",
}


def main() -> None:
    assert OUTPUT.is_dir(), f"missing delivered batch: {OUTPUT}"
    assert MANIFEST.is_file(), f"missing manifest: {MANIFEST}"

    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ids = [str(item["id"]) for item in entries]
    assert len(entries) == 18, len(entries)
    assert set(ids) == EXPECTED_IDS
    assert len(set(ids)) == 18
    assert dict(Counter(int(item["tier"]) for item in entries)) == {
        1: 1,
        2: 1,
        3: 1,
        4: 2,
        5: 2,
        6: 2,
        7: 3,
        8: 3,
        9: 3,
    }

    sources = sorted(OUTPUT.glob("*-source.png"))
    previews = sorted(OUTPUT.glob("*-preview.png"))
    assert len(sources) == 18, len(sources)
    assert len(previews) == 18, len(previews)
    source_ids = {path.name[: -len("-source.png")] for path in sources}
    preview_ids = {path.name[: -len("-preview.png")] for path in previews}
    assert source_ids == EXPECTED_IDS
    assert preview_ids == EXPECTED_IDS

    for tier in range(1, 10):
        assert (OUTPUT / "regions" / f"tier-{tier}.png").is_file()

    for name in (
        "dungeon-enemies-color-v2-contact-sheet.png",
        "dungeon-enemies-color-v2-84px-sheet.png",
        "batch-summary.md",
    ):
        assert (OUTPUT / name).is_file(), name

    for item in entries:
        enemy_id = str(item["id"])
        assert (OUTPUT / f"{enemy_id}-source.png").is_file()
        assert (OUTPUT / f"{enemy_id}-preview.png").is_file()
        assert str(item["sourcePath"]).endswith(
            f"2026-08-01-dungeon-enemies-color-v2/{enemy_id}-source.png"
        )
        assert str(item["previewPath"]).endswith(
            f"2026-08-01-dungeon-enemies-color-v2/{enemy_id}-preview.png"
        )
        assert set(item["palette"]) == {"primary", "secondary", "accent"}

    print(
        "PASS dungeon enemy color-v2 delivered=18 "
        "tiers=1/1/1/2/2/2/3/3/3 sources+previews+regions"
    )


if __name__ == "__main__":
    main()
