# Stage 2 Task 1 Report — Frozen Content Registries

## Scope

Implemented only the frozen Stage 2 content boundary:

- `content/items.js`
- `content/life-skills.js`
- `content/gathering.js`
- `content/recipes.js`
- `content/homestead.js`
- `selftest_stage2_content.js`
- focused-suite registration in `selftest_all.js`

No player state, inventory rules, progression rules, simulation actions, UI, or
`release/` files were changed.

## RED evidence

1. Registered `selftest_stage2_content.js` immediately after
   `selftest_foundation.js`, before the focused test file existed.
2. `npm test` failed only with:
   `Cannot find module ...\selftest_stage2_content.js`.
   Existing suites remained green at 70 foundation, 248 simulation,
   177 skill-network, and 85 UI assertions.
3. Added the focused content suite before production modules existed.
4. `node selftest_stage2_content.js` then failed with:
   `Cannot find module './content/items.js'`.
5. A later frozen-query assertion was also observed failing before
   `LifeSkillContent.list()` was corrected to return a frozen array.

## GREEN evidence

- Focused content suite: **928 passed / 0 failed**
- Foundation suite: **70 passed / 0 failed**
- Simulation suite: **248 passed / 0 failed**
- Existing skill-network suite: **177 passed / 0 failed**
- Existing UI suite: **85 passed / 0 failed**
- `npm test`: **all suites passed**
- `node --check`: all five content modules and the focused suite passed
- `git diff --check`: passed
- Static forbidden-dependency scan over `content/`: no `Math.random`, DOM,
  Canvas, storage, save, simulation, or runtime API access

## Integrity statistics

- 103 item records, including all 66 legacy `ITEM_NAMES` entries
- 12 canonical life skills in stable order
- 41 preserved gathering definitions: 10 mining, 10 woodcutting, 11 herb,
  and 10 fishing spots
- 10 shared fish-species records
- 33 recipes: 9 alchemy, 6 forging, 7 cooking, 6 talisman, 5 formation
- 6 crops
- 5 formations
- 4 spirit-beast species
- All gathering, recipe, crop, and beast item references resolve
- All exported registries and nested records are deeply frozen

An independent field-by-field comparison against the current `game.js`
confirmed all 41 legacy gathering IDs, names, unlock levels, times, XP values,
capacity bounds, drop item IDs, weights, and quantities are unchanged. All 66
legacy item IDs and display names are also preserved.

## Formal-review contract hardening

The formal Task 1 review found that the first focused suite locked counts,
references, and selected examples but did not independently lock every static
content row. The follow-up adds
`selftest_stage2_content_fixtures.js`, which contains hand-written literal
fixtures and does not import or derive from production registries.

The focused suite now performs ordered, row-exact comparisons for:

- all 12 life skills;
- all 103 items, including ordered legacy ID/name pairs and every item's
  category, sale value, and stackability;
- all 41 gathering rows and their ordered drops, with fishing capacity absence;
- all 10 fish species and the three exploration definitions;
- all 33 recipe identities, unlocks, ingredients, choices, outputs, and
  formula-derived skill/mastery XP;
- all 6 crops, 5 formations, 4 beast species, 4 traits, and 3 growth
  tendencies, including all specified timing, cost, reward, and effect fields.

This raised the focused suite from 608 to 926 assertions, adding 318 exact
contract checks without changing production content.

### Mutation evidence

The suite supports an opt-in, test-only in-memory mutation through
`STAGE2_CONTENT_MUTATION`. No source file is modified. A single field was
mutated separately for every content family; all ten probes exited non-zero
and reported the intended exact-row failure:

- `skills` → `skill row is exact: herb`
- `items` → `item row is exact: copperOre`
- `gathering` → `mining gathering row is exact: copper`
- `fish` → `fish species row is exact: spiritCarp`
- `recipes` → `recipe row is exact: alchemy:healingPill`
- `crops` → `crop row is exact: spiritRice`
- `formations` → `formation row is exact: gatheringFormation`
- `beasts` → `spirit-beast row is exact: spiritFox`
- `traits` → `spirit-beast trait row is exact: keenNose`
- `growth` → `spirit-beast growth row is exact: steady`

After the probes, the environment override was removed and the normal focused
suite returned to 926/926. The working tree contained only the expected test
fixture, focused-suite, and report changes.

### Strict structural comparator follow-up

The row-exact follow-up initially used `JSON.stringify` as its comparator.
That comparator erases object properties whose value is `undefined`. A
test-only `nestedUndefined` mutation added
`unexpected: undefined` to `alchemy:healingPill.output`; the old comparator
incorrectly allowed the entire focused suite to pass at 926/926.

`exact()` now uses Node's `util.isDeepStrictEqual`, which preserves property
existence, `undefined`, nested structure, types, and array ordering. Two
comparator assertions permanently prove both sides of the regression:

- the legacy JSON representation is identical after the illegal nested field;
- strict structural comparison rejects it.

With the strict comparator, the same `nestedUndefined` probe exits non-zero at
927 passed / 1 failed and reports
`recipe row is exact: alchemy:healingPill`. The original ten family probes also
continue to fail at their intended row. The normal focused suite is now
928/928. Projection fallbacks for charm XP source and beast assistance target
also use `?? null`, so empty strings and other invalid falsy values are not
normalized into absence.

## Commit

- `d9cb311 feat: define canonical stage 2 content`
- `8e8f99c test: lock canonical stage 2 content rows`
- `test: use strict structural content comparison` (comparator follow-up)

## Concerns

None. The Stage 2 plan explicitly replaces the legacy fishing stock cap of 30
with shared per-species stock capped at 20; the content registry uses the
Stage 2 canonical value and retains the legacy spot definitions themselves
unchanged.
