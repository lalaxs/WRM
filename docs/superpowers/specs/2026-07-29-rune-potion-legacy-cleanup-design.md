# Rune, Potion, And Legacy Content Cleanup Design

## Decision

The current art and item pipeline must treat the Melvor-parity material system as the official source of truth. Early prototype items in `content/items.js`, `content/gathering.js`, and the first hard-coded block of `content/recipes.js` are legacy content until they are migrated into the parity system.

## Talisman / Rune Direction

Our `talisman` skill should primarily map to Melvor's rune economy, not to generic active scroll buffs.

- Melvor reference role: runes are crafted resources that are consumed by magic combat.
- Game mapping:符咒 are stackable material resources produced by the符咒 skill and consumed by符修 techniques or magic-like attacks.
- Official new design should use rune-like item families such as base essence, elemental符咒, spirit/mind-like符咒, chaos/void/soul-like符咒, and high-tier law/blood/death-like符咒.
- Active one-shot talismans may exist later as a separate branch, but they are not the core parity target.

Legacy prototype talismans such as `gatheringTalisman`, `hasteTalisman`, `wardTalisman`, `healingTalisman`, and `beastLureTalisman` should not be used as official art requirements or as the long-term talisman system design.

## Alchemy / Potion Direction

Our `alchemy` skill should primarily map to Melvor's Herblore potion economy.

- Melvor reference role: herbs plus secondary materials produce potions with utility, skilling, preservation, and combat effects.
- Game mapping:炼丹 produces potion-like丹药 with stackable charges or consumable uses.
- Official new design already contains the first parity-facing examples: `miningFocusPill`, `smithingFocusPill`, `combatGuardPill`, `gemSeekerPill`, `voidStabilizerPill`, and `tribulationGuardPill`.
- Realm breakthrough pills from the early prototype (`foundationPill`, `goldCorePill`, etc.) are progression helpers, not the primary Herblore parity system.

## Implemented Content Pass

- Rune-like符咒 resources now include 13 base/core符咒 and 6 combined elemental符咒: `airCharm`, `waterCharm`, `earthCharm`, `fireCharm`, `mindCharm`, `bodyCharm`, `cosmicCharm`, `chaosCharm`, `natureCharm`, `lawCharm`, `deathCharm`, `bloodCharm`, `soulCharm`, `mistCharm`, `mudCharm`, `dustCharm`, `lavaCharm`, `smokeCharm`, and `steamCharm`.
- Herblore-like药剂 now include 16 potion rows across skilling, material preservation, rune preservation, and combat utility.
- Existing utility符箓 such as `craftingFocusTalisman`, `fishingFocusTalisman`, and `soulBindingTalisman` are typed as `utility_charm`, separate from the core `rune_charm` economy.
- Official material recipes no longer consume legacy prototype fish, blank talisman paper, old hide, old common seed, or other legacy prototype ids.

## Implemented Runtime Pass

- Magic-like active techniques can declare `runeCost`; combat consumes those rune charm items through the same `Inventory.apply` boundary used by food and other automatic supplies.
- If a technique lacks the required rune charms, combat emits `missing_rune_charm`, does not spend qi, does not grant technique XP, and falls back to a normal attack.
- Current rune-cost techniques are `spiritNeedle`, `clearHeartArt`, `thunderSeal`, `bindingTalisman`, and `starfallArray`.
- Combat potion supplies now include `combatGuardPill`, `spiritShieldPill`, `battleFuryPill`, `voidPiercingPill`, and `tribulationGuardPill`.
- `runeSaverPill` remains content-only until rune preservation has an explicit combat buff rule.

## Fishing And Cooking

The latest parity table has not implemented Fishing or Cooking yet.

- `content/materials.js` currently has `fishing: []`.
- Fish and prepared food item ids such as `spiritCarp`, `dragonFish`, `grilledCarp`, and `dragonFishBanquet` belong to the early prototype layer until a new Melvor-parity fishing/cooking table is written.
- Do not generate final art for these ids until they are migrated or replaced.

## Cleanup Rules

1. Do not generate new official art from legacy prototype item ids.
2. Keep deprecated generated assets only under `_deprecated/` so count scripts and future integration work do not treat them as active assets.
3. New art requirement tables should be generated from parity content rows only.
4. Before implementing Fishing, Cooking, and rune-like符咒 combat consumption, write the new content rows and recipes first, then generate icons.

## Current Deprecated Asset Batch

The accidentally generated legacy batch has been moved to:

`docs/art/icon-batches/2026-07-29/_deprecated/production-fishing-alchemy-cooking-v4-no-outline/`

It must not be wired into the game.
