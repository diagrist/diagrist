# Burn-down

Debt we accept on purpose. Each entry gives the reason and what removes it. An entry is deleted in the change that
settles it, and that change says so in its description. The entries are sorted by the package that holds the debt;
the crutches that keep the predecessor's bytes are numbered, since they go together in one clean-up.

## Language and kernel (`lang`, `core`)

| Debt | Clean-up |
|---|---|
| **Operators are fixed in `lang`.** `OPERATORS` in `packages/lang/src/scanner.ts` knows the UML diamond ends; BPMN gateways or ER crow's feet would need a change there. | Plugins declare their operators, when the first one needs its own. |
| **`Infer` stops at recursion, and `readKind` casts.** Children of fragments are typed by hand in `plugins/plugin-uml/src/sequence/source.ts`, and `readKind` asserts its result type. | Carry the child tables in the type when a second recursive kind arrives. |
| **No list of arguments.** A statement cannot take a variable number of arguments, so C4 writes grid names with commas (`grid cols a,b,c`). | A variadic last argument in `lang`; then the predecessor's spaces read again. |
| **Value descriptions are English in every locale.** The `expected` text of a value type (`a text in double quotes like ...`) is not translated in German messages. | Phrase value descriptions through the catalogue (ADR 0004). |
| **No JSON schema of a kind's statements as data.** No command reads or writes statements as JSON, so a schema of the typed values (`Infer`) would have no user. | Derive it from the tables when such a command arrives (ADR 0004). |
| **Spec references are plugin-internal** (ADR 0017). `implementing` in `plugins/plugin-uml/src/spec` keeps its marks as extra properties of the tables, which `lang` passes along without knowing them; the grammar JSON has no field for them. | When a second plugin cites a standard (BPMN, ArchiMate): a typed field in `lang`, emitted by `grammarOf`, with the walker of `src/spec/coverage.ts`. |
| **Classes of markers count as unused.** The kernel writes a rule only when a shape uses its class, and a marker in `<defs>` is no shape, so marker rules (`uml-hollow`, the symbols of class diagrams) are marked `always` and written into every picture of their kind. | The kernel counts the classes of referenced markers. |
| **One marker size per style table.** The kernel's markers share `markerSize`; class diagrams set 18 for the diamond of 16 pixels and draw each symbol in pixels of that size, while use case diagrams draw the triangle 10 long where the predecessor drew 14. | A size per marker. |
| **The placement check knows rectangles only.** Ellipses of use cases are reported as their inscribed rectangle, entry and exit points and the names beside pseudostates not at all; lanes, edges, pins and region frames of activity diagrams are not reported, so a region frame around a foreign node is a G400 warning where the predecessor reported E439 as an error. | An outline on `Placed`, and a kind of `Placed` for frames whose overlap is an error. |
| **Ligatures of JetBrains Mono.** Browsers join texts such as `->` in labels, while the layout measured single glyphs. Fixing it changes the bytes of every picture. | `font-variant-ligatures: none` on the root rule, with the second baseline of sequence diagrams. |

## Layout library (`layout-grid`)

Pieces stay in their plugin until a second kind needs them (ADR 0015); each comes into the library as data on the
spec and is compared number for number, as the path finding of state machines was.

| Debt | Clean-up |
|---|---|
| **Paths of one predecessor kind only.** The tile flow of C4 without a grid (fixed columns, bands, row gaps), the FigJam `elbow` profile and relations docking at attribute rows are not in the library. | Each comes back with its plugin. |
| **The layered layout of activity diagrams stays in the plugin.** Lanes, bars of fork and join, diamonds branching at their corners, loop channels, tracks for parallel jogs, pins and region names live in `src/activity/layout`; state machines, the second layered kind, brought their own rails, steps and loops. | Move what a second kind would draw alike, probably loop channels and tracks. |
| **Labels along straight lines stay in the plugin.** Use case labels look along a slanted line, at both ends and inside the frame of the use case; notes search a field around their anchor. | Move the search for spots along a line into the library when a second kind draws straight lines. |
| **Disconnected parts of a scope are layered side by side.** `layerGraph` lays out each connected part on its own, where the predecessor ordered all vertices of a state's scope at once. All examples are connected. | An option to layer a graph as one part, if a machine needs it. |

## UML (`plugin-uml`)

### Sequence diagrams keep the predecessor's bytes (ADR 0008 Nr. 5)

The 15 examples render the predecessor's SVG byte for byte. These crutches keep it so; they go in one clean-up
with a second baseline.

1. **Base stylesheet always written.** 24 rules marked `always` in `packages/core/src/standard/styles.ts`, also
   in pictures that use none of them. Clean-up: drop `always`, the kernel writes only used rules.
2. **All four arrowheads in every `<defs>`** (`MARKERS`). Clean-up: write only referenced markers.
3. **Root class `dia`** (`standardStyles`). The target is `diagrist`, and `--dgr-` for CSS variables.
4. **Unrounded path numbers and circle radii** (`r="5.151515151515151"`), while rectangles, lines and texts are
   rounded to one decimal in `packages/core/src/svg.ts`. Clean-up: one rounding for all numbers.
5. **Arithmetic order of the layout.** `src/sequence/layout` keeps the predecessor's order of floating point steps
   (the right edge of a note is passed on, not recomputed as `x + w`). Refactors there must keep the bytes.
6. **Measuring by size, not by font role.** The layout measures with token sizes (`messageSize`) instead of the
   font roles of its style table. Clean-up: measure with `FONTS`.
7. **Card look in code.** `look=cards` changes shapes in `scene/cards.ts`, not only the style table.

Waiting for the same clean-up, because they change the bytes: `label-<i>` is never written, although the SVG
contract names it and `EdgeAnchor.labelId` exists (message labels need a group with the id); and heads, notes,
frames and labels are not handed to the placement check, which would report what the examples overlap.

| Debt | Clean-up |
|---|---|
| **U400 points at the statement, not the token.** `msg a -> b` reports column 1 instead of the `b`. | Carry the span of the offending end through the model. |
| **Completion knows no lifelines in `msg`.** Message ends are no `ref`, since they may also be `found`, `lost`, `gate` or a frame (`messageEnd` in `src/sequence/grammar/values.ts`), and the same holds for `over=`. | Let a value name the declarations it accepts besides its own forms, without `lang` checking them. |

### Activity, class and state machine diagrams

| Kind | Debt | Clean-up |
|---|---|---|
| activity | **No notes.** The predecessor allowed `note "..." on id`; no example used it, and its placement belonged to the generic note layout that use case diagrams replaced. | A `note` statement with a free spot beside its node, as in use case diagrams. |
| class | **Symbols at the start of a line sit on a stub.** resvg ignores `orient="auto-start-reverse"` and draws no marker on a path without stroke, so a diamond at the whole, the second head of `<->` and the shared triangle of a bundle are the end marker of a short transparent path. | `marker-start` once the renderer turns markers there. |
| class | **No search for an arrangement of many packages.** From four packages on one level the predecessor tried four layouts (`class-package-arrange.ts`, `package-fit.ts`); without it `pakete-quer` has labels in foreign packages (G400) and is left out. | Port the search and bring the example back. |
| class | **No grid placed by hand.** `grid` and `at` are gone, as in use case diagrams, so `pakete-raster` and the warning W415 are not carried over. | Only if a diagram needs it. |
| class | **Packages align per level only.** A parent is not grown again around children that moved. No example nests packages. | Enclose parents after aligning. |
| class | **Lines on toned packages keep the canvas halo**, a faint light seam on the 7 % tint, where the predecessor tinted it (`halo-<tone>`). | A halo role per surface, shared with C4 and use case cards. |
| class | **The dashed note exists twice**, in `src/shared/notes.ts` and in `plugins/plugin-architecture/src/layout/notes.ts`. | Move it into `parts`. |
| class | **Coverage does not see line forms.** The walker in `src/spec/coverage.ts` reads statements, so the static and abstract flags of members count as not covered. | Walk `lines` too. |
| state | **Cross references are not checked.** `file=` on a submachine state is only named in the description; the predecessor loaded the file and compared points and kind (E480 to E484). | A port for the files a source names, handed in by the CLI, and the checks as rules over two models. |
| state | **No room for long region names.** The predecessor moved the columns of a right neighbour for a wide region name (`region-room.ts`); here only the last region grows its frame. No example needs it. | A column offset per region, compared with an example. |

## C4 (`plugin-architecture`)

### C4 diagrams keep the predecessor's bytes (ADR 0016)

The eight examples, and `look=cards` variants of five, render the predecessor's SVG byte for byte. These crutches
keep it so; they go in the clean-up with a second baseline.

1. **Inline paint on a role** (`RoleStyle.paint` in `packages/core/src/styles.ts`). The predecessor painted the
   legend separator inline, so role `legendRule` carries that paint. Clean-up: class `legend-rule`, and `paint`
   goes.
2. **Icons in the predecessor's form** (`Icon.markup`): `<g transform>` with the markup of Lucide or Simple Icons
   and inline paint (`icon-<stroke>-<colour>` roles), where the kernel draws a nested `<svg>` styled by class.
   Clean-up: derive `paths` from the markup, colour by class, drop `markup`.
3. **`abgeloest` in German boxes** (`statusInBox` in `src/texts`), while legend and description write `abgelöst`.
   Clean-up: one word.
4. **Blocks restate base rules** (`blockBase` in `src/styles/index.ts`): 13 base rules again with larger fonts and
   strokes. Clean-up: the kernel builds the standard look from measures.
5. **The predecessor's arithmetic.** Measures, heads, flow numbers, marks, layers and the legend follow its order of
   floating point steps, as `layout-grid` does.

| Debt | Clean-up |
|---|---|
| **Not ported yet:** the tile flow (`flow=` on groups and in the header), framed groups (`style=`, `line=`, `icon=` on `group`), accents and chips, an own `legend`, end marks of edges (`from-box=` and the like; the scene has no rotated text), and `form=ellipse`. No example uses them. | Each with its tables, a predecessor example and its bytes. |
| **No layout checks on routes.** The predecessor reported edges through nodes (E204), unroutable edges (E206), crossings (W203), overlapping edges (W206), labels on edges (W207) and lines through heads (W492). | Report routes as placed lines. |
| **Labels reach into foreign frames.** `radverleih/komponenten`, `soll` and `variante-a` warn (G400, G402) where an edge label reaches into a frame it does not belong to; the pictures show it. | Fixing it changes their bytes. |
| **Edges to a group in a fixed grid run slanted** when the group's middle lies in another row, and their label can cover the start node, as with the predecessor. | Dock at the frame like at a node. |

## Tools

| Debt | Clean-up |
|---|---|
| **Two generators of README code tables**, `plugins/plugin-uml/test/codes.ts` and `plugins/plugin-architecture/test/codes.ts`, each with the plugin's table of predecessor codes. | One generator in `tools/docs`, with the predecessor tables as data of their plugins. |
