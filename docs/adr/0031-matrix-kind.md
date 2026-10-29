# 31. A kind `matrix`: two declared sets, a scale, and the scale's rules

Date: 2026-10-29. Status: proposed; the owner decides on `docs/concept-and-matrix.md`. Builds on ADR 0004, 0006,
0024, 0027, 0028 and 0030.

## Context

Responsibilities of roles that are not systems, use cases against business objects, requirements against building
blocks and permissions of roles are tables of two sets. ADR 0028 draws responsibilities on C4 elements and leaves a
RACI matrix open, because a matrix loses the picture; in a business concept the roles are people and units, and the
picture is the matrix. Drawn in a word processor such a table is never checked: a task without an accountable or an
object nobody creates goes unnoticed. ADR 0027 lists the family "matrix and cards" as missing and names `decision`
and `requirements` as its users.

## Decision

1. **A kind `matrix` with columns, rows and one scale.** `col` and `row` declare the two sets in their order,
   `group` bands rows or heads columns, and the indented lines below a row are its cells as a line form (ADR 0006):
   the id of a column and one or more values of the scale, such as `station R,A`.
2. **The scale carries the rules.** The plugin brings `raci` (exactly one A and at least one R per row), `crud` (at
   least one C and one R per column), `cover` (every row and column marked), `check` (every cell filled) and `rating`
   (ordered, every cell filled). A file may declare its own with `scale` and `value`, where `row=` and `col=` say how
   often a value must appear and `single` and `full` say how many values a cell holds and whether it may be empty.
   Broken rules of the scale are errors.
3. **Marks survive greyscale.** A value is drawn as its letter in the mono face or as a shape from a closed set
   (full, half, empty, check, cross, dash), never as a colour alone; ordered scales are painted by rank. The legend is
   generated from the scale and states its rules.
4. **A layout library of its own.** `packages/layout-matrix` places heads, wrapped or slanted, row heads, bands of
   groups and equal cells, and knows no kind (ADR 0015). `decision` and `requirements` reuse it.
5. **`rating` is not a decision.** A matrix marks no chosen option and gives no reason; that is `decision`.

## Consequences

The responsibility question of a business concept gets a checked picture, and the layout family that `decision`
and `requirements` wait for is built by the smallest kind that needs it, which is why `matrix` comes first in the
order of work. Rows and columns taken from other files, a traceability matrix built from a `requirements` file and a
C4 file, need `use` across kinds and come later; so does a RACI matrix derived from `does` (ADR 0028), which would
need `raci=` on `does`. More than twelve columns or forty rows is a warning that asks for groups or a split.
