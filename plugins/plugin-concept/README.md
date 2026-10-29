# @diagrist/plugin-concept

Pictures of a business concept for Diagrist: the kinds `matrix`, `concept` and `vocabulary`.

## `matrix`

A matrix has columns, rows and one scale, and
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

## `concept`

A concept picture declares its own vocabulary first: types of things with `type`, types of relations with `link`.
Then it writes items with `item` and relations with `rel`, and every declaration is a rule Diagrist checks. A link
says which types it joins (`from=`, `to=`), how many relations each item needs (`each=`, `single=`), and whether
chains may loop (`acyclic`). A type with `explain` asks every item for an entry, such as a definition.

```dgr
diagram concept "Rental: who creates which record" locale=en
type role "Role" shape=person
type task "Task" shape=round
type record "Record" shape=doc
link does "carries out" from=role to=task each=to
link creates "creates" from=task to=record each=to single=to
item customer "Customer" is role
item rent "Rent a bike" is task
item contract "Rental contract" is record
rel customer does rent
rel rent creates contract
```

The vocabularies `terms` and `roles` bring the declarations of two common pictures. `terms` has terms with their
definitions, broader terms above narrower ones, parts and synonyms, and a rule that asks to mark one of two
synonyms `status=deprecated`. `roles` has who reports to whom, each role to one lead at most and never in a circle,
and who stands in for whom. The items are layered along their relations by `@diagrist/layout-grid`, and the
legend shows the types, links and statuses the picture uses.

## `vocabulary`

A vocabulary file holds the `type` and `link` declarations of a subject, so several concept pictures share them
instead of each writing its own. A picture names the file with `use=` in its header and writes only items and
relations; Diagrist reads the file the way `use` reads a base (ADR 0021) and checks the picture against it.
Drawn on its own, a vocabulary is a picture of the subject: each type in its shape, each link a line with its
rules in words, such as "exactly one per control". `examples/bank` has an internal control system of a bank as a
vocabulary and two pictures that use it. The vocabularies `terms` and `roles` of the plugin are written as such
files too, with `de=` for their German names.

```dgr
diagram vocabulary "Internal controls"
type risk "Risk"
type control "Control" shape=doc
type role "Role" shape=person
link mitigates "mitigates" from=control to=risk each=to
link owns "owns" from=role to=control each=to single=to
```

The statements, their attributes and the diagnostic codes (prefix `M`, ADR 0011) are in the generated language
pages [`matrix`](../../docs/language/matrix.md), [`concept`](../../docs/language/concept.md) and
[`vocabulary`](../../docs/language/vocabulary.md). The examples in
`examples/radverleih` show the three scales of the matrix and the two vocabularies. ADR 0030 and 0031 and
`docs/concept-and-matrix.md` explain the kinds and what comes next.
