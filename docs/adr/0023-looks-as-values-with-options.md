# 23. A look is a value with named options

Date: 2026-10-25. Status: accepted, decided by Claude in Noel's absence, reversible. Extends ADR 0022, builds on
ADR 0004, 0014 and 0015.

## Context

ADR 0022 made measures, fonts by role and the style table of a look one thing. What a look draws differently
stayed code: `look=paper` added eight `model.look === 'paper'` conditions to the shared layout, its own sheet,
legend and header, a correction of flow numbers after the layout, and a third way to build the stylesheet beside
plain's and blocks'. Three further looks were drafted on branches (columns, instrument, panel); each added its own
conditions to the same lines, its own sheet, legend, wrap function and post-layout correction, and one left the
shared layout for a scene of its own. Every pair of those branches conflicted on the same four files. The kinds to
come (phases, requirements, decision comparison, deployment) could reuse none of it, because every piece was keyed
to the C4 model and to the name of a look.

## Decision

1. **A look is a value.** `Look` in `src/looks/look.ts` holds a one-line doc, measures, fonts by role, paint and
   options. Each look is one file of `src/looks/` exporting one value. The layout and the scene read
   `look.options`, `look.metrics` and `look.fonts`, never the look's name: `lookOf(model)` in the registry is the
   one place that reads `model.look`, besides where the model is built.
2. **Options are named choices, every value drawn by one piece of code.** Header (`inline`, `kicker`), node family
   (`box`, `card`, `block`), person (`figure`, `bust`), status (`word`, `dot`), groups (form `frame`, `area`,
   `panel`; head `corner`, `onLine`, `centre`), edge text (place `beside`, `onLine`; `flat`; ground `halo`,
   `gap`), numbers (seat `free`, `seated`; form `plate`, `disc`), marks (`aside`, `inside`), layers (`boxes`,
   `bracket`), legend (`strip`, `sentence`, `none`) and decisions (`bar`, `notes`). The layout and the scene
   dispatch through small tables keyed by these values, and the scene is grouped by them
   (`scene/{nodes,groups,labels}`, `header.ts`, `person.ts`, `layers.ts`). A union holds only values that are
   built; a look that needs another adds it with its code. A thing is an option when two looks pick different
   values of it. What differs only in measure is a metric (corner radii, the shift of texts in a cylinder); what
   differs only in colour is paint, including what a look does not mute. Capitals are a property of a font role
   (`LookFont.caps`), measured and drawn alike.
3. **Paint is laid over the standard look one way.** `stylesOf(look)` builds every look's table alike: the
   standard look with the C4 roles and rules, the look's roles over them, its rules replacing standard ones by name
   in place and appending the rest, the root in the family and size of one font role, and canvas and arrowheads
   where the look sets them. `usedOnly` lets a look write only the rules a picture uses. The rules of a diff picture
   (ADR 0021) are a required part of paint (`changes`), so every look paints added, removed and changed elements in
   its own inks; a test holds each look's set against the standard one.
4. **The registry is the source.** `LOOKS` in `src/looks/index.ts` lists the values in the order of the docs;
   the values `look=` allows, its doc, the default, a render test of every example in every look and the
   architecture rule that forbids reading a look's name elsewhere derive from it (ADR 0004). `LOOK_METRICS` and
   the per-look branches of `stylesOf` are gone.
5. **Pieces drawn alike move to the libraries next, with plain parameters.** Sheet header in both forms, wrap,
   decision notes, the sentence legend and the sheet arithmetic go to `parts`; seated flow numbers (both
   directions, reported as placed), texts on a line that keep clear of given rectangles, and a reserved docking
   stretch on `GridNode` go to `layout-grid`. They take fonts and rectangles, never a model or a look, so a kind
   that is not C4 can draw them. In this step they stay in the plugin under the names of what they are
   (`layout/sheet.ts`, `seat.ts`, `sentence.ts`, `scene/labels/gap.ts`).
6. **Font tables stay in the kernel, font files may leave it.** `textWidth` stays pure and measures from the bundled
   tables; the TrueType files can move to `@diagrist/fonts-<family>` packages, which PNG export resolves for the
   families a picture names, in a pull request of their own.

## Consequences

A new look is one file of values and its hashes; a new option value is one piece of code every look may pick. The
first step changed no byte: every example, every diff picture and two extra pictures that use what the examples do
not, in all four looks, render the same SVG and PNG as before. `cards` and `blocks` stop being special cases of
`plain` and are entries like any other. The option set is drawn from the looks of one kind and may not fit the
next; the shared pieces will not depend on it, so a second kind defines its own options over the same pieces, and
the type moves to `parts` only if two kinds want the same one. Paper keeps two quirks as data rather than options:
an added core stays yellow (`boxEmphAdded` is painted as the core), and shared or deprecated boxes are painted in
the ink of the others.
