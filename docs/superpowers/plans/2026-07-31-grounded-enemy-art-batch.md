# Grounded Enemy Art Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete, normalized, reviewable set of 45 nonhuman enemy portraits from the approved grounded cultivation roster.

**Architecture:** Reuse the four frozen approved nonhuman portraits and generate the remaining 41 portraits one asset at a time with the built-in image generation tool. Every generated portrait first uses a flat removable chroma-key background, then passes through one deterministic normalization pipeline that removes the key, scales the visible subject into the approved close-up bounds, exports 512px and 256px RGBA PNGs, and renders regional and full-roster review sheets.

**Tech Stack:** Built-in ImageGen, Python 3, Pillow, the installed ImageGen chroma-key helper, PNG RGBA assets, Markdown and JSON manifests.

## Global Constraints

- Use `docs/superpowers/specs/2026-07-31-enemy-roster-art-requirements-design.md` as the sole roster and art-direction source.
- Preserve all 45 existing enemy IDs and the 27 normal / 9 elite / 9 boss rank distribution.
- Use no ordinary human silhouette, human clothing, hand-held weapon, or animal-headed human torso.
- Preserve the approved no-outline, broad-color-block, low-texture cartoon rendering.
- Keep the design grounded: 70%–80% understandable natural anatomy or material, about 20% cultivation mutation, at most 10% glow or supernatural cue.
- Normal enemies have one abnormal feature; elites and bosses have no more than two.
- Do not use galaxy textures, chest cores, floating halos, law wheels, lightning rings, architecture on backs, crowns, armor costumes, or full-screen effects.
- Use stable, front-facing or near-front neutral poses; heads or primary sensory organs face the viewer.
- Prioritize a close upper-body crop and an 84px-readable silhouette.
- Final sources are 512×512 PNG RGBA; previews are 256×256 PNG RGBA; all four corners have alpha 0.
- Do not replace runtime assets or modify combat data in this plan.
- User has explicitly waived intermediate approvals; execute all tasks continuously and provide the completed contact sheets at the end.

---

### Task 1: Create the batch workspace, manifest, and deterministic validator

**Files:**
- Create: `scripts/build-grounded-enemy-batch.py`
- Create: `tmp/imagegen/enemy-grounded-roster/manifest.json`
- Create: `tmp/imagegen/enemy-grounded-roster/reference-approved-nonhuman.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/batch-summary.md`

**Interfaces:**
- Consumes: the 45-row roster in the approved design spec and the four frozen v5 source portraits.
- Produces: a manifest with `id`, `name`, `tier`, `rank`, `keyColor`, `brief`, `avoid`, `reuseSource`, `rawPath`, `sourcePath`, and `previewPath`; a reusable normalization command; a four-character style reference sheet.

- [ ] **Step 1: Implement the manifest and reference-sheet builder**

Create `scripts/build-grounded-enemy-batch.py` with these commands:

```text
prepare    create directories, validate the 45-entry manifest, copy four frozen sources, and build the approved nonhuman reference sheet
prompt     print the complete shared and entry-specific ImageGen prompt for one enemy ID
normalize  remove chroma key from one raw image or selected tier, scale visible alpha bounds into the rank target, and export source/preview PNGs
sheets     render nine regional sheets and one 45-enemy contact sheet
validate   check counts, dimensions, RGBA mode, transparent corners, visible bounds, rank distribution, and manifest/file agreement
```

Use these visible-height targets on the 512px canvas:

```text
normal: 410–450px
elite:  430–468px
boss:   448–486px
```

Top-align the normalized visible bounds to `16–24px`, center them horizontally, and allow overflow only at the bottom or up to 4% on the left/right.

- [ ] **Step 2: Encode all 45 manifest entries exactly**

The manifest must contain the approved display names:

```text
刺背兔 山狼 灰尾狸 石傀 青鳞蟒
铁爪兽 石偶 火尾狐 镇坛石狮 老山猿
赤沙蝎 火鸦 刀螳 丹蟾 赤鳞巨蜥
魂蛾 鬼藤 泥妖 阴蛛 魂茧
雷隼 电蜥 甲犀 黑角牛 雷鹏
裂甲虫 黑翅蛾 裂背獾 白骨螈 巨口蜈蚣
陨铁犬 陨石傀 黑鳞螭 铜兽 黑甲龟
盲眼鱼 纹角兽 洞蝠 碑兽 食气兽
山鹫 雷灵 灰蛹 断角蛟 劫云
```

Set `reuseSource` only for:

```text
thornHare
stonePuppet
soulMoth
earthVeinApe
```

- [ ] **Step 3: Run preparation and verify manifest invariants**

Run:

```bash
python3 scripts/build-grounded-enemy-batch.py prepare
python3 scripts/build-grounded-enemy-batch.py validate --allow-missing-generated
```

Expected:

```text
manifest=45 uniqueIds=45 normal=27 elite=9 boss=9 reused=4 generated=41
```

- [ ] **Step 4: Commit the plan support files**

```bash
git add scripts/build-grounded-enemy-batch.py \
  tmp/imagegen/enemy-grounded-roster/manifest.json \
  tmp/imagegen/enemy-grounded-roster/reference-approved-nonhuman.png \
  docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/batch-summary.md
git commit -m "art: prepare grounded enemy batch pipeline"
```

### Task 2: Generate and normalize tiers 1–3

**Files:**
- Create: `tmp/imagegen/enemy-grounded-roster/raw/{enemyId}.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-source.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-preview.png`

**Interfaces:**
- Consumes: manifest entries for tiers 1–3 and `reference-approved-nonhuman.png` as a style/framing reference.
- Produces: 15 normalized portraits, including two reused frozen portraits (`thornHare`, `stonePuppet`) and 13 newly generated portraits.

- [ ] **Step 1: Generate each non-reused tier 1 portrait**

Issue one built-in ImageGen call for each of:

```text
grayWolf wanderingBandit caveWarden breathSerpent
```

Each prompt must include the shared prompt in Task 6 plus the entry-specific `brief` and `avoid` strings from the manifest.

- [ ] **Step 2: Normalize and inspect tier 1**

Run:

```bash
python3 scripts/build-grounded-enemy-batch.py normalize --tier 1
```

Then run:

```bash
python3 scripts/build-grounded-enemy-batch.py sheets --tier 1
python3 scripts/build-grounded-enemy-batch.py validate --tier 1
```

Expected: five valid portraits, one regional sheet, no missing IDs, no opaque corners.

- [ ] **Step 3: Generate each non-reused tier 2 portrait**

Issue one built-in ImageGen call for each of:

```text
ironClawBeast rogueCultivator altarGuardian earthVeinApe
```

`earthVeinApe` is reused, so generation is skipped unless its frozen source fails validation.

- [ ] **Step 4: Normalize and inspect tier 2**

Normalize each new raw image, render the tier 2 sheet, and run `validate --tier 2`.

- [ ] **Step 5: Generate and normalize tier 3**

Issue one built-in ImageGen call for each of:

```text
sandScorpion fireCrow swordRogue ruinElder scarletCoreBeast
```

Normalize each output, render the tier 3 sheet, and run `validate --tier 3`.

- [ ] **Step 6: Commit tiers 1–3**

```bash
git add docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster
git commit -m "art: add grounded enemy portraits tiers 1 to 3"
```

### Task 3: Generate and normalize tiers 4–6

**Files:**
- Create: `tmp/imagegen/enemy-grounded-roster/raw/{enemyId}.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-source.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-preview.png`

**Interfaces:**
- Consumes: manifest entries for tiers 4–6 and the approved reference sheet.
- Produces: 15 normalized portraits, including one reused frozen portrait (`soulMoth`) and 14 newly generated portraits.

- [ ] **Step 1: Generate and normalize tier 4**

Generate one asset each for:

```text
ghostVine mireFiend towerKeeper infantSoulShade
```

Reuse `soulMoth`, render the tier 4 sheet, and run `validate --tier 4`.

- [ ] **Step 2: Generate and normalize tier 5**

Generate one asset each for:

```text
thunderBird lightningSpirit armoredFiend thunderJudge heavenlyThunderRoc
```

Render the tier 5 sheet and run `validate --tier 5`.

- [ ] **Step 3: Generate and normalize tier 6**

Generate one asset each for:

```text
riftCrawler voidMoth spaceBandit riftWarden voidDevourer
```

Render the tier 6 sheet and run `validate --tier 6`.

- [ ] **Step 4: Commit tiers 4–6**

```bash
git add docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster
git commit -m "art: add grounded enemy portraits tiers 4 to 6"
```

### Task 4: Generate and normalize tiers 7–9

**Files:**
- Create: `tmp/imagegen/enemy-grounded-roster/raw/{enemyId}.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-source.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/{enemyId}-preview.png`

**Interfaces:**
- Consumes: manifest entries for tiers 7–9 and the approved reference sheet.
- Produces: 15 newly generated and normalized portraits.

- [ ] **Step 1: Generate and normalize tier 7**

Generate one asset each for:

```text
starHound meteorGolem abyssCultivator palaceMarshal unityTitan
```

Render the tier 7 sheet and run `validate --tier 7`.

- [ ] **Step 2: Generate and normalize tier 8**

Generate one asset each for:

```text
daoWraith lawBeast skyDemon daoGateKeeper myriadLawAvatar
```

Render the tier 8 sheet and run `validate --tier 8`.

- [ ] **Step 3: Generate and normalize tier 9**

Generate one asset each for:

```text
cloudGeneral tribulationSpirit immortalShadow tribulationHerald ninefoldTribulation
```

Render the tier 9 sheet and run `validate --tier 9`.

- [ ] **Step 4: Commit tiers 7–9**

```bash
git add docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster
git commit -m "art: add grounded enemy portraits tiers 7 to 9"
```

### Task 5: Render the complete roster package and run final validation

**Files:**
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/enemy-grounded-roster-contact-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/enemy-grounded-roster-84px-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/regions/tier-{1..9}.png`
- Modify: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/batch-summary.md`

**Interfaces:**
- Consumes: all 45 normalized source and preview assets.
- Produces: final review sheets, prompt/method summary, and machine-verifiable complete batch.

- [ ] **Step 1: Render all sheets**

Run:

```bash
python3 scripts/build-grounded-enemy-batch.py sheets
```

- [ ] **Step 2: Run complete validation**

Run:

```bash
python3 scripts/build-grounded-enemy-batch.py validate
```

Expected:

```text
manifest=45 source=45 preview=45 regions=9 cornersTransparent=90 dimensionsValid=90
normal=27 elite=9 boss=9 reused=4 generated=41
PASS
```

- [ ] **Step 3: Inspect the complete contact sheet**

Open:

```text
docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/enemy-grounded-roster-contact-sheet.png
docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/enemy-grounded-roster-84px-sheet.png
```

Check:

- no human silhouettes;
- no side-facing humanoid pose;
- no galaxy skins, halos, crowns, architecture backs, weapons, or chest cores;
- all rows use close framing;
- ordinary, elite, and boss scale increases without added clutter;
- all nine regions have distinct but restrained material palettes.

- [ ] **Step 4: Update the batch summary**

Record:

- built-in ImageGen as the generation path;
- the shared prompt from Task 6;
- the 41 entry-specific briefs and avoid clauses from the manifest;
- the four reused source paths;
- normalization and alpha-removal commands;
- validation results and final sheet paths.

- [ ] **Step 5: Commit the final package**

```bash
git add scripts/build-grounded-enemy-batch.py \
  docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster
git commit -m "art: complete grounded enemy portrait roster"
```

### Task 6: Shared ImageGen prompt contract

**Files:**
- Consume: `tmp/imagegen/enemy-grounded-roster/manifest.json`
- Consume: `tmp/imagegen/enemy-grounded-roster/reference-approved-nonhuman.png`

**Interfaces:**
- Consumes: one manifest entry at a time.
- Produces: one keyed raw PNG for the entry's `enemyId`.

- [ ] **Step 1: Use this shared prompt for every new portrait**

```text
Use case: stylized-concept
Asset type: production enemy portrait for a 2D cultivation idle game
Input images: the supplied image is a style and framing reference only; create a new enemy, do not copy any reference character
Primary request: create exactly one nonhuman enemy using the entry-specific subject brief
Style/medium: rounded flat cartoon game art, no black outline, broad connected color shapes, low texture, restrained hard-edged shading; match the supplied approved enemy portraits
Composition/framing: square portrait, stable neutral pose, head or primary sensory organ faces the viewer, front-facing or no more than 15 degrees turned; close upper-body crop; subject fills 84%–90% of the canvas; centered; highest point 4% from the top; feet, lower body, or tail may crop at the bottom
Design logic: 70%–80% recognizable natural anatomy or material, about 20% cultivation mutation, no more than 10% glow; normal enemy one abnormal feature; elite or boss no more than two
Scene/backdrop: perfectly flat solid chroma-key background using the manifest key color, uniform edge to edge
Constraints: exactly one subject; no ordinary human silhouette; no human face; no robes; no armor costume; no hand-held weapon; no text; no labels; no watermark; no scenery; no ground; no shadow; no reflection; no gradient or texture in the background; crisp separated silhouette; do not use the chroma-key color anywhere in the subject
Avoid: galaxy or cosmic textures, chest gems or energy cores, floating halos, law wheels, lightning rings, buildings or mountains on the back, crowns, decorative shoulder armor, excessive horns, excessive eyes, excessive tails, busy particles, cinematic action pose, side-facing profile, realistic hair, realistic muscles, realistic scale texture, mechanical joints
```

Append three lines populated directly from the selected manifest entry:

```text
Subject brief: the selected entry's complete brief string
Additional avoid: the selected entry's complete avoid string
Rank: the selected entry's rank; communicate rank through age, mass, wear, and framing, never through added ornaments or effects
```

For every call, obtain the complete concrete prompt with:

```bash
python3 scripts/build-grounded-enemy-batch.py prompt --id grayWolf
```

Replace `grayWolf` with one of the explicitly listed IDs in Tasks 2–4. The command must fail for an ID not present in the 45-entry manifest.

- [ ] **Step 2: Save each built-in output into the raw directory**

Copy the generated PNG from the built-in output location to:

```text
tmp/imagegen/enemy-grounded-roster/raw/{enemyId}.png
```

Do not leave any project deliverable only under the built-in default generated-images directory.
