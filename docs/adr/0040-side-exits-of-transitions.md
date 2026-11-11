# 40. Side exits of transitions: `side=` on `go`, a rank beside, and an order the searches keep

Date: 2026-11-11. Status: proposed. Builds on ADR 0019, 0034 and 0039; follows the boundary of `docs/scope.md`.

## Context

A state machine flows down its layers. A state that only leads to the end, such as `Abgelehnt` after `Wartet auf
Bestätigung`, stood in the layer below its source like every other target, so the line into it left the bottom of
the source, bent twice and entered from above. The owner wanted that line to leave the source at the middle of its
side and run straight into the middle of the target, without turning the whole picture with `direction=right`.

Two ways were tried. A rule of the layout alone, which lets every such branch end join its source's layer where
`scoreOf` prices the picture lower, gave both branch ends of the example a place beside the source when moved
together, but not when moved one at a time, and put the one the owner meant on the left: the measure decides which
exit is cheaper, not which one the author means. Without the room its text needs, the measure preferred the old
picture. A statement that says which transition leaves sideways and to which side is the reliable way, and a side is
no coordinate: the use case kind already places an actor with `side=left|right`.

## Decision

1. **`go` takes `side=left|right|above|below`.** The transition leaves `from` at that side, in the middle, and runs
   straight into `to`, which stands beside `from` in its layer. `left` and `right` lie across a flow down, `above`
   and `below` across `direction=right`; a side along the flow has no effect, and U962 says so. Without `side=` the
   engine chooses, as before.
2. **The kind hands such a transition as an edge ranked `beside`** with `first` for the side and the `room` of its
   text, so its words stand on one line between the two boxes.
3. **The layering honours `beside` between two ranked nodes.** Until now an edge of rank 0 only placed a node that
   had no ranked edge. The lower end of such an edge now moves up into the layer of the upper one where every ranked
   edge into it comes from above that layer (`joinBeside` in `layers/assign.ts`); its edges out still point down.
   Where an edge into it comes from that layer or below, it stays.
4. **The searches keep the order an edge beside asks for.** The order stage already priced a pair the wrong way
   round like a broken frame, but the search over the sides of rails (`laidOut`) and the shorter and hanging orders
   compared pictures by `scoreOf` alone and could turn the pair. They now keep only the arrangements that break the
   fewest such pairs, so an author's side holds even where the other side would spare a crossing; the crossing is
   then reported (G410).

## Consequences

`lebenszyklus` with `go wartet -> abgelehnt on="Kunde lehnt ab" side=right` draws the line out of the middle of the
right side of `Wartet auf Bestätigung` straight into the middle of `Abgelehnt`, no finding, 38 px narrower; its two
bends moved to the line from `Abgelehnt` into the final state, so the count stays at 10 and the lines grow by 264 px.
No example and no golden picture of any kind changes, since no edge beside had both ends ranked and no search had
turned a pair before. Whether a branch end should stand beside its source without `side=`, chosen by the measure, is
left open; it needs a search that moves two branch ends at once and a measure that sees the calmer picture.
