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
and render byte-identical to the predecessor with `locale=de`; `test/__golden__/examples.sha256` holds the
predecessor's SHA-256 of each picture, and a test compares every example with it.

## Diagnostic codes

Errors keep their number with the prefix `U`; warnings, which shared numbers with errors before, keep their
number plus 500 (ADR 0011). Checks that the language or the tables now do have `lang` codes.

<!-- Generated from the rules in src/sequence/rules by `pnpm docs:uml`. Do not edit. -->

| Code | Severity | Before | What it checks |
|---|---|---|---|
| U400 | error | E400 | Message ends and `over=` lists name declared lifelines. `lang` checks the other references; these can also be gates, so the plugin checks them. |
| U401 | error | E401 | Inside a fragment, the statements of an operand are indented below its `else` or `and`. A statement at the level of the marker after it would silently join the operand above. |
| U403 | error | E403 | A reply `-->` answers an open synchronous call in the opposite direction; the model pairs them innermost first. |
| U404 | error | E404 | Before its creation and after its destruction a lifeline does not exist; each happens at most once (UML 2.5.1, 17.3). |
| U405 | error | E405 | `deactivate` ends a bar that `activate` started on the same lifeline. |
| U408 | error | E408 | A lost message has no receiver, a found one no sender (UML 2.5.1, 17.4.3): `lost` only on the right, `found` only on the left, both only on a call or asynchronous message, and neither as a lifeline id. |
| U450 | error | E450 | A gate links a message with the frame of the interaction (UML 2.5.1, 17.3): `gate` is no lifeline id and stands at one end of a message only, never with `lost`, `found` or a creation. |
| U451 | error | E451 | `ignore` and `consider` name the messages they ignore or consider (UML 2.5.1, 17.6.3), written as their guard. |
| U452 | error | E452 | A note and a reference need `over=`, a state invariant needs `on=`: they stand on lifelines (UML 2.5.1, 17.2.4). |
| U453 | error | E453 | A coregion is the short form of a `par` whose operands hold one event each on the same lifeline (UML 2.5.1, 17.6.3); every message in it is sent or received by that lifeline. The tables allow only `msg`, `activate`, `deactivate` and `note` in it. |
| U454 | error | E454 | A gate links a message with the edge of a reference (actual gate) or a fragment (formal gate), UML 2.5.1, 17.3. At a reference the message comes from a lifeline outside it and follows it, with only events beside it in between; at a fragment it stands inside. The frame name is its own. |
| U900 | warning | W400 | UML allows `alt` and `par` with one operand, but `opt` or no fragment says it more clearly. |
| U901 | warning | W401 | UML allows leaving out the reply; it is still named. Exempt are self calls and calls made while the caller handles a call it answers later: that reply implies the inner call returned. Lost and found messages are U907. |
| U902 | warning | W402 | A lifeline no message, note or reference touches says nothing; remove it or add what it does. |
| U903 | warning | W403 | An operand without events draws an empty band; fill it or remove it. |
| U904 | warning | W404 | In `alt` every operand but the last needs a guard; the last one may stand for `[else]`. |
| U905 | warning | W405 | `activate` without `deactivate`: the bar reaches to the end of the diagram. |
| U906 | warning | W406 | A duration runs from the earlier to the later message; swapped, Diagrist still draws it. |
| U907 | warning | W407 | No reply can follow a lost or found message, so as a synchronous call it would wait forever; use `~>`. |
| U908 | warning | W408 | `duration=` slopes the arrow. A self call is a loop and a creation ends at the head at its height: there the arrow stays level and the duration is missing from the picture. |
| U909 | warning | W409 | A coregion with fewer than two messages leaves no order open and says nothing. |
| U950 | warning | W450 | `id=` on a reference or fragment only serves gates; without a message at its edge it has no effect. |
| U951 | warning | W451 | A gate is a point on the frame with one message per side (UML 2.5.1, 17.3); two messages through the same named gate in the same direction leave open which one is meant. |

Checks of the predecessor that the language or the tables do now:

| Before | Now | |
|---|---|---|
| E400, in part | L107 | `activate`, `destroy`, `coregion` and `on=` name declared lifelines |
| E402 | L101 | `else` only in `alt`, `and` only in `par`, `seq`, `strict` |
| E406 | L108 | ids are unique |
| E407 | L107, L108 | `id=` is an id like any other |
| E409 | L101 | `divider` only at the top level |
| E453, in part | L101 | statements a coregion cannot hold |
| W302 | L107 | `mark=` refers to an `adr` |

<!-- End of the generated codes. -->

Not carried over yet: the cross-file checks E480 to E484 (`file=` is kept and named in the description), W301.
