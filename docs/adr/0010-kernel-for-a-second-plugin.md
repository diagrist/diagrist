# 10. Kernel pieces for a second plugin: markers, icons, themes, placement check

Date: 2026-10-24. Status: accepted. Extends ADR 0008.

## Context

The next kinds are C4 and use case. With only sequence diagrams the kernel knew two arrowheads (an open hook and a
filled triangle), had no icon, no way to restyle a kind from outside, and no check that a layout keeps things apart.
A class or C4 plugin would have needed a kernel change for each of these.

## Decision

1. **Markers are data.** A marker is an outline of points in a 12-unit grid plus the class that paints it
   (`MARKER_SHAPES`: hook, triangle, diamond). A role may put one at either end of a path (`marker`, `markerStart`).
   A hollow triangle is a triangle whose class fills it with the canvas.
2. **`icon` is a scene primitive.** It names a pictogram in the style table (`Styles.icons`, path data in a square)
   and is drawn as a nested `<svg>`. An icon the table lacks is an error (K102), not an empty spot.
3. **Themes enter at `compile`.** `compile(source, { theme })` lays a `Theme` over the drawn kind's style table:
   roles, rules, markers, icons, canvas. A theme repaints; it never changes fonts or sizes, because the layout has
   measured with them. Measures that change geometry are a variant of the kind.
4. **The kernel checks placement.** A layout may hand over what it placed (`Drawing.placed`: key, box or text,
   rectangle, the box it belongs into, source span). The kernel reports overlaps (G400), what leaves the picture
   (G401) and what does not fit into its box (G402), the same way for every kind. They are warnings: the picture
   is still drawn, so the problem can be seen.

## Consequences

A second plugin brings its markers, icons and placed rectangles as data. What depends on the coming `layout-grid`
library is left out on purpose: the grid, edge routing, label placement, boundary frames and filling `placed` from
them. Sequence diagrams report no placed rectangles yet; their layout stays byte-identical (ADR 0008 Nr. 5).
