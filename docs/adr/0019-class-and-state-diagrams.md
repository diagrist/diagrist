# 19. Class and state diagrams: keywords, end symbols, and the data a kind hands to `layout-grid`

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0002, 0003,
0005, 0006, 0015 and 0018.

## Context

The predecessor wrote packages with `group`, read every vertex of a state machine through one statement, and placed
classes and states either by hand (`grid`, `at`) or with a layered placer that asked for the kind in its router: the
sides of a transition, frames of foreign states as obstacles, loops at the freest corner, rows lower than a node,
final states in the last layer. Its class pictures drew triangles 14 and diamonds 16 pixels long as paths.

## Decision

1. **`package` for a UML package**, since `group` is the C4 frame (ADR 0002 Nr. 3). Members of classes, interfaces
   and enumerations stay entries (ADR 0003), the line form of their statement (ADR 0006).
2. **One statement per vertex of a state machine**: `state`, `initial`, `final`, `choice`, `junction`, `history`,
   `fork`, `join`, `terminate`, `entrypoint`, `exitpoint` and `region`, with `go` and `internal` for transitions.
   Each table says what its vertex takes (ADR 0005); `region` keeps the meaning ADR 0018 left free for it.
3. **No grid by hand** in either kind, as in use case diagrams: one way to write a diagram.
4. **End symbols are the kernel's markers in the predecessor's sizes.** Class and state tables set `markerSize` 18
   and give each symbol its outline in pixels of that size. A symbol at the start of a relation sits at the end of a
   short transparent stub, because the PNG renderer neither turns markers with `auto-start-reverse` nor draws them on
   paths without stroke.
5. **What differs between kinds reaches `layout-grid` as data** (ADR 0015): the sides a kind chooses for an edge per
   routing attempt, rectangles to avoid, routes it laid itself, `rowMin`, the `last` nodes of a layering, and labels
   it placed itself (`placeLabels`). The rest stays in `plugin-uml`: rails, steps and loop corners of transitions,
   entry and exit points on borders, regions, frames growing around their points, and the legs, tabs and row gaps
   of class packages.

## Consequences

Sources of the predecessor convert by renaming `group` to `package` in class diagrams and `decision` to `adr`, and
by dropping `grid` and `at`; state sources read as they were. With `locale=de` the converted examples draw the
predecessor's pictures, to the pixel where no package and no italic text is involved. `layout-grid` grows by six
optional fields and one function that no other kind has to set.
