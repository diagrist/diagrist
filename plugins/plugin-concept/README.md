# @diagrist/plugin-concept

Pictures of a business concept for Diagrist, so far the kind `matrix`. A matrix has columns, rows and one scale, and
the scale carries rules that a table in a word processor never checks: `raci` asks every row for exactly one A and
at least one R, `crud` asks every column for a C and an R, so every business object is created and read somewhere,
and `cover` asks every row and every column for a mark, so a requirement no building block meets shows up.

```dgr
diagram matrix "Rental: responsibilities" scale=raci locale=en
col customer "Customer"
col station "Station team"
col service "Customer service"
row rent "Rent a bike"
  customer R
  station A
row damage "Settle a damage"
  station R,A
  service C
```

Columns stand in the order written, rows below each other; a row's cells are its indented lines, each the id of a
column and its values. `group` bands rows that belong together, and `note` writes numbered notes below the table,
with the number at a head when the note is `on` a row or column. Letters are set bold in the mono face of the
standard look, coverage is drawn as full and half discs, and the legend lists the values in use with their rules.
The table is placed by `@diagrist/layout-matrix`, which knows no kind and will place the matrix forms of `decision`
and `requirements` too.

The statements, their attributes and the diagnostic codes (prefix `M`, ADR 0011) are in the generated
[language page](../../docs/language/matrix.md); the examples in `examples/radverleih` show the three scales. ADR 0031
and `docs/concept-and-matrix.md` explain the kind and what comes next.
