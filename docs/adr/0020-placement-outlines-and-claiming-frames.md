# 20. Placement check: outlines, frames that claim their content, and G403 in the kernel

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Extends ADR 0010 Nr. 4 and
builds on ADR 0011.

## Context

The placement check of ADR 0010 knew rectangles only. A use case reported its ellipse as the rectangle inscribed in
it, so a text in the curve went unseen. Entry and exit points sit half outside their state, so state machines left
them out, together with the names beside every pseudostate. Activity diagrams left out lanes, pins and expansion
nodes, and reported the frame of an interruptible or expansion region as a plain box: a node that the layering put
between members of a region, inside its frame, was a G400 warning. The predecessor reported it as E439, an error,
because the picture then says that the node belongs to the region while the source says it does not.

## Decision

`Placed` stays data and the kernel stays blind to kinds. It grows by two optional fields and two kinds. `outline`
says what is drawn in the rectangle, the rectangle itself or the ellipse inscribed in it; overlap and containment
count the ellipse exactly against rectangles and point by point against another ellipse. `on` names the box a thing
sits on the border of, such as an entry point on its state or an expansion node on its region: it may overlap that
box and need not lie inside it. Kind `area` is background such as a lane, which things lie in and cross freely, so it
meets only other areas and what is `within` it. Kind `frame` is a frame that claims what lies in it.

A box or frame reaching into a foreign `frame` is G403, an error. The code belongs to the kernel, not to the plugin.
The check is the same geometry over `Placed` as G400 to G402, which already took the place of the predecessor's
E202, E205 and E303; the plugin only says which of its frames claim their content, as data. A plugin code U439 would
have needed either a rule over the layout, which rules do not see, or a code carried on `Placed` from the layout,
which ADR 0011 forbids outside rules and catalogues. The severity follows from the kind of the frame, so no kind
can make an overlap an error without saying that its frame means membership.

Activity diagrams report lanes as areas with their names, region frames as frames, nodes and pins in their
innermost region or else their lane, bars of fork and join without a lane because they stretch over their branches,
and expansion nodes on their frame. State machines report circles with their outline, entry and exit points on
their state, and the names beside pseudostates. Lines are still left out: they cross lanes and frames by design,
and reporting them needs an outline of its own (`docs/burn-down.md`).

## Consequences

The 69 examples render the same bytes and gain no finding. A region around a foreign node fails the build again,
as with the predecessor. Use cases and C4 circles are checked by their real outline, which can only remove false
findings near the curve and add true ones inside it.
