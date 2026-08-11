# Dungeon Enemy Color v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolor the 18 approved dungeon-enemy portraits into a brighter,
softly saturated, dungeon-specific vector-cartoon palette without changing their
identity, pose, expression, framing, or transparent delivery format.

**Architecture:** A new non-destructive Python/Pillow batch wrapper derives its
18-entry manifest from the approved `dungeon-enemies-neutral-cute` batch, adds
per-enemy color-edit prompts and v2 output paths, delegates chroma removal and
sheet building to the existing dungeon-enemy pipeline, and adds before/after plus
color/shape validation. Built-in ImageGen edits one approved source image per
call; raw keyed images stay under `tmp/imagegen`, while normalized transparent
deliverables go to a new dated directory.

**Tech Stack:** Python 3, Pillow, built-in ImageGen, existing
`remove_chroma_key.py`, existing dungeon-enemy batch pipeline.

## Global Constraints

- Scope is exactly the existing 18 dungeon-exclusive enemies; the earlier 45
  enemies are out of scope.
- Write deliverables only under
  `docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2`.
- Do not overwrite or delete `2026-07-31-dungeon-enemies-neutral-cute`.
- Preserve species, silhouette, pose, body structure, proportions, eye shape,
  expression, crop, scale, and unique feature.
- Preserve 512×512 RGBA sources, 256×256 RGBA previews, transparent corners,
  target visible long edge of 450px, and 84px readability.
- Raise perceived brightness about 12%–18%; main saturation target is 25%–45%;
  accent saturation target is 45%–58%; high-saturation accent area is at most
  15% of visible pixels.
- Replace dominant dark brown/black with colored blue-gray, indigo-gray,
  lavender-gray, or dark green.
- Do not add geometry, patterns, props, ornaments, glow, aura, runes, scenery,
  gradients, realistic texture, or high-saturation candy/neon color.
- This plan delivers art assets only and does not modify runtime combat data or
  bindings.

---

### Task 1: Add the non-destructive color-v2 batch contract

**Files:**

- Create: `selftest_dungeon_enemy_color_v2.py`
- Create: `scripts/build-dungeon-enemy-color-v2.py`
- Consume: `scripts/build-dungeon-enemy-art-batch.py`
- Consume: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/manifest.json`

**Interfaces:**

- Consumes: `BASE.ENTRIES`, `BASE.normalize_one(item)`,
  `BASE.build_sheets(tier)`, and `BASE.validate(tier)` from the existing batch.
- Produces: `ENTRIES: list[dict[str, Any]]`, `prepare() -> None`,
  `edit_prompt(enemy_id: str) -> str`, `normalize(...) -> None`,
  `build_before_after() -> Path`, and `validate_color_v2() -> None`.

- [ ] **Step 1: Write the failing focused test**

Create `selftest_dungeon_enemy_color_v2.py` with assertions equivalent to:

```python
assert SCRIPT.exists()
before = {path.name: sha256(path) for path in OLD_OUTPUT.glob("*-source.png")}
subprocess.run([PYTHON, str(SCRIPT), "prepare"], check=True, cwd=ROOT)
after = {path.name: sha256(path) for path in OLD_OUTPUT.glob("*-source.png")}
assert before == after

entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
assert len(entries) == 18
assert len({item["id"] for item in entries}) == 18
assert {item["id"] for item in entries} == EXPECTED_IDS
for item in entries:
    assert item["oldSourcePath"].startswith(
        "docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/"
    )
    assert "2026-08-01-dungeon-enemies-color-v2" in item["sourcePath"]
    assert "dungeon-enemies-color-v2" in item["rawPath"]
    assert "Change colors only" in item["editPrompt"]
    assert "keep the exact silhouette" in item["editPrompt"]
    assert "main saturation 25 to 45 percent" in item["editPrompt"]
    assert item["palette"]["primary"]
    assert item["palette"]["secondary"]
    assert item["palette"]["accent"]
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  selftest_dungeon_enemy_color_v2.py
```

Expected: FAIL because `scripts/build-dungeon-enemy-color-v2.py` does not exist.

- [ ] **Step 3: Implement the derived manifest and commands**

Create `scripts/build-dungeon-enemy-color-v2.py` with:

```python
ROOT = Path(__file__).resolve().parents[1]
BASE_SCRIPT = ROOT / "scripts" / "build-dungeon-enemy-art-batch.py"
OLD_OUTPUT_DIR = ROOT / "docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute"
WORK_DIR = ROOT / "tmp/imagegen/dungeon-enemies-color-v2"
OUTPUT_DIR = ROOT / "docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2"

PALETTES = {
    "mossbackSnail": ("honey gold", "fresh moss green", "soft cream"),
    "creviceGecko": ("light sandstone", "soft blue-gray", "apricot"),
    "dregBeetle": ("soft coral red-brown", "amber", "warm beige"),
    "roundWoodlouse": ("mist blue", "blue-gray", "soft lavender"),
    "broadwingBat": ("soft gray-purple", "mist blue-gray", "cream gray"),
    "paleVeinCicada": ("pale gold-brown", "storm blue", "pale gray-white"),
    "graybackMarten": ("storm blue-gray", "cream", "soft brown"),
    "paleBandLeech": ("lake blue-gray", "deep teal-gray", "light apricot"),
    "stoneCrab": ("teal-gray", "lake blue-gray", "light apricot"),
    "grayOwl": ("lavender-gray", "cream gray", "soft gold"),
    "broadclawMole": ("light gray-purple brown", "cream yellow", "dusty rose-brown"),
    "brownbackPangolin": ("soft golden brown", "lavender-gray", "cream yellow"),
    "stonewallMussel": ("pearl white", "pale blue-gray", "very pale peach"),
    "blindEel": ("ivory", "pale peach", "pale blue-gray"),
    "rockwallMantis": ("sage green", "pale mint-gray", "cream"),
    "rockDeer": ("sky blue-gray", "ivory", "soft gray-purple"),
    "grayCrane": ("ivory", "sky blue-gray", "indigo-gray"),
    "rockBee": ("soft golden yellow", "indigo-gray", "light cream"),
}
```

Each derived entry must contain `oldSourcePath`, `rawPath`, `alphaPath`,
`sourcePath`, `previewPath`, `palette`, and `editPrompt`. The shared edit prompt
must say that Image 1 is the edit target; change colors only; preserve exact
silhouette, pose, anatomy, expression, crop, scale, and flat-shape boundaries;
raise brightness 12%–18%; keep main saturation 25%–45% and accents 45%–58%; and
render on the entry's exact uniform chroma-key color.

Add CLI commands:

```text
prepare
prompt --id ENEMY_ID
normalize (--id ENEMY_ID | --tier TIER | --all)
sheets [--tier TIER]
validate [--tier TIER]
```

`prepare` must write both working and delivery manifests but must not write or
modify any file under `OLD_OUTPUT_DIR`.

- [ ] **Step 4: Run the focused test and syntax check**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  selftest_dungeon_enemy_color_v2.py
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  -m py_compile scripts/build-dungeon-enemy-color-v2.py \
  selftest_dungeon_enemy_color_v2.py
```

Expected: both commands PASS.

- [ ] **Step 5: Commit the batch contract**

```bash
git add scripts/build-dungeon-enemy-color-v2.py \
  selftest_dungeon_enemy_color_v2.py
git commit -m "feat: add dungeon enemy color v2 pipeline"
```

---

### Task 2: Edit and normalize Tier 1–3

**Files:**

- Create: `tmp/imagegen/dungeon-enemies-color-v2/raw/{mossbackSnail,creviceGecko,dregBeetle}.png`
- Create: matching alpha intermediates
- Create: matching v2 sources and previews in the new output directory

**Interfaces:**

- Consumes: each entry's `oldSourcePath`, `keyColor`, and `editPrompt`.
- Produces: three normalized v2 source/preview pairs used by sheets and final
  validation.

- [ ] **Step 1: Inspect the three edit targets**

Open the three approved source PNGs so their exact shape, expression, and framing
are visible before editing.

- [ ] **Step 2: Run one built-in ImageGen edit per enemy**

Use only the corresponding approved source as Image 1. Do not use unrelated
character references. Save each built-in result to its manifest `rawPath`.

- [ ] **Step 3: Normalize and validate the tiers**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY scripts/build-dungeon-enemy-color-v2.py normalize --tier 1
$PY scripts/build-dungeon-enemy-color-v2.py normalize --tier 2
$PY scripts/build-dungeon-enemy-color-v2.py normalize --tier 3
$PY scripts/build-dungeon-enemy-color-v2.py validate --tier 1
$PY scripts/build-dungeon-enemy-color-v2.py validate --tier 2
$PY scripts/build-dungeon-enemy-color-v2.py validate --tier 3
```

Expected: three source/preview pairs pass RGBA, size, transparency, close-up, and
shape-overlap checks.

- [ ] **Step 4: Inspect the Tier 1–3 sheet**

Confirm honey/moss/cream, sandstone/blue-gray/apricot, and coral/amber/beige are
visibly distinct without neon color or geometry drift. Regenerate only a failed
enemy.

---

### Task 3: Edit and normalize Tier 4–6

**Files:**

- Create: raw, alpha, source, and preview assets for `roundWoodlouse`,
  `broadwingBat`, `paleVeinCicada`, `graybackMarten`, `paleBandLeech`, and
  `stoneCrab`

**Interfaces:**

- Consumes: the six approved v1 sources and manifest prompts.
- Produces: six normalized v2 source/preview pairs.

- [ ] **Step 1: Inspect all six edit targets**

Check especially the bat's revised neutral eyes, the leech's lack of invented
eyes, and the crab's asymmetric claws.

- [ ] **Step 2: Run six independent built-in ImageGen edits**

Each call changes color only and uses exactly one corresponding v1 target.

- [ ] **Step 3: Normalize and validate Tier 4–6**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
for tier in 4 5 6; do
  $PY scripts/build-dungeon-enemy-color-v2.py normalize --tier "$tier"
  $PY scripts/build-dungeon-enemy-color-v2.py validate --tier "$tier"
done
```

- [ ] **Step 4: Inspect the Tier 4–6 sheets**

Confirm the six enemies no longer read as one brown family; verify the bat,
marten, and crab keep their revised neutral expressions.

---

### Task 4: Edit and normalize Tier 7–9

**Files:**

- Create: raw, alpha, source, and preview assets for `grayOwl`,
  `broadclawMole`, `brownbackPangolin`, `stonewallMussel`, `blindEel`,
  `rockwallMantis`, `rockDeer`, `grayCrane`, and `rockBee`

**Interfaces:**

- Consumes: the nine approved v1 sources and manifest prompts.
- Produces: nine normalized v2 source/preview pairs.

- [ ] **Step 1: Inspect all nine edit targets**

Lock the owl's natural round eyes, the mussel's absence of a face, the blind
eel's regressed eye marks, the mantis's non-weapon forelegs, the deer's worn
antler tip, and the crane/bee's revised neutral eyes.

- [ ] **Step 2: Run nine independent built-in ImageGen edits**

Use magenta chroma for `rockwallMantis`; use the manifest key color for every
other enemy. Do not add divine or magical effects to Tier 9.

- [ ] **Step 3: Normalize and validate Tier 7–9**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
for tier in 7 8 9; do
  $PY scripts/build-dungeon-enemy-color-v2.py normalize --tier "$tier"
  $PY scripts/build-dungeon-enemy-color-v2.py validate --tier "$tier"
done
```

- [ ] **Step 4: Inspect the Tier 7–9 sheets**

Confirm lavender/cream/gold, pearl/peach/sage, and sky-blue/ivory/soft-gold read
as three different families. Reject candy pink, neon green, warning yellow-black,
metallic armor, or sacred glow.

---

### Task 5: Build comparison sheets and run final validation

**Files:**

- Create: `docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2/regions/tier-{1..9}.png`
- Create: `docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2/dungeon-enemies-color-v2-contact-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2/dungeon-enemies-color-v2-84px-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2/dungeon-enemies-color-v2-before-after.png`
- Create: matching `manifest.json` and `batch-summary.md`

**Interfaces:**

- Consumes: all 18 old/new source pairs.
- Produces: complete delivery package and quantitative audit output.

- [ ] **Step 1: Implement and run before/after plus color checks**

`validate_color_v2()` must calculate for each old/new pair:

```python
old_v = mean_visible_value(old_image)
new_v = mean_visible_value(new_image)
assert new_v >= old_v + 0.03 or new_v >= 0.75
assert alpha_iou(old_image, new_image) >= 0.82
assert high_saturation_fraction(new_image, threshold=0.58) <= 0.18
```

It must also require batch mean value improvement of at least `0.07` and at
least five occupied 30-degree hue bins among pixels with saturation `>= 0.25`.
The 18% implementation tolerance allows antialiased edges around the design's
15% accent target while still rejecting highly saturated subjects.

- [ ] **Step 2: Build every sheet**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY scripts/build-dungeon-enemy-color-v2.py sheets
```

- [ ] **Step 3: Run focused and asset validation**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY selftest_dungeon_enemy_color_v2.py
$PY scripts/build-dungeon-enemy-color-v2.py validate
git diff --check -- scripts/build-dungeon-enemy-color-v2.py \
  selftest_dungeon_enemy_color_v2.py \
  docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2
```

Expected: 18 sources, 18 previews, nine regional sheets, three batch sheets,
complete manifest/summary, unchanged v1 hashes, and all geometry/color checks
PASS.

- [ ] **Step 4: Perform final visual QA**

Open the v2 contact sheet, 84px sheet, and before/after sheet. Verify all 18
identities, neutral expressions, color-family separation, brightness, controlled
saturation, and transparent edges. Regenerate only failed items, then rerun Step
3.

- [ ] **Step 5: Commit the verified delivery**

```bash
git add docs/superpowers/plans/2026-08-01-dungeon-enemy-color-v2.md \
  scripts/build-dungeon-enemy-color-v2.py \
  selftest_dungeon_enemy_color_v2.py \
  docs/art/enemy-prototypes/2026-08-01-dungeon-enemies-color-v2
git commit -m "art: deliver brighter dungeon enemy palette"
```

Raw ImageGen working images remain under `tmp/imagegen/dungeon-enemies-color-v2`
and are not runtime assets.
