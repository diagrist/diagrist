# 15. `@diagrist/layout-grid`: a grid layout library that knows no kind

Date: 2026-10-24. Status: accepted. Builds on ADR 0009 and 0010.

## Context

C4 and use case diagrams both place boxes in named columns and rows, wrap frames around them, draw lines between
them and set labels where there is room. In the predecessor this code lived in `core/layout` and asked for the kind
in many places: `place.ts` measured classes, states and use cases itself, the router jumped off for use cases, and
`layout()` called itself again with a grown context for frames and packages. That made a cycle of 67 files that no
plugin could take a part of.

## Decision

`packages/layout-grid` is a library, not a hook. A plugin calls it like any other function; the kernel does not know
it exists. It depends on `@diagrist/core` only, for `Rect`, `Point`, `Font`, `textWidth` and `Placed`, and an
architecture test keeps the names of kinds out of its strings.

Everything that differs between kinds arrives as data. The plugin measures its nodes and hands over their own width
and height, what they ask of their columns and rows, an outline (box, ellipse, circle), a caption below them or a
crest on top. It measures its frames' pads and heads, and it phrases the texts of its edges. The library turns that
into geometry and hands back rectangles, routes, label positions and `placed` for the kernel's check.

| Function | What it does |
|---|---|
| `placeGrid` | columns, rows, nodes and frames, fixed or adaptive |
| `routeEdges` | straight, L and Z in a fixed grid; path search with bundles in an adaptive one; straight lines from outline to outline |
| `labelEdges` | name and detail on the longest segment, end boxes and marks, free spots in an adaptive grid |
| `fitFrames` | frames grow around the routes and labels between their own nodes |
| `grow`, `insertRows` | a second run with more pad, empty rows next to a node |
| `occupancy`, `cheapest` | weighed room for free placements such as notes |
| `layerGraph` | layers, order and columns of a graph, cycles broken by direction |
| `placedOf` | what was placed, for the placement check (G400 to G402) |

What used to be recursion is a second run the plugin starts: it reads the routes, decides that a frame needs more
room, calls `grow` and places again, with its own limit. Head growth of framed groups, title heads, legends, notes,
flow numbers and marks stay in the plugins and in `parts`. So do the automatic use case grid and the probe layouts.

The algorithms keep the predecessor's order of floating point steps, so the same input gives the same numbers. A
throwaway comparison fed the predecessor's measures for fifteen C4 examples (among them
`architecture/cloud` and the pattern examples) into both and found no difference in any column, row, node, frame,
route or label; layering and straight lines matched for the class and use case examples.

## Consequences

C4 and use case dock onto one tested library instead of copying the predecessor's layout, and a later class or state
plugin can use the layering. The API is wider than a hook would be, and every field on `GridNode` is public contract.
Pieces only one predecessor kind needed are left out until a plugin asks for them; `docs/burn-down.md` lists them.
