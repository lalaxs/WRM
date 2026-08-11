# Material Icon Batch Summary - 2026-07-29

## Style Standard

- Accepted style: v4 no-outline flat vector.
- Mobile target sizes: 100x100 source icon and 50x50 small inventory icon.
- Rules: single subject only, no outline, no stroke, no border, no decorative particles, no UI frame. Final in-game assets must use transparent RGBA canvas; white or chroma-key backgrounds are intermediate source states only.

Current full art standard: `docs/art/2026-07-30-item-icon-art-standard.md`.

## Current Scope

Current official art requirements: 538 items from `MaterialContent.artRequirements()`.

- 72 Herblore potion series are now mapped 1:1.
- 288 potion-tier items are now official icon targets.
- 91 Herblore ingredient items are now official icon targets.
- 152 existing generated candidate icons still match official item ids.
- 10 generated candidate icons are now obsolete because prototype pills/utility charms were removed.
- 386 official icon targets remain pending.

## Delivered Batches

| Priority | Generated candidates | Active candidates | Pending official targets |
| --- | ---: | ---: | ---: |
| P0 | 30 | 20 | 187 |
| P1 | 73 | 73 | 166 |
| P2 | 49 | 49 | 33 |

Only these three directories are active candidate batches:

- `p0-v4-no-outline/`
- `p1-v4-no-outline/`
- `p2-v4-no-outline/`

Historical `_deprecated/` prototype directories, batch review/sheet images, and obsolete candidate icons have been removed from the repository.

## Obsolete Candidates

These generated icons no longer map to official item ids and have been deleted from the batch folders:

`combatGuardPill`, `craftingFocusTalisman`, `farmingFocusDew`, `fishingFocusTalisman`, `gemSeekerPill`, `miningFocusPill`, `smithingFocusPill`, `soulBindingTalisman`, `tribulationGuardPill`, `voidStabilizerPill`

## Next Use

Use `docs/art/2026-07-29-material-icon-requirements.md` as the source of truth for the next batch. Generate the 386 pending official ids with the same v4 no-outline prompt before treating the material icon set as complete.
