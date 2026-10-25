# Burn-down

Debt we accept on purpose. Each entry gives the reason and what removes it. An entry is deleted in the change that
settles it, and that change says so in its description. The entries are sorted by the package that holds the debt;
the crutches that keep the predecessor's bytes are numbered, since they go together in one clean-up.

## Language and kernel (`lang`, `core`)

| Debt | Clean-up |
|---|---|
| **Operators are fixed in `lang`.** `OPERATORS` in `packages/lang/src/scanner.ts` knows the UML diamond ends; BPMN gateways or ER crow's feet would need a change there. | `operators` in `KindSpec`, handed to the scanner by `readKind`, with `lang` keeping `=`, `=>`, `->` and `--`. It changes `read-kind.ts` and the tables, which the work on variants rewrites, so it follows once that has landed, or with the first plugin that needs its own. |
| **`Theme` and the description reach no host.** `compile` takes a `theme` and returns a `description` and `anchors`, but the CLI passes no theme and drops the other two, so the words in `describe/` of every UML kind reach no user yet. | `--theme <file>` and `description` in `build --json`, or drop what still has no host by the first release. |
| **`Infer` stops at recursion, and `readKind` casts.** Children of fragments are typed by hand in `plugins/plugin-uml/src/sequence/source.ts`, and `readKind` asserts its result type. | Carry the child tables in the type when a second recursive kind arrives. |
| **No list of arguments.** A statement cannot take a variable number of arguments, so C4 writes grid names with commas (`grid cols a,b,c`). | A variadic last argument in `lang`; then the predecessor's spaces read again. |
| **Value descriptions are English in every locale.** The `expected` text of a value type (`a text in double quotes like ...`) is not translated in German messages. | Phrase value descriptions through the catalogue (ADR 0004). |
| **No JSON schema of a kind's statements as data.** No command reads or writes statements as JSON, so a schema of the typed values (`Infer`) would have no user. | Derive it from the tables when such a command arrives (ADR 0004). |
| **Spec references are plugin-internal** (ADR 0017). `implementing` in `plugins/plugin-uml/src/spec` keeps its marks as extra properties of the tables, which `lang` passes along without knowing them; the grammar JSON has no field for them. | When a second plugin cites a standard (BPMN, ArchiMate): a typed field in `lang`, emitted by `grammarOf`, with the walker of `src/spec/coverage.ts`. |
| **Classes of markers count as unused.** The kernel writes a rule only when a shape uses its class, and a marker in `<defs>` is no shape, so marker rules (`uml-hollow`, the symbols of class diagrams) are marked `always` and written into every picture of their kind. | The kernel counts the classes of referenced markers. |
| **One marker size per style table.** The kernel's markers share `markerSize`; class diagrams set 18 for the diamond of 16 pixels and draw each symbol in pixels of that size, while use case diagrams draw the triangle 10 long where the predecessor drew 14. | A size per marker. |
| **The placement check knows no lines.** Edges of every kind are not reported, so a line through a node or under a label goes unseen; activity diagrams also leave out the lines of their lanes. | An outline for polylines on `Placed` (ADR 0020), with the C4 route checks below. |
| **Pictures of one file do not share their sizes** (ADR 0021). Cells are inherited, but the fixed grid measures column widths and row heights per picture, so a variant with a wider label widens its column and the pictures of one file do not overlay pixel for pixel. | An optional `Kind.measure?(models)` the kernel calls once with every model of a source, its result handed to each `layout`; C4 returns the largest widths and heights. |
| **`set` and `drop` reach the top level only** (ADR 0021). A class inside a package or a nested fragment is changed by restating its block. | Address nested lines when a kind needs it, by a path such as `set pkg.order ...`. |
| **Ligatures of JetBrains Mono.** Browsers join texts such as `->` in labels, while the layout measured single glyphs. Fixing it changes the bytes of every picture. | `font-variant-ligatures: none` on the root rule, with the second baseline of sequence diagrams. |
| **Two public types named `Finding`.** `core` calls the finding of a rule so, and `packages/cli/src/engine.ts` its diagnostic with a phrased message. | Rename the CLI's, such as `PhrasedDiagnostic`, once the variants work in `packages/cli` has landed; it changes the same files. |
| **Contextual alternates of Inter** (ADR 0022). resvg and browsers turn `->` and `=>` into an arrow glyph, narrower than the advances the table sums, and resvg has no switch for `calt`. Such texts take a little less room than measured, never more. | Read those substitutions from `GSUB` into the packed table, or switch `calt` off once resvg honours `font-feature-settings`. |

## Layout library (`layout-grid`)

Pieces stay in their plugin until a second kind needs them (ADR 0015); each comes into the library as data on the
spec and is compared number for number, as the path finding of state machines was.

| Debt | Clean-up |
|---|---|
| **Paths of one predecessor kind only.** The tile flow of C4 without a grid (fixed columns, bands, row gaps), the FigJam `elbow` profile and relations docking at attribute rows are not in the library. | Each comes back with its plugin. |
| **The layered layout of activity diagrams stays in the plugin.** Lanes, bars of fork and join, diamonds branching at their corners, loop channels, tracks for parallel jogs, pins and region names live in `src/activity/layout`; state machines, the second layered kind, brought their own rails, steps and loops. | Move what a second kind would draw alike, probably loop channels and tracks. |
| **Labels along straight lines stay in the plugin.** Use case labels look along a slanted line, at both ends and inside the frame of the use case; notes search a field around their anchor. | Move the search for spots along a line into the library when a second kind draws straight lines. |
| **Options with one user so far.** `rowMin`, `avoid` and `placeLabels` serve state machines, `demand` and `lines: 'straight'` use case diagrams, `cover`, `slot`, `bundle`, `lane`, `rowOverhang` and `crest` C4. All but `crest` describe geometry a second kind can set unchanged: a least row height, rectangles a route keeps out of, labels a kind placed itself, the width a node asks of its columns, straight lines, a frame over one more column, equal places in an area, shared trunks, a column an edge runs in, room for what sticks out below a row. `crest` is the icon of a C4 card in disguise, a circle on the middle of the top edge. | `crest` becomes a general outline that routes keep clear of with the look refactor of C4, which owns its only user. The others stay as options. |
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
   (the right edge of a note is passed on, not recomputed as `x + w`). Refactors there must keep the bytes; the
   module TSDoc of `src/sequence/layout/index.ts` and of `packages/layout-grid/src/layout.ts` says so where the code is.
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
| class | **No grid placed by hand.** `grid` and `at` are gone, as in use case diagrams, so `pakete-raster` and the warning W415 are not carried over. | Only if a diagram needs it. |
| class | **Packages align per level only.** A parent is not grown again around children that moved. No example nests packages. | Enclose parents after aligning. |
| class | **Lines on toned packages keep the canvas halo**, a faint light seam on the 7 % tint, where the predecessor tinted it (`halo-<tone>`). | A halo role per surface, shared with C4 and use case cards. |
| class | **The dashed note exists twice**, in `src/shared/notes.ts` and in `plugins/plugin-architecture/src/layout/notes.ts`. | Move both into `parts` with the look refactor of C4, which owns the second copy. |
| class | **Coverage does not see line forms.** The walker in `src/spec/coverage.ts` reads statements, so the static and abstract flags of members count as not covered. | Walk `lines` too. |
| state | **Cross references are not checked.** `file=` on a submachine state is only named in the description; the predecessor loaded the file and compared points and kind (E480 to E484). | A port for the files a source names, handed in by the CLI, and the checks as rules over two models. |
| state | **Orthogonal regions are not placed.** The dashed lines between regions of a state and their names at the top left are drawn, but not handed to the placement check, so a name on a line or a state goes unseen. | Report each region as a frame with its name, as activity diagrams do (ADR 0020). |
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
| **Labels reach into foreign frames.** `radverleih/komponenten` and the pictures `soll` and `a` of `radverleih/radverleih.dgr` warn (G400, G402) where an edge label reaches into a frame it does not belong to; the pictures show it. Diff pictures add labels of removed and kept edges between the same two boxes that crowd each other (ADR 0021). | Fixing it changes their bytes; a removed edge could leave its label to the kept one. |
| **The sheet of `look=paper` lives in the plugin.** Kicker above the title, margin notes for decisions, the legend as sentences and the gap behind texts on a line are drawn in `src/layout/paper*.ts` and `src/scene/paper.ts`, measured with the plugin's fonts. | Move them into `parts` when a second plugin draws paper (ADR 0014). |
| **The legend in `parts` has one user.** ADR 0014 moved it there for a second plugin, but only C4 draws one; `stripWidth` and `MARGIN` beside it serve UML. | Back into the plugin with the look refactor of C4, or it stays when a second plugin draws a legend. |
| **Copies the UML plugin no longer has.** The card and note rules in `src/styles/rules.ts` (`card`, `card-shadow`, `note-tail`) repeat `plugins/plugin-uml/src/shared/card-rules.ts`, and `src/layout/index.ts` defines `right` and `bottom`, which `layout-grid` exports with `overlaps`, `cx` and `cy`. | The look refactor of C4: card rules into `parts` or the standard look for both plugins, and the helpers from `layout-grid`. |
| **Edges to a group in a fixed grid run slanted** when the group's middle lies in another row, and their label can cover the start node, as with the predecessor. | Dock at the frame like at a node. |

## Tools

| Debt | Clean-up |
|---|---|
| **Two generators of README code tables**, `plugins/plugin-uml/test/codes.ts` and `plugins/plugin-architecture/test/codes.ts`, each with the plugin's table of predecessor codes. | One generator in `tools/docs`, with the predecessor tables as data of their plugins. |
| **The source condition is published.** Every packed `package.json` keeps the export condition `@diagrist/source`, which points into `src/`, which is not in the tarball. Hosts outside the workspace never set the condition, so nothing resolves through it; only the CLI drops a subpath (`./tables`) with `publishConfig.exports`. | `publishConfig.exports` in every package, derived from `exports` when a host outside the repository needs it gone. |
