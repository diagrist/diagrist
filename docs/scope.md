# Scope: what Diagrist draws, how it may look, and how it lays things out

Date: 2026-10-28. Status: draft for `docs/scope.md`; the ADR at the end is the decision it proposes.

Basis: 105 architecture diagrams from about sixty sources (company engineering blogs, cloud vendors, books and
teachers, banks and European payment bodies, papers and concept pages), collected on 25.10.2026 and read picture by
picture; the owner's own needs as an architect in a regulated enterprise (sequence, use case, activity, C4, work states as-is and
to-be, phases, feature planning with functional and non-functional requirements, decision papers, variant
comparisons; PNG, git and FigJam; German and English labels); the gap research against PlantUML, Mermaid, D2,
Structurizr and LikeC4; the look review of 25.10.2026; and ADR 0001 to 0026. Entries are cited by their id in the
collection (`bigtech-12`, `fintech-04` and so on); the Sources section names each one with its page.

The owner's principle, which this document carries out: Diagrist is not a graphics tool. It is a layout engine for
coding agents, built to draw diagrams that explain software processes and software architecture.

## Product statement

Diagrist turns a small text file into a diagram that explains a piece of software: what it is made of, who talks
to whom, what happens in which order, what changes between today and the target, and which option was chosen and
why. The file says what exists and how it relates; the engine decides where every pixel goes. A diagram is checked
like code: every statement is in a table, every finding has a stable code, and the same file gives the same bytes.

It is written for coding agents first and for the people who review their work. An agent gets the grammar of every
kind as data and findings as JSON; a reviewer gets a picture in git that only changes when the source does, and a
PNG that prints on A4 in greyscale without losing a distinction.

It draws a small catalogue of kinds, each with rules it can check: the UML behaviour and structure diagrams in the
look of the specification; C4 structure at three levels plus deployment; and the architect's working documents
that no other diagrams-as-code tool checks, namely work states as-is and to-be, phases over time, decisions
between options, and requirements tied to the building blocks they constrain.

Its visual principles come from the best diagrams in the field, not from a brand: one main path and a quiet
context, colour only where it means something and a legend that says what, focus by dimming rather than by
leaving out, a title that says what the picture is and when it was true, and type that stays legible on paper.

It refuses to become a drawing tool. There are no coordinates, no pixel positions, no per-element colours, no
macros, no icons from the network, no browser in the render path, and no diagram kind without rules worth checking.
It will not race Mermaid for the number of kinds, draw pies, mind maps, isometric clouds or comics, and it will not
draw a thousand services as a hairball; it will ask for groups instead.

## Lessons

The collection was read for what the good pictures share and what the bad ones lack. Each lesson is one sentence,
its evidence, and what it means for Diagrist. The last column says who owns the lesson: the language (what the file
can say), the layout (what the engine decides), the look (how it is painted), or nobody at Diagrist, because it is
a graphics tool's job.

| # | Lesson | Evidence | For Diagrist | Owner |
|---|---|---|---|---|
| 1 | As-is and to-be only read as a pair when unchanged elements keep their exact place and ink, and only the change is marked. | bigtech-12, fintech-06, bigtech-16, people-03, fintech-17, people-16, fintech-14, bigtech-04 | `variant` with `diff` does this already (ADR 0021); what is missing is shared cell sizes across the pictures of one file, numbered interventions on a diff, and a strip that shows base and variants side by side. | layout |
| 2 | One path is the story and everything else steps back: heavy and black against thin, grey and italic; data path against control path. | concepts-08, cloud-14, bigtech-15, cloud-13, bigtech-07, people-13 | `flow ... accent` exists; the look must make the difference survive greyscale (the review found 1.5 px against 1 px too fine), and context elements need a ghost state (grey, dashed, optional without label) that the model asks for, not the look. | look, language |
| 3 | Focus beats omission: the same whole picture rendered again with the irrelevant parts dimmed and the current part framed says "you are here" without losing the map. | cloud-11, fintech-10, fintech-02, fintech-20, concepts-09, people-15 | A `focus=` header option on C4 kinds that names a flow, group or element; everything else is painted as context. It is a mode, not a kind, and it is what makes one source serve a whole document. | language, look |
| 4 | Colour means responsibility, scope or path, never technology, and it needs a sentence in the legend. | fintech-02, bigtech-08, bigtech-15, cloud-10, concepts-15, people-20; counter-examples fintech-09, cloud-08 | `tone=` stays, but a tone used in a picture must appear in the legend with a text, and more than four tones is a warning. A theme may repaint, never add meaning. | look, check |
| 5 | Decisions read best as equally built cards on a named axis, or as a matrix with three rating symbols, with the chosen option the only coloured one and the reason in one sentence. | bigtech-11, concepts-04, people-14, cloud-01, cloud-03, people-10, people-19, concepts-06, fintech-12 | A kind `decision` with options, criteria, ratings from a closed set, a chosen option and a reason; drawn as cards or matrix. Variants of a structure diagram side by side are a layout of what `variant` already holds. | language, layout |
| 6 | Zoom levels and views of one system belong on one sheet as tiles, each framed and titled, with a dashed outline for what opens elsewhere. | bigtech-06, bigtech-21, fintech-20, fintech-18 | A `sheet` that composes the pictures of several files or variants as tiles is a layout of existing pictures, not a kind. It waits for `use` across kinds and sizes shared between pictures. | layout |
| 7 | Time needs its own axis: phases as lanes with a today marker and status in the bar, state as a film strip of equal tiles, a sequence with phases as tinted bands. | concepts-02, cloud-15, concepts-07, concepts-03, bigtech-14, fintech-07, people-08, concepts-17, cloud-04 | A kind `phases` (lanes over time, milestones, status words, today) and phase bands plus a phase column in `sequence`. Horizontal time with slanted messages is a different diagram than UML sequence and stays out while UML keeps the specification look. | language, layout |
| 8 | Numbers on edges turn a structure picture into a story: steps with branch suffixes (5B, 5C), scenario prefixes (1.x, 2.x), stable step ids that the text refers to, and a worked example with real values. | bigtech-02, people-07, fintech-04, fintech-03, bigtech-18, people-11, bigtech-13, fintech-21, people-22 | `flow` numbers exist; add branch letters for parallel steps, a prefix per flow when a picture holds several scenarios, stable ids on activity nodes, and a `sample=` value on a step for a worked example. Errors in activity diagrams take the one reserved colour. | language |
| 9 | A legend that draws the real symbols, and a footer with name of the view, purpose, author and date, make a picture usable outside the document it was made for. | fintech-19, people-01, bigtech-20, concepts-15, people-18, cloud-09 | The legend is generated from what the picture uses (lines, statuses, tones) and is mandatory as soon as there is more than one edge kind; the header gains a status and date line (kicker) that every kind draws. | look, parts |
| 10 | Groups that cross each other are unreadable as frames; one axis as columns and one as rows reads at once, and zones can be a floor or a tab instead of yet another frame. | cloud-06 (counter), cloud-18, cloud-01, cloud-12, cloud-02, cloud-17, bigtech-19, concepts-21 | Deployment is a grid whose columns are zones and whose rows are tiers; a zone is a frame, an area or a caption, chosen by the look; nesting deeper than two frames is a warning. | layout |
| 11 | Dense is fine when the set is small and consistent: short codes in the node plus a legend, replicas as a stack, counts as brackets or dots, never the same icon twelve times. | cloud-09, cloud-10, fintech-06, concepts-19, people-21, fintech-11; counter-examples cloud-05, bigtech-09, fintech-09 | `replicas=` draws a stack; a picture with more than about forty nodes and no groups gets a finding that asks for domains; identical siblings are not drawn, they are counted. | check, layout |
| 12 | The tool's default is the benchmark: an unchanged Mermaid look in a prominent post reads as generic, missing labels or edges through titles read as broken. | bigtech-01, cloud-19, cloud-20, people-16 (counter); bigtech-15, cloud-14, fintech-05, concepts-22 (model) | `paper` is proposed as the default of every non-UML kind (the owner decides, see ADR 0027); every label is a real `<text>` and a test proves each label of the model is in the SVG; lines join the placement check so an edge through a label or a group head is a finding. | look, check |

Two things the collection shows that are not Diagrist's job. The hand-drawn pictures (people-03, bigtech-13,
cloud-16, people-21, fintech-14, people-06) say "this is provisional, argue with me"; that message is real, but
Diagrist says it with a kicker such as "Draft, 14.09.2026" and `status=planned`, not with a wobble filter, because a
sketch look would be a fourth look to maintain for every kind. The illustrated explanations (people-11, concepts-13,
cloud-07, concepts-10, people-09) teach a concept to a reader; they are editorial work with faces, emoji and
simulations, and belong to an illustrator or an interactive page, not to a layout engine.

## Kinds

The catalogue is grouped by what a diagram answers. Each row says what the kind is for, where the collection shows
it, whether it exists, whether it is a new kind or a mode of an existing one, which layout family it needs, and its
priority with the reason. Priorities: now (in the next releases), next (after the installable release and the
multi-file work), later (when a real diagram asks for it), never (with the reason in the last section).

### Structure: what the software is made of

| Kind | Purpose | Evidence | Today | New or mode | Layout | Priority |
|---|---|---|---|---|---|---|
| `context` | One system as a black box with its users and neighbours. | fintech-02, people-01, fintech-05 | exists | kind | grid | now; the owner's daily picture, add `focus=` and the kicker |
| `container` | Applications and stores of one system, grouped by responsibility, with numbered flows. | bigtech-08, bigtech-15, cloud-10, cloud-14, fintech-05, bigtech-17, bigtech-05 | exists | kind; data pipelines are containers in stage columns with `=>` edges, not a kind of their own | grid | now; the best-covered kind, needs the fixes of the look review |
| `component` | Components inside one container and what they depend on. | bigtech-07, bigtech-10, cloud-09, people-16 | exists | kind; the layer rule of bigtech-07 (an edge against the layer direction is red) is a check on `layer` | grid, layered | now |
| `deployment` | Where containers run: zones, regions, tiers, nodes, replicas, ports and protocols on the edges. | cloud-12, cloud-18, cloud-13, people-02, cloud-02, fintech-11, bigtech-19, bigtech-20, cloud-17, cloud-06 (counter) | missing | new kind in `plugin-architecture`, sharing the tables of the three levels | grid with zones as columns and tiers as rows, at most two nested frames | next; the owner names it, every bank needs it, and the grid carries it already |
| `landscape` | Every system of an organisation without a focus, as tiles or bands without edges, or as a context map of many systems. | people-01, fintech-01, fintech-15, bigtech-09 and fintech-09 (counter) | missing | mode of `context` without a core system, with `layer` bands; the ECB tile stack is `layout=bands` | grid, bands | later; the owner draws one system at a time, and the aggregation rule (lesson 11) must exist first |
| `domain` | Bounded contexts and their relationships with roles (upstream, downstream, OHS, ACL, shared kernel). | people-17, concepts-16, people-22, fintech-10, fintech-21 | missing | new kind; the relationship patterns are a closed set that can be checked (every relation has two roles, a pattern needs its side) | grid or layered, badges at the ends of edges | later; a real DDD need, but not the owner's daily work |
| `class` | UML class diagram. | concepts-22 (as a dependency tree) | exists | kind; a module dependency tree is a class diagram with packages | layered | now, as is |
| `code` | Excerpts of real source files as cards with marks and links. | (no entry; the owner's own need) | exists | kind | stack | now, as is |
| `er` | Tables and their relations. | (gap research only) | missing | new kind, needs operators from plugins | layered | later; the class diagram covers most of it in a Java house |

### Behaviour: what happens in which order

| Kind | Purpose | Evidence | Today | New or mode | Layout | Priority |
|---|---|---|---|---|---|---|
| `sequence` | Messages between participants over time, UML 2.5.1. | bigtech-14, fintech-07, fintech-13, cloud-08, zalando parallel run (fintech-13) | exists | kind; phases as tinted bands with a title and a phase column at the left margin are modes (`phase` statement); participants grouped by runtime are a mode (`boundary` over lifelines); code identifiers in labels in mono is a text run | sequence | now; the phase statement is the one addition the collection asks for most |
| `activity` | Steps, decisions, forks and lanes, UML 2.5.1. | fintech-04, concepts-03 | exists | kind; stable step ids (`id=CT-01.05`) and the error-path rule (every edge from a rejection node is drawn in the error colour) are attributes and a check | layered with lanes | now |
| `state` | States and transitions, UML 2.5.1. | concepts-08, concepts-07, people-12 | exists | kind; the main path heavy and side transitions grey is a `main` flag on transitions; the coupled time strip of concepts-07 is a `phases` picture next to it | layered | now |
| `usecase` | Actors and use cases of a subject. | (the owner's need) | exists | kind | grid | now |
| request path | One request followed through a structure picture with numbered steps, branch suffixes and sample values. | bigtech-02, bigtech-06, bigtech-13, people-07, fintech-03, bigtech-18, people-11, concepts-13 | partly | mode of C4 kinds: `flow` gains branch letters, a prefix per flow, and `sample=` on a step | grid | now; small additions to `flow` with high yield |
| message flow | Messages as cards with a number and a field list on the edges between contexts and systems. | people-18, fintech-21, people-15, people-05 | missing | mode of `flow` in `domain` and `container`: a step with `fields=` draws a card | grid | later, with `domain` |
| `flowchart` | A process without UML strictness. | (gap research; Mermaid's most used kind) | missing | would be a kind; only with rules (unreachable node, decision without exits) | layered | later; `activity` covers the owner's processes |
| horizontal time with latency | Lifelines across and messages slanted, pauses as bars. | people-08, concepts-11 | missing | would be a kind of its own, not UML | time axis | never for now; UML keeps the specification look by the owner's decision, and this is a paper's diagram |

### Change over time: what moves from today to the target

| Kind | Purpose | Evidence | Today | New or mode | Layout | Priority |
|---|---|---|---|---|---|---|
| as-is and to-be | The target drawn against the current state, unchanged parts in place, changes marked. | bigtech-12, fintech-06, bigtech-16, people-03, fintech-17, people-16, fintech-14 | exists | mode: `variant ... diff` (ADR 0021); add shared sizes across pictures, numbered interventions (`mark=1` on added lines) and a `strip` that puts base and variant side by side | grid, strip of pictures | now; the mechanism is there, the sizes and the strip are the gap |
| `phases` | Phases of a change on a time axis: lanes per item, bars per phase with a status word, milestones, a today marker. | concepts-02, cloud-04, bigtech-04, concepts-17, fintech-08, concepts-07 | missing | new kind, no calendar Gantt: phases are named and ordered, dates are labels, status words are a closed set | lanes over time | next; the owner names phases of a new vertical as a core need |
| film strip | The same scene in three to five states side by side, each with a one-line caption. | cloud-15, fintech-08, cloud-04, concepts-01, bigtech-04, fintech-12 | partly | a layout of variants: `strip` composes base and variants of one file in a row with their titles; sizes shared | strip | next, with the shared sizes |
| focus | One whole picture, the current part framed, the rest dimmed; one source for a whole document. | cloud-11, fintech-10, fintech-02, concepts-09 | missing | option `focus=` on C4 kinds, built on variants so a document holds `radverleih.dgr` once and asks for `--variant` | grid | now; it is paint over an existing layout |
| status | Planned, existing, deprecated, under construction, out of scope. | people-16, fintech-16, fintech-03, cloud-18, fintech-15, fintech-01 | partly | `status=planned|deprecated` exists; add `building` (hatched) and `external-scope` (grey, roman numeral) as values | grid | now; two table values |

### Decision: which option and why

| Kind | Purpose | Evidence | Today | New or mode | Layout | Priority |
|---|---|---|---|---|---|---|
| `decision` | Options as equally built cards on a named axis or as a matrix against criteria, ratings from a closed set, the chosen one marked, a reason as footer. | bigtech-11, concepts-04, people-14, concepts-06, people-19, fintech-22 | missing (only the `adr` bar in C4) | new kind; rules: every option rated on every criterion, exactly one chosen, a reason given | cards on an axis, matrix | next; the owner's decision papers, and no other tool checks it |
| variant comparison | Two or three structure variants side by side on the same grid so only the difference shows. | cloud-03, people-10, cloud-01, fintech-12, bigtech-17 | partly | layout of variants (`strip`), plus `cover` bars over a grid for the archetype matrix of cloud-01 | strip, grid | next, with the strip |
| quadrant | Items placed in four named fields by two criteria. | people-19, concepts-05 | missing | a drawing of `decision` with two criteria, not a kind; Wardley maps with free positions stay out | matrix | later |
| `requirements` | Functional and non-functional requirements with priority, measure, the building block or use case they constrain, scenario ids and conflicts. | concepts-18, fintech-18, fintech-22 | missing | new kind; rules: every NFR has a measure, every FR hangs on a use case or container, a conflict names two requirements | table with cards beside a referenced picture | next; the owner's feature planning, and the rules are exactly what Diagrist is for |
| canvas | One page with value, stakeholders, functions, quality, decisions, risks and a small context picture. | fintech-22, fintech-18 | missing | a sheet composed of a `requirements` table, a `decision` list and a `context` picture | sheet of tiles | later; it is composition of the kinds above, and mostly text |

### Not built

Pies, radar, sankey, kanban, git graphs, mind maps and wardley maps have no rules to check and are Mermaid's race.
Isometric views (cloud-21, concepts-21) and vendor icon forests (cloud-05, cloud-06) are presentation, not
structure, and their icons carry licences and brands. Comics and panel explanations (people-11, concepts-13),
simulations (concepts-10), fantasy maps (people-09) and honeycomb domain walls (fintech-10) are editorial
illustration. Service graphs of a thousand nodes (bigtech-09, fintech-09) are drawn by nothing; Diagrist reports
that groups are missing. A sketch look is not a kind and not a look for now; provisional pictures say so in words.
A horizontal latency diagram and a calendar Gantt are different tools. ER waits for a real diagram. The reasons are
spelled out in the last section.

## Styles

ADR 0022 and 0023 set the frame: a look is a value with measures, fonts by role, paint and named options from a
closed set; a theme arrives after layout and only repaints. This section says what that means for the catalogue.

### What a look may change, and what never

A look may change the typeface and size per role, the measures of the kind (pads, radii, grid gaps), the paint of
every role, and one value per named option (how a group is framed, where an edge label sits, how a number is seated,
where decisions and legend go, whether a person is a figure or a bust). It may decide that a zone is an area, a
frame or a caption, and that a name sits in the top edge or inside the box.

A look never changes the model: which elements exist, which cell they sit in, which flow is accented, what status
an element has, what a label says. The look review found `columns` turning "this flow is accented" into "everything
else is context", which reinterprets the model; that is the line. A look never adds meaning that the file does not
carry, never changes text content or capitalisation of names (German compounds lose their word shape in capitals),
never draws a thing the model does not have (the panel look needed a second group to have something to show), and
never corrects the layout after the fact; what it needs from the layout it asks for as an option of `layout-grid`.

A theme changes only paint: the colours of roles, the canvas, the inks of the diff. It may not touch fonts or
measures (the layout has measured with them), it may not switch options, and it may not paint two roles the same
when the look painted them apart, which a test over the standard palette checks.

### The minimal set of looks

Three looks are enough for the long term, and each future kind picks its values from the same options.

| Look | Role | Why it stays |
|---|---|---|
| `paper` | proposed default of every non-UML kind, pending the owner's decision: C4, deployment, phases, decision, requirements, code | the quietest look, prints in greyscale without loss, Inter is bundled, one emphasis (the yellow core), decisions as margin notes; the review named it the new standard, and `plugin-code` already takes its colours |
| `plain` | opt-in: JetBrains Mono everywhere, strip legend, decision bar | byte-identical to the predecessor, the goldens and the README pictures depend on it, and it is honest in a terminal and a FigJam screenshot |
| `columns` | opt-in after its fixes: column heads, layer bands, names in the top edge | the only look that solves the layer bar and reads as a technical sheet; a second real user of the option set |

`cards` and `blocks` stay as values for the pictures that use them but receive no new kinds; when the goldens move
to `paper` they become candidates for removal. `panel` and `instrument` stay parked branches; `instrument` may come
back as the look of `phases` and `decision` if those kinds want a face, with the corrections the review listed. UML
kinds keep the look of the specification by the owner's decision; what they take from `paper` is only the sheet
(kicker, title, status line) so a document reads as one set.

### Principles a look must satisfy, as checkable rules

The collection's good pictures share a handful of properties. Each is written so that a test over the look or a
check over the picture can hold it.

| Rule | What it says | How it is checked |
|---|---|---|
| Hierarchy | The accented flow is heavier than a normal edge by at least two stroke levels or one ink level, and context elements are lighter than normal ones but still visible in greyscale (luminance difference to the canvas at least 0.25). | a test renders each look's roles to grey and compares luminance; the review's finding on `paper` (1.5 px against 1 px) fails it |
| One emphasis | A picture has at most one `emph` core and at most one accented flow; a second is a warning that names the first. | rule over the model |
| Colour with meaning | Every `tone` used in a picture appears in the legend with a text; more than four tones in one picture is a warning; a theme may not merge two roles the look paints apart. | rule over model and legend; test over themes |
| Greyscale survival | Every distinction a look paints in colour is also carried by weight, dash, fill or a sign, as the diff already does with `+`, `×`, `~`. | a test renders every example of every look to greyscale and checks that the class pairs that differ in colour also differ in another property |
| Legend when needed | A picture with more than one edge kind, any status, any tone or a diff has a legend; the legend draws the real symbols it names. | rule over the model; legend generated from use |
| Focus by dimming | `focus=` never removes an element; it paints it as context. | rule: the set of placed elements is equal with and without focus |
| Sheet | Every picture has a title, the name of its kind, and a status line (kicker) with a date or work state when the file gives one; a picture wider than 1,100 CSS pixels gets a warning with the width and the advice to move notes below. | header parts in `parts`; width check in `dgr check` |
| Typography | Names and texts in a proportional face, identifiers, protocols, ports and code in mono; capitals only for kickers and micro labels of at least 9.5 px; no text smaller than 9 px; names never set in capitals. | look fonts are data, a test over the font roles |
| Labels present | Every label of the model is a real `<text>` in the SVG, never a `foreignObject`, and a test finds each one. | test over the compiled SVG |
| Nothing crossed | No edge runs through a label, a node or a group head; a number sits clear of the frame it crosses. | placement check over lines (burn-down) |
| Nesting | Frames nest at most two deep; a third frame is a warning that suggests columns and rows. | rule over groups |

## Layouts

Six layout families cover every kind in the catalogue. Three exist, three are missing, and none of them takes a
coordinate from a file.

| Family | What it places | Kinds | Today | What is missing |
|---|---|---|---|---|
| Grid with zones | Boxes in named columns and rows, frames and areas around them, edges routed straight, L or Z, labels on the longest segment, numbers seated on steps. | context, container, component, deployment, landscape, domain, usecase | `@diagrist/layout-grid` (ADR 0015): `placeGrid`, `routeEdges`, `labelEdges`, `fitFrames`, `grow`, adaptive and fixed | zones as a second grid axis for deployment (columns are zones, rows are tiers), lines in the placement check, shared sizes across pictures, `cover` bars over a grid (the archetype matrix of cloud-01), a floor or tab form for zones |
| Layered graph | Nodes in layers by direction, cycles broken, lanes as areas. | activity, state, class, flowchart, module trees | `layerGraph` in the library, lanes and loops still in `plugin-uml` | loop channels and tracks move to the library when a second kind needs them; a main-path weight that the ordering respects |
| Sequence | Participants left to right, messages top to bottom, fragments nested. | sequence | in `plugin-uml`, byte-identical to the predecessor | phase bands with a title, a phase column at the left margin, participant groups as a boundary over lifelines |
| Lanes over time | One lane per item, bars per phase in order, milestones as marks, a today marker; no calendar arithmetic, phases are ordered names and dates are labels. | phases, state strips next to a state machine | missing | the whole family; it is a one-dimensional grid with bars, so it builds on `placeGrid` with rows as lanes |
| Matrix and cards | Equal cards in a row on a named axis; or a table with row and column heads, cells from a closed set of symbols, group rows. | decision, requirements, quadrant, canvas | missing | the whole family; the legend and notes mechanics of `parts` already lay out rows of samples and texts, which is the seed |
| Strip and sheet | Finished pictures composed side by side (base and variants, phases of a film strip) or as tiles (zoom levels, four views), each with a title, sizes shared. | as-is and to-be, film strip, variant comparison, zoom levels, canvas | missing; `dgr build` writes one file per picture | composition in the kernel after `compile`, with `Kind.measure` for shared sizes; `strip` and `sheet` are header options, not kinds |

### What the agent writes and what the engine decides

The file says what exists (elements with names, types, technology, status), how things belong together (groups,
layers, lanes, zones), how they relate (edges with a kind, flows with an order), what matters (one emphasis, one
accented flow, a focus), and what changed (variants with set and drop). In a grid kind it also says which named
column and row an element sits in, because the author decides what stands next to what and because stable cells
are what makes as-is and to-be comparable. Everything else is the engine's: widths and heights, routes, where a
label sits, how a frame grows, where numbers and marks are seated, where the legend and the notes go, and how two
pictures of one file share their measures.

One existing attribute sits on the wrong side of this line: `width=` and `height=` in pixels on `style` and on
elements. They are the only place where a file speaks in pixels. They should become relative sizes from a closed
set (`size=wide`, `size=tall`) before the first release, so that no file ever carries a number the engine should
have found.

### The boundary that keeps Diagrist a layout engine

A file never holds a coordinate, a pixel, a colour value, a font name or a free shape. Position is a named cell or
an order; size is a word; colour is a role or a tone with a meaning in the legend; shape is a type from a table. A
picture is deterministic and complete from one text file; there is no side file of manual positions, no "fix it in
the editor" step. If a picture needs a hand-placed element to be right, the kind lacks a statement, and the answer
is a statement with a rule, not a coordinate. If a picture needs a drawing that no statement can describe, it is
not a Diagrist picture.

## What we refuse

| Refused | Why |
|---|---|
| Coordinates, pixel sizes, manual positions in a side file | Structurizr and LikeC4 show the cost: positions lost on rename, diffs that mean nothing. Stable cells and a deterministic engine are the product. |
| Per-element colours, CSS classes, skin parameters, macros, procedures | They make a file unreadable for a tool and an agent, because the picture is only known after execution. Colour is a role; looks and themes are values. |
| A race for kinds | Mermaid has thirty kinds and a syntax each; every kind without rules dilutes "checked like code". A kind enters the catalogue with the rules it can fail. |
| Pies, radar, sankey, kanban, git graphs, mind maps, Wardley maps, timing diagrams, wireframes | No architecture rules to check, or better served by a charting or planning tool. The quality tree (concepts-18) is a `requirements` picture, not a mind map. |
| Isometric and 3D views, vendor icon libraries as the picture | Presentation of infrastructure, not its structure; brands and licences in every picture; the AWS example (cloud-06) shows icons without a single edge. Local SVG icons of the user remain possible. |
| Comics, panels, illustrated explanations, simulations, animation | Editorial and interactive work for a reader; a layout engine for agents draws structure and order, and a `strip` of variants gives the step-by-step a document needs. |
| A sketch or hand-drawn look | A fourth look to maintain for every kind, with no information a kicker and a status do not carry; the look review's arithmetic (every look is maintenance forever) applies. |
| Hairball graphs of hundreds of services | Nothing reads them (bigtech-09, fintech-09). Above a size, Diagrist reports that groups are missing instead of drawing. |
| Browser, Java, network or randomness in the render path | Byte-identical SVG and PNG from one file are why a bank can use Diagrist in git. |
| Horizontal time with slanted messages, calendar Gantt | Different diagrams than UML sequence and than ordered phases; UML keeps its specification look, and phases are names with dates as labels, not arithmetic. |

## Sources

Entries cited above, by id, with their source and page. Images are not reproduced; each page holds the original.

| Id | Source | Page |
|---|---|---|
| bigtech-01 | Discord, "How Discord stores trillions of messages" | https://discord.com/blog/how-discord-stores-trillions-of-messages |
| bigtech-02 | Slack Engineering, "Real-time messaging" | https://slack.engineering/real-time-messaging/ |
| bigtech-04 | Notion, "Building and scaling Notion's data lake" | https://www.notion.com/blog/building-and-scaling-notions-data-lake |
| bigtech-05 | Notion, "Building and scaling Notion's data lake" | https://www.notion.com/blog/building-and-scaling-notions-data-lake |
| bigtech-06 | Dropbox, "Inside the Magic Pocket" | https://dropbox.tech/infrastructure/inside-the-magic-pocket |
| bigtech-07 | Shopify, "Deconstructing the monolith" | https://shopify.engineering/shopify-monolith |
| bigtech-08 | Datadog, "Introducing Husky" | https://www.datadoghq.com/blog/engineering/introducing-husky/ |
| bigtech-09 | Uber, "Introducing domain-oriented microservice architecture" | https://www.uber.com/blog/microservice-architecture/ |
| bigtech-10 | Uber, "Introducing domain-oriented microservice architecture" | https://www.uber.com/blog/microservice-architecture/ |
| bigtech-11 | Netflix, "Single-tenant Titus" | https://netflixtechblog.com/single-tenant-titus-vm-level-isolation-on-a-multi-tenant-container-platform-6d8b1909d163 |
| bigtech-12 | Netflix, "Netflix Conductor: the next chapter" | https://netflixtechblog.com/netflix-conductor-the-next-chapter-41ad21067649 |
| bigtech-13 | Netflix, "Evolving Netflix's ads event pipeline for live, part II" | https://netflixtechblog.com/behind-the-scenes-evolving-netflixs-ads-event-pipeline-for-live-part-ii-826ebf9ad9fb |
| bigtech-14 | Airbnb, "Flexible authentication" | https://medium.com/airbnb-engineering/flexible-authentication-reimagining-authentication-for-millions-of-users-at-airbnb-3a8a4c917137 |
| bigtech-15 | Airbnb, "The guest journey, updated in real time" | https://medium.com/airbnb-engineering/the-guest-journey-updated-in-real-time-extending-airbnbs-sequence-recommender-with-chronon-8f1582578553 |
| bigtech-16 | GitHub, "How we improved push processing on GitHub" | https://github.blog/engineering/architecture-optimization/how-we-improved-push-processing-on-github/ |
| bigtech-17 | Canva, "Scaling to count billions" | https://www.canva.dev/blog/engineering/scaling-to-count-billions/ |
| bigtech-18 | Canva, "Search pipeline, part II" | https://www.canva.dev/blog/engineering/search-pipeline-part-ii/ |
| bigtech-19 | Meta (Chunqiang Tang), "Meta's hyperscale infrastructure", CACM | https://cacm.acm.org/research/metas-hyperscale-infrastructure-overview-and-insights/ |
| bigtech-20 | Meta (Chunqiang Tang), "Meta's hyperscale infrastructure", CACM | https://cacm.acm.org/research/metas-hyperscale-infrastructure-overview-and-insights/ |
| bigtech-21 | Spotify, "Software visualization: challenge accepted" | https://engineering.atspotify.com/2022/07/software-visualization-challenge-accepted |
| cloud-01 | Google Cloud, "Deployment archetypes" | https://docs.cloud.google.com/architecture/deployment-archetypes |
| cloud-02 | Google Cloud, "Regional deployment archetype" | https://docs.cloud.google.com/architecture/deployment-archetypes/regional |
| cloud-03 | Azure Architecture Center, "Virtual network peering" | https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking/virtual-network-peering |
| cloud-04, concepts-01 | Azure Architecture Center, "Strangler fig pattern" | https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig |
| cloud-05 | Azure Architecture Center, "Hub-spoke network topology" | https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/hub-spoke |
| cloud-06 | AWS, "VPC with servers in private subnets and NAT" | https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html |
| cloud-07 | AWS Builders' Library, "Workload isolation using shuffle sharding" | https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/ |
| cloud-08 | AWS Compute Blog, "Extending a serverless event-driven architecture" | https://aws.amazon.com/blogs/compute/extending-a-serverless-event-driven-architecture-to-existing-container-workloads/ |
| cloud-09 | Kubernetes, "Kubernetes components" | https://kubernetes.io/docs/concepts/overview/components/ |
| cloud-10 | Grafana Labs, "Mimir deployment modes" | https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/ |
| cloud-11 | Confluent Developer, "Inside the Apache Kafka broker" | https://developer.confluent.io/courses/architecture/broker/ |
| cloud-12 | HashiCorp, "Vault with integrated storage reference architecture" | https://developer.hashicorp.com/vault/tutorials/day-one-raft/raft-reference-architecture |
| cloud-13 | HashiCorp Validated Designs, "Vault installation guide" | https://developer.hashicorp.com/validated-designs/vault/installation-guide/vms/architecture |
| cloud-14 | PlanetScale, "Neki overview" | https://planetscale.com/docs/neki/overview |
| cloud-15 | Temporal (Tom Wheeler), "What is durable execution" | https://temporal.io/blog/what-is-durable-execution |
| cloud-16 | Temporal (Loren Sands-Ramshaw), "Building reliable distributed systems in Node.js, part 2" | https://temporal.io/blog/building-reliable-distributed-systems-in-node-js-part-2 |
| cloud-17 | Render, "Private network" | https://render.com/docs/private-network |
| cloud-18 | Elastic, "Hot/frozen high availability" | https://www.elastic.co/docs/deploy-manage/reference-architectures/hotfrozen-high-availability |
| cloud-19 | Fly.io, "Connecting to user machines" | https://docs.fly.io/blueprints/connecting-to-user-machines |
| cloud-20 | Supabase, "Realtime architecture" | https://supabase.com/docs/guides/realtime/architecture |
| cloud-21 | Arcentry, "Isometric Mermaid diagrams" | https://arcentry.com/blog/isometric-mermaid-diagrams-with-arcentry/ |
| people-01 | Simon Brown, c4model.com, "System landscape" | https://c4model.com/diagrams/system-landscape |
| people-02 | Simon Brown, c4model.com, "Deployment" | https://c4model.com/diagrams/deployment |
| people-03, fintech-17 | Cartwright, Horn, Lewis on martinfowler.com, "Patterns of legacy displacement" | https://martinfowler.com/articles/patterns-legacy-displacement/ |
| people-05 | Gregor Hohpe, Enterprise Integration Patterns, "Composed messaging example" | https://www.enterpriseintegrationpatterns.com/patterns/messaging/ComposedMessagingExample.html |
| people-06 | Gregor Hohpe, The Architect Elevator, "Show the pirate ship" | https://architectelevator.com/architecture/show-the-pirate-ship/ |
| people-07 | Alex Xu, ByteByteGo, "Money movement when you buy a product" | https://blog.bytebytego.com/p/money-movement-when-you-buy-a-product |
| people-08 | Martin Kleppmann, "How to do distributed locking" | https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html |
| people-09 | Martin Kleppmann, Designing Data-Intensive Applications, chapter maps | https://github.com/Vonng/ddia |
| people-10 | Martin Kleppmann, Designing Data-Intensive Applications, figure 12-1 | https://github.com/Vonng/ddia |
| people-11 | Julia Evans, Wizard Zines, "Life of a DNS query" | https://wizardzines.com/comics/life-of-a-dns-query/ |
| people-12 | Julia Evans, Wizard Zines, "Draw a diagram" | https://wizardzines.com/comics/draw-a-diagram/ |
| people-13 | Sam Newman, "Backends for frontends" | https://samnewman.io/patterns/architectural/bff/ |
| people-14 | Richards and Ford, "Architecture styles worksheet" | https://developertoarchitect.com/resources.html |
| people-15 | Richards and Ford via The Architect Elevator, "Architect's zoom" | https://architectelevator.com/architecture/architects-zoom/ |
| people-16 | arc42 examples (Gernot Starke), HtmlSanityCheck building block view | https://examples.arc42.org/systems/htmlsc/05-building-block-view/ |
| people-17 | DDD Crew, "DDD starter modelling process" | https://github.com/ddd-crew/ddd-starter-modelling-process |
| people-18 | DDD Crew (Nick Tune), "Domain message flow modelling" | https://github.com/ddd-crew/domain-message-flow-modelling |
| people-19 | DDD Crew, "Core domain charts" | https://github.com/ddd-crew/core-domain-charts |
| people-20 | DDD Crew, "EventStorming glossary cheat sheet" | https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet |
| people-21, people-22 | Pavel Paramonov, Hazeflow, "Excalidraw: how to create beautiful diagrams" | https://research.hazeflow.xyz/p/excalidraw-how-to-create-beautiful |
| fintech-01 | European Central Bank, T2-T2S consolidation business description document | https://www.ecb.europa.eu/paym/target/consolidation/profuse/shared/pdf/Business_Description_Document.en.pdf |
| fintech-02 | European Central Bank, CLM user requirements document | https://www.ecb.europa.eu/paym/target/consolidation/profuse/shared/pdf/clm_urd_v3-0.en.pdf |
| fintech-03, fintech-04 | European Payments Council, SCT Inst rulebook | https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2026-09/EPC004-16%202025%20SCT%20Instant%20Rulebook%20v1.2.pdf |
| fintech-05 | Adyen, "Design to duty: Adyen architecture" | https://www.adyen.com/knowledge-hub/design-to-duty-adyen-architecture |
| fintech-06 | Adyen, "Design to duty: Adyen architecture, part 2" | https://www.adyen.com/knowledge-hub/design-to-duty-adyen-architecture-part2 |
| fintech-07 | Adyen, "Sessions API: faster integration" | https://www.adyen.com/knowledge-hub/sessions-api-faster-integration |
| fintech-08 | Stripe, "Online migrations at scale" | https://stripe.com/blog/online-migrations |
| fintech-09 | Monzo, "We built network isolation for 1,500 services" | https://monzo.com/blog/we-built-network-isolation-for-1-500-services |
| fintech-10, fintech-11, fintech-12 | Nubank (Wible, Ferreira), QCon SF 2017 slides | https://qconsf.com/sf2017/system/files/presentation-slides/nubank-architecture-v11.pdf |
| fintech-13, fintech-14 | Zalando, "Parallel run" | https://engineering.zalando.com/posts/2021/11/parallel-run.html |
| fintech-15 | Zalando, "Micro frontends, part 1" | https://engineering.zalando.com/posts/2021/03/micro-frontends-part1.html |
| fintech-16 | OTTO, "Architecture principles" | https://www.otto.de/jobs/en/blogs/techblog/architecture-principles-2013-04-15/ |
| fintech-18 | DB Systel (Christian Fischer), "The C4 test pyramid" | https://speakerdeck.com/cfisch3r/the-c4-test-pyramid-an-architecture-driven-test-approach |
| fintech-19 | DB Systel Tech Stories, "Deine Diagramme sind Legende" | https://techstories.dbsystel.de/blog/2022/2022-10-21-Deine-Diagramme-sind-Legende.html |
| fintech-20 | INNOQ (Gernot Starke), "Perspektivwechsel als Methode" | https://www.innoq.com/de/blog/2026/09/perspektivwechsel-als-methode/ |
| fintech-21 | INNOQ (Johannes Seitz, Michael Plöd), "API-Schnittstellen unabhängiger Systeme" | https://www.innoq.com/de/blog/2024/06/api-schnittstellen-unabhaengige-systeme/ |
| fintech-22 | INNOQ and arc42 (Starke, Wolf), "Architecture Communication Canvas" | https://www.innoq.com/en/blog/2023/07/architecture-communication-canvas/ |
| concepts-02 | Python Developer's Guide, "Status of Python versions" | https://devguide.python.org/versions/ |
| concepts-03 | Kubernetes SIG Scheduling, KEP-624 scheduling framework | https://github.com/kubernetes/enhancements/tree/master/keps/sig-scheduling/624-scheduling-framework |
| concepts-04 | Ink & Switch (Kleppmann et al.), "Local-first software" | https://martin.kleppmann.com/papers/local-first.pdf |
| concepts-05 | Wikipedia, "Wardley map" | https://en.wikipedia.org/wiki/Wardley_map |
| concepts-06 | Amazon (DeCandia et al.), "Dynamo", SOSP 2007 | https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf |
| concepts-07 | Ongaro and Ousterhout, "In search of an understandable consensus algorithm" | https://raft.github.io/raft.pdf |
| concepts-08 | Google (Verma et al.), "Large-scale cluster management at Google with Borg" | https://research.google.com/pubs/archive/43438.pdf |
| concepts-09 | Ben Johnson, "The Secret Lives of Data: Raft" | http://thesecretlivesofdata.com/raft/ |
| concepts-10 | Sam Rose, "Load balancing" | https://samwho.dev/load-balancing/ |
| concepts-11 | Jepsen (Kyle Kingsbury), Maelstrom | https://github.com/jepsen-io/maelstrom |
| concepts-13 | Okta Developer (David Neal), "An illustrated guide to OAuth and OIDC" | https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc |
| concepts-15 | Jepsen, "Consistency models" | https://jepsen.io/consistency/models |
| concepts-16 | DDD Crew, "Context mapping" | https://github.com/ddd-crew/context-mapping |
| concepts-17 | Jeff Patton, "Story mapping" | https://www.jpattonassociates.com/wp-content/uploads/2015/03/story_mapping.pdf |
| concepts-18 | arc42, "Quality tree as mind map" | https://docs.arc42.org/tips/10-3/ |
| concepts-19 | Notion, "Sharding Postgres at Notion" | https://www.notion.com/blog/sharding-postgres-at-notion |
| concepts-21 | Cloudcraft, "ALB vs NLB" | https://blog.cloudcraft.co/alb-vs-nlb-which-aws-load-balancer-fits-your-needs/ |
| concepts-22 | React, "Understanding your UI as a tree" | https://react.dev/learn/understanding-your-ui-as-a-tree |

Other material: the maintainers' internal research notes (the owner's needs, a gap analysis against PlantUML,
Mermaid, D2 and Structurizr of 24.10.2026, and a review of the C4 looks of 25.10.2026), which are not public; ADR 0004,
0005, 0010, 0014, 0015, 0016, 0017, 0021, 0022, 0023 and 0026.
