# Burn-down

Debt we accept on purpose, each with the reason and what removes it. Strike items when they are done.

## Byte-identical sequence diagrams (ADR 0008 Nr. 5)

`plugin-uml` renders the predecessor's 15 sequence examples byte for byte. These crutches keep it so; they go
in one clean-up with a second baseline.

1. **Base stylesheet always written.** 24 rules marked `always` in `plugins/plugin-uml/src/shared/base-styles.ts`,
   also in pictures that use none of them. Clean-up: drop `always`, the kernel writes only used rules.
2. **All four arrowheads in every `<defs>`** (`MARKERS`). Clean-up: write only referenced markers.
3. **Root class `dia`.** The target is `diagrist` (and `--dgr-` for CSS variables).
4. **Unrounded path numbers and circle radii** (`r="5.151515151515151"`), while rectangles, lines and texts
   are rounded to one decimal in `packages/core/src/svg.ts`. Clean-up: one rounding for all numbers.
5. **Arithmetic order of the layout.** `plugins/plugin-uml/src/sequence/layout` keeps the predecessor's order of
   floating point steps (e.g. the right edge of notes is passed on, not recomputed as `x + w`). Refactors there
   must keep the bytes until the clean-up.
6. **Measuring by size, not by font role.** The sequence layout measures with token sizes (`messageSize`)
   instead of the font roles of its style table. Clean-up: measure with `FONTS`.
7. **Card look in code.** `look=cards` changes shapes in `scene/cards.ts`, not only the style table.

## Waiting for a second user (ADR 0008 Nr. 6)

- Palette, strokes and fonts (`plugins/plugin-uml/src/theme.ts`) move to the kernel with the second plugin.
- Title header and decision bar (`plugins/plugin-uml/src/shared`) move to a small library then.
