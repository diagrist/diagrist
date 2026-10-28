# 27. Scope: kinds, styles and layouts

Date: 2026-10-28. Status: proposed. Builds on ADR 0005, 0015, 0016, 0021, 0022 and 0023.

## Context

Diagrist has nine kinds, five looks for C4 and a layout library. The owner's needs name four more diagrams (work
states over time, phases, decisions, requirements) and a deployment view, the gap research lists fifteen things the
other tools have, and a collection of 105 reference diagrams was read for what good architecture pictures share.
Without a stated scope, every reference picture and every competitor feature is an argument for one more kind, one
more look or one more styling knob, and the product drifts toward a drawing tool.

## Decision

1. **Diagrist is a layout engine for agents that draws software structure, behaviour, change and decisions.** A
   file says what exists, how it belongs together, how it relates, what matters and what changed; the engine decides
   every position, size and route. A file never holds a coordinate, a pixel, a colour value, a font name or a free
   shape. `width=` and `height=` in pixels are replaced by sizes from a closed set before the first release.
2. **The catalogue of kinds is closed by a rule, not by a list.** A kind enters when it has rules Diagrist can
   fail and a layout family that needs no hand placement. The catalogue is: UML `sequence`, `usecase`, `activity`,
   `state`, `class` in the look of the specification; C4 `context`, `container`, `component` and the new
   `deployment`; `code`; and the new `phases`, `decision` and `requirements`. `landscape`, `domain`, `flowchart`
   and `er` wait for a real diagram. As-is and to-be, focus, film strips, variant comparisons and zoom-level sheets
   are modes and compositions of these kinds, built on `variant` (ADR 0021), not kinds.
3. **Three looks, and a look never reinterprets the model.** `paper` is proposed as the default of every non-UML kind (pending the owner's decision), `plain`
   and `columns` are opt-in, `cards` and `blocks` receive no new kinds. A look changes fonts, measures, paint and
   values of named options; it never changes which elements exist, where they sit, which flow is accented, what a
   status means or what a label says. A theme changes paint only. UML kinds keep the specification look and take only
   the sheet from `paper`.
4. **Visual principles are checks.** One emphasis per picture, colour only with a legend entry and at most four
   tones, every distinction surviving greyscale, a legend whenever more than one edge kind or any status, tone or
   diff appears, focus by dimming never by removal, a title with kind and status line, names never in capitals, no
   text under 9 px, every label a real `<text>`, no edge through a label or head, frames at most two deep, a warning
   above 1,100 CSS pixels of width, and a finding instead of a picture above about forty ungrouped nodes.
5. **Six layout families, no seventh.** Grid with zones, layered graph and sequence exist; lanes over time, matrix
   and cards, and the composition of finished pictures into strips and sheets are added, each as a library that
   knows no kind (ADR 0015). Deployment is the grid with zones as columns and tiers as rows.
6. **Refused for good:** per-element styling and macros; kinds without rules (pies, radar, sankey, kanban, git
   graphs, mind maps, Wardley maps, timing, wireframes); isometric and icon-forest pictures; comics, simulations and
   animation; a hand-drawn look; hairball graphs; horizontal latency diagrams and calendar Gantt; and any browser,
   network or randomness in the render path.

## Consequences

Requests for a new kind are answered with the rule in point 2, requests for a new look with point 3, and requests
for a knob with point 1. The next work is ordered by the owner's needs: the `flow` extensions and `focus=` on C4,
then `deployment`, `phases`, `decision` and `requirements` with the two missing layout families and the strip,
each on `paper`. `docs/scope.md` carries the catalogue and the checkable rules; the rules become tests and
diagnostic codes as the kinds arrive, and `docs/burn-down.md` lists what is accepted on the way.
