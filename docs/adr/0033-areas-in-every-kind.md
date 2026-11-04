# 33. Areas: a named part of the picture in its own tone, in every kind

Date: 2026-11-04. Status: accepted by the owner (04.11.2026). Builds on ADR 0004, 0008, 0014 and 0027; amends
ADR 0027 point 4.

## Context

An overview of an extensible architecture has to show at a glance what is the core and which extension each piece
belongs to: the core in black, each extension in a colour of its own. The scope refuses per-element colours, because
a colour without a name says nothing and a file full of colour values cannot be checked. The owner wants the
assignment for every kind, since the question "core or which extension" is asked of a concept picture, a C4
container picture and a class diagram alike, and he wants the way the colour is painted to be a choice of the file,
not one fixed look.

## Decision

1. **The file declares areas, never colours.** `area <id> <label> [tone=]` declares a named part of the picture once;
   elements and frames join it with `area=`. An area without `tone=` stays in ink, as a core does, and still gets its
   legend entry. Tones come from a closed table of eight (`green`, `orange`, `purple`, `red`, `yellow`, `teal`, `pink`,
   `sky`), each an ink of at least 4.5:1 on white for lines and texts and a light tint for fills. They are new names
   besides the `tone=` of the C4 blocks, whose bright greens and oranges are too light for a text.
2. **Lines derive their area.** A line takes its own `area=`, else the coloured area of its first end, else that of
   its second. A line from an extension to the core therefore belongs to the extension, one inside the core to
   nobody, and the author writes nothing twice. Members of a frame take the frame's area unless they name their own.
3. **How elements are painted is the header's choice.** `areas=tint` (default) fills an element lightly in its tone
   and draws the outline in it; `areas=outline` draws outline and name in the tone; `areas=stripe` keeps the element
   in ink and lays a stripe of the tone along the inside of its left edge. The stripe stays inside the outline, so the
   edge the layout measured, and every arrowhead that ends on it, stays where it was on every side. Lines, their
   labels and frames take the ink of their area in all three.
4. **The kernel paints, the kinds only mark.** The table `area` and the attributes `area=`, `areas=` come from `core`,
   like `locale=`; a kind puts them into its tables. The kind marks the groups of its scene with the area's tone and
   whether they are an element or a line. The SVG writer derives the rules from the kind's own style table: inside
   an area, every rule of the table used there is repeated with ink and fill replaced, the markers on its lines get a
   copy in the tone, and the stripe is one filter per tone. A kind needs no role, rule or colour of its own, and a
   picture without areas keeps its bytes.
5. **The kernel checks areas for every kind.** An area nothing joins is K105, more than six coloured areas in one
   picture is K106 at the seventh, two areas of one tone are K107, all warnings. An unknown area is the language's
   L107. The legend names each area in use with a sample painted like its elements, and the description writes one
   sentence per area with its tone and members.

## Consequences

Colour enters every kind with a meaning and a legend entry, as the scope asks, and the paint stays a value of the
file, not of the kind. ADR 0027 point 4 is amended: at most six coloured areas, not four tones, because the owner's
overviews need a core and five or six extensions. Greyscale survival does not hold for the tones themselves; it holds
for the assignment as far as the legend and the description name it, and `stripe` survives best. Every kind takes them:
`concept`, the C4 levels in all five looks, the five UML kinds, `code` and `matrix` (on the heads of its columns and
rows, since a cell belongs to a row and a column at once). Kinds without a legend of their own append one with
`withAreaLegend` of `parts`. What the areas still paint weakly is listed in `docs/burn-down.md`.
