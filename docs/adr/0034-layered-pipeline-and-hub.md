# 34. A layered pipeline with a channel router, and hub pictures

Date: 2026-11-04. Status: accepted by the owner (04.11.2026, plan "Layout-Plan für Diagrist", steps L1 to L7).
Builds on ADR 0015, 0027, 0030 and 0033; amends the row "Layered graph" of the layout families in `docs/scope.md`.

## Context

Layered pictures were laid out in two unrelated steps. `layerGraph` gave layers and positions in half columns,
the grid placed the boxes, and the adaptive router routed every line on its own with a search that knew nothing
about layers. The owner judged none of the arrangements of a core-and-extensions picture presentable: small jogs
before the heads, detours around the whole picture, lines sharing a track, a word on every line, labels between two
lines. The causes were structural: positions without widths, no placeholders for long edges, no notion of a fan of
edges, no tracks in the gaps. A core with its extensions also has a crossing or a detour in every strict
layering, whatever the order and the router.

## Decision

1. **One layered pipeline in `layout-grid` (`src/layered`), kind-free.** Layers by longest path with lone sources
   moved next to their child and a placeholder for every layer a long edge crosses; the thorough order of
   `layers`, with a cost that weighs crossings by the weights of both pieces and keeps clusters together where that
   costs no crossing; positions with real widths by weighted isotone regression, parents over the middle of their
   children and a child exactly below its strongest parent; edges of one bundle as a fan out of a box or a join
   into it; ports ordered by the other end; one track per horizontal piece of a gap in the order that loses the
   fewest crossings, the gap as high as its tracks, with a straight run of two arrowheads into every head; one
   label per line or trunk beside the start of its own line. Kinds opt in with `layoutLayered`; `orderLayers`
   takes its cost as an option and is unchanged without it, so kinds that do not opt in keep their bytes.
2. **Hub pictures are an arrangement of the layered family, not a seventh family.** The core is laid out alone,
   every other cluster docks at a side of it (above, below, or left and right outside its widest layer) and its
   lines point into the core. The sides start from a guess and every extension tries the others; a change stays
   when the whole picture costs less, crossings first. The core stands in a light frame headed by its name, an
   exception to ADR 0033, where areas are tones only.
3. **`concept` chooses its arrangement by a rule.** Columns when at least 80 % of the relations join items of
   different types (a story across types), a hub when a core area extends two areas or more, else layers;
   `arrange=` asks for one. The core is the area marked `core`, else the one area without a tone. With one or two
   links in a picture their words stand in the legend only, never on every line.
4. **Lines are checked.** `lineFindings` (`src/check`) reports crossings, lines through boxes and labels, bends,
   short runs before heads and after starts, small jogs, parallel lines too close, ports out of order or too close,
   and ambiguous labels; `lineMetrics` measures crossings, bends, length and the centring of parents. Every plugin
   records them per example in `layout-metrics.json`; a kind on the pipeline asserts that its examples break no
   hard rule.

## Consequences

`erweiterungen` went from 31 bends, 3,056 px of lines and 25 breaches of the hard rules to 4 bends, 999 px and
none, without a crossing; `rollen` and `begriffe` lost their jogs. Concept pictures in layers changed on purpose;
pictures in columns keep the grid's router. Class diagrams take the pipeline with their layers and order as given,
packages as frames and end symbols with their own run (L5): every example breaks no hard rule, from 26 findings.
State machines route forward transitions through its ports and tracks and keep their rails and loops (L6): from 76
findings to the three nested rails of `fahrgastraum`. Activity diagrams share its track assigner (L7): from 7
findings to none. Every kind on the pipeline asserts the line check over its examples; C4 keeps its grid. The search of the hub runs the
pipeline a few dozen times; pictures are small (under forty boxes), so a hub takes well under a second.
