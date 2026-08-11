# Dungeon Enemy Art Batch Implementation Plan

> **Execution note:** Apply `superpowers:executing-plans` task by task. This is an
> asset-only, non-destructive batch: do not modify the existing 45 enemy images,
> game combat data, or runtime asset bindings.

**Goal:** Generate, normalize, validate, and deliver 18 dungeon-exclusive enemy
portraits defined by
`docs/superpowers/specs/2026-07-31-dungeon-enemy-expansion-design.md`.

**Architecture:** A standalone Python/Pillow batch script owns the canonical
manifest, generation prompts, chroma-key removal, framing, previews, contact
sheets, and validation. Built-in ImageGen creates one raw raster per enemy using
the approved flat-cartoon v2 batch as style-only reference. Raw outputs stay under
`tmp/imagegen`; transparent deliverables go to a new dated directory under
`docs/art/enemy-prototypes`.

**Tech Stack:** Python 3, Pillow, built-in ImageGen, existing
`remove_chroma_key.py` helper.

---

## Task 1: Lock the manifest and non-destructive contract

**Files:**

- Create: `selftest_dungeon_enemy_art_batch.py`
- Create: `scripts/build-dungeon-enemy-art-batch.py`
- Create: `tmp/imagegen/dungeon-enemies-neutral-cute/manifest.json`

### Step 1: Write the failing focused test

The test must require:

- exactly 18 unique enemy IDs and 18 unique Chinese names;
- tier distribution `1,1,1,2,2,2,3,3,3`;
- exact dungeon display names and enemy IDs from the approved design;
- every enemy is marked nonhuman and ordinary rank;
- every prompt contains the approved flat-cartoon, neutral-natural-cute,
  readable-at-84px, uniform-chroma-key, no-scenery, and no-deliberate-cuteness
  constraints;
- every output path is inside
  `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute`;
- every raw path is inside `tmp/imagegen/dungeon-enemies-neutral-cute`;
- `prepare` leaves all existing
  `2026-07-31-enemy-grounded-roster-cartoon-v2/*-source.png` hashes unchanged;
- all 18 IDs are absent from the current runtime `CombatContent.ENEMIES`.

Run:

```bash
python3 selftest_dungeon_enemy_art_batch.py
```

Expected: FAIL because `scripts/build-dungeon-enemy-art-batch.py` does not yet
exist.

### Step 2: Implement the minimal standalone pipeline

Add the exact 18-item manifest and commands:

- `prepare`
- `prompt --id ENEMY_ID`
- `normalize --id ENEMY_ID`
- `normalize --tier TIER`
- `normalize --all`
- `sheets`
- `validate`

Use:

- 512×512 RGBA source;
- 256×256 RGBA preview;
- target visible long edge of 450px;
- centered subject with 18px preferred top inset;
- green key by default and magenta key for green subjects;
- the existing chroma-key helper with a soft matte and despill;
- no writes to runtime image folders.

### Step 3: Run the focused test

Run:

```bash
python3 selftest_dungeon_enemy_art_batch.py
```

Expected: PASS with 18 manifest entries and unchanged existing source hashes.

### Step 4: Commit the pipeline

Stage only:

```bash
git add selftest_dungeon_enemy_art_batch.py \
  scripts/build-dungeon-enemy-art-batch.py
git commit -m "feat: add dungeon enemy art batch pipeline"
```

Do not stage generated files or unrelated dirty-worktree changes at this point.

---

## Task 2: Generate and normalize Tier 1–3

**Files:**

- Create: `tmp/imagegen/dungeon-enemies-neutral-cute/raw/mossbackSnail.png`
- Create: `tmp/imagegen/dungeon-enemies-neutral-cute/raw/creviceGecko.png`
- Create: `tmp/imagegen/dungeon-enemies-neutral-cute/raw/dregBeetle.png`
- Create: matching alpha intermediates
- Create: matching `*-source.png` and `*-preview.png` deliverables

### Step 1: Generate one asset per call

Use built-in ImageGen with
`tmp/imagegen/enemy-grounded-roster-cartoon-v2/reference-flat-cartoon.png` as a
style-only reference. Generate each enemy on its manifest key color.

### Step 2: Normalize

Run:

```bash
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 1
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 2
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 3
```

### Step 3: Inspect

Build sheets, inspect Tier 1–3 framing, species readability, flatness, expression,
and transparent edges. Regenerate only any failed asset.

---

## Task 3: Generate and normalize Tier 4–6

**Files:**

- Create: raw, alpha, source, and preview assets for `roundWoodlouse`,
  `broadwingBat`, `paleVeinCicada`, `graybackMarten`, `paleBandLeech`, and
  `stoneCrab`

### Step 1: Generate one asset per call

Follow each manifest brief and forbidden-feature list. Preserve natural animal
proportions while making the head/upper body the visual center.

### Step 2: Normalize by tier

Run:

```bash
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 4
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 5
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 6
```

### Step 3: Inspect

Reject deliberate mascot expressions, baby proportions, overly sharp anatomy,
glowing effects, props, scenery, or painterly texture.

---

## Task 4: Generate and normalize Tier 7–9

**Files:**

- Create: raw, alpha, source, and preview assets for `grayOwl`,
  `broadclawMole`, `brownbackPangolin`, `stonewallMussel`, `blindEel`,
  `rockwallMantis`, `rockDeer`, `grayCrane`, and `rockBee`

### Step 1: Generate one asset per call

Use magenta key for `rockwallMantis`; do not add a face to `stonewallMussel` or
normal large eyes to `blindEel`.

### Step 2: Normalize by tier

Run:

```bash
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 7
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 8
python3 scripts/build-dungeon-enemy-art-batch.py normalize --tier 9
```

### Step 3: Inspect

Confirm all nine remain calm or alert rather than aggressive, and that Tier 9
does not become ornate or divine.

---

## Task 5: Build the delivery package and verify

**Files:**

- Create: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/regions/tier-{1..9}.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/dungeon-enemies-contact-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/dungeon-enemies-84px-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/batch-summary.md`
- Create: `docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute/manifest.json`

### Step 1: Build all sheets

Run:

```bash
python3 scripts/build-dungeon-enemy-art-batch.py sheets
```

The region sheets group assets by their nine dungeon themes; the full sheet shows
all 18 names and tiers; the 84px sheet shows actual small-size legibility.

### Step 2: Run automated validation

Run:

```bash
python3 selftest_dungeon_enemy_art_batch.py
python3 scripts/build-dungeon-enemy-art-batch.py validate
git diff --check
```

Expected:

- 18 source images are 512×512 RGBA;
- 18 previews are 256×256 RGBA;
- all four corners are transparent;
- visible long edge is at least 442px without clipping;
- all required sheets, summary, and copied manifest exist;
- existing v2 sources remain byte-identical;
- no whitespace errors in scoped text changes.

### Step 3: Perform visual QA

Open the full contact sheet and 84px sheet. Confirm:

- species and unique features are identifiable;
- all images use the same flat-color family;
- eyes are clear and only modestly enlarged where natural;
- no image uses scenery, text, frame, cast shadow, aura, runes, weapons, clothing,
  accessories, gore, or deliberately cute decoration;
- no image is noticeably smaller, more realistic, more ornate, or more aggressive
  than the rest.

Regenerate and revalidate any failed item.

### Step 4: Commit the verified delivery

Stage only the plan, pipeline, focused test, and the new delivery directory:

```bash
git add \
  docs/superpowers/plans/2026-07-31-dungeon-enemy-art-batch.md \
  scripts/build-dungeon-enemy-art-batch.py \
  selftest_dungeon_enemy_art_batch.py \
  docs/art/enemy-prototypes/2026-07-31-dungeon-enemies-neutral-cute
git commit -m "art: deliver dungeon enemy portrait batch"
```

The raw ImageGen working files under `tmp/imagegen` remain local and are not
required for runtime use.
