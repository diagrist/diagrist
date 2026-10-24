# @diagrist/plugin-uml

UML diagrams for Diagrist: `sequence` (UML 2.5.1, chapter 17), `usecase` (chapter 18) and `activity` (chapters 15
and 16).

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

```dgr
diagram activity "Order" locale=en
partition customer "Customer"
partition warehouse "Warehouse"
initial start in customer
action order "Place order" in customer output="Order"
action reserve "Reserve goods" in warehouse input="Order"
decision stock "Enough stock?" in warehouse
action ship "Ship goods" in warehouse
send refusal "Refusal" in warehouse
merge done in warehouse
final end in warehouse
go start -> order
go order => reserve
go reserve -> stock
go stock -> ship "yes"
go stock -> refusal else
go ship -> done
go refusal -> done
go done -> end
```

The statement tables in `src/sequence/grammar`, `src/usecase/grammar` and `src/activity/grammar` are the reference; `grammarOf` returns
them as data and every statement has a doc and an example.

## UML 2.5.1 coverage

Each kind has a catalog of the UML 2.5.1 elements its diagrams can show, in `src/spec`, with the section of the
specification and a short title in our own words. Statements, arguments, arrows, flags and rules name the elements
they implement with `implementing`, which also adds the section to their docs (ADR 0017). Which elements are covered
and which are not follows from these marks alone: [docs/spec-coverage.md](docs/spec-coverage.md) is generated from
them by `pnpm docs:generate`, with the share per kind and the examples that use each element.

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

## Activity diagrams: changes from the predecessor's syntax

| Before | Now | Why |
|---|---|---|
| `group kunde "Kunde"` | `partition kunde "Kunde"` | ADR 0002 Nr. 3: `group` is a C4 frame; `partition` is the UML term (15.6.3.1) |
| `region storno "..."`, `region=storno` on nodes | `interruptible storno "..."`, `interruptible=storno` | `region` is the orthogonal region of a state; UML calls this an interruptible activity region (15.6.3.3) |
| `time frist "14 Tage"` | `wait frist "14 Tage"` | `time` is the time constraint of sequence diagrams; the node is an accept time event action, where the flow waits |
| one statement for all node keywords, E436 and E438 as rules | one table per node keyword | ADR 0005: each table says which text, pins, `state=`, `call` and `tone=` a node takes, so a wrong one is a language error naming the allowed parts |
| no decision bar in activity diagrams | `adr E1 "Q" = "A"`, `mark=E1` on actions, objects and signals | ADR 0002 Nr. 3: the bar has its own keyword and works in every kind |
| texts added to the picture in German | `locale=de` in the header for German, default `en` | ADR 0008 Nr. 3 |

`decision` stays the keyword of the decision node (ADR 0018). It meant two things before, the diamond here and an entry of the
decision bar elsewhere; since the bar is `adr` (ADR 0002 Nr. 3), `decision` means only the UML decision node
(15.3.3.5) in every kind, and renaming it would have changed every activity source for nothing. `go`, `initial`,
`final`, `fork` and `join` keep their names too; a state diagram may use them later with the same UML meaning.

The twelve examples under `examples/activity` were converted by these rules only. Their PNGs are pixel for pixel the
predecessor's, their descriptions word for word; their SVGs hold the same elements and differ only in that lanes and
regions now stand in `<g id="group-<id>">` groups, as the SVG contract asks, and the expansion nodes of a region are
written in source order. The layout is the predecessor's, reviewed and ported area by area into `src/activity/layout`;
it uses the layering steps of `@diagrist/layout-grid` (cycles, layers, crossings, columns) and keeps its own lanes,
bars, diamonds, loops, pins and regions, which no other kind draws. Three examples are golden files
(`test/__golden__/activity-*.svg`), and geometric tests check what makes the picture right: nodes in their lanes,
edges downwards with loops on the right, alternatives symmetric below their decision, bars as wide as their
branches, region frames around their members only, pins on the edge where their flow attaches.

## Diagnostic codes

Errors keep their number with the prefix `U`; warnings, which shared numbers with errors before, keep their
number plus 500 (ADR 0011). Checks that the language, the tables or the kernel's placement check now do have
their codes. The use case kind adds U428, a note without the element it belongs to.

<!-- Generated from the rules in src/*/rules by `pnpm docs:uml`. Do not edit. -->

### `sequence`

| Code | Severity | Before | What it checks |
|---|---|---|---|
| U400 | error | E400 | Message ends and `over=` lists name declared lifelines. `lang` checks the other references; these can also be gates, so the plugin checks them. UML 2.5.1: 17.3.3.1 Lifeline. |
| U401 | error | E401 | Inside a fragment, the statements of an operand are indented below its `else` or `and`. A statement at the level of the marker after it would silently join the operand above. UML 2.5.1: 17.6.3.1 Operand of a combined fragment. |
| U403 | error | E403 | A reply `-->` answers an open synchronous call in the opposite direction; the model pairs them innermost first. UML 2.5.1: 17.4.3.1 Reply to a call, 17.4.3.1 Synchronous call. |
| U404 | error | E404 | Before its creation and after its destruction a lifeline does not exist; each happens at most once. UML 2.5.1: 17.4.3.1 Message that creates a lifeline, 17.4.3.4 End of a lifeline (destruction). |
| U405 | error | E405 | `deactivate` ends a bar that `activate` started on the same lifeline. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar). |
| U408 | error | E408 | A lost message has no receiver, a found one no sender: `lost` only on the right, `found` only on the left, both only on a call or asynchronous message, and neither as a lifeline id. UML 2.5.1: 17.4.3.1 Lost message, without receiver, 17.4.3.1 Found message, without sender. |
| U450 | error | E450 | A gate links a message with the frame of the interaction: `gate` is no lifeline id and stands at one end of a message only, never with `lost`, `found` or a creation. UML 2.5.1: 17.4.3.5 Gate on the frame of the interaction. |
| U451 | error | E451 | `ignore` and `consider` name the messages they ignore or consider, written as their guard. UML 2.5.1: 17.6.3.15 Ignored messages (`ignore`), 17.6.3.15 Considered messages (`consider`). |
| U452 | error | E452 | A note and a reference need `over=`, a state invariant needs `on=`: they stand on lifelines. UML 2.5.1: 17.2.3.5 State invariant, 17.7.3.1 Use of another interaction (`ref`). |
| U453 | error | E453 | A coregion is the short form of a `par` whose operands hold one event each on the same lifeline; every message in it is sent or received by that lifeline. The tables allow only `msg`, `activate`, `deactivate` and `note` in it. UML 2.5.1: 17.6.4.10 Coregion, unordered events on one lifeline. |
| U454 | error | E454 | A gate links a message with the edge of a reference (actual gate) or of a combined fragment. At a reference the message comes from a lifeline outside it and follows it, with only events beside it in between; at a fragment it stands inside. The frame name is its own. UML 2.5.1: 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |
| U900 | warning | W400 | UML allows `alt` and `par` with one operand, but `opt` or no fragment says it more clearly. UML 2.5.1: 17.6.3.7 Alternatives (`alt`), 17.6.3.10 Parallel (`par`). |
| U901 | warning | W401 | UML allows leaving out the reply; it is still named. Exempt are self calls and calls made while the caller handles a call it answers later: that reply implies the inner call returned. Lost and found messages are U907. UML 2.5.1: 17.4.3.1 Synchronous call, 17.4.3.1 Reply to a call. |
| U902 | warning | W402 | A lifeline no message, note or reference touches says nothing; remove it or add what it does. UML 2.5.1: 17.3.3.1 Lifeline. |
| U903 | warning | W403 | An operand without events draws an empty band; fill it or remove it. UML 2.5.1: 17.6.3.1 Operand of a combined fragment. |
| U904 | warning | W404 | In `alt` every operand but the last needs a guard; the last one may stand for `[else]`. UML 2.5.1: 17.6.3.7 Alternatives (`alt`), 17.6.3.2 Guard of an operand. |
| U905 | warning | W405 | `activate` without `deactivate`: the bar reaches to the end of the diagram. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar). |
| U906 | warning | W406 | A duration runs from the earlier to the later message; swapped, Diagrist still draws it. UML 2.5.1: 8.5.3.2 Duration constraint. |
| U907 | warning | W407 | No reply can follow a lost or found message, so as a synchronous call it would wait forever; use `~>`. UML 2.5.1: 17.4.3.1 Lost message, without receiver, 17.4.3.1 Found message, without sender, 17.4.3.1 Synchronous call. |
| U908 | warning | W408 | `duration=` slopes the arrow. A self call is a loop and a creation ends at the head at its height: there the arrow stays level and the duration is missing from the picture. UML 2.5.1: 8.5.3.2 Duration constraint. |
| U909 | warning | W409 | A coregion with fewer than two messages leaves no order open and says nothing. UML 2.5.1: 17.6.4.10 Coregion, unordered events on one lifeline. |
| U950 | warning | W450 | `id=` on a reference or fragment only serves gates; without a message at its edge it has no effect. UML 2.5.1: 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |
| U951 | warning | W451 | A gate is a point on the frame with one message per side; two messages through the same named gate in the same direction leave open which one is meant. UML 2.5.1: 17.4.3.5 Gate on the frame of the interaction, 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |

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
| U421 | error | E421 | `include` and `extend` join two use cases, never an actor. An actor takes part through an association `--`. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend. |
| U422 | error | E422 | An association joins an actor with a use case: not two actors, not two use cases, not an element with itself. UML 2.5.1: 18.1.3.1 Association of an actor with a use case. |
| U423 | error | E423 | A generalization joins an actor with an actor or a use case with a use case, never one with itself, and runs in no cycle: the triangle points at the more general one. UML 2.5.1: 9.2.3.2 Generalization between actors or between use cases. |
| U424 | error | E424 | The extension points named by `at=` of an `extend` belong to the extended use case `to`, and the points of one use case have distinct names. UML 2.5.1: 18.1.3.2 Extension point, 18.1.3.2 Extend. |
| U425 | error | E425 | A use case includes itself neither directly nor through others. The arrow points from the base to the included case. UML 2.5.1: 18.1.3.3 Include. |
| U426 | error | E426 | `-->` names exactly one of the flags `include` and `extend`; `--` and `-\|>` name neither. Multiplicities `source=` and `card=` belong to associations, `when=` and `at=` to `extend`. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend, 18.1.3.1 Multiplicity at an end of that association, 18.1.3.2 Condition of an extend. |
| U427 | error | E427 | `«include»` and `«extend»` mark relations, `«actor»` an actor and `«subsystem»` a subject. As the stereotype of a use case the picture claims something the model is not. UML 2.5.1: 18.1.4 Keyword or stereotype above a use case. |
| U428 | error | – | A note in a use case diagram is a comment on one element: it names its actor, use case or subject with `on`. UML 2.5.1: 7.2.3.2 Comment (note). |
| U920 | warning | W420 | UML allows use cases without a subject, but in a diagram with one, exam practice expects every use case inside it. UML 2.5.1: 18.1.3.1 Subject a use case applies to. |
| U921 | warning | W421 | A use case yields a result for an actor. It is reached when an actor takes part in it, or through `include`, `extend` or a generalization from a reached use case; otherwise an association is probably missing. UML 2.5.1: 18.1.3.1 Association of an actor with a use case. |
| U922 | warning | W422 | In UML the condition of an `extend` is optional; without it the extension always applies. Exam practice asks for it, and for the extension point when the extended use case has some. UML 2.5.1: 18.1.3.2 Condition of an extend, 18.1.3.2 Extension point. |
| U923 | warning | W423 | An actor without an association or generalization takes part in nothing, and a diagram without actors describes no use of the system. Both are valid UML. UML 2.5.1: 18.1.3.1 Actor. |
| U924 | warning | W424 | Between two use cases behaviour is either always part (`include`) or optional (`extend`), not both; usually one direction is swapped. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend. |
| U926 | warning | W426 | A subject encloses the use cases of its system. Without one it has no content and is not drawn; a note on it finds no frame. UML 2.5.1: 18.1.3.1 Subject a use case applies to. |
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

### `activity`

| Code | Severity | Before | What it checks |
|---|---|---|---|
| U430 | error | E430 | An initial node has no incoming edge, an activity final and a flow final node have no outgoing one. UML 2.5.1: 15.3.3.1 Initial node, 15.3.3.2 Activity final node, ending every flow, 15.3.3.2 Flow final node, ending one flow. |
| U431 | error | E431 | A decision has one incoming edge; bringing flows together is the job of a merge in front of it. UML 2.5.1: 15.3.3.6 Decision node. |
| U432 | error | E432 | A merge and a join have exactly one outgoing edge, a fork exactly one incoming edge. UML 2.5.1: 15.3.3.5 Merge node, 15.3.3.4 Join node, 15.3.3.3 Fork node. |
| U433 | error | E433 | The guards of a decision exclude each other, so none appears twice, and `else` appears at most once and only on an edge out of a decision. UML 2.5.1: 15.2.3.3 Guard on an activity edge, 15.3.3.6 Predefined guard else. |
| U434 | error | E434 | A control flow touches no object node, and an object flow has an object node, a pin or a control node it passes at one end at least. UML 2.5.1: 15.2.3.3 Control flow, 15.2.3.4 Object flow. |
| U435 | error | E435 | A join waits for all its incoming edges. When they come from alternatives of one decision, only one of them runs and the activity hangs; a merge is meant. UML 2.5.1: 15.3.3.4 Join node. |
| U437 | error | E437 | An interrupting edge `~>` starts inside an interruptible region and ends outside it. UML 2.5.1: 15.6.3.2 Edge that interrupts its region. |
| U455 | error | E455 | Pins are named object nodes of an action: a name stands once per side, and `pin=` on an object flow names an output pin of its source or an input pin of its target, or a named expansion node. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |
| U456 | error | E456 | An exception handler joins two different actions. The handler action has no edges of its own, no input pin besides the exception pin, and as many output pins as the protected action: after it the flow goes on at the output of the protected action. UML 2.5.1: 15.5.3.1 Exception handler of an executable node. |
| U457 | error | E457 | An expansion region gets the collection it runs over as an object flow `=>` from outside into each of its inputs. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |
| U458 | error | E458 | Expansion nodes are object nodes: only object flows `=>` start or end at an expansion region. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |
| U930 | warning | W430 | UML allows no initial node or several; exam practice expects exactly one. UML 2.5.1: 15.3.3.1 Initial node. |
| U931 | warning | W431 | UML asks for one outgoing edge at least; a decision with fewer than two decides nothing. UML 2.5.1: 15.3.3.6 Decision node. |
| U932 | warning | W432 | A merge or join with fewer than two incoming edges, and a fork with fewer than two outgoing ones, has no effect. UML 2.5.1: 15.3.3.5 Merge node, 15.3.3.4 Join node, 15.3.3.3 Fork node. |
| U933 | warning | W433 | Every alternative of a decision needs a guard; otherwise it is open when it applies. UML 2.5.1: 15.2.3.3 Guard on an activity edge. |
| U934 | warning | W434 | The guards of a decision should cover every case together. Without `else` that shows only for obvious pairs such as yes and no; otherwise the flow may stop. UML 2.5.1: 15.2.3.3 Guard on an activity edge, 15.3.3.6 Predefined guard else. |
| U935 | warning | W435 | Every node should be reachable from a start: an initial node, or an accept event, time event or data store without incoming edge, which start a flow from outside. A handler counts when the action it protects does. |
| U936 | warning | W436 | UML allows an activity without end; exam practice expects one. A node without outgoing edge that is no end lets its flow run out; after a handler the flow goes on at its protected action. UML 2.5.1: 15.3.3.2 Activity final node, ending every flow, 15.3.3.2 Flow final node, ending one flow. |
| U937 | warning | W437 | A merge does not synchronize: when its incoming edges come from parallel branches of a fork, everything after it runs several times. Valid UML, but usually a join is meant. UML 2.5.1: 15.3.3.5 Merge node. |
| U938 | warning | W438 | An activity final ends every flow. When two parallel branches end in an activity final each without a join, the faster one stops the other: the main branch ends with `final`, side branches with `flowfinal`. UML 2.5.1: 15.3.3.2 Activity final node, ending every flow. |
| U939 | warning | W439 | An action with several incoming edges waits for all of them (implicit join), with several outgoing ones it starts all of them (implicit fork). Usually a merge or a decision is meant. Object flows at pins do not count: each pin is an object node of its own. UML 2.5.1: 16.2.3.1 Action. |
| U955 | warning | W455 | An interruptible region without an interrupting edge `~>` interrupts nothing: usually the edge is missing, or the frame only groups. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| U956 | warning | W456 | An edge that crosses the frame of an expansion region without an expansion node is valid UML, but leaves open whether it acts once per element or once for the whole region. The way through the input or output is clearer. UML 2.5.1: 16.12.3 Expansion region. |
| U957 | warning | W457 | An expansion region without nodes, or without an edge from its input inside, processes nothing: usually `expansion=` on the nodes or `go region => first` is missing. UML 2.5.1: 16.12.3 Expansion region. |

Checks of the predecessor that the language, the tables or the kernel do now:

| Before | Now | |
|---|---|---|
| E101 | L107 | `in`, `interruptible=`, `expansion=`, `mark=`, the ends of `go` and `handler` name declared elements of the right kind |
| E102 | L108 | ids are unique |
| E436 | L102, L104, L105 | actions, objects, signals and time events need their text, start, ends and bars take none, `state=` only on `object`: each node has its own table |
| E438 | L104, L105 | pins only on `action`, `send` (input) and `accept` (output), `call` only on `action` |
| E439, now a warning | G400 | the frame of a region overlaps a node that is not its member |
| W458 | L105 | `tone=` only on nodes drawn as cards |
| E456, in part | L107 | both ends of `handler` are actions |

<!-- End of the generated codes. -->

Not carried over yet: the cross-file checks E480 to E484 (`file=` is kept and named in the description), W301.
