# @diagrist/plugin-uml

UML diagrams for Diagrist. The first kind is `sequence` (UML 2.5.1, chapter 17).

```dgr
diagram sequence "Login" locale=en
actor user "User"
participant api "API" stereotype="service"
msg user -> api "POST /login" id=login
alt "credentials valid"
  msg api --> user "200 OK" id=ok
  else
    msg api --> user "401"
duration login ok "≤ 300 ms"
```

The statement tables in `src/sequence/grammar` are the reference; `grammarOf` returns them as data and every
statement has a doc and an example.

## Changes from the predecessor's syntax

| Before | Now | Why |
|---|---|---|
| `alt "x"` … `else` … `end` | `alt "x"` with its statements indented below it; `else` indented inside `alt`, its statements indented below `else`; no `end` | ADR 0008 Nr. 4: nesting by indentation |
| `coregion a` … `end` | `coregion a` with its messages indented below it | same |
| `decision E1 "Q" = "A" => "C"` | `adr E1 "Q" = "A" => "C"` | ADR 0002 Nr. 3: one keyword, one meaning |
| texts added to the picture in German | `locale=de` in the header for German, default `en` | ADR 0008 Nr. 3 |

Everything else reads as before. The 15 examples under `examples/sequence` were converted by these rules only
and render byte-identical to the predecessor with `locale=de`.

## Diagnostic codes

Errors keep their number with the prefix `U`; warnings, which shared numbers with errors before, keep their
number plus 500. Checks that the language or the tables now do have `lang` codes.

| Before | Now | | Before | Now |
|---|---|---|---|---|
| E400 | U400, and L107 for `activate`, `destroy`, `coregion`, `on=` | | W400 | U900 |
| E401 | U401 (statement after an operand marker); unclosed fragments cannot happen | | W401 | U901 |
| E402 | L101: `else` only in `alt`, `and` only in `par`, `seq`, `strict` | | W402 | U902 |
| E403 | U403 | | W403 | U903 |
| E404 | U404 | | W404 | U904 |
| E405 | U405 | | W405 | U905 |
| E406 | L108 | | W406 | U906 |
| E407 | L107, L108 (`id=` is an id like any other) | | W407 | U907 |
| E408 | U408 | | W408 | U908 |
| E409 | L101: `divider` only at the top level | | W409 | U909 |
| E450 | U450 | | W450 | U950 |
| E451 | U451 | | W451 | U951 |
| E452 | U452, now also for `note` and `ref` without `over=` | | W302 | L107 (`mark=` refers to an `adr`) |
| E453 | U453, and L101 for statements a coregion cannot hold | | | |
| E454 | U454 | | | |

Not carried over yet: the cross-file checks E480 to E484 (`file=` is kept and named in the description), W301.
