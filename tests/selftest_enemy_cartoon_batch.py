#!/usr/bin/env python3
"""Validate the delivered grounded-roster cartoon-v2 enemy batch."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = (
    ROOT
    / "docs"
    / "art"
    / "enemy-prototypes"
    / "2026-07-31-enemy-grounded-roster-cartoon-v2"
)
FROZEN = {"thornHare", "stonePuppet", "soulMoth", "earthVeinApe"}


def main() -> None:
    assert OUTPUT.is_dir(), f"missing delivered batch: {OUTPUT}"

    sources = sorted(OUTPUT.glob("*-source.png"))
    previews = sorted(OUTPUT.glob("*-preview.png"))
    assert len(sources) == 45, len(sources)
    assert len(previews) == 45, len(previews)

    source_ids = {path.name[: -len("-source.png")] for path in sources}
    preview_ids = {path.name[: -len("-preview.png")] for path in previews}
    assert source_ids == preview_ids
    assert FROZEN.issubset(source_ids)

    for enemy_id in source_ids:
        assert (OUTPUT / f"{enemy_id}-source.png").is_file()
        assert (OUTPUT / f"{enemy_id}-preview.png").is_file()

    for tier in range(1, 10):
        assert (OUTPUT / "regions" / f"tier-{tier}.png").is_file()

    for name in (
        "enemy-cartoon-v2-contact-sheet.png",
        "enemy-cartoon-v2-84px-sheet.png",
        "batch-summary.md",
    ):
        assert (OUTPUT / name).is_file(), name

    # Legacy grounded-roster overview sheets should not remain after cleanup.
    assert not (OUTPUT / "enemy-grounded-roster-contact-sheet.png").exists()
    assert not (OUTPUT / "enemy-grounded-roster-84px-sheet.png").exists()

    print("PASS enemy cartoon-v2 delivered=45 sources+previews+regions")


if __name__ == "__main__":
    main()
