# @diagrist/plugin-architecture

C4 architecture diagrams for Diagrist: the kinds `context`, `container` and `component` (C4 levels 1 to 3). Elements
stand in a named grid, frames group them by responsibility, flows number the steps of a path, and a decision bar
below the picture explains the marks in it.

```dgr
diagram context "Bike rental" locale=en
grid cols people,core,partners
grid rows top,main
person rider "Rider" at people/main
system rental "Bike rental" tech="App, rides, billing" at core/main emph mark=E1
system stations "Stations" at partners/top
flow ride accent
  rider -> rental "unlocks a bike" via=App
edge stations ~> rental "report battery levels" via=MQTT
adr E1 "Who controls the locks?" = "The rental itself" => "Lock logic and firmware stay in one hand."
```

## One set of tables for three levels

The three kinds share their statement tables; a factory builds them per level (`src/grammar/spec.ts`). What differs
is which elements a level allows: `LEVEL_ELEMENTS` in `src/grammar/elements.ts` says it, so a `component` in a
context diagram is an unknown keyword (L101) with the list of what the level offers, where the predecessor read it
and warned (W110). The ends of edges, flows and notes refer to exactly these elements and to groups.

Every statement, argument, attribute and flag has a doc and every statement an example (ADR 0005); `grammarOf`
returns the tables as data. Because the levels share their tables, the plugin has one set of the folders a UML kind
has (`grammar`, `model`, `rules`, `messages`, `layout`, `scene`, `describe`, `texts`), not one per level.

## Looks

| Look | What it draws |
|---|---|
| `plain` (default) | Boxes with icon and second line, shapes for stores, queues, jobs and apps, frames by role, and a legend of what the picture uses. |
| `cards` | White cards with a toned icon circle, stores as circles with their name below, replicas as a stack. No legend. |
| `blocks` | Filled blocks with shadows and large text, as pattern books draw them: tubes, cylinders, layer bands with side titles and tags. A variant with its own measures (ADR 0010), no legend. |
| `paper` | A quiet print look with its own fonts and measures (ADR 0022): names and texts in Inter, technologies of containers and components in JetBrains Mono, warm paper, the own system's zone as an area without border, the `emph` element in yellow, status as a dot, open arrowheads, texts standing on their line, decisions as notes in the right margin and the legend as one sentence below a hairline. |

Each look is one value in `src/looks/` (ADR 0023): measures, fonts by role, paint, and a few named options such as
`nodes`, `groups`, `edgeText` or `legend`, whose values are drawn by one piece of code each. Layout and scene read
the options, never the name of a look, and `look=` with its doc is derived from the registry `src/looks/index.ts`.

Layout runs on `@diagrist/layout-grid` (ADR 0015): the plugin measures its nodes and frames, the library places,
routes and labels them, and with `layout=adaptive` grows frames around their routes. Heads, flow numbers, marks,
layers, notes, the decision bar and the legend are drawn by the plugin and `@diagrist/parts`.

## Changes from the predecessor's syntax

| Before | Now | Why |
|---|---|---|
| `grid cols user radverleih neighbours` | `grid cols user,radverleih,neighbours` | The language has no list of arguments; names separated by commas, as `over=` in sequence diagrams. |
| `decision E1 "Q" = "A" => "C"` | `adr E1 "Q" = "A" => "C"` | ADR 0002 Nr. 3: one keyword, one meaning |
| texts added to the picture in German | `locale=de` in the header for German, default `en` | ADR 0008 Nr. 3 |
| any icon name, checked by a rule (E104) | `icon=` is one of the bundled names | The table lists them; a wrong name gets the list. |

Everything else that the examples use reads as before. Left out for now, each listed in `docs/burn-down.md`: the
tile flow (`flow=` on groups and in the header), framed groups (`style=`, `line=`, `icon=` on `group`), accents and
chips, an own `legend`, end marks of edges (`from-box=` and the like), `form=ellipse`, and the layout checks the
predecessor ran on routes (E204, E206, W203, W206, W207, W492).

## Examples and byte identity

The eight C4 examples under `examples/` are the predecessor's, converted by the rules above; three more
(`*-paper.dgr`) draw `radverleih/kontext`, `radverleih/komponenten` and `architecture/cloud` in `look=paper`, without
findings, and their hashes are in `test/__golden__/paper.sha256`. With `locale=de` all of
them render the predecessor's SVG and PNG byte for byte; `test/__golden__/examples.sha256` holds the predecessor's
SHA-256 of each picture, and three of them are golden files. `look=cards` variants of the five plain examples match
the predecessor too (`test/__golden__/cards.sha256`). The crutches that keep the bytes are listed in
`docs/burn-down.md`.

The kernel's placement check (G400, G402) reports a few labels in the radverleih examples that reach into a frame they
do not belong to. The predecessor did not check that; the pictures show it, and fixing it changes their bytes.

## Icons

53 icons from Lucide (ISC) and Simple Icons (CC0 1.0), as the predecessor bundled them; the licences are in
`ICONS.md`, which ships with the package.

## Diagnostic codes

Errors keep the predecessor's number with the prefix `A`; warnings keep theirs plus 500 (ADR 0011).

<!-- Generated from the rules in src/rules by `pnpm docs:generate`. Do not edit. -->

| Code | Severity | Before | What it checks |
|---|---|---|---|
| A001 | error | E001 | A note names the element it points at with `on`. |
| A007 | error | E007 | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| A008 | error | E008 | Every element has a place in the grid with `at column/row`. |
| A103 | error | E103 | Column and row of `at` are names of the grid. |
| A105 | error | E105 | An edge connects two different elements or groups. |
| A106 | error | E106 | Every column and every row is named once. |
| A107 | error | E107 | An edge does not lead from an element to the group that holds it, or back. |
| A109 | error | E109 | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| A710 | warning | W210 | An edge says what happens: a label or a protocol (`via=`). |
| A801 | warning | W301 | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |

Checks of the predecessor that the language, the tables or the kernel do now:

| Before | Now | |
|---|---|---|
| E101 | L107 | edge ends, `in`, `on`, `mark=` and `style=` name declared statements of the right kind |
| E102 | L108 | ids are unique |
| E104 | L103 | `icon=` is one of the icon names |
| E108, W110 | L101 | each level lists the elements it allows; other keywords are unknown there |
| W302 | L107 | `mark=` refers to an `adr` |
| E202, E205, E303, W205 | G400, G402 | the placement check reports overlapping nodes, frames and labels |

<!-- End of the generated codes. -->
