#!/usr/bin/env python3
"""Validate the current dungeon-exclusive enemy art delivery (color-v2)."""

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
ROSTER_OUTPUT = (
    ROOT
    / "docs"
    / "art"
    / "enemy-prototypes"
    / "2026-07-31-enemy-grounded-roster-cartoon-v2"
)
MANIFEST = OUTPUT / "manifest.json"
COMBAT_CONTENT = ROOT / "content" / "combat.js"

EXPECTED_DUNGEONS = {
    1: ("breathCave", "林中石洞", ["mossbackSnail"]),
    2: ("foundationAltar", "山腰石坛", ["creviceGecko"]),
    3: ("goldCoreRuins", "旧丹房", ["dregBeetle"]),
    4: ("nascentSoulTower", "泽中残塔", ["roundWoodlouse", "broadwingBat"]),
    5: (
        "spiritTransformationPeak",
        "峰顶石台",
        ["paleVeinCicada", "graybackMarten"],
    ),
    6: ("voidRefiningRift", "峡底石洞", ["paleBandLeech", "stoneCrab"]),
    7: (
        "bodyIntegrationPalace",
        "地下石殿",
        ["grayOwl", "broadclawMole", "brownbackPangolin"],
    ),
    8: (
        "mahayanaTrial",
        "崖壁洞室",
        ["stonewallMussel", "blindEel", "rockwallMantis"],
    ),
    9: ("ascensionTrial", "天柱山顶", ["rockDeer", "grayCrane", "rockBee"]),
}


def main() -> None:
    assert OUTPUT.is_dir(), f"missing dungeon batch: {OUTPUT}"
    assert ROSTER_OUTPUT.is_dir(), f"missing roster batch: {ROSTER_OUTPUT}"
    assert MANIFEST.is_file(), f"missing manifest: {MANIFEST}"

    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert len(entries) == 18, len(entries)
    ids = [str(item["id"]) for item in entries]
    assert len(set(ids)) == 18

    expected_ids = {
        enemy_id
        for _tier, (_dungeon_id, _name, enemy_ids) in EXPECTED_DUNGEONS.items()
        for enemy_id in enemy_ids
    }
    assert set(ids) == expected_ids
    assert dict(Counter(int(item["tier"]) for item in entries)) == {
        tier: len(enemy_ids)
        for tier, (_dungeon_id, _name, enemy_ids) in EXPECTED_DUNGEONS.items()
    }

    combat_text = COMBAT_CONTENT.read_text(encoding="utf-8")
    for enemy_id in expected_ids:
        assert enemy_id not in combat_text, enemy_id

    roster_ids = {
        path.name[: -len("-source.png")]
        for path in ROSTER_OUTPUT.glob("*-source.png")
    }
    assert expected_ids.isdisjoint(roster_ids)

    for enemy_id in expected_ids:
        assert (OUTPUT / f"{enemy_id}-source.png").is_file()
        assert (OUTPUT / f"{enemy_id}-preview.png").is_file()

    print(
        "PASS dungeon enemy art current=color-v2 "
        "count=18 disjoint-from-roster=45"
    )


if __name__ == "__main__":
    main()
