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
