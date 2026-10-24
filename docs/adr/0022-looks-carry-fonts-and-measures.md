# 22. Looks carry their fonts and measures; themes stay paint

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Extends ADR 0010 Nr. 3 and
ADR 0013.

## Context

Every picture was set in JetBrains Mono, measured from one table. A quieter look for C4 (`look=paper`) needs a
proportional face for names and texts and keeps the monospace face for technologies, and further looks (a panel, a
column and an instrument look) will want their own faces and sizes. ADR 0010 already said that a theme only
repaints, because the layout has measured before the theme is laid over the style table, and that measures which
change geometry make a variant of the kind. What was missing is how such a variant names its fonts, how the kernel
measures them, and how a rasterizer gets them.

## Decision

A font names its typeface. `Font` gains `family`, one of the bundled typefaces (`jetbrains-mono`, `inter`), and
`letterSpacing` in pixels; without them it is JetBrains Mono as before, so the standard look writes the same
stylesheet. `textWidth` measures each typeface from its own table, generated from the bundled files as ADR 0013
describes. A proportional face has advances for thousands of code points, so its table is packed into short strings
(`PackedFace`), one generated file per weight. Inter 4.1 Regular and SemiBold are bundled with their licence and
provenance in `packages/core/fonts/FONTS.md`; PNG export hands them to resvg, and every other family still falls
back to JetBrains Mono.

The table sums advances without kerning. A picture in a proportional face therefore writes `font-kerning: none` on
its root (`Styles.fontKerning`), and resvg and browsers set it as wide as it was measured; a test renders kerned
pairs and compares. `textRule` writes the family stack and the letter spacing of a font, so a text class says the
face it was measured in.

A look is the set of three things that belong together: the measures of the kind (grid, pads, sizes), the fonts by
role that layout measures with, and the style table whose text rules set the same fonts. In C4 the measures carry
the fonts (`Metrics.fonts`), every measuring call names a font role instead of a size, and `stylesOf(look)` builds
the table from those fonts. The second line of a box has two roles, a description on people, systems and nodes and
a technology on containers and components, which the standard look sets alike and paper sets apart.

Fonts stay out of themes. A theme arrives at `compile` after the layout has measured, so a theme that changed a face
or a size would draw text wider or narrower than the room it was given, which is exactly the collision the placement
check exists to prevent, without the check seeing it. A corporate design that needs its own face is a look of the
kind, with a typeface bundled and measured like Inter.

## Consequences

A new look is a metrics entry with its fonts, a style table and the scene pieces it draws differently; `paper` is
the first and shows the path. A new face is a font file, its licence and a generated table, and it adds to the size
of the kernel package (Inter's two faces add about 830 kB of font files and 22 kB of tables). Inter's contextual
alternates, which turn `->` into an arrow, cannot be switched off in resvg, so such texts take a little less room
than measured; `docs/burn-down.md` lists it. `look=plain` keeps its bytes, and whether `paper` becomes the default
of C4 is decided separately.

`look=panel` is the second look and adds Geist and Geist Mono (about 400 kB of font files and 11 kB of tables).
It also needs soft shadows, which a class cannot draw alone: a style table may now carry `shadows`, filters of
`feDropShadow` that its rules name with `filter: url(#f-<id>)`. They are paint like markers, so they belong to the
style table and a theme keeps them. Each filter costs the rasterizer time in proportion to its region, so the
region grows a shape only as far as its shadows reach from the smallest shape it falls on, and a look gives
shadows only to what stands in front.
