# Enemy v3 Front-Facing Prototype Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete seven-enemy v3 review batch that preserves the approved rabbit and moth while replacing the other five enemies with simpler front-facing, arms-down designs.

**Architecture:** Copy the two approved v2 assets byte-for-byte into a separate v3 directory. Generate one neutral front-facing humanoid pose reference, use it in all three humanoid calls, independently redesign the stone puppet and ape, then remove chroma backgrounds, normalize transparent assets, and build a v2/v3 comparison sheet.

**Tech Stack:** Built-in ImageGen, local ImageGen chroma-key removal helper, Pillow/Lanczos, SHA-256 byte comparison, existing CommonJS combat content.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-31-enemy-art-v3-front-neutral-design.md`.
- Preserve `thornHare` and `soulMoth` exactly as they exist in `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/`.
- Regenerate only `stonePuppet`, `rogueCultivator`, `thunderJudge`, `earthVeinApe`, and `myriadLawAvatar`.
- Save the complete seven-enemy set only under `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/`.
- Human enemies use the same front-facing waist-up pose: level shoulders, vertical torso, arms hanging at both sides, visible hands near the lower waist, and no legs.
- Human enemies use no crossed arms, folded arms, side faces, body turns, raised hands, spell gestures, or handheld objects.
- `stonePuppet` and `earthVeinApe` use full-body front views with both arms down at their sides.
- `stonePuppet` must read as a rounded stone doll, not a robot, armored golem, or mech.
- `earthVeinApe` must remove the rock ridge and reduce earth-vein markings to one broad shape per shoulder.
- Use no outline, line art, scene, ground base, cast shadow, text, badge, watermark, extra subject, or detached particles.
- Use broad rounded color masses and at most one broad highlight and one broad shadow.
- Do not modify runtime assets, `ui.js`, `styles.css`, gameplay content, or `release/`.
- Do not commit generated prototypes before user approval.

---

### Task 1: Generate the shared front-facing humanoid pose reference

**Files:**
- Create temporary: `tmp/imagegen/enemy-v3-front/humanoid-front-arms-down-reference.png`

- [ ] Generate one gender-neutral gray cartoon mannequin from head through lower waist.
- [ ] Lock the head and torso directly toward the viewer with a vertical centerline and level shoulders.
- [ ] Place both arms vertically at the sides with small gaps from the torso and both simplified hands visible near the lower waist.
- [ ] End the body at a rounded lower-waist edge with no hips, thighs, knees, shins, or feet.
- [ ] Use an oversized head equal to roughly one third of visible height.
- [ ] Reject any reference with side face, body turn, crossed arms, folded hands, raised arms, clothing, hair, prop, action pose, or asymmetrical shoulder height.

### Task 2: Preserve the approved rabbit and moth

**Files:**
- Copy without transformation:
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/thornHare-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/thornHare-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/soulMoth-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v2-cartoon/soulMoth-preview.png`
- Create corresponding files under: `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/`

- [ ] Copy all four approved files without resizing, recompression, metadata edits, or color changes.
- [ ] Compare SHA-256 hashes between v2 and v3 and require exact equality.

### Task 3: Redesign the front-facing stone puppet and ape

**Files:**
- Create temporary:
  - `tmp/imagegen/enemy-v3-front/stonePuppet-raw.png`
  - `tmp/imagegen/enemy-v3-front/earthVeinApe-raw.png`

- [ ] Generate `stonePuppet` front-facing from one rounded head stone, one larger rounded body stone, two directly attached short hanging stone arms, and two wide stone feet.
- [ ] Give `stonePuppet` only a small flat ochre chest core and gray-brown two-tone stone color.
- [ ] Reject `stonePuppet` if it has shoulder armor, joint rings, elbow guards, gauntlets, mechanical gaps, a hexagonal armor silhouette, cracks, or detailed stone texture.
- [ ] Generate `earthVeinApe` as a symmetric front-facing squat ape with enlarged head, short neck, barrel torso, both heavy arms hanging down, and fists beside the body.
- [ ] Remove all rock plates and back ridges from `earthVeinApe`; retain only one broad ochre shoulder shape on each side.
- [ ] Reject `earthVeinApe` if it has detailed muscles, hair tufts, many fingers, full-body vein networks, a knuckle-charge pose, or more than seven main masses.

### Task 4: Generate the three front-facing arms-down humanoids

**Files:**
- Read shared pose: `tmp/imagegen/enemy-v3-front/humanoid-front-arms-down-reference.png`
- Create temporary:
  - `tmp/imagegen/enemy-v3-front/rogueCultivator-raw.png`
  - `tmp/imagegen/enemy-v3-front/thunderJudge-raw.png`
  - `tmp/imagegen/enemy-v3-front/myriadLawAvatar-raw.png`

- [ ] Generate `rogueCultivator` on the shared pose with a deep-wine short robe, charcoal collar, simplified dark-purple tied hair, and no held object.
- [ ] Generate `thunderJudge` on the shared pose with an indigo-violet robe, one connected broad shoulder mantle, no baton, and one attached cyan lightning stripe on a hanging sleeve.
- [ ] Generate `myriadLawAvatar` on the shared pose with a deep-violet body, warm-ivory inner plane, one chest core, and exactly three connected rounded teal back plates.
- [ ] Require all three faces, centerlines, shoulder lines, elbows, hands, and lower-waist crops to align with the shared reference.
- [ ] Reject any human result with a side face, body turn, crossed arms, hidden hands, raised hands, weapon, spell gesture, legs, or asymmetric action pose.

### Task 5: Remove backgrounds and normalize the five redraws

**Files:**
- Create helper: `tmp/imagegen/enemy-v3-front/normalize_enemy_v3.py`
- Create five new `*-source.png` and five new `*-preview.png` files under: `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/`

- [ ] Remove each flat chroma background using auto-key border sampling, soft matte, despill, and RGBA output.
- [ ] Retry one image with one-pixel edge contraction only if key-colored fringe exceeds the review threshold.
- [ ] Normalize `stonePuppet` to 82% longest-dimension occupancy and `earthVeinApe` to 87%.
- [ ] Normalize all three humanoids to the same 84% alpha height, top coordinate, bottom coordinate, and vertical center.
- [ ] Save 512×512 RGBA sources with transparent corners.
- [ ] Derive 256×256 RGBA previews with Lanczos.

### Task 6: Build and verify the v2/v3 review sheet

**Files:**
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v3-front/enemy-v3-front-contact-sheet.png`

- [ ] Show v2 at 84px, v3 at 256px on checkerboard, v3 at 104px, v3 at 84px, and v3 on a light-pink battle card.
- [ ] Label `thornHare` and `soulMoth` as “保留”; label the other five as “重做”.
- [ ] Confirm the v3 directory contains exactly seven sources, seven previews, and one contact sheet.
- [ ] Confirm every source and preview is PNG RGBA with transparent corners, 80%–88% occupancy, and no more than 3% center deviation.
- [ ] Confirm all three humanoids have identical alpha height and vertical bounds.
- [ ] Confirm frozen-file SHA-256 hashes match v2 and the five redraw hashes differ from v2.
- [ ] Confirm all seven IDs still match names, tiers, and ranks in `content/combat.js`.
- [ ] Inspect key-colored edge pixels and require suspicious fringe below 1%.
- [ ] Run `git diff --check -- docs/superpowers/plans/2026-07-31-enemy-v3-front-prototype-batch.md docs/art/enemy-prototypes/2026-07-31-enemy-v3-front`.
- [ ] Present the comparison sheet without modifying or committing runtime assets.

