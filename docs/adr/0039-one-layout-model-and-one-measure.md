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
   either), the cheapest whole picture stays if it costs less, in rounds until none does; no count of bent pieces
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
   parent's move relieves a layer does `wrap` cut it by count. `LayeredEdge` keeps its ranks; class pictures reach
   the pipeline with the layers this gives.

## Consequences

The block search (`spread.ts`) still estimates lines in half columns before anything is laid out; it has no lines
to measure and goes with the blocks (plan P5). Raising the tie-breaking weights belongs to the changes that make
coordinates and ports leave no jogs and overlaps behind (plan P2, P3), each with the stress budgets to show what it
buys. A layout stage that wants to compare two of its own variants can now ask the same question the check answers.
