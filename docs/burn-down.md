# Burn-down

Debt we accept on purpose. Each entry gives the reason and what removes it. An entry is deleted in the change that
settles it, and that change says so in its description. The entries are sorted by the package that holds the debt;
the crutches that keep the predecessor's bytes are numbered, since they go together in one clean-up.

## Language and kernel (`lang`, `core`)

| Debt | Clean-up |
|---|---|
| **Areas repaint colours, not meanings** (ADR 0033). The kernel finds what to repaint by the values of a style table's rules (`areaColors`) and by the kinds of shape a class is drawn on, so a look that paints an element in a colour of its own, such as the heads of UML cards in their `tone=`, shows the area only on what is left; a stripe on a diamond follows both left edges as a chevron. | A role for the paint an area replaces, which looks name, once a look needs more than colour values. |
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
| **Options with one user so far, or none.** `onLine.avoid` and `detailFont` have no user yet: paper hands no rectangles and measures details in the label font, so its bytes stay; the panel and instrument looks drafted them. `rowMin`, `avoid` and `placeLabels` serve state machines, `demand` and `lines: 'straight'` use case diagrams, `cover`, `slot`, `bundle`, `lane`, `rowOverhang` and `indent` C4. All describe geometry a second kind can set unchanged: a least row height, rectangles a route keeps out of, labels a kind placed itself, the width a node asks of its columns, straight lines, a frame over one more column, equal places in an area, shared trunks, a column an edge runs in, room for what sticks out below a row, room left of the grid. `reserve` has two users, the names in the top edge of `look=columns` and the icon circles of cards (ADR 0023). | They stay as options. |
| **Disconnected parts of a scope are layered side by side.** `layerGraph` lays out each connected part on its own, where the predecessor ordered all vertices of a state's scope at once. All examples are connected. | An option to layer a graph as one part, if a machine needs it. |
| **The line check reads lines from the anchors and finds their texts by key.** `linesOfDrawing` takes a line per edge anchor, ties a text to the line whose index its key names (`<id><n>.label.<k>`, `label-<n>`), and reads lines that leave or enter a box at one point as a bundle. The per-plugin `layout-metrics.json` only record its findings; no kind asserts them, and the kernel's placement check still knows no lines. | Lines as `Placed` with an outline and their own key (ADR 0020), handed by the kinds with their bundles, once the layered router (layout plan L3) makes the first kind pass Q1 to Q9; then the kernel reports them and the key convention goes. |

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
| **Areas show weakly in `look=cards` and between lanes** (ADR 0033). Card heads keep their `tone=`, so sequence heads, lane heads and state cards show their area only in the outline or the stripe; neighbouring activity lanes share a border, which takes the tone of the lane drawn later; interruptible and expansion regions and sequence fragments take no `area=`. | Let a card head take the area's ink when it names no tone; draw shared lane borders once, in ink. |
| **U400 points at the statement, not the token.** `msg a -> b` reports column 1 instead of the `b`. | Carry the span of the offending end through the model. |
| **Completion knows no lifelines in `msg`.** Message ends are no `ref`, since they may also be `found`, `lost`, `gate` or a frame (`messageEnd` in `src/sequence/grammar/values.ts`), and the same holds for `over=`. | Let a value name the declarations it accepts besides its own forms, without `lang` checking them. |

### Activity, class and state machine diagrams

| Kind | Debt | Clean-up |
|---|---|---|
| activity | **No notes.** The predecessor allowed `note "..." on id`; no example used it, and its placement belonged to the generic note layout that use case diagrams replaced. | A `note` statement with a free spot beside its node, as in use case diagrams. |
| class | **Symbols at the start of a line sit on a stub.** resvg ignores `orient="auto-start-reverse"` and draws no marker on a path without stroke, so a diamond at the whole, the second head of `<->` and the shared triangle of a bundle are the end marker of a short transparent path. | `marker-start` once the renderer turns markers there. |
| class | **No grid placed by hand.** `grid` and `at` are gone, as in use case diagrams, so `pakete-raster` and the warning W415 are not carried over. | Only if a diagram needs it. |
| class | **Packages arrange as blocks before the pipeline sees them.** The layers and the order of a class diagram come from the block search of `layout/cells.ts` (each package one rectangle of cells, the top level tried in several arrangements); the layered pipeline of `layout-grid` keeps them as given (`LayeredSpec.layers`) and only places, routes and frames. Its own ordering of placeholders, weighted crossings and soft clusters does not reach the classes. | Frames as hard clusters in the pipeline's order, so it can order packaged pictures itself. |
| class | **Lines with a package at an end, and loops, are drawn by the kind.** `layout/package-lines.ts` sets a dependency between frames on the first free vertical both frames share, else a Z through the middle of the gap, after the pipeline has routed everything else, so it takes no track and can meet a horizontal piece of another line; a relation of a class with itself is a loop at its right side that the pipeline leaves no room for. No example has a loop. | Frames as ends of edges in the pipeline, and loops on a side channel. |
| class | **Names on lines are one line long.** The pipeline seats a name beside the start of its line in one line of text, so a long name such as `«bind» <K → String, V → Kunde>` is as wide as it is long, where the grid wrapped it into two. | Labels of two lines in `LayeredEdge.label`. |
| class | **Lines on toned packages keep the canvas halo**, a faint light seam on the 7 % tint, where the predecessor tinted it (`halo-<tone>`). | A halo role per surface, shared with C4 and use case cards. |
| class | **Coverage does not see line forms.** The walker in `src/spec/coverage.ts` reads statements, so the static and abstract flags of members count as not covered. | Walk `lines` too. |
| state | **Cross references are not checked.** `file=` on a submachine state is only named in the description; the predecessor loaded the file and compared points and kind (E480 to E484). | `file=` as a `file()` value, read like `use` (ADR 0025), and the checks as rules over two models. |
| state | **Orthogonal regions are not placed.** The dashed lines between regions of a state and their names at the top left are drawn, but not handed to the placement check, so a name on a line or a state goes unseen. | Report each region as a frame with its name, as activity diagrams do (ADR 0020). |
| state | **Nested rails break Q8 in `fahrgastraum`.** Two back edges between the same two states on one side, and a skip edge leaving a state beside a back edge entering it, run on nested rails, the only way without a crossing; their docks stand in the opposite order of their other ends, which the line check reads as interleaved ports. `test/state-lines.test.ts` allows these three findings by name. | Let Q8 in `check/ports.ts` tell nested lines that leave and enter one side from interleaved ones, then drop the allowance. |
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
4. **Blocks restate base rules** (`blockBase` in `src/looks/blocks.ts`): 13 base rules again with larger fonts and
   strokes. Clean-up: the kernel builds the standard look from measures.
5. **The predecessor's arithmetic.** Measures, heads, flow numbers, marks, layers and the legend follow its order of
   floating point steps, as `layout-grid` does.

| Debt | Clean-up |
|---|---|
| **Not ported yet:** the tile flow (`flow=` on groups and in the header), framed groups (`style=`, `line=`, `icon=` on `group`), accents and chips, an own `legend`, end marks of edges (`from-box=` and the like; the scene has no rotated text), and `form=ellipse`. No example uses them. | Each with its tables, a predecessor example and its bytes. |
| **No layout checks on routes.** The predecessor reported edges through nodes (E204), unroutable edges (E206), crossings (W203), overlapping edges (W206), labels on edges (W207) and lines through heads (W492). | Report routes as placed lines. |
| **Labels reach into foreign frames.** The pictures of `radverleih/radverleih.dgr` and `entscheidung.dgr` warn (G400) where an edge label reaches into a frame it does not belong to; the pictures show it. Diff pictures add labels of removed and kept edges between the same two boxes that crowd each other (ADR 0021). | Fixing it changes their bytes; a removed edge could leave its label to the kept one. |
| **The sheet pieces in `parts` have one user.** The strip legend, the kicker header, the margin notes (in a column or a row below) and the sentence legend of `sheetOf` are drawn only by C4 (ADR 0023 Nr. 5); `stripWidth`, `MARGIN`, `wrap`, the note geometry and the card and note rules also serve UML. The gap behind texts on a line stays in the plugin (`src/scene/labels/gap.ts`), because it takes its colour from the C4 surfaces under it. | They stay: phases, requirements and decision comparison will draw them; the gap moves when a second kind cuts its lines. |
| **Flow numbers stand on frame borders.** A number sits a little after the start of its edge, and where the edge leaves its frame close to its node, the number covers the frame line. The placement check reports it (G400) in `radverleih/komponenten` and `komponenten-paper` and in the pictures of `radverleih/radverleih.dgr` and `entscheidung.dgr`. | Seat the number clear of the border it crosses; this changes the bytes of those pictures. |
| **Edges to a group in a fixed grid run slanted** when the group's middle lies in another row, and their label can cover the start node, as with the predecessor. | Dock at the frame like at a node. |
| **Paper seats numbers by the predecessor's test.** `seatMarks` in `layout-grid` tests a spot on lines running left or up the right way now, but `look=paper` asks for the old test (`crutches.predecessorSeat`), which multiplies the distances to both ends by the direction of the segment, so a number may reach a few pixels into the box it starts from. | Drop the crutch with the paper fixes; this moves the number and its texts by a few pixels. |
| **Cards in a fixed grid dock under their icon.** Cards reserve the stretch below their icon circle (`reserve.top`) only in an adaptive grid, as the predecessor kept it free there alone, so in a fixed grid a line from above still ends under the icon. | Reserve it in every grid; this changes the bytes of the cards pictures with such a line. |
| **`decisions=` defaults to `right`.** `auto` puts the notes below a picture wider than 1,100 pixels, as a printed page needs, but as the default it would move paper's notes, so the `-columns` examples ask for it. | `auto` becomes the default with paper becoming the default look, which rewrites those hashes anyway. |
| **Columns' spines in an adaptive grid bend.** A line docks beside the name in the top edge per pair of boxes, so a column of three boxes with names of different width has its lines at two positions; the fixed grid moves whole lanes. | Lanes in the adaptive router, as `clearReserved` does for the fixed grid. |
| **Columns lists no steps.** The predecessor's draft of `look=columns` listed every step beside the picture; the list only helps when edges carry no text in the picture, which an author would have to ask for. | A word like `labels=aside` once someone needs it; the list then names steps by their texts only. |
| **Paper's arrowheads are not open.** `look=paper` writes only the rules a picture uses (`usedOnly`), and the kernel counts the classes of shapes, not of markers, so `arrow-open` and `arrow-open-accent` never reach the stylesheet and the hooks are drawn as filled black triangles. Areas (ADR 0033) paint what is drawn: inside an area that black fill takes the area's ink, so the head keeps the tone of its line, and once the hooks open the area rules follow without a change of their own. | Count marker classes as used, or write the rules a look's markers name; this changes paper's bytes, so with the next change that rewrites them, such as paper becoming the default. |

## Code (`code`)

| Debt | Clean-up |
|---|---|
| **The stripe of an area lies under the bands of marked lines** (ADR 0033), so at a marked line it looks dark; a matrix gives no area to groups of rows. | Draw the bands inset by the stripe in `stripe`; let rows take the area of their group when a matrix needs it. |
| **Shiki still looks at the clock.** `vscode-textmate` calls `Date.now()` once per line even with `tokenizeTimeLimit: 0` and only ignores the result, and it reads `process.env.VSCODE_TEXTMATE_DEBUG` when it loads, which turns on logging and nothing else. The purity test reads only our sources; `packages/code/test/highlight.test.ts` proves the runs do not depend on the clock. | Upstream: skip the clock when the limit is 0. |
| **The paper colours exist twice.** `plugins/plugin-code/src/styles.ts` repeats the ink, paper and outline colours of the C4 sheet `paper` by value, since plugins may not import each other. | Take them from `parts` or the standard look once the looks refactor of C4 moves the paper palette there. |
| **Badges of marks that start on one line overlap.** Each mark's badge sits at the first line of its band, so two marks starting on the same line draw two badges in one spot. No example does it. | Stack such badges to the left, or refuse the second mark. |
| **`symbol` knows braces, not syntax.** A declaration is the line whose tokens the grammar marks as declaring the name, and its end the brace that closes it, so `symbol` works for Java and Kotlin and finds nothing in SQL, YAML, JSON or XML. | A selection by key path for YAML and JSON, or by tag for XML, when a diagram needs one. |

## Tools

| Debt | Clean-up |
|---|---|
| **Two generators of README code tables**, `plugins/plugin-uml/test/codes.ts` and `plugins/plugin-architecture/test/codes.ts`, each with the plugin's table of predecessor codes. | One generator in `tools/docs`, with the predecessor tables as data of their plugins. |
| **The source condition is published.** Every packed `package.json` keeps the export condition `@diagrist/source`, which points into `src/`, which is not in the tarball. Hosts outside the workspace never set the condition, so nothing resolves through it; only the CLI drops a subpath (`./tables`) with `publishConfig.exports`. | `publishConfig.exports` in every package, derived from `exports` when a host outside the repository needs it gone. |
