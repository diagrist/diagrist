# 16. C4 in `plugin-architecture`: one set of tables, roles for the legend rule, icons with their licences

Date: 2026-10-24. Status: accepted. Builds on ADR 0008, 0010, 0014 and 0015.

## Context

C4 is the second plugin. Its three levels (`context`, `container`, `component`) share almost every statement and
differ in the elements they allow; the predecessor read any element everywhere and warned (W110). Its pictures
painted two things inline that a role cannot express, the thin legend separator and the icons, and its icons came
from two collections with their own licences.

## Decision

1. **One set of tables, built per level.** A factory builds the statement tables for a level; `LEVEL_ELEMENTS` says
   which element keywords it has, and the ends of edges, flows and notes refer to exactly those and to groups. An
   element of another level is an unknown keyword (L101) that lists what the level offers. The three kinds share
   one model, one set of rules (codes `A`, ADR 0011) and one layout.
2. **The legend separator is a role.** Following ADR 0008 Nr. 1 the scene names it `legendRule`; the style table
   decides how it looks. The target is a class of its own, `legend-rule`, thin and grey. Until the clean-up with a
   second baseline the role carries the predecessor's inline paint (`RoleStyle.paint`), so the pictures keep their
   bytes; `docs/burn-down.md` lists it.
3. **Icons go through the kernel's icon primitive** (ADR 0010) with the 53 icons the predecessor bundled: Lucide
   (ISC, with Feather portions under MIT) drawn with lines, Simple Icons (CC0 1.0) filled. The licences ship in the
   package (`ICONS.md`); `icon=` accepts exactly these names. For the bytes an icon keeps the predecessor's markup
   and form (`Icon.markup`), a crutch on the burn-down list.
4. **Looks**: `plain` with a legend, `cards`, and `blocks` as a variant with its own measures.
5. **Byte-identical first** (ADR 0008 Nr. 5): with `locale=de` the eight C4 examples and five `look=cards` variants
   render the predecessor's SVG and PNG byte for byte; their hashes are tests.

## Consequences

A new level or element is a table change. Kinds may share rule objects, so `checkPlugin` counts a shared rule once.
The kernel gained two optional fields for the bytes (`RoleStyle.paint`, `Icon.markup`) that the clean-up removes.
