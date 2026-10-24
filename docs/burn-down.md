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

## Byte-identical C4 diagrams (ADR 0016)

`plugin-architecture` renders the predecessor's eight C4 examples, and `look=cards` variants of five, byte for
byte. These crutches keep it so; they go in the clean-up with a second baseline.

1. **Inline paint on a role** (`RoleStyle.paint` in `packages/core/src/styles.ts`). The predecessor painted the
   legend separator inline (class `line` with `stroke="#e4e4e7" stroke-width="1"`), so role `legendRule` carries
   that paint. Clean-up: role `legendRule` gets the class `legend-rule` (thin, grey), which the predecessor already
   used for own legends, and `paint` goes.
2. **Icons in the predecessor's form** (`Icon.markup`). The kernel draws icons as a nested `<svg>` styled by class;
   the predecessor wrote `<g transform>` with the markup of Lucide or Simple Icons and inline paint
   (`icon-<stroke>-<colour>` roles). The icons have no `paths` yet. Clean-up: derive `paths` from the markup, draw
   the clean form, colour by class, drop `markup`.
3. **`abgeloest` in German boxes** (`statusInBox` in `plugins/plugin-architecture/src/texts`). Legend and
   description already write `abgelöst`. Clean-up: one word.
4. **Blocks restate base rules** (`blockBase` in `plugins/plugin-architecture/src/styles/index.ts`). The standard
   look has one set of measures; the blocks variant repeats 13 base rules with larger fonts and strokes. Clean-up:
   the kernel builds the standard look from measures.
5. **The predecessor's arithmetic.** Measures, heads, flow numbers, marks, layers and the legend follow its order of
   floating point steps, as `layout-grid` does (ADR 0015).

## C4: left out, or found while porting

- **Not ported yet.** The tile flow (`flow=` on groups and in the header), framed groups (`style=`, `line=`, `icon=`
  on `group`, with heads inside that move aside for lines and grow the frame through `grow` when they cannot), accents
  and chips, an own `legend`, end marks of edges (`from-box=` and the like: the scene has no rotated text), and
  `form=ellipse`. No example of the eight uses them. Each comes with its tables, a predecessor example and its bytes.
- **Layout checks on routes are gone.** The predecessor reported edges through nodes (E204), unroutable edges
  (E206), crossings (W203), overlapping edges (W206), labels on edges (W207) and lines through heads (W492). The
  kernel's placement check knows boxes and texts. Clean-up: report routes as placed lines.
- **The placement check finds labels in foreign frames.** `radverleih/komponenten`, `soll` and `variante-a` warn
  (G400, G402) where an edge label reaches into a frame it does not belong to; the pictures show it. Fixing it
  changes their bytes.
- **Edges to a group in a fixed grid run slanted** when the group's middle lies in another row, and their label can
  cover the start node. The predecessor did the same. Clean-up: dock at the frame like at a node.
- **Grid names are comma-separated** (`grid cols a,b,c`), because a statement cannot take a list of arguments.
  Clean-up: a variadic last argument in `lang`, then the predecessor's spaces read again.
- **Two generators of README code tables**, `plugins/plugin-uml/test/codes.ts` and
  `plugins/plugin-architecture/test/codes.ts`. Clean-up: one in `tools/docs`.

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
- **Spec references are plugin-internal** (ADR 0017). `implementing` in `plugins/plugin-uml/src/spec` keeps the
  marks on the tables as extra properties that `lang` passes along without knowing them, and reaches agents only
  as a sentence in the docs. The grammar JSON has no field for them, and the language spec cannot link them.
  Clean-up when a second plugin cites a standard (BPMN, ArchiMate): a typed, generic field in `lang` for the
  sections a part implements, emitted by `grammarOf`, and the walker of `src/spec/coverage.ts` moved with it.

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

## Use case diagrams (`plugin-uml/src/usecase`)

- **Classes of markers count as unused.** The kernel writes a rule only when a shape uses its class, and the class
  of a marker in `<defs>` is no shape's. The hollow triangle of a generalization (`uml-hollow`) is therefore marked
  `always` and written into every use case picture. Clean-up: the kernel counts the classes of referenced markers.
- **One marker size per style table.** The predecessor drew the hollow triangle 14 pixels long and the open head 10;
  the kernel's markers share `markerSize` 12 in a 12-unit grid, so the triangle is 10 long. Clean-up, if the
  difference matters: a size per marker.
- **Labels of straight lines stay in the plugin.** `labelEdges` puts names on the longest segment of orthogonal
  routes; the use case labels look along a slanted line, at both ends and inside the frame of the use case, and
  notes search a field around their anchor. They use `occupancy` and `cheapest` of the library. Clean-up when a
  second kind draws straight lines: move the search for spots along a line into `layout-grid`.
- **Ellipses are reported as their inscribed rectangle.** The placement check knows boxes and texts only, and a
  label near the curve of an ellipse lies inside its bounding box without touching it. Clean-up: an outline on
  `Placed`.
