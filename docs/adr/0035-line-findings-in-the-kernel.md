# 35. Line findings in the kernel: `dgr check` reports bad lines

Date: 2026-11-04. Status: accepted by the owner (04.11.2026). Builds on ADR 0010, 0020 and 0034. Amended by ADR 0038:
C4 takes part with a `labelNear` of 10. Amended by ADR 0039: `lineMetrics` counts lines on one another, avoidable
bends and the aspect, and the searches of the layout price by the same findings and measures.

## Context

The line check of ADR 0034 (crossings, lines through boxes, bends, short runs before heads, jogs, crowded or
interleaved ports, ambiguous texts) lived in `layout-grid` and ran only in the tests of the plugins. Whoever wrote
a diagram, a person or an agent, saw none of it: `dgr check` said "no findings" for a picture whose lines crossed
three times. An agent that works the loop "check until nothing is reported" therefore had no way to notice a bad
picture short of looking at the PNG. The check reads nothing but what every kind already hands the kernel, the
anchors and the placed rectangles, so it is no layout matter.

## Decision

1. **The line check is part of the kernel.** `lineFindings`, `lineMetrics` and `linesOfDrawing` move from
   `layout-grid` to `core` (`src/lines`), with the segment tests they use (`segmentMeetsRect`,
   `segmentsIntersect`, `segmentMeetsEllipse`), which `core` now exports for the layout libraries and plugins.
2. **Each hard rule is a kernel warning**, one code per rule in the order of `LINE_RULES`: G410 crossing, G411
   through, G412 bends, G413 lead, G414 tail, G415 jog, G416 parallel, G417 ports, G418 label. The message names
   the lines by their ends (`` `a` → `b` ``), the measure and the limit a presentable picture allows, and what an
   author can change: another order of the declarations, a split picture, a shorter text. They are warnings, so
   the picture is still drawn and the overlap can be seen, as with G400. A crossing is a finding only in a picture
   of at most `crossingsUpTo` lines (15, rule Q1 of the layout plan: hard up to 15 edges, soft beyond); in a denser
   one it is a measure, which `--metrics`, the stress budgets and the price of the searches count.
3. **A finding points at the line that declares the edge.** `EdgeAnchor.span` is optional and additive; concept,
   class, state, activity, use case and code fill it. Without it the finding stands at the first line.
4. **A kind takes part unless it says otherwise.** `Kind.lineCheck` is `false` for a kind whose layout does not meet
   the rules yet, or thresholds of its own for a look drawn smaller or larger. C4 opts out while it keeps the
   grid's router; every other kind meets the rules with the standard thresholds on all its examples.
5. **Every drawn picture carries its measures.** `DrawnPicture.metrics` holds `lineMetrics`, and
   `dgr check --metrics` prints them per picture, in text and in `--json`, so two versions of a diagram can be
   compared by numbers.
6. **Two readings got fairer on the way.** Q8 reports ports out of order only when the two lines cross where one of
   them leaves or enters the box; nested rails, whose ends stand in opposite orders but never cross, pass. Lines
   that meet at one of their ends are read as a bundle whichever end is the start, since pictures in columns draw
   a line against its reading.

## Consequences

`dgr check` is now the place where a bad picture shows: an agent can iterate on a diagram until neither the
grammar, the rules, the placement nor the lines report anything, and then look at the PNG. The tests of the plugins
keep their own assertions over the examples, which give a finer message when a layout change breaks a rule.
The three allowed findings of `fahrgastraum` and the one of `kredit` are gone, so no example of a kind that takes
part has a line finding. C4 still has about a hundred (burn-down), which the route checks of its predecessor would
report once it moves to the channel router or gets them back.
