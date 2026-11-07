# 8. Kernel scene, styling, codes and the first plugin

Date: 2026-10-24. Status: accepted.

## Context

In the predecessor, `core` held all diagram families: about 6 % of its 31,300 lines were kernel. It branched on the
diagram kind in many places, kept colours in five places and wrote diagnostics as German free text.

## Decision

1. **The scene carries roles, not styles.** Primitives name what they are (`lifeline`, `message`, `fragment`);
   each plugin ships a table from role to style, and texts carry a font role. Looks and corporate themes change the
   tables, never the code.
2. **Diagnostic codes are prefixed per plugin** and keep their predecessor number, e.g. `U403` in `plugin-uml`.
   Message texts live in the catalogue (ADR 0004), with span and values.
3. **Image texts follow `locale`** in the header, default `en`. Comparisons with the predecessor run with `locale=de`.
4. **Sequence fragments are nested by indentation** (`alt`, `loop`, `opt` and their branches), not closed with `end`.
   The plugin flattens them into an event list internally.
5. **Byte-identical first, then clean up.** Until sequence diagrams are complete, the new code renders the same bytes
   as the predecessor. Deliberate changes (rounding, spelling) follow afterwards, each with a new reference and a reason.
6. **Shared pieces wait for a second user.** Title header and decision bar start in `plugin-uml` and move to a library
   when a second plugin needs them.
7. **Order:** minimal kernel, then `plugin-uml` with sequence diagrams as the first end-to-end kind.

## Consequences

The kernel stays small and knows no diagram kind. The 17 sequence examples change syntax for fragments; their
rendered output must not.

## Amendment: the second baseline (2026-11-07)

Nr. 5 is done for every plugin. A picture's stylesheet holds only the rules of the classes its shapes, texts and
markers use, and `<defs>` only the markers its lines end in; the classes of markers count as used, so no rule is
written `always` any more. The root class is `diagrist`, which an inline SVG needs to paint only itself. Every
number of the SVG, path data and radii included, is rounded to one decimal, so the layouts no longer keep the
predecessor's order of floating point steps. The texts of a sequence message stand in `label-<k>`, and the base
rules of the standard look are built from the measures of a variant, which retired the restated rules of C4 blocks.
Of 180 pictures (every example and stress picture, C4 also in `look=cards`) 143 stayed pixel for pixel; 36 differ
by anti-aliasing within one pixel, from the rounding; the arrowheads of code diagrams, whose rule had never been
written, are drawn as the thin open hooks they were meant to be. The SVGs are 18 % smaller.
