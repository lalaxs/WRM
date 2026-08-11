# Enemy v4 Melvor-Inspired Portrait Framing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe all seven approved v3 enemy illustrations into larger, upper-body-focused v4 portraits without regenerating or redesigning any character.

**Architecture:** A deterministic Pillow script crops each v3 transparent source to its alpha bounds, applies a per-enemy scale, centers it horizontally, anchors its highest visible point to a 16–24px top safe area, and clips overflow at the canvas edges. The same script emits 512px sources, 256px previews, and one v3/v4 contact sheet; a focused unittest file verifies geometry, transparency, identity-source usage, and output metadata.

**Tech Stack:** Python 3, Pillow, SHA-256, existing v3 PNG RGBA assets.

## Global Constraints

- Source assets are read only from `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/`.
- Do not use ImageGen and do not repaint, recolor, retouch, or alter poses.
- Output goes only to `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/`.
- Emit one 512×512 RGBA source and one 256×256 RGBA preview for each of seven enemies.
- Keep each highest visible contour 16–24px from the 512px top edge.
- Center every subject horizontally.
- Preserve transparent corners.
- Six enemies must be bottom-clipped; `soulMoth` is exempt and instead fills the width while preserving its main wings.
- Do not modify runtime code or replace production assets.
- Keep generated v4 PNGs uncommitted until the user approves the contact sheet.

---

## File Structure

- Create `tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py`
  - Owns v4 framing configuration, alpha-bound cropping, resizing, placement, output writing, contact-sheet rendering, and validation helpers.
- Create `tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py`
  - Owns deterministic geometry and output-contract tests.
- Create `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/`
  - Contains exactly fourteen enemy PNGs plus one contact sheet.
- Read `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/*.png`
  - Approved input assets; never modified.

## Shared Interfaces

```python
FRAMING: dict[str, dict[str, float | int | bool]]

def visible_bbox(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int]
def reframe(source: Image.Image, config: dict[str, float | int | bool]) -> Image.Image
def write_enemy_assets(enemy_id: str, source: Image.Image) -> tuple[Path, Path]
def build_contact_sheet(v4_sources: dict[str, Image.Image]) -> Image.Image
def validate_asset(path: Path, expected_size: int) -> dict[str, float | int]
```

The exact framing table is:

```python
FRAMING = {
    "thornHare":         {"scale": 1.28, "top": 18, "bottom_clip": True},
    "stonePuppet":       {"scale": 1.28, "top": 18, "bottom_clip": True},
    "soulMoth":          {"scale": 1.28, "top": 20, "bottom_clip": False},
    "rogueCultivator":   {"scale": 1.22, "top": 18, "bottom_clip": True},
    "thunderJudge":      {"scale": 1.22, "top": 18, "bottom_clip": True},
    "earthVeinApe":      {"scale": 1.20, "top": 18, "bottom_clip": True},
    "myriadLawAvatar":   {"scale": 1.22, "top": 18, "bottom_clip": True},
}
```

These values give an average scale of approximately 1.24× while keeping wide subjects inside the approved clipping limits.

---

### Task 1: Build and test deterministic portrait reframing

**Files:**
- Create: `tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py`
- Create: `tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py`
- Read: `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/*-source.png`

**Interfaces:**
- Consumes: v3 512×512 PNG RGBA source files and the exact `FRAMING` table above.
- Produces: `visible_bbox()` and `reframe()` for Tasks 2 and 3.

- [ ] **Step 1: Write the failing geometry tests**

```python
import importlib.util
import unittest
from pathlib import Path
from PIL import Image

SCRIPT = Path(__file__).with_name("reframe_enemy_v4.py")
spec = importlib.util.spec_from_file_location("reframe_enemy_v4", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReframeGeometryTests(unittest.TestCase):
    def test_all_seven_configs_are_frozen(self):
        self.assertEqual(
            set(module.FRAMING),
            {
                "thornHare", "stonePuppet", "soulMoth",
                "rogueCultivator", "thunderJudge",
                "earthVeinApe", "myriadLawAvatar",
            },
        )

    def test_reframe_uses_top_anchor_and_transparent_corners(self):
        for enemy_id, config in module.FRAMING.items():
            source = Image.open(
                module.V3_DIR / f"{enemy_id}-source.png"
            ).convert("RGBA")
            result = module.reframe(source, config)
            self.assertEqual(result.mode, "RGBA")
            self.assertEqual(result.size, (512, 512))
            left, top, right, bottom = module.visible_bbox(result)
            self.assertGreaterEqual(top, 16)
            self.assertLessEqual(top, 24)
            self.assertLessEqual(abs((left + right) / 2 - 256), 3)
            for point in ((0, 0), (511, 0), (0, 511), (511, 511)):
                self.assertEqual(result.getchannel("A").getpixel(point), 0)

    def test_six_subjects_clip_at_bottom(self):
        for enemy_id, config in module.FRAMING.items():
            source = Image.open(
                module.V3_DIR / f"{enemy_id}-source.png"
            ).convert("RGBA")
            result = module.reframe(source, config)
            bottom_has_alpha = result.getchannel("A").crop((0, 511, 512, 512)).getbbox()
            if config["bottom_clip"]:
                self.assertIsNotNone(bottom_has_alpha, enemy_id)
            else:
                self.assertIsNone(bottom_has_alpha, enemy_id)
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py
```

Expected: FAIL because `reframe_enemy_v4.py` does not exist.

- [ ] **Step 3: Implement the minimal reframing engine**

```python
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
V3_DIR = ROOT / "docs/art/enemy-prototypes/2026-07-31-enemy-v3-front"
OUTPUT_DIR = ROOT / "docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing"
CANVAS = 512
PREVIEW = 256
ALPHA_THRESHOLD = 8

FRAMING = {
    "thornHare": {"scale": 1.28, "top": 18, "bottom_clip": True},
    "stonePuppet": {"scale": 1.28, "top": 18, "bottom_clip": True},
    "soulMoth": {"scale": 1.28, "top": 20, "bottom_clip": False},
    "rogueCultivator": {"scale": 1.22, "top": 18, "bottom_clip": True},
    "thunderJudge": {"scale": 1.22, "top": 18, "bottom_clip": True},
    "earthVeinApe": {"scale": 1.20, "top": 18, "bottom_clip": True},
    "myriadLawAvatar": {"scale": 1.22, "top": 18, "bottom_clip": True},
}


def visible_bbox(image, threshold=ALPHA_THRESHOLD):
    mask = image.getchannel("A").point(
        lambda value: 255 if value > threshold else 0
    )
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("image has no visible pixels")
    return bounds


def reframe(source, config):
    left, top, right, bottom = visible_bbox(source)
    subject = source.crop((left, top, right, bottom))
    scale = float(config["scale"])
    resized = subject.resize(
        (
            round(subject.width * scale),
            round(subject.height * scale),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = round((CANVAS - resized.width) / 2)
    y = int(config["top"])
    canvas.alpha_composite(resized, (x, y))
    return canvas
```

- [ ] **Step 4: Run the geometry tests to verify GREEN**

Run the Step 2 command.

Expected: `Ran 3 tests` and `OK`.

- [ ] **Step 5: Inspect the seven 512px reframes before writing previews**

Use `view_image` on a temporary montage generated from the in-memory results. Confirm:

- no key facial feature is cut;
- rabbit ears and back spines remain readable;
- moth wing tips remain readable;
- all other enemies visibly meet the bottom edge.

Do not change the approved scale table without recording the exact failing visual criterion.

---

### Task 2: Emit sources, previews, and enforce the asset contract

**Files:**
- Modify: `tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py`
- Modify: `tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/{id}-source.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/{id}-preview.png`

**Interfaces:**
- Consumes: `reframe()` from Task 1.
- Produces: fourteen validated PNG assets and `write_enemy_assets()`.

- [ ] **Step 1: Add a failing output-contract test**

```python
    def test_generated_asset_contract(self):
        module.generate_assets()
        expected = {
            f"{enemy_id}-{kind}.png"
            for enemy_id in module.FRAMING
            for kind in ("source", "preview")
        }
        actual = {
            path.name
            for path in module.OUTPUT_DIR.glob("*.png")
            if "contact-sheet" not in path.name
        }
        self.assertEqual(actual, expected)
        for enemy_id in module.FRAMING:
            source = Image.open(
                module.OUTPUT_DIR / f"{enemy_id}-source.png"
            )
            preview = Image.open(
                module.OUTPUT_DIR / f"{enemy_id}-preview.png"
            )
            self.assertEqual((source.mode, source.size), ("RGBA", (512, 512)))
            self.assertEqual((preview.mode, preview.size), ("RGBA", (256, 256)))
```

- [ ] **Step 2: Run the single test to verify RED**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py
```

Expected: the three geometry tests pass and the new test fails with `AttributeError: module has no attribute 'generate_assets'`.

- [ ] **Step 3: Implement asset writing**

```python
def write_enemy_assets(enemy_id, source):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source_path = OUTPUT_DIR / f"{enemy_id}-source.png"
    preview_path = OUTPUT_DIR / f"{enemy_id}-preview.png"
    source.save(source_path, format="PNG", optimize=True)
    source.resize((PREVIEW, PREVIEW), Image.Resampling.LANCZOS).save(
        preview_path, format="PNG", optimize=True
    )
    return source_path, preview_path


def generate_assets():
    results = {}
    for enemy_id, config in FRAMING.items():
        source = Image.open(V3_DIR / f"{enemy_id}-source.png").convert("RGBA")
        framed = reframe(source, config)
        write_enemy_assets(enemy_id, framed)
        results[enemy_id] = framed
    return results


if __name__ == "__main__":
    generate_assets()
```

- [ ] **Step 4: Run all tests to verify GREEN**

Run the Task 1 Step 2 command.

Expected: `Ran 4 tests` and `OK`.

- [ ] **Step 5: Generate the fourteen PNG assets**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py
```

Expected: fourteen PNGs in the v4 output directory. Do not commit them.

---

### Task 3: Build the v3/v4 contact sheet and perform visual QA

**Files:**
- Modify: `tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py`
- Modify: `tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/enemy-v4-melvor-framing-contact-sheet.png`

**Interfaces:**
- Consumes: the seven v4 512px sources from `generate_assets()`.
- Produces: `build_contact_sheet()` and one 1760×2238 RGBA comparison sheet.

- [ ] **Step 1: Add a failing contact-sheet test**

```python
    def test_contact_sheet_contract(self):
        sources = module.generate_assets()
        sheet = module.build_contact_sheet(sources)
        self.assertEqual(sheet.mode, "RGBA")
        self.assertEqual(sheet.size, (1760, 2238))
```

- [ ] **Step 2: Run the test file to verify RED**

Run the Task 1 Step 2 command.

Expected: FAIL with `AttributeError: module has no attribute 'build_contact_sheet'`.

- [ ] **Step 3: Implement the comparison sheet**

Use the established v3 contact-sheet geometry:

```python
SHEET_WIDTH = 1760
HEADER_HEIGHT = 142
ROW_HEIGHT = 294
SHEET_HEIGHT = HEADER_HEIGHT + ROW_HEIGHT * 7 + 38

HEADERS = [
    (365, "v3 · 84px"),
    (618, "v4 · 256px 透明底"),
    (888, "v4 · 104px"),
    (1088, "v4 · 84px"),
    (1435, "v4 · 浅粉战斗卡"),
]
```

For every row, load the v3 source for the left comparison and use the v4 source for the other four panels. Preserve the existing checkerboard, rank-colored portrait frame, light-pink battle card, names, IDs, tiers, and ranks. Change the title to `敌人形象 v4 · 梅尔沃式近景构图` and the subtitle to `v3 / v4 对照｜全部放大｜上半身优先｜未接入游戏`.

- [ ] **Step 4: Save the contact sheet from `main()`**

```python
def main():
    sources = generate_assets()
    sheet = build_contact_sheet(sources)
    sheet.save(
        OUTPUT_DIR / "enemy-v4-melvor-framing-contact-sheet.png",
        format="PNG",
        optimize=True,
    )
```

- [ ] **Step 5: Run the tests and generator**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py
```

Expected: all tests pass and the contact sheet is written.

- [ ] **Step 6: Inspect the contact sheet at original resolution**

Use `view_image` on:

`docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/enemy-v4-melvor-framing-contact-sheet.png`

Confirm at 256px, 104px, 84px, and card scale:

- every v4 enemy is visibly larger than v3;
- upper-body identity features dominate;
- no key face, rabbit ear, back spine, moth wing, shoulder marking, sleeve lightning, or chest core is accidentally cut;
- no subject is visually off-center;
- the moth exception reads intentionally rather than undersized.

---

### Task 4: Final automated validation and review handoff

**Files:**
- Verify: `docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing/*.png`
- Verify: `tmp/imagegen/enemy-v4-melvor-framing/reframe_enemy_v4.py`
- Verify: `tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py`

**Interfaces:**
- Consumes: all outputs from Tasks 1–3.
- Produces: an evidence-backed review handoff; no runtime integration.

- [ ] **Step 1: Run the full unittest suite**

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tmp/imagegen/enemy-v4-melvor-framing/test_reframe_enemy_v4.py
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Verify the exact output set and metadata**

```python
expected = {
    f"{enemy_id}-{kind}.png"
    for enemy_id in FRAMING
    for kind in ("source", "preview")
}
expected.add("enemy-v4-melvor-framing-contact-sheet.png")
assert {path.name for path in OUTPUT_DIR.iterdir()} == expected
```

Expected: exactly 15 files.

- [ ] **Step 3: Verify source identity and visible enlargement**

For each enemy:

- SHA-256 of v4 must differ from v3 because framing changed;
- the v4 subject visible width or height must be larger than the corresponding v3 measurement;
- the top alpha bound must be 16–24px;
- the horizontal center offset must be at most 3px;
- all four corner alpha values must be zero.

- [ ] **Step 4: Verify scope**

Run:

```bash
git status --short --untracked-files=all -- \
  docs/art/enemy-prototypes/2026-07-31-enemy-v4-melvor-framing \
  tmp/imagegen/enemy-v4-melvor-framing
```

Expected: only v4 generator/test files and v4 output assets are listed. No runtime file is touched.

- [ ] **Step 5: Deliver the review sheet**

Embed the absolute contact-sheet path in the final response. State:

- all seven were reframed from v3 without regeneration;
- the framing follows the approved Melvor-inspired large portrait direction;
- no game integration was performed;
- assets remain uncommitted pending user approval.
