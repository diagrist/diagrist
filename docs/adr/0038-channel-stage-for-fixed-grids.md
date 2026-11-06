# 38. A channel stage for fixed grids: ports, tracks and signs that keep clear

Date: 2026-11-05. Status: accepted by the owner (05.11.2026, plan "C4 to zero line findings", decisions D1 to D5).
Builds on ADR 0015, 0016, 0021, 0034 and 0035. Amended the same day: gutters grow (D2), see the last section.

## Context

C4 places its boxes by hand on a fixed grid, and the grid's router drew its lines from the middle of each side:
straight, L or Z. The kernel's line check (ADR 0035) found about a hundred breaches in the C4 examples, so C4 opted
out of it. Most came from four causes. Two edges between the same boxes, as a diff picture draws a removed and a kept
one, shared a port and a segment, and their texts lay on each other. Ends that moved off a reserved stretch, such as
the name in the top edge of `look=columns`, all moved to one lane, four pixels apart. The Zs of one gap stepped by a
fixed lane gap without knowing each other. And texts and flow numbers stood where the shape put them, on frame
borders, on foreign lines and on each other.

The layered pipeline (ADR 0034) solves the same problems with ports ordered by the other end and tracks per gap, but
it computes its own positions, and C4's places come from the author's grid. Its pieces that take placed rectangles,
the track assigner above all, can serve a fixed grid as well.

## Decision

1. **A fixed grid with `GridSpec.channels` routes through its channels** (`packages/layout-grid/src/route/channel`).
   The shapes and sides stay those of the grid's router, with the head of a frame where its kind draws it
   (`GridGroup.head`) as the obstacle instead of the whole strip above its members. Two boxes that face each other
   across a gap are joined straight where their sides share a free stretch, and a straight edge without one bends as
   a Z over the middle instead of running slanted. Without `channels` nothing changes, so use case diagrams keep
   their bytes.
2. **Ports per side.** Straight edges between the same boxes run twice the port spread apart around the middle of
   what both sides share; a column of reserved sides keeps one spine. The bent ends of a side form a train in the
   order of their other ends, a port spread apart and twice that between edges of the same two boxes, inside the free
   stretches of the side (`GridNode.reserve`, now also the icon circle of a card in a fixed grid) and clear of the
   straight ends. Nested Ls and parallel Zs between the same boxes keep a consistent order on both sides.
3. **Tracks per gap.** The middle pieces of the Zs of one gap get tracks a lane gap apart, centred on the gap, in the
   order `assignTracks` of the layered pipeline finds.
4. **Signs keep clear.** `signEdges` places the flow numbers and then the texts of a channel grid, each clear of
   boxes, captions, heads, frames that hold neither end of its edge or that it only reaches into, foreign lines (the
   kernel's `labelClear` and `clearance`, now exported as `DEFAULT_THRESHOLDS`) and what was placed before. A text
   stays where the old rule put it when that spot is clear; else it takes the first clear spot beside or on one of its
   pieces, longest first and nearest the middle, wrapped where that helps, and two lines between the same boxes get
   their texts outward on their own. When a text finds no spot, its number moves along the line until it does. Signs beside a line, such as
   decision marks, take the first clear spot of those the kind offers (`pins`), before everything else.
5. **A text or number belongs to the frame of either end** that holds it in a channel grid (`placedOf`), not only to
   the frame of both ends: a text beside a line that leaves a frame may stand inside it.

The plan proposed a gutter that grows when its tracks need more room (D2) and a fallback for texts of a removed edge
that leave their place to a kept twin (D3). Neither was needed for the C4 examples; the stress set needed D2 (see the
amendment). Labels beside vertical pieces come from one search for all pieces instead of a second function next
to the layered pipeline's `seatLabel`, which seats one label per edge at its start and knows no frames.

## Consequences

C4 moved onto the stage with a second byte baseline for every C4 picture, and into the kernel's line check with a
`labelNear` of 10, its label gap (D1), after its adaptive router learnt to keep a lead of 24 pixels into a head
(`GridMetrics.lead`); `lineCheck: false` is gone, and no C4 example has a line or placement finding. A kind with a hand-placed grid gets presentable lines without a layout
of its own; the search for spots is a few thousand cheap tests per picture. Gutters did not grow at first, so a crowded gap
could run out of tracks or room for texts; the amendment below lets them grow.

## Amendment: gutters grow, and four smaller rules (D2)

The C4 stress set showed what the examples did not: a long text between the tracks of a gap, a box with more ends on
one side than it holds, a Z that runs through a box on every gap it may take, and texts on two upright twins. So:

1. **Gutters grow.** `signEdges` names the routes whose texts found no clear spot (`crowded`). `gutterRoom` asks, per
   gap between columns and rows, for the room its tracks need, `laneGap` from either border, and for each crowded
   text the growth of the one gap where it needs the least: beside a piece across the gap, or along a piece that runs
   into it, between the piece's end or the gap's border and the outermost track, which stays centred. The kind sets
   the room with `widen` as `GridColumn.gap` (new) and `GridRow.gap` and places again, at most three times, and keeps
   a round only when fewer texts stay crowded. The author's grid stays; only its gaps widen.
2. **A Z that crowds a side moves.** Where the ends of a side ask more than its free stretches hold, straight ends
   centred twice the port spread apart and bent ones beside them, a Z between two boxes of one column or row takes
   the gap on the other side of them, any other Z the gap across, if that runs through nothing and its new sides hold
   it (`relieve`).
3. **A Z blocked on every gap bends three times** (`detour`): out into a gap beside its first box, along it into a
   gap of the other axis beside its second box, and in. Of the free ways, the one that crosses the fewest other
   routes, then the shortest.
4. **No bent end between straight twins**, whose gap belongs to their texts; and texts on two upright straight twins
   in a look whose texts stand on their line may stand beside it, where a text across one would meet the other.
5. **An adaptive grid's texts take part in the search for spots** (`SignOptions.placed`): those its labelling placed
   stay where they are clear, the others move, and like a channel grid's they belong to the frame of either end.

No example changed a byte: their texts found clear spots before. In the stress set the hard findings fell from 45 to
3, in two pictures the burn-down names.

## Amendment: follow-ups from looking at the stress set

1. **Facing ends keep apart.** Two Zs through one gap whose ends on the sides facing each other across it stood at
   one height ran on one another there, or read as one line through the gap (`komponenten-zehn`). The ends of both
   sides are then placed together as one train (`apartFacing`), and the single straight edge between them may move
   off the middle to make room. A side whose bent ends all lead one way and do not fit beside its single straight end
   moves that end too, instead of parting the train around it. Four stress pictures traded an overlap, counted as
   `parallel`, for the crossing it hid; their crossing budgets were raised by hand for that count alone.
2. **A detour stays inside the frames of its boxes.** Of the ways a blocked Z may bend three times, those that keep
   every corner inside the frames holding both boxes come first, then the fewest crossings, then the shortest. In
   `diff-entfernt` a line between two members of one frame ran out of it and around the whole picture to save one
   crossing; it now runs up the gap beside its box for one crossing more, which its budget was raised by.
3. **An empty column takes no room.** A column of a channel grid that no node stands in or reaches over and no frame
   covers is as wide as nothing, so only its gaps stay between its neighbours. `kontext-stern` names two such columns
   to set its neighbours two cells away from the middle; they took 384 pixels of nothing, and the picture shrinks from
   1728 to 1344 pixels wide.
4. **Long texts wrap.** No line of an edge's text that the search for spots places runs wider than 16 sizes of the
   label font, two or three words, where its words allow: a longer name or detail wraps word by word into lines as
   alike as the width allows, a detail first between its parts joined by ` · `. A text kept where the old rule put
   it is kept only within that width too. Gutters grow for the wrapped text, so `lange-texte` shrinks from 1344 to
   1152 pixels wide; no example changed, their texts fit before.

## Amendment (06.11.2026)

`keepInside` keeps a Z between two boxes of a frame inside it, since a frame of a fixed grid does not grow. Now a
round after the widening of `layoutCells` (`graph/grid-outside.ts`) tries every Z it moved in its own gap outside the
frame: the frame grows around the line and its text as an adaptive frame does (`fitFrames`), the gap beyond widens
until the frame keeps `framePad.x` from the next column, at most three times, and the texts are sought again in the
grown frames. The picture keeps this only when it crosses fewer lines, breaks no hard rule of the line check more
often, and its frames cover no more boxes and run through no more texts. `zwei-fluesse` went from 4 to 3 crossings
in four of the five looks and 104 px wider; no other picture changed.

