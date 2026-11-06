# 39. One layout model and one measure for all kinds

Date: 2026-11-05. Status: proposed, following the layout plan the owner accepted on 05.11.2026 (decisions D1 to
D10). Builds on ADR 0015, 0034 and 0035.

## Context

The line check of ADR 0035 says what a presentable picture is, the same for every kind. The searches that choose
between layouts did not use it: the side search of a hub priced an arrangement by its own sum of crossings, bends,
length and width (`layered/score.ts`), the block search of packaged class pictures by another one with other
weights and its own test for lines through classes (`class/layout/routed.ts`), and neither saw what the check
reports besides crossings. What a search minimised and what `dgr check` reported could disagree, and a measure the
stress budgets count, such as bends a straight line could spare, reached no search at all.

## Decision

1. **One measure.** `scoreOf` in `layout-grid` prices a laid out picture by the findings of `lineFindings` and the
   measures of `lineMetrics`: a line through a box or text, ports too close or out of order, crossings, texts near
   foreign lines, a picture longer than three times its height, bends a straight line could spare, bends, lines on
   one another, foreign lines too near, short pieces, length and width. It returns the cost, whether the picture is
   clean (no line through anything, no crossing) and the measures. The hub search and the block search of class
   diagrams use it; their own objectives are gone. `linesOfLaid` reads a layout as the check reads the drawing,
   lines meeting at one of their ends as a bundle (`bundleLines`, the reading of ADR 0035).
2. **The measure is the check's.** `lineMetrics` counts `overlaps` (stretches where two foreign lines lie less than
   a pixel apart), `avoidable` (bends a straight line could have spared, which until now only the stress harness
   counted) and `aspect` (the longer side over the shorter). `dgr check --metrics` prints them, and the stress
   budgets of every kind count `overlaps` and `avoidable`, so neither can come back once it fell (D1: measures, no
   warning code; an author cannot act on them, only the engine).
3. **The plan's weights, and lines weighed by their strength.** The orders of magnitude follow the plan: through
   10 000, ports 3 000, crossing and lines on one another 1 000 (lines on one another hide where each goes, so no
   saving of length may buy them), foreign lines too near and texts near a foreign line 600, jogs and short pieces
   150, a picture longer than three times its height 100, a bend 20 and a bend a straight line could spare 20 more,
   length and width 0.1 per pixel. A bend counts by the weight of its line: a main path (`weight` 2) twice, a soft
   line (`strength: 'soft'`, a dashed dependency or concept link) half. Boxes off the middle of their children and
   children off their one parent cost half a unit per pixel, counted by `lineCentring` on the lines that are not
   soft, so a box keeps its parent's axis before it straightens a secondary line. Until the side search of a hub
   tried two sides at once, these weights stopped it a step early (`hub-fuenf` a crossing more); it now takes, each
   round, the cheapest of every arrangement that moves one extension or two, and the weights choose as well as the
   tie-breaking ones did.
4. **Lines run straight by moving what stands in their way, priced by the measure.** After the placement, a piece
   that bends by more than a slip moves a placeholder chain, else a box, by its whole offset within the room of its
   layer, where until now only slips under 24 pixels were taken out. Such a move stays when fewer pieces bend, no
   link of a chain bends, and the whole picture, drawn, costs no more by `scoreOf`. This is the plan's rule R1 for
   any offset and its R2 in a form that works: a box that the pull of placeholders took away from its real
   neighbour comes back under it after the placement, while the placement keeps the weights that order the layers
   (R2 as a separate pull weight added four hard breaches to the class stress set). The guard on chains keeps the
   straight pipeline of `ueberspringen`, which a move of `Data Marts` toward its readers would bend. The measure
   decides every move: of the moves that fit for a bent piece (its lower box or chain, its upper one, the frame of
   either), the cheapest whole picture stays if it costs less, in rounds until none does, or costs as much and leaves
   the bent lines passing fewer layers, so of two lines only one of which can run straight the longer one does
   (`speichert` in `hexagonal` straight down to `Konto`, `ändert` bent instead); no count of bent pieces
   gates a move first, and slips and frame moves are priced like the rest.
5. **One order per side, and the side a line bends to.** The ends on a side of a box stand in the order of their
   other ends; an end that comes along the trunk of a fan or join holds its place lightly, so it gives way to a
   piece that can run straight. An end on the top of a box keeps a port gap away from the vertical of a line that
   runs beside the layer above, which crosses the whole gap, so the two never lie on one another; a line above its
   layer needs no such room, since its verticals reach only the boxes it enters. A line beside its layer that is no
   neighbours' runs below the layer or above it, chosen in the port stage on the ports of the placement: below, it
   crosses the pieces whose horizontal passes one of its ends and those entering a box between its ends; above, only
   the latter; the side that crosses fewer wins, a tie stays below (the plan's R3; its `apart` for tracks stays out,
   measured at 5 to 13 crossings in `raute`). It is the same for hub pictures, which no longer keep their lines
   below, and costs one more port pass instead of a layout per line.
6. **Leaves are packed, and full layers keep families together** (plan R4, owner decision D3). An edge of the
   layering may be `free`: its ends would rather stand side by side, but a leaf, a node whose one edge is `free`,
   stands beside its node only while that has a place at either side; the smallest leaves take those places, the
   next two stand in the row above the node, the next two in the row below, no row over `maxPerLayer`. Class
   associations are `free`, sized by the area of their boxes, so the enumerations of `aufzaehlungen` stand above
   and below `Ticket` instead of in a row 1,320 px wide. A layer still too full moves the parent of some of its
   nodes down a layer with everything below it, rather than cutting the last members of a family off into a row of
   their own: `Glasbruch` stands with its siblings and `Person` and `Firma` directly under `Partner`. Only where no
   parent's move relieves a layer does `wrap` cut it by count. `LayeredEdge` keeps its ranks; class pictures hand
   the pipeline the graph of their layers (decision 8).
7. **Texts on lines break into lines.** A text wider than the wrap of line texts (`WRAP_EM`, sixteen sizes of its
   font, the wrap C4 got for its channel grid) breaks between its words (`wrapWithin`), never before a token that
   only closes or punctuates (`%`, `]`, `,`), after an operator or between a number and its unit, and inside a
   `[...]` guard only where it must, before `und` first, then before an operator; and a class name that starts
   with a keyword in guillemets, such as `«bind» <K → String, V → Kunde>`, keeps the keyword on a line of its own.
   The pipeline seats such a label as one block beside its line, the gap growing for every line, and hands one text
   per line, keyed `<edge>.label.<n>`, the lines of a text moving together; where it moves them is decision 9.

8. **Frames are blocks of layers, ends of edges and no walls** (plan P5, rule R5, owner decisions D2 and D4).
   `layerGraph` lays out every frame first as a block of layers of its own and then layers it in its parent's level
   like one node as wide as its widest layer (`LayerGraph.frames`, `widths`), the edges of its nodes lifted to it.
   The pipeline takes such a graph as `LayeredSpec.layering` and orders each layer anew; where a frame is the leaf of
   a `free` edge, it lays the picture out with the frame beside its partner, above and below it and keeps the
   cheapest by `scoreOf`, as the side search of a hub does. The block search of class diagrams (`cells.ts`,
   `arrange.ts`, `spread.ts`, `blocks.ts`, `rough-path.ts`) and its estimate are gone: `pakete-quer` lays its five
   packages out in three rows at 2.1 : 1, no line crossing. An edge may name a frame at an end: it runs to the box
   of the frame most linked to the other end, takes its place, port and track there, and is cut at the frame's
   outline, below a head worn as a tab (`LayeredFrame.tab`); the kind's own router of such lines is gone. A line
   that has to pass a frame lying wholly between its ends runs through it, and the order moves the placeholders of a
   whole chain to an end of their frame at once, which single moves cannot reach (`speichert` in `hexagonal`); of
   two such orders that cost the same, the one whose pieces span less across, its boxes side by side, wins, so the
   inner chain of `gedaechtnis` runs straight with the line to its history state beside it. A line entering a frame
   from above near its head moves right past the head with the node it enters, where that costs less than widening
   the frame and its empty strip, and outermost frames close up to the left where the picture then costs less by
   `scoreOf` (`pakete-quer` 1,759 to 1,232 px wide). An
   edge from a box to itself is a loop beside the box, on the side no line beside its layer takes, its gap grown for
   it and its text.

9. **One spot search for texts on lines** (plan P6). The pipeline seats a text beside the start of its line, a
   fan's at its trunk, and hands every seat to the spot search of the channel grid (`signEdges`, through
   `spotLabels`): a text stays at its seat while that is clear of boxes, heads, frames that hold neither end of its
   line, foreign lines, the outlines of frames and the texts set before it, else takes the first clear spot beside
   or on its line, the longest piece first and nearest the middle, wrapped where that helps. A text of a line drawn
   beside its layer or a loop starts over the middle of its longest flat piece; until now the pipeline gave those
   none and the class kind placed them itself. Where a text finds no clear spot, the gap it is seated in grows by its
   height and the picture is drawn once more. The pipeline's own sliding along the verticals (`seatLabel`) and the
   class kind's second search for its names (`names.ts`) are gone.

10. **One contract: the layout graph** (plan P7, section 2.2). `layoutGraph(graph)` lays out a `LayoutGraph`, the
    public contract of `layout-grid`: what stands in a picture and what freedom it has, as data. Its parts and how
    the stages read them:

    | Part | Fields | Read by |
    |---|---|---|
    | `nodes` | id, width, height, shape, `sides` ends may take, cluster | every stage; `sides` by none yet |
    | `edges` | from and to (a node or a frame), `rank` (`down`, `up`, `beside`, `free`), `strength`, `weight`, `bundle`, `label` with its lines, `profile` (`orthogonal`, `loop`), `hidden`, `run`, `room` | layers, order, ports, tracks, routes, texts |
    | `containers` | `frame` (a block of layers, an end of edges), `core` (the core of a hub, its head naming it), `lane` and `part` (laid out as frames for now) | layers, order, placement |
    | `given` | `ranks` and their `order` (`kept` or `free`), `arrangement` (`layers` or `hub`), `perLayer` (layering by `layerGraph`: free ranks, leaves packed, frames as blocks) | layers and order |

    The stages still run on `LayeredSpec`, which `layoutGraph` derives from the graph (`specOf`); `layoutLayered`
    stays public as that adapter for one release. Class and concept pictures hand a layout graph: a class diagram its
    classifiers and diamonds, its packages as frames with their tab, every relation ranked by its kind (association
    `free`, generalization `up`, composition and dependency `down`, the legs of a diamond by their place around it)
    and `perLayer`; a concept picture its items with their area as cluster, links ranked `down`, `up` or `beside`,
    and with `arrange=hub` its core area as a `core` container. Moving both was a pure refactor: all 149 example
    and stress pictures of every kind are byte for byte the same.

    What the next kinds need of the contract, and where it grows: state machines (P8) hand composite states as
    frames and regions as `part`, back transitions as a `rail` profile, entry and exit points through `sides`, and
    need frames that grow around their routes; activity diagrams (P9) hand lanes as `lane`, which the placement must
    keep as hard columns, bars as a shape, decisions with ends at their corners through `sides`, and loops back as
    rails; the adaptive C4 grid (P10) hands its boxes with given cells (a `given` of columns and rows besides
    ranks), its groups as frames, and texts placed by the same spot search. Each such field comes with the stage
    that reads it, so the contract holds nothing that a stage ignores without saying so.

11. **Lanes are hard columns** (plan P9, first step). A container of kind `lane` is no frame any more: the stages
    read it as `LayeredSpec.lanes`, left to right. The order keeps every layer sorted by lane, the order within a
    lane as the order stage chose it; the placement moves each lane, only to the right, until its column starts
    where the one before ends, its boxes `pad` inside; the layout hands the columns as `lanes`, as high as the
    picture. An edge ranked `beside` between two lanes is a hand-over: the layering joins its ends into one layer
    (`handOvers`), the first ones winning and none bringing two nodes of one lane into a layer; a placeholder stands
    in the lane of its line's upper end. Pictures without lanes are layered as before, byte for byte. Activity
    diagrams do not hand a layout graph yet: their bars over the branches, decisions with ends at their corners
    (`sides`, which no stage reads yet), loop channels around lanes, pins, regions and handler bolts have no stage in
    the engine, and moving the kind without them would draw every example worse. Meanwhile the kind's own pipeline
    keeps the measure's hard rules in its stress set: a loop channel moves past a node of another lane it would cut
    (`fuenf-bahnen`), a branch leaves or enters a corner at the corner's height only where that row is free and
    else turns into the gap, where it gets a track (`parallel-entscheidung`: three lines through nodes and two on
    one another traded for two crossings, which the topology of three lanes needs), and a guard a foreign line
    comes near moves to the other side of its line or below the foreign one.

12. **Rails, and state machines on the layout graph** (plan P8). An edge of the profile `rail` that runs up the layers
    or past a layer leaves the order without placeholders and runs on a rail: out of a side of one end, along a
    track beside every box, placeholder, foreign frame and text of a line between its ends, into the same side of
    the other end. It takes a side where both ends stand outermost in their layers and no loop takes that side;
    where none does, the order runs again with both ends pinned to the side they stand nearer, or to the other where
    that side clashes with the pins of a rail before it (an end pinned the other way, or another node of its layer
    pinned the same way), and to neither where both clash, so `gedaechtnis` keeps `Pausiert -> H*` on a rail, and a
    rail whose ends
    still stand inside runs through the layers, one per new order. Rails are placed shortest first, each outside
    the ones before it on its side by the room of their texts where their stretches meet (from the middle of one end
    to the middle of the other, as high as the text at least), so rails one above the other share a track, on the side where it crosses fewer of them; the ends
    on one side of a box stand rising rails first, inner ones higher, then arriving ones, outer ones higher, so no
    end crosses another rail. A rail's text starts beside its track, outside it. A frame holding both ends of a rail
    grows around it and its text, and so does a frame around a text of a line inside it that found no clear spot
    within. `given.last` puts nodes, such as final states, below every other node of their frame. A fan or join
    whose lines carry texts seats each text beside its own branch, not one at the trunk. State machines that flow
    down and have no entry or exit points, regions or bars hand a layout graph: simple vertices as nodes, the
    initial pseudostates first, composite states as frames with their name field and compartment as head,
    transitions as `rail` edges with texts wrapped at the line-text wrap, the lines of pseudostates and final states
    on one trunk, final states `last`; the kind's rails, steps, corners, loops and label placement are not used for
    them. The others stay on the adaptive grid until their fields come (`sides` for points, `part` for regions).

## Consequences

Placeholders cross a frame only where it lies wholly between the ends of their line; a frame beside a line's way is
still gone around where the way round is shorter than a crossing is worth (see the amendment of 06.11.2026 and
`docs/burn-down.md`, the order and length). The leaf search lays a picture out once more for
every place a leaf frame may take, like the hub search; pictures without such frames pay nothing. A layout stage that
wants to compare two of its own variants can now ask the same question the check answers.

## Amendment: the adaptive C4 grid on the channel stage (plan P10)

An adaptive C4 grid takes its places from the author's columns and rows, as a fixed one does; only the widths and
gaps grow to the content. Of the stages, it needs the ports, tracks and texts, not layers, order or coordinates, so
it moved onto the engine piece that already serves fixed grids, the channel stage of ADR 0038, instead of
`layoutGraph` (D8): `GridSpec.channels` with `adaptive` routes through `route/channel/adaptive.ts`, and C4 sets
`channels` for every grid and signs every grid in one way, a text of an adaptive grid staying where `labelEdges`
seats it while that is clear and frames of an adaptive grid growing around the signed texts afterwards; the look option `numbers.seat` (ADR 0023), which only the old way read, is gone. Three things stay the adaptive grid's own: bundles keep their trunks, an edge into a wide box
drops down the gap beside its narrow end (`drops`, #30), and an edge with a `lane` keeps to that column. The path
search of the adaptive router is left as the fallback for a route that still runs through a node, and no picture
needs it.

Four rules came with it, for fixed grids as well. Two routes that end on one side of a box and cross each other
swap their places there when that crosses fewer routes, a straight one moving as a whole (`untangle`). A Z between
two boxes of one column or row takes the gap on the other side when its own lies outside a frame holding both boxes,
and `relieve` no longer moves it out (`keepInside`); like a detour (ADR 0038), `zwei-fluesse` keeps its line and text
in the frame for one crossing more, raised in its budget by hand. A column whose names in the top edge reach past
the middle keeps all its lines on one spine, the column of the narrower box (`look=columns`). And a gap asks room
for lanes only where they run beside each other, and shared trunks count once. The C4 stress set keeps nothing in
`PENDING`; `cloud` in `look=cards` has no line finding, `cloud-columns` stands on three spines.

## Amendment: shared trunks and the price of a detour (owner decisions of 06.11.2026)

**One trunk for the realizations of an interface.** UML draws every generalization and every realization into one
target on one trunk with one triangle. An edge may now ask for that (`GraphEdge.trunk: 'whole'`): its bundle forms one
fan or join at the shared box however the other ends stand, where until now a box between two of them split the
trunk, so `Fahrzeug` in `hierarchie-quer` and `Signierbar` in `schnittstellen` drew two triangles. Class diagrams ask
it for generalizations and realizations. The order counts a piece of the same box whose other end stands between
members of such a trunk as the crossings it makes with the trunk (`trunkSites`), the tracks count a crossing of a
whole trunk once per pair of lines, as the check does, and a whole trunk moves onto a member whose end slipped less
than a jog beside it. Other bundles, such as the links of concept pictures, keep trunks of ends side by side: a bus
that gathers every link of two groups (`raute`) would read "each uses each", a notation no kind has.

**A crossing is worth 600 pixels of detour** (`DETOUR`). Where a line can avoid a crossing only by a detour longer than
that, it crosses. The order stage prices it: after the order of fewest crossings, a refinement prices the estimated
length across of every piece as well, weighted as its crossings are, 10/600 per pixel against 10 a crossing
(`spanPricing`, by layer, by place and by swap as the crossings are, so the search stays incremental). Where that
moves anything, both orders are drawn without the passes that move boxes, and the shorter stays only where its
crossings and length together cost less, a crossing 600 pixels, and it has no more lines on one another and no more
lines through boxes or texts, ports out of order, texts near lines, lines side by side, jogs or short pieces; only the
order that stays is laid out in full (`laidOut`). The order alone would not do: it estimates where boxes stand, and a
refinement trusted on its own gave pictures new crossings and lines through texts. Placeholders between two boxes
drawn beside each other share the room the line between them asks, so a line that crosses there passes clear of the
texts at its ends. `scoreOf` keeps length at 0.1 a pixel: its searches move boxes, where a few pixels of line must not
buy a bend. `beobachter` now crosses `Kursquelle → PreisBeobachter` once instead of running `PushAlarm → AlarmRegel`
round the top, 768 px shorter, a trade its budget names (a crossing and a bend a straight line could spare).

## Amendment: every state machine on the layout graph (plan P8)

The state machines that stayed on the adaptive grid moved as well, with four stages around the layered ones
(`graph/stages.ts`), each a field of the contract and each handing a picture without it back byte for byte:

| Field | Stage | What it does |
|---|---|---|
| `GraphContainer.kind` `part` | `graph/parts.ts` | Parts are laid out as frames, then stretched until the parts of one parent fill it side by side (or stacked), meeting in the middle of the gap between them; the kind draws its dividers where two meet. Orthogonal regions are parts of their state. |
| `GraphNode.shape` `bar` | `graph/bars.ts` | A line out of the bottom or into the top of a bar loses its jog next to the bar, and the bar reaches over all its lines. Where the bar wants to be wider than laid out, the picture is laid out again with the bar that wide, up to three times, so the placement keeps its room. Fork and join are bars. |
| `GraphNode.dock` | `graph/docks.ts`, `dock-place.ts`, `dock-texts.ts` | A node docked on the outline of a frame or box leaves the graph: a line through it, from outside the frame to inside or back, is laid out as one edge and cut where it crosses the outline, the node centred there; a line from outside runs to the host and ends on its outline; the one line of a node with nothing outside runs beside its partner, the node moved out to the frame's side. The texts of cut lines are seated anew at their own part by the spot search, and stay where the stages set them where their part has no room. Entry and exit points are docked nodes. |
| `GraphGiven.direction` `right` | `graph/turn.ts` | The graph is laid out down with the sides of its boxes and texts swapped and turned a quarter to the left, so texts the stages seat right of a line stand above it; the spot search then runs once more on the turned picture with the real texts. |

`layout/grid.ts`, `cells.ts`, `gaps.ts`, `growth.ts`, `scope.ts`, `sides.ts`, `bars.ts`, `points/index.ts`,
`points/pairs.ts`, `points/penalty.ts` and `layout/route` of the kind are gone. The rails of the pipeline counted a
rail placed before as crossed where the new one held it inside its stretch, and not where it lay across the new
one's ends; the count is the right way round now (`fahrgastraum` 488 px of line less, no crossing). The state stress
set keeps nothing in `PENDING`: `parallel-drei` loses its crossing, its line through a text and its text near a
foreign line, `punkte` its text on a point's name and its lines on one another. `quer-rechts` is the named trade:
one bend a straight line could spare, for six fewer bends, a fifth less line and a third less height.

The spot search of the pipeline searches a picture moved right where its lines come nearer to the left edge than its
widest text, not only where they reach past it, so a text may take a spot left of its line and the picture grows
there instead of a gap growing for a text that found none: `lange-ereignisse` is 56 px lower again, as before #59.

## Amendment: every activity diagram on the layout graph (plan P9)

Activity diagrams hand a layout graph (`activity/layout/engine.ts`): actions, objects and signals as boxes, start and
ends as ellipses, fork and join as bars, decisions and merges with `sides`, partitions as `lane` containers,
interruptible and expansion regions as frames, flows ranked down with a hand-over between lanes `beside`, the loops
back with the profile `back`, the bolt of an exception handler beside its first protected action and on a rail into
the other side of the handler from every further one. Hidden edges hold the triggers of a region beside its last
member and the expansion nodes of a region above and below the members no flow ties to them. The kind's own
pipeline (`rank`, `columns`, `order`, `place`, `lane-fit`, `bars`, `ports`, `route`, `channels`, `tracks`,
`extents`) is gone; it keeps its pins, which it docks on the routes the engine laid out, the questions of its
diamonds, the names of its regions and its art. What the stages learnt for it:

| Field or rule | Where | What it does |
|---|---|---|
| `GraphNode.sides` | `layered/docks.ts` | Ends on the top and bottom meet at the middle; of two or more pieces on a side the outermost whose other end lies beyond the box leaves or enters it at the corner, where no box or long line of its layer stands between, and its text stands above that run (`cornerSeat`). Branches at a corner pull lightly where a long line runs out of the tip (`cornerPulls`), and a chain does not slide along a tip. |
| `GraphNode.shape` `bar` | `layered/bar-docks.ts`, `bar-links.ts`, `graph/bars.ts` | The stages see bars: a branch stands straight above or below its other end, the trunk too where the bar may grow so far without passing a box or line, and the bar grows over its ends. A node whose only partner on one side is a bar stands on one vertical with its one partner across the bar in its own lane. In a picture with lanes a bar that runs through a box of its layer moves a layer below it instead of widening, since every lane places its own boxes. |
| `GraphNode.reach` | `finish.ts`, `lanes.ts`, `rail-pass.ts` | Texts the kind sets beside a node keep other boxes, lane borders and rails away. |
| `GraphEdge.profile` `back` | `layered/rank.ts` | A rail only where the edge runs up the layers. |
| lanes | `lane-coords.ts`, `order.ts`, `lanes.ts`, `rail-lanes.ts`, `hand-overs.ts` | Every lane is placed on its own by the links within it; the order prices a node out of its lane's order like a broken frame; a lane is as wide as its head and holds its rails and the texts beside their pieces at either side; a rail runs beside its own lane and past what stands in its way, on the side where it crosses fewer lines; a hand-over whose line would pass a box or long line of a lane between runs a layer down. |

The activity stress set keeps nothing in `PENDING`, and every count falls: crossings 5 to 2 (`entscheidungen-kette`,
`objektfluss`, `schleifen-zurueck` none), lines on one another 2 to 0 and parallels 2 to 0 (`objektfluss`), bends a
straight line could spare 3 to 0. `Genehmigungsfähig?` keeps clear of the lane border in `fuenf-bahnen`, whose loop
now runs inside the lane of its merge, and no branch leaves a corner for a stub into the gap. Expansion nodes are not
docked (`GraphNode.dock`): a line through them carries pins and a keyword stands beside them, which the cut lines of
`placeDocks` do not keep yet (see `docs/burn-down.md`).

## Amendment: C4 grids on the layout graph (one contract)

C4 pictures called the grid's entry points themselves (`placeGrid`, `routeEdges`, `labelEdges`, `signEdges`,
`fitFrames`, `gutterRoom` and `widen`), while every other kind hands a layout graph to `layoutGraph`. They hand one
now. Its boxes are nodes (a circle an `ellipse`, the width it asks of its columns as `width`, the height it asks of its
row as `height`), its groups `frame` containers (the room below as `pad`, above as `top`, the size of the head as
`head`), its edges unranked, and the author's grid goes into `given.cells` (`GraphCells`, `graph/cells.ts`):

| Field | What it carries |
|---|---|
| `cols`, `rows` | The columns and rows of the grid, with widths and least gaps. |
| `cells` | Per node its column and row, the last ones of its area, its slot, its own width and height, `exact`, a caption below it and the stretches of its sides no line docks on. |
| `frames` | Per frame the room at its left and right, a column it reaches over too, where its head stands, its source. |
| `lanes` | The column an edge keeps to. |
| `adaptive` | Columns and gaps grow to the content, as with `layout=adaptive`; else the grid is fixed. |
| `metrics` | The measures of the grid the graph's measures do not give; those give gaps, tracks, port gap, lead, label gap and the top left corner. |
| `texts`, `preferFlat`, `onLine`, `signs` | The texts of the lines and how they stand, and signs: numbers on lines, pins beside them near the head, signs at a corner of a node, inside it where the kind says how far. |

`layoutGraph` lays out a graph with cells in the grid and the channel stage instead of the layered stages
(`graph/grid.ts`): it places, routes and signs, widens the gaps and places again as before (ADR 0038, D2), lets the
frames of an adaptive grid grow around their routes and texts, and returns a `CellLayout` with the grid, the routes,
texts, numbers, pins and corner signs, and what the placement check reads of them. The searches for the spots of signs
at corners and pins beside a line moved from C4 into the library (`graph/corners.ts`). The plugin calls none of the
grid's entry points any more. All C4 examples and stress pictures, each in all five looks, 192 pictures, are byte for
byte the same, and so is every picture of the other kinds.

With one way into the channel stage, three pieces beside it had no user and went: `seatMarks`, the older search that
moved marks off the texts on their line, `placeLabels` with the path of `adaptiveLabels` that kept labels a kind had
placed, and the branch of `labelEdges` that set the texts of a channel grid through `signEdges` a second time.

## Amendment: weak pictures after the move (06.11.2026)

**The sides of rails are searched.** Where rails stand inside the first order, `arrangeRails` pins their ends to the
side they stand nearer, one rail after the other, which can leave a picture worse than another choice would: the
initial state of `gedaechtnis` stood under `Bereit` beside its chain, and the exit point of `auftrag-parallel` sat
left of its state with its line round the picture. `laidOut` now lays such a picture out once more for every other
choice of the rails that stood inside, up to four of them, each to the left, to the right or to neither
(`railChoices`), and keeps the cheapest by `scoreOf`, the first on a tie. `gedaechtnis` runs `abbrechen` on the
right, its initial state straight over its chain, 4 bends, 311 px of line and 105 px of width less, its crossing
kept; `auftrag-parallel` leaves `In Bearbeitung` at the bottom through `Storno` beside `Storniert`, 101 px narrower.

**A second bolt comes in beside the first.** The bolt of a further protected action into a handler ran on a rail
round the handler into its far side (`karten-belasten` 958 px wide). The activity kind now lays such a picture out
with the bolt as a hidden edge, which holds the layers, and the handler tall enough for a pin per bolt below the
middle; it then draws the bolt itself from the side of its action facing the handler, across at half way and up into
that side of the handler, below the first (`sideBolts`), so the exception pins stand below each other as UML draws
them. Where that bolt would pass a box or meet a line, or the handler stands above or below its action, the rail
stays. `karten-belasten` is 836 px wide again, 373 px of line less.

**Expansion nodes slide over their pins.** The pins of an action come after the layout, so the line between an
expansion node and a pin inside its region bent at the pin wherever the pins of a side were spread over the box
(`preise-berechnen`: all four). The activity kind now slides an expansion node along the outline of its region until
that line runs straight, where the node with its name stays clear of every box and text, the line outside takes up the
bend without a slip, and no moved line passes a box or meets another (`slideExpansions`): `Positionen` and `Preise`
run straight, 12 to 8 bends. Docking expansion nodes in the engine stays open (`docs/burn-down.md`).

**Trunks keep their own tracks.** Two whole trunks of one gap (`GraphEdge.trunk`) shared a track wherever they did
not meet, and stood one track apart where they did, so in `schnittstellen` the trunks of `Signierbar` and
`Versioniert` read as one line and four trunks ran 16 px apart through each other's verticals. Two whole trunks now
share a track only where their ends lie twice `APART` apart, and one runs two tracks below the other where they meet
(`assignTracks`): each trunk of `schnittstellen` has its own level, 32 px from the next, for 64 px of height and its
5 crossings kept. `hierarchie-quer`, whose two trunks lie far apart, keeps its one track.
