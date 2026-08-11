# Enemy v1 Prototype Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, normalize, and visually verify seven review-only enemy prototypes that follow the approved `enemy-v1-no-outline-xianxia` standard and use only enemies already defined in the game.

**Architecture:** Treat `content/combat.js` as the identity source and the approved enemy art specification as the visual source of truth. Generate one isolated enemy per ImageGen call, use the approved no-outline material sheet only as a flatness and color-block reference, remove the temporary chroma background, normalize each subject on a transparent 512px canvas, derive 256px previews, then build a single contact sheet showing 256px, 104px, 84px, and battle-card-background views. Keep the entire batch under `docs/art/enemy-prototypes/`; do not touch runtime assets or UI code before user approval.

**Tech Stack:** Built-in ImageGen, ImageGen chroma-key removal helper, Pillow/Lanczos, local shell verification, existing CommonJS combat content.

**Reference Standard:** `docs/superpowers/specs/2026-07-31-enemy-art-asset-standard-design.md`

## Global Constraints

- The exact review roster is `thornHare`, `stonePuppet`, `soulMoth`, `rogueCultivator`, `thunderJudge`, `earthVeinApe`, and `myriadLawAvatar`.
- Generate each enemy independently; never ask ImageGen for a multi-enemy sheet.
- Use one centered subject, a three-quarter view facing the image's left-front, and complete uncut silhouette features.
- Use no outline, line art, frame, scene, ground base, cast shadow, text, rank badge, watermark, unrelated prop, detached particle field, or additional character.
- Use broad flat color blocks, at most one highlight plane and one shadow plane, with restrained accent color.
- Normal enemies use one defining silhouette feature; the elite uses one added dominant feature; bosses use a genuinely stronger silhouette rather than a recolor.
- Use no invented enemy names, named equipment, abilities, affiliations, or story details.
- Final source images are 512×512 RGBA; review previews are 256×256 RGBA.
- Normal and elite subjects should occupy approximately 76%–86% of the canvas; bosses may occupy 82%–90%.
- Keep the visual center within 3% of the canvas center, while allowing asymmetrical wings, weapons, tails, or aura structures to balance perceptually.
- Do not modify `ui.js`, `styles.css`, `assets/enemy-portraits/`, `release/`, gameplay content, tests, or package manifests.
- Do not commit generated prototypes before the user approves them.
- Preserve all unrelated working-tree changes.

---

### Task 1: Confirm inputs and prepare isolated prototype paths

**Files:**
- Read: `content/combat.js`
- Read: `docs/superpowers/specs/2026-07-31-enemy-art-asset-standard-design.md`
- Read: `docs/art/icon-prototypes/2026-07-29/material-icon-standard-sheet-v4-no-outline.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-v1/`
- Create temporary work files under: `tmp/imagegen/enemy-v1/`

- [ ] Verify all seven IDs, Chinese names, tiers, ranks, and regions from `content/combat.js`.
- [ ] Inspect the approved item reference sheet only for its no-outline shape language, broad clean color blocks, palette restraint, and low detail density.
- [ ] Create isolated raw, keyed, normalized, and review paths without overwriting any existing runtime art.
- [ ] Record the exact roster metadata used for prompting:
  - `thornHare`: 棘刺兔, tier 1 normal, 青云山麓.
  - `stonePuppet`: 岩石傀儡, tier 2 normal, 玄铁岭.
  - `soulMoth`: 噬魂蛾, tier 4 normal, 雾魂泽.
  - `rogueCultivator`: 邪修, tier 2 normal, 玄铁岭.
  - `thunderJudge`: 雷罚使, tier 5 elite, 雷霆峰.
  - `earthVeinApe`: 地脉猿王, tier 2 boss, 玄铁岭.
  - `myriadLawAvatar`: 万法化身, tier 8 boss, 大乘天渊.

### Task 2: Generate the four normal enemies

**Files:**
- Create temporary raw images:
  - `tmp/imagegen/enemy-v1/thornHare-raw.png`
  - `tmp/imagegen/enemy-v1/stonePuppet-raw.png`
  - `tmp/imagegen/enemy-v1/soulMoth-raw.png`
  - `tmp/imagegen/enemy-v1/rogueCultivator-raw.png`

- [ ] Generate `thornHare` with this fixed art direction:
  - One compact full-body rabbit demon beast, alert low stance, slightly enlarged head and powerful rear legs.
  - A short fan of blunt dark-jade back spines is the only attack feature.
  - Warm sand/taupe body, muted jade spines, dark plum eyes, 4–6 broad color blocks.
  - Cute through rounded mass and readable ears, but not babyish; no blush, stars, grin, weapon, armor, magic, or detached thorn projectiles.
- [ ] Generate `stonePuppet` with this fixed art direction:
  - One compact full-body humanoid puppet assembled from a small number of large interlocking rock blocks.
  - Squared shoulders, short stable limbs, slightly forward guarding pose, one simple ochre core inset in the chest.
  - Gray-brown stone, dark slate joints, muted ochre focal point, 4–6 broad hard-edged color blocks.
  - No rune text, floating stones, weapon, moss scene, pedestal, glowing circle, or realistic cracked texture.
- [ ] Generate `soulMoth` with this fixed art direction:
  - One complete hovering moth spirit with a broad, immediately readable wing silhouette.
  - Compact body and one solid teal-violet soul core connected to the torso; the lower body may taper softly but remains connected.
  - Deep blue-violet wings with muted teal accents, 4–6 broad symmetrical color blocks.
  - No swarm, skull pattern, dust cloud, detached wisps, moon, fog scene, thin antenna clutter, or near-black outer edge.
- [ ] Generate `rogueCultivator` with this fixed art direction:
  - One hostile human cultivator shown from head to knee in a left-front three-quarter guarded stance.
  - Dark short robe, tied hair, compact unnamed protective object held close to the body; face remains simple and readable.
  - Deep wine, charcoal-purple, muted tan skin, and one dull bronze accent, 4–6 broad color blocks.
  - No named weapon, sect crest, detailed talisman text, cape spread, elaborate costume folds, second person, background spell circle, or player-character portrait polish.
- [ ] Review each generated result at source size and reject it immediately if it violates the one-subject, no-outline, no-scene, simple-flat-render, or identity rules.

### Task 3: Generate the elite and two bosses

**Files:**
- Create temporary raw images:
  - `tmp/imagegen/enemy-v1/thunderJudge-raw.png`
  - `tmp/imagegen/enemy-v1/earthVeinApe-raw.png`
  - `tmp/imagegen/enemy-v1/myriadLawAvatar-raw.png`

- [ ] Generate `thunderJudge` with this fixed art direction:
  - One elite human enforcer shown head to knee, upright attack-ready left-front three-quarter stance.
  - Broad angular shoulder mantle is the single dominant elite structure.
  - One connected fork of blue-violet lightning runs from the forearm into a short unnamed ceremonial implement and never forms a detached particle field.
  - Indigo, muted violet, pale cyan lightning, and one restrained gold accent, 5–8 broad color blocks.
  - No crown badge, readable runes, giant weapon, multiple lightning rings, storm scene, floating sparks, second person, or full-body tiny framing.
- [ ] Generate `earthVeinApe` with this fixed art direction:
  - One massive full-body ape boss in a grounded knuckle-forward stance, facing left-front.
  - Wide shoulders and heavy forearms establish the boss silhouette; a restrained ridge of rock-like protrusions and connected ochre earth-vein planes concentrates on the shoulders and upper back.
  - Deep earth brown, warm rock gray, muted ochre, and dark moss green, 7–10 broad color blocks.
  - No crown, throne, weapon, mountain scene, ground debris, floating boulders, energy ring, or recolored ordinary ape proportions.
- [ ] Generate `myriadLawAvatar` with this fixed art direction:
  - One high-tier humanoid dharma avatar, shown as a tall three-quarter figure with calm imposing posture, facing left-front.
  - A single solid central body with several broad connected fan-like law plates behind the shoulders; every plate physically joins the main silhouette.
  - Pale warm ivory must stay inside the silhouette and be bounded by deep violet or muted teal outer structures so it remains readable on pale UI.
  - Deep violet, muted teal, warm ivory, restrained gold, and one cyan-violet core, 7–10 broad color blocks.
  - No multiple clones, multiple faces, named artifacts, written glyphs, mandala background, detached orbiting symbols, galaxy scene, giant bloom, or photoreal deity rendering.
- [ ] Compare the elite and bosses against the normal enemies: `thunderJudge` must read as one step more structured; both bosses must have unique larger silhouettes and remain cleaner than a splash illustration.
- [ ] Regenerate only the failed enemy when a result violates the approved hierarchy or style.

### Task 4: Remove chroma backgrounds and normalize transparent masters

**Files:**
- Create:
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thornHare-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/stonePuppet-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/soulMoth-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/rogueCultivator-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thunderJudge-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/earthVeinApe-source.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/myriadLawAvatar-source.png`
- Create one-off normalization helper: `tmp/imagegen/enemy-v1/normalize_enemy_prototypes.py`

- [ ] Run the installed ImageGen chroma-key removal helper on each accepted raw image using its border color, soft matte, despill, and forced RGBA output.
- [ ] Inspect each keyed edge on both light pink and dark checkerboard backgrounds; reject green, magenta, blue, white, or gray fringes.
- [ ] In the one-off Pillow helper, detect alpha bounds, scale the visible subject with Lanczos, preserve aspect ratio, and place it on a 512×512 transparent canvas.
- [ ] Use target occupancy by longest visible dimension:
  - 82% for `thornHare`, `stonePuppet`, `soulMoth`, and `rogueCultivator`.
  - 84% for `thunderJudge`.
  - 87% for `earthVeinApe` and `myriadLawAvatar`.
- [ ] Center by alpha-bounds visual center and apply only small optical offsets when wings, weapons, or asymmetric plates make the subject feel visibly off-center.
- [ ] Save all source files as 512×512 RGBA PNGs with fully transparent corners.
- [ ] Do not posterize, trace, recolor, sharpen, or add artificial outlines during normalization.

### Task 5: Derive previews and build the contact sheet

**Files:**
- Create:
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thornHare-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/stonePuppet-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/soulMoth-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/rogueCultivator-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/thunderJudge-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/earthVeinApe-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/myriadLawAvatar-preview.png`
  - `docs/art/enemy-prototypes/2026-07-31-enemy-v1/enemy-v1-contact-sheet.png`

- [ ] Derive each 256×256 RGBA preview directly from the accepted 512px source with Lanczos resampling.
- [ ] Build one labeled contact-sheet row per enemy in the fixed roster order.
- [ ] For every row, show:
  - A 256px transparent-checker preview.
  - A 104px desktop combat-frame preview.
  - An 84px mobile combat-frame preview.
  - An 84px preview placed on the game's light pink battle-card color.
  - Chinese name, `enemyId`, tier, and normal/elite/boss rank outside the art itself.
- [ ] Keep all scale examples unsharpened and sourced from the same 512px master so the sheet reveals true small-size readability.
- [ ] Use no decorative effects in the sheet that could hide fringe, contrast, or centering problems.

### Task 6: Run automated and visual acceptance checks

**Files:**
- Verify: `docs/art/enemy-prototypes/2026-07-31-enemy-v1/*.png`
- Verify unchanged: `ui.js`
- Verify unchanged: `assets/enemy-portraits/`
- Verify unchanged: `release/`

- [ ] Confirm there are exactly seven `*-source.png`, seven `*-preview.png`, and one `enemy-v1-contact-sheet.png`.
- [ ] Confirm every source is 512×512 PNG RGBA, every preview is 256×256 PNG RGBA, and all four corners have alpha zero.
- [ ] Confirm every visible alpha bound falls inside the approved 76%–90% range and its center deviation is no more than 3% per axis, except a documented intentional optical offset.
- [ ] Confirm all seven IDs still exist in `content/combat.js` and no extra enemy ID was produced.
- [ ] Inspect the seven sources individually for identity, outline, extra subjects, forbidden story additions, edge fringe, color-block discipline, and complete silhouettes.
- [ ] Inspect the final contact sheet at native size and at fit-to-window size for cross-enemy consistency, rank hierarchy, light-pink contrast, and 104px/84px recognition.
- [ ] Run `git diff --check -- docs/superpowers/plans/2026-07-31-enemy-v1-prototype-batch.md docs/art/enemy-prototypes/2026-07-31-enemy-v1`.
- [ ] Confirm `git status --short` shows no task-caused modification to runtime, release, or gameplay files.
- [ ] Present the contact sheet and prototype directory for user review, explicitly noting that no art has been integrated into the game and that any failed enemy can be regenerated individually.

