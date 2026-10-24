# @diagrist/plugin-uml

UML diagrams for Diagrist: `sequence` (UML 2.5.1, chapter 17) and `usecase` (chapter 18).

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

```dgr
diagram usecase "Shop" locale=en
actor customer "Customer"
actor psp "Payment provider" kind=system
subject shop "Online shop"
usecase order "Place order" in shop points="before checkout"
usecase pay "Pay" in shop
usecase voucher "Redeem voucher" in shop
rel customer -- order source=1 card=0..*
rel order --> pay include
rel voucher --> order extend when="voucher present" at="before checkout"
rel pay -- psp
```

The statement tables in `src/sequence/grammar` and `src/usecase/grammar` are the reference; `grammarOf` returns
them as data and every statement has a doc and an example.

## Sequence diagrams: changes from the predecessor's syntax

| Before | Now | Why |
|---|---|---|
| `alt "x"` … `else` … `end` | `alt "x"` with its statements indented below it; `else` indented inside `alt`, its statements indented below `else`; no `end` | ADR 0008 Nr. 4: nesting by indentation |
| `coregion a` … `end` | `coregion a` with its messages indented below it | same |
| `decision E1 "Q" = "A" => "C"` | `adr E1 "Q" = "A" => "C"` | ADR 0002 Nr. 3: one keyword, one meaning |
| texts added to the picture in German | `locale=de` in the header for German, default `en` | ADR 0008 Nr. 3 |

Everything else reads as before. The 15 examples under `examples/sequence` were converted by these rules only
and render byte-identical to the predecessor with `locale=de`; `test/__golden__/examples.sha256` holds the
predecessor's SHA-256 of each picture, and a test compares every example with it.

## Use case diagrams: changes from the predecessor's syntax

| Before | Now | Why |
|---|---|---|
| `group shop "Online shop"` | `subject shop "Online shop"` | ADR 0002 Nr. 3: `group` means a C4 frame elsewhere; `subject` is the UML term (18.1.3) |
| `grid cols ...`, `grid rows ...`, `at col/row` | gone; Diagrist always lays the diagram out itself | one way to write a diagram; no example placed by hand |
| `actor x "X" in shop` (reported as E420) | `actor` has no `in` | actors stand outside every subject; the table says so |
| `rel a --> b` (syntax error E004) | a diagnostic (U426) naming both `include` and `extend` with an example | ADR 0005: diagnostics teach |
| `decision E1 "Q" = "A" => "C"` | `adr E1 "Q" = "A" => "C"` | ADR 0002 Nr. 3 |
| texts added to the picture in German | `locale=de` in the header for German, default `en` | ADR 0008 Nr. 3 |
| `card=3..1` (E426) | a value error of the table (L103): a multiplicity is checked where it is read | ADR 0004 |

The nine examples under `examples/usecase` were converted by these rules only. They are visually equal to the
predecessor's pictures, not byte-identical: the layout runs on `@diagrist/layout-grid` (ADR 0015), where a stick
figure is the node and its role a caption below it, so actors stand about ten pixels lower; the hollow triangle of
a generalization is the kernel's marker and a little smaller. The descriptions are the predecessor's word for word.
Three examples are golden files (`test/__golden__/usecase-*.svg`), and geometric tests check what makes the picture
right: use cases inside their subject, actors outside, included use cases right of their base, lines from
outline to outline without crossings, notes at free spots, multiplicities inside the frame.

## Diagnostic codes

Errors keep their number with the prefix `U`; warnings, which shared numbers with errors before, keep their
number plus 500 (ADR 0011). Checks that the language, the tables or the kernel's placement check now do have
their codes. The use case kind adds U428, a note without the element it belongs to.

<!-- Generated from the rules in src/*/rules by `pnpm docs:uml`. Do not edit. -->

### `sequence`

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

Checks of the predecessor that the language, the tables or the kernel do now:

| Before | Now | |
|---|---|---|
| E400, in part | L107 | `activate`, `destroy`, `coregion` and `on=` name declared lifelines |
| E402 | L101 | `else` only in `alt`, `and` only in `par`, `seq`, `strict` |
| E406 | L108 | ids are unique |
| E407 | L107, L108 | `id=` is an id like any other |
| E409 | L101 | `divider` only at the top level |
| E453, in part | L101 | statements a coregion cannot hold |
| W302 | L107 | `mark=` refers to an `adr` |

### `usecase`

| Code | Severity | Before | What it checks |
|---|---|---|---|
| U421 | error | E421 | `include` and `extend` join two use cases, never an actor (UML 2.5.1, 18.1.3). An actor takes part through an association `--`. |
| U422 | error | E422 | An association joins an actor with a use case (UML 2.5.1, 18.1.3): not two actors, not two use cases, not an element with itself. |
| U423 | error | E423 | A generalization joins an actor with an actor or a use case with a use case, never one with itself, and runs in no cycle: the triangle points at the more general one. |
| U424 | error | E424 | The extension points named by `at=` of an `extend` belong to the extended use case `to` (UML 2.5.1, 18.1.3), and the points of one use case have distinct names. |
| U425 | error | E425 | A use case includes itself neither directly nor through others (UML 2.5.1, 18.1.3). The arrow points from the base to the included case. |
| U426 | error | E426 | `-->` names exactly one of the flags `include` and `extend`; `--` and `-\|>` name neither. Multiplicities `source=` and `card=` belong to associations, `when=` and `at=` to `extend`. |
| U427 | error | E427 | `«include»` and `«extend»` mark relations, `«actor»` an actor and `«subsystem»` a subject. As the stereotype of a use case the picture claims something the model is not. |
| U428 | error | – | A note in a use case diagram is a comment on one element: it names its actor, use case or subject with `on`. |
| U920 | warning | W420 | UML allows use cases without a subject, but in a diagram with one, exam practice expects every use case inside it. |
| U921 | warning | W421 | A use case yields a result for an actor. It is reached when an actor takes part in it, or through `include`, `extend` or a generalization from a reached use case; otherwise an association is probably missing. |
| U922 | warning | W422 | In UML the condition of an `extend` is optional; without it the extension always applies. Exam practice asks for it, and for the extension point when the extended use case has some. |
| U923 | warning | W423 | An actor without an association or generalization takes part in nothing, and a diagram without actors describes no use of the system. Both are valid UML. |
| U924 | warning | W424 | Between two use cases behaviour is either always part (`include`) or optional (`extend`), not both; usually one direction is swapped. |
| U926 | warning | W426 | A subject encloses the use cases of its system. Without one it has no content and is not drawn; a note on it finds no frame. |
| U927 | warning | W427 | `direction=` places several subjects side by side or below each other; with fewer than two it changes nothing. |

Checks of the predecessor that the language, the tables or the kernel do now:

| Before | Now | |
|---|---|---|
| E101 | L107 | `rel`, `in`, `on` and `mark=` name declared elements of the right kind |
| E102 | L108 | ids are unique |
| E420 | L104 | `actor` has no `in`: actors stand outside every subject |
| E426, in part | L103 | `source=` and `card=` are valid multiplicities |
| E004, in part | U426 | `-->` without `include` or `extend` |
| W425 | G400 | a note without free room overlaps a node, a text or a frame line |

<!-- End of the generated codes. -->

Not carried over yet: the cross-file checks E480 to E484 (`file=` is kept and named in the description), W301.
