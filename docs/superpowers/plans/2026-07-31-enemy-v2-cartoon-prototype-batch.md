# Enemy v2 Cartoon Prototype Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a more cartoon-styled v2 of the seven approved enemy prototypes, with all three humanoid enemies sharing one waist-up guarded pose.

**Architecture:** Preserve the v1 batch as identity reference and create a separate v2 output directory. First generate one neutral humanoid pose reference, then use it in every humanoid ImageGen call alongside the corresponding v1 identity image and approved item-style sheet. Generate nonhumans independently with enlarged heads, shorter limbs, fewer broad masses, and reduced shading; remove chroma backgrounds, normalize transparent masters, and build a v1/v2 comparison sheet.

**Tech Stack:** Built-in ImageGen, local ImageGen chroma-key removal helper, Pillow/Lanczos, existing CommonJS combat content, local image validation.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-31-enemy-art-v2-cartoon-halfbody-design.md`.
- Preserve the exact roster: `thornHare`, `stonePuppet`, `soulMoth`, `rogueCultivator`, `thunderJudge`, `earthVeinApe`, and `myriadLawAvatar`.
- Preserve `docs/art/enemy-prototypes/2026-07-31-enemy-v1/` unchanged.
- Save v2 only under `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/`.
- Generate every requested enemy with a separate built-in ImageGen call.
- Use the v1 image only for enemy identity and palette; do not preserve its realistic proportions or pose.
- Use the v4 material sheet only for no-outline geometry, restrained palette, and low-detail rendering.
- Use enlarged heads, shortened thick limbs, rounded masses, simplified faces, and no continuous realistic shading.
- Use 3–5 main shape masses for normal enemies and 5–7 for elite or boss enemies.
- Use no outline, line art, scene, ground base, cast shadow, text, badge, watermark, extra character, or detached particle field.
- `rogueCultivator`, `thunderJudge`, and `myriadLawAvatar` must all use the same pose reference and show only head through lower waist.
- Humanoid bodies face image-left by about 30 degrees; heads turn slightly back toward the player; the near forearm crosses the lower chest and the far forearm bends inward.
- Humanoid hands, handheld objects, and connected effects remain inside shoulder width.
- Elite shoulder armor and boss back plates may extend to 1.35 times shoulder width without obscuring the shared pose.
- Do not modify runtime assets, `ui.js`, `styles.css`, gameplay content, or `release/`.
- Do not commit generated prototypes before user approval.

---

### Task 1: Create and approve the shared humanoid pose reference

**Files:**
- Read: `docs/superpowers/specs/2026-07-31-enemy-art-v2-cartoon-halfbody-design.md`
- Read: `docs/art/icon-prototypes/2026-07-29/material-icon-standard-sheet-v4-no-outline.png`
- Create temporary: `tmp/imagegen/enemy-v2-cartoon/humanoid-halfbody-pose-reference.png`

- [ ] Generate exactly one neutral, gender-neutral, gray cartoon mannequin on a flat removable chroma background.
- [ ] Show head through lower waist only; no thighs, knees, shins, or feet.
- [ ] Lock the body at a 30-degree image-left turn and the head slightly back toward the viewer.
- [ ] Lock the near forearm horizontally across the lower chest and the far forearm bent inward to the chest.
- [ ] Keep both hands inside shoulder width and keep both shoulders visible and nearly level.
- [ ] Use a head equal to roughly one third of visible subject height.
- [ ] Reject the reference if it contains clothing, hair, weapon, magic, gender-specific anatomy, spread arms, a full body, or a dramatic action pose.

### Task 2: Generate the four cartoon nonhumans

**Files:**
- Read identity references:
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thornHare-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/stonePuppet-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/soulMoth-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/earthVeinApe-source.png`
- Create temporary raw images:
  - `tmp/imagegen/enemy-v2-cartoon/thornHare-raw.png`
  - `tmp/imagegen/enemy-v2-cartoon/stonePuppet-raw.png`
  - `tmp/imagegen/enemy-v2-cartoon/soulMoth-raw.png`
  - `tmp/imagegen/enemy-v2-cartoon/earthVeinApe-raw.png`

- [ ] Generate `thornHare` as one bean-shaped cartoon rabbit with a head 20% larger than v1, very short thick legs, oversized ears, and only three or four broad back spines.
- [ ] Generate `stonePuppet` from six or seven rounded rock blocks with an oversized head, large fists and feet, almost absent neck, and short joints.
- [ ] Generate `soulMoth` with a merged round head-and-chest mass, wide short wings, one large marking per wing, short antennae, and one connected tail.
- [ ] Generate `earthVeinApe` with a larger head, shorter thicker forearms, rounded squat torso, reduced shoulder ridge, and only two or three ochre earth-vein shapes.
- [ ] Reject any result that preserves v1's long limbs, small head, many angular facets, detailed hair or rock texture, or realistic anatomy.

### Task 3: Generate the three unified-pose cartoon humanoids

**Files:**
- Read shared pose: `tmp/imagegen/enemy-v2-cartoon/humanoid-halfbody-pose-reference.png`
- Read identity references:
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/rogueCultivator-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thunderJudge-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/myriadLawAvatar-source.png`
- Create temporary raw images:
  - `tmp/imagegen/enemy-v2-cartoon/rogueCultivator-raw.png`
  - `tmp/imagegen/enemy-v2-cartoon/thunderJudge-raw.png`
  - `tmp/imagegen/enemy-v2-cartoon/myriadLawAvatar-raw.png`

- [ ] Generate `rogueCultivator` with the shared pose unchanged, a large simplified head, deep-wine short robe, tied hair, and one plain bronze plaque held between the inward arms.
- [ ] Generate `thunderJudge` with the shared pose unchanged, indigo-violet robe, one broad shoulder-armor structure, and a short baton crossing the lower chest with one attached cyan lightning shape.
- [ ] Generate `myriadLawAvatar` with the shared pose unchanged, deep-violet central body, chest core, and three to five broad teal law plates connected behind the shoulders.
- [ ] Keep all three crops at the same lower-waist height and keep their head, shoulder, elbow, and hand positions visually aligned.
- [ ] Reject any result with legs, a different body turn, spread arms, raised casting hand, long weapon, action lunge, or identity detail that hides the shared pose.

### Task 4: Remove chroma backgrounds and normalize v2 assets

**Files:**
- Create helper: `tmp/imagegen/enemy-v2-cartoon/normalize_enemy_v2.py`
- Create seven `*-source.png` files under: `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/`
- Create seven `*-preview.png` files under: `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/`

- [ ] Remove each accepted raw image's flat background with auto-key border sampling, soft matte, despill, and RGBA output.
- [ ] Inspect edges and retry once with a one-pixel edge contraction only when a visible key fringe remains.
- [ ] Normalize each source to 512×512 RGBA with transparent corners and centered alpha bounds.
- [ ] Use 82% longest-dimension occupancy for the three nonhuman normal enemies and 87% for `earthVeinApe`.
- [ ] Normalize `rogueCultivator`, `thunderJudge`, and `myriadLawAvatar` to the same 84% alpha-bound height and vertical center; do not programmatically crop or scale one humanoid differently from the others.
- [ ] Derive 256×256 RGBA previews directly from the accepted 512px sources with Lanczos.

### Task 5: Build the v1/v2 comparison contact sheet

**Files:**
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/enemy-v2-cartoon-contact-sheet.png`

- [ ] Build one fixed-order row for each of the seven enemies.
- [ ] Show the v1 84px image first as a labeled comparison only.
- [ ] Show v2 at 256px on a checkerboard, 104px in the desktop portrait frame, 84px in the mobile portrait frame, and 84px on a light-pink battle card.
- [ ] Label each row with Chinese name, `enemyId`, tier, and rank outside the art.
- [ ] Add a visible “统一半身姿态” note to the three humanoid rows.
- [ ] Do not apply sharpening or post effects that hide actual 84px readability.

### Task 6: Verify and hand off the review batch

**Files:**
- Verify: `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/*.png`
- Verify unchanged: `docs/art/enemy-prototypes/2026-07-31-enemy-v1/`

- [ ] Confirm the v2 directory contains exactly seven 512px sources, seven 256px previews, and one contact sheet.
- [ ] Confirm every source and preview is PNG RGBA with four transparent corners.
- [ ] Confirm alpha occupancy is 80%–88% and center deviation is no more than 3% per axis.
- [ ] Confirm every ID still matches the name, tier, and rank in `content/combat.js`.
- [ ] Compare the three humanoids side by side and reject the batch if their crop, body turn, shoulder line, or arm layout does not read as one shared template.
- [ ] Inspect the v1/v2 sheet and confirm all seven v2 images are visibly more cartoon in proportion and rendering.
- [ ] Check key-colored fringe on partially transparent edge pixels.
- [ ] Run `git diff --check -- docs/superpowers/plans/2026-07-31-enemy-v2-cartoon-prototype-batch.md docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon`.
- [ ] Present the comparison sheet for user approval without modifying or committing runtime assets.
