# Burn-down

Debt we accept on purpose. Each entry gives the reason and what removes it. An entry is deleted in the change that
settles it, and that change says so in its description.

## Byte-identical sequence diagrams (ADR 0008 Nr. 5)

`plugin-uml` renders the predecessor's 15 sequence examples byte for byte. These crutches keep it so; they go
in one clean-up with a second baseline.

1. **Base stylesheet always written.** 24 rules marked `always` in `packages/core/src/standard/styles.ts`,
   also in pictures that use none of them. Clean-up: drop `always`, the kernel writes only used rules.
2. **All four arrowheads in every `<defs>`** (`MARKERS`). Clean-up: write only referenced markers.
3. **Root class `dia`** (`standardStyles`). The target is `diagrist` (and `--dgr-` for CSS variables).
4. **Unrounded path numbers and circle radii** (`r="5.151515151515151"`), while rectangles, lines and texts
   are rounded to one decimal in `packages/core/src/svg.ts`. Clean-up: one rounding for all numbers.
5. **Arithmetic order of the layout.** `plugins/plugin-uml/src/sequence/layout` keeps the predecessor's order of
   floating point steps (e.g. the right edge of notes is passed on, not recomputed as `x + w`). Refactors there
   must keep the bytes until the clean-up.
6. **Measuring by size, not by font role.** The sequence layout measures with token sizes (`messageSize`)
   instead of the font roles of its style table. Clean-up: measure with `FONTS`.
7. **Card look in code.** `look=cards` changes shapes in `scene/cards.ts`, not only the style table.

## Waiting for a second user (ADR 0008 Nr. 6)

- **Legend mechanics have no plugin yet.** `legendLayout` and `legendShapes` in `packages/parts` are tested against
  the predecessor's `radverleih/kontext.dgr`; C4 is their first user.

## Changes that need new bytes (found in the review of 24.10.2026)

They change the SVG of the 15 examples, so they wait for the clean-up with a second baseline.

- **Ligatures of JetBrains Mono.** Browsers apply the font's ligatures to texts such as `->` in labels, while the
  layout measured single glyphs. Clean-up: `font-variant-ligatures: none` on the root rule.
- **`label-<i>` is never written.** The SVG contract names `label-<index>` for the text of an edge, and
  `EdgeAnchor.labelId` exists, but the sequence scene sets neither (`scene/index.ts`). Clean-up: give message
  labels their own group with the id and set `labelId`.
- **Sequence diagrams report no placed rectangles** (ADR 0010). Reporting them changes no bytes, but fixing what
  the check finds in the examples does. Clean-up: hand heads, notes, frames and labels to the placement check.

## Not derived yet (ADR 0004)

ADR 0004 asks that a derivative which cannot be generated yet is listed here, with what it waits for.

- **JSON schema of a kind's statements as data.** No command reads or writes statements as JSON yet, so a schema
  of the typed values (`Infer`) would have no user. Clean-up: derive it from the tables when such a command arrives.
- **Completion knows no lifelines in `msg`.** Message ends are no `ref`, because they may also be `found`, `lost`,
  `gate` or a frame (`messageEnd` in `plugins/plugin-uml/src/sequence/grammar/values.ts`), and the same holds for
  `over=` lists. `complete` therefore proposes no ids there. Clean-up: let a value name the declarations it accepts
  besides its own forms, without `lang` checking them.

## Waiting for a plugin that needs it

- **Operators are fixed in `lang`.** `OPERATORS` in `packages/lang/src/scanner.ts` knows the UML diamond ends;
  BPMN gateways or ER crow's feet would need a change there. Clean-up: plugins declare their operators.
- **`Infer` stops at recursion and `readKind` casts.** Children of fragments are typed by hand in
  `plugins/plugin-uml/src/sequence/source.ts`, and `readKind` asserts its result type. Clean-up when a second
  recursive kind arrives: carry the child tables in the type.
- **Legend separator with inline paint.** The predecessor drew the default separator as class `line` with
  `stroke="#e4e4e7" stroke-width="1"` written on the element, and the separator of an own `legend` as class
  `legend-rule`. The scene has no attributes besides the role, so `legendShapes` writes role `legendRule` (class
  `line`) only. Byte-identical `kontext.dgr` needs a decision in the C4 stream: a class for the thin rule
  (new bytes) or paint on scene shapes.

## Found while joining the CLI with the kernel

- **U400 points at the statement, not the token.** `msg a -> b` reports column 1 instead of the `b`. Clean-up:
  carry the span of the offending end through the model.
- **German messages keep English value descriptions.** `expected` texts of value types (`a text in double quotes
  like ...`) are English in every locale. Clean-up: phrase value descriptions through the catalogue (ADR 0004).

## Left out of `layout-grid` until a plugin needs it (ADR 0015)

- **Predecessor paths for one kind only.** The tile flow of C4 without a grid (fixed columns, bands, row gaps),
  the FigJam `elbow` profile, state transitions (rails, loops at corners, border points), class packages (row gaps,
  legs at vertices, wider air between package frames) and domain relations docking at attribute rows are not in the
  library. Each comes back as data on the spec when its plugin arrives, compared number for number like the rest.
- **Use case gets new numbers.** The predecessor reserved room for stacked frame heads above the first row only in
  C4, measured actors with their name and started lines at the figure. `layout-grid` reserves in every adaptive grid
  and expects a figure as the node with its name as `caption`, so the use case baseline is new.
