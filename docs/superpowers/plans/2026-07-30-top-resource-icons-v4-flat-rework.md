# Top Resource Icons v4 Flat Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the five already-integrated top resource icons with assets that strictly follow the approved `v4-no-outline` item icon art standard.

**Architecture:** Keep all existing HUD markup, data flow, filenames, and resource order unchanged. Generate one independent flat icon for each resource against a removable chroma-key background, convert the selected images to transparent centered RGBA PNGs, derive 100px and 50px deliverables, then overwrite the existing files and sync the generated release directory.

**Tech Stack:** Built-in ImageGen, local chroma-key removal helper, Pillow/Lanczos image normalization, existing Node asset tests, existing release sync scripts.

**Reference Standard:** `docs/art/2026-07-30-item-icon-art-standard.md`

## Constraints

- Preserve the five canonical resources and order: `lingshi`, `jingqi`, `mood`, `shengwang`, `shouyuan`.
- Use one concrete centered subject per icon, occupying roughly 72–84% of the square canvas.
- Use simple flat color blocks with no outline, stroke, contour, gradient, gloss, bevel, cast shadow, frame, badge, particles, text, or watermark.
- Maintain a transparent final background and strong silhouette/color recognition at the HUD's 14px display size.
- Do not change `ui.js`, `styles.css`, gameplay values, saves, production/consumption, or future paired-cultivation behavior.
- Overwrite only the ten existing files under `assets/resource-icons/{100,50}/`, then regenerate their `release/` copies through the existing sync script.
- Preserve all unrelated uncommitted workspace changes and do not create a mixed commit.

---

### Task 1: Generate and approve the five new flat sources

**Files:**
- Read: `docs/art/icon-prototypes/2026-07-29/material-icon-standard-sheet-v4-no-outline.png`
- Create temporary sources under: `tmp/imagegen/top-resource-icons-v4/`

- [ ] Inspect the approved v4 reference sheet for shape language, flatness, palette restraint, and detail density.
- [ ] Generate each icon independently, using the reference sheet only as a style reference.
- [ ] Reject any result with outlines, gradients, volumetric rendering, cast shadows, frames, particles, extra subjects, or weak 14px silhouette.
- [ ] Select one source for each resource:
  - `lingshi`: one pale-cyan spirit stone, three flat cyan/teal facets.
  - `jingqi`: one compact three-lobed blue-white qi swirl made from broad flat shapes.
  - `mood`: one heart silhouette made from two rounded pink petals.
  - `shengwang`: one upright purple jade prestige token with a single simple gold accent.
  - `shouyuan`: one longevity peach with one small green leaf.

### Task 2: Normalize and overwrite the shipping assets

**Files:**
- Modify: `assets/resource-icons/100/{lingshi,jingqi,mood,shengwang,shouyuan}.png`
- Modify: `assets/resource-icons/50/{lingshi,jingqi,mood,shengwang,shouyuan}.png`

- [ ] Remove each flat chroma-key background with the installed helper and inspect edge quality.
- [ ] Center the visible subject on a transparent square canvas.
- [ ] Export RGBA PNGs at exactly 100×100 with subject bounds in the approved 72–84% range.
- [ ] Derive 50×50 PNGs from the accepted 100px masters with Lanczos resampling.
- [ ] Visually inspect all five final 100px assets and a 14px contact sheet.

### Task 3: Sync and verify

**Files:**
- Regenerate: `release/assets/resource-icons/100/*.png`
- Regenerate: `release/assets/resource-icons/50/*.png`

- [ ] Run `node selftest_resource_icons.js`.
- [ ] Run the existing release sync command.
- [ ] Re-run the resource icon and release/package checks that cover these paths.
- [ ] Inspect the live 390×844 game HUD and confirm all five icons remain readable, aligned, and unobtrusive.
- [ ] Report any unrelated pre-existing test failures separately from this asset rework.
