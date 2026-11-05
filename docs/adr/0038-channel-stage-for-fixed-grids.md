# 38. A channel stage for fixed grids: ports, tracks and signs that keep clear

Date: 2026-11-05. Status: accepted by the owner (05.11.2026, plan "C4 to zero line findings", decisions D1 to D5).
Builds on ADR 0015, 0016, 0021, 0034 and 0035.

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
that leave their place to a kept twin (D3). Neither was needed: the C4 examples find their tracks and their spots
without them. Labels beside vertical pieces come from one search for all pieces instead of a second function next
to the layered pipeline's `seatLabel`, which seats one label per edge at its start and knows no frames.

## Consequences

C4 moved onto the stage with a second byte baseline for every C4 picture, and into the kernel's line check with a
`labelNear` of 10, its label gap (D1), after its adaptive router learnt to keep a lead of 24 pixels into a head
(`GridMetrics.lead`); `lineCheck: false` is gone, and no C4 example has a line or placement finding. A kind with a hand-placed grid gets presentable lines without a layout
of its own; the search for spots is a few thousand cheap tests per picture. Gutters do not grow yet, so a crowded gap
can still run out of tracks or room for texts; the search then takes the spot that meets least, and the line check
says so.
