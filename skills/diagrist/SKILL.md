---
name: diagrist
description: Write, change, check and render Diagrist diagrams, text files ending in .dgr that the dgr command line turns into checked SVG and PNG pictures. Use it when a diagram such as a sequence or usecase or activity or context or container or component diagram is wanted as code, when a .dgr file is created or edited, or when dgr reports a code such as L101 or U403.
---

<!-- Generated from the command tables, the statement tables of every kind and the diagnostic catalogues by `pnpm docs:generate`. Do not edit. -->

# Diagrist

Diagrist turns a small text language into diagrams. The language is strict on purpose: every statement, argument and attribute is listed in a table, the check names what was found and what is allowed, and the same file always gives the same picture. Work with the tools instead of guessing.

A `.dgr` file holds one diagram. Its first line names the kind and the title, `diagram sequence "Checkout"`, followed by the attributes of the header. Every other line is a statement: a keyword, then its arguments in the order the table gives, then flags, clauses and `key=value` attributes in any order.

Texts stand in double quotes and may contain `\"`. Ids are single words of letters, digits, `_` and `-` that start with a letter; a statement declares an id, and other statements refer to it by that word. An attribute value is a single word or a text in quotes, as in `stereotype="web app"`.

Indentation nests: a line belongs to the nearest line above it with less indent, so the statements of a block such as a fragment are indented below it. `dgr fmt` writes two spaces per level and keeps at most one blank line. `#` starts a comment that runs to the end of the line.

## How to work

Look up before writing. `dgr grammar` lists the kinds, and `dgr grammar <kind> --json` prints every statement of a kind with its arguments, attributes, flags, doc and examples as data. The reference below is the same grammar in short; do not use keywords or attributes it does not list.

Write the file, then run `dgr check <file> --json`. Each diagnostic has a stable `code`, a `span` with line and column, and `values`; its message names what was found, what is allowed and a correct example. Fix every error and read every warning, then check again until nothing is reported.

Run `dgr fmt <file>` to settle indentation and spacing, and `dgr build <file> --png` to write the SVG and a PNG beside it. Look at the PNG before you hand the diagram over: the check proves the file is valid, not that the picture says what was meant.

Every command takes `--json` for one JSON document on stdout. The commands:

| Command | What it does |
|---|---|
| `dgr fmt <files...> [options]` | Formats .dgr files in place. |
| `dgr check <file> [options]` | Checks a diagram against the grammar and the rules of its kind and prints every finding. |
| `dgr build <file> [options]` | Renders a diagram as SVG, and with `--png` also as PNG. |
| `dgr grammar [kind] [options]` | Shows what a diagram kind allows. |
| `dgr help [command] [options]` | Explains the commands. |

## Kind `sequence`

A UML sequence diagram (UML 2.5.1, chapter 17): lifelines from left to right in source order, messages and fragments from top to bottom. Fragments nest by indentation. Full reference: `dgr grammar sequence`.

```text
diagram sequence "Title" [subtitle=<text>] [look=<plain|cards>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `participant <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as a box, from left to right in source order. | `participant api "api-service" stereotype="service"` |
| `actor <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as a stick figure, from left to right in source order. | `actor customer "Customer"` |
| `database <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as a cylinder, from left to right in source order. | `database db "Orders DB"` |
| `queue <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as a horizontal tube, from left to right in source order. | `queue broker "Kafka"` |
| `boundary <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as the boundary symbol of robustness analysis, from left to right in source order. | `boundary form "Order form"` |
| `control <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as the control symbol of robustness analysis, from left to right in source order. | `control checkout "Checkout"` |
| `entity <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]` | top level | A lifeline drawn as the entity symbol of robustness analysis, from left to right in source order. | `entity order "Order"` |
| `autonumber` | top level | Numbers all messages in source order (1, 2, 3 ...), across fragments; the number stands before the label. | `autonumber` |
| `frame [label]` | top level | A frame around the whole interaction with `sd Name` in its tag. | `frame "OAuth callback"` |
| `msg <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A message in source order; its arrow says what kind. | `msg client -> api "GET /orders" id=request` |
| `create <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A creation message: dashed with an open head, and the head of the receiver stands at its height. | `create client -> meter "new MeterData()"` |
| `destroy <target>` | top level and inside blocks | Destruction: the lifeline ends here with an X. | `destroy session` |
| `activate <target>` | top level and inside blocks | Starts an activation bar by hand, for processing after an asynchronous message. | `activate worker` |
| `deactivate <target>` | top level and inside blocks | Ends the bar the last `activate` of this lifeline started. | `deactivate worker` |
| `note <text> [over=<lifelines>]` | top level and inside blocks | A note at this point of the time axis, over the lifelines of `over=`. | `note "Idempotency key = order number" over=api,db` |
| `ref <label> [over=<lifelines>] [id=<id>] [file=<text>]` | top level and inside blocks | A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. | `ref "Authorize payment" over=payment,psp id=pay file="authorize-payment.dgr"` |
| `invariant <text> [on=<ref>] [state]` | top level and inside blocks | A state invariant at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box. | `invariant "logged in" on=bff state` |
| `divider [label]` | top level | A divider on the time axis: a double line across all lifelines with the text in a box in the middle. | `divider "Accept the webhook"` |
| `coregion <on>` | top level and inside blocks | A coregion on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. | `coregion notify` |
| `alt [guard] [id=<id>]` | top level and inside blocks | Alternatives: the first operand whose guard holds is taken; further operands start with `else`. | `alt "token valid"` |
| `else [guard]` | inside `alt` | The next operand of `alt`, written inside `alt` with its statements indented below it. | `else "invalid token"` |
| `opt [guard] [id=<id>]` | top level and inside blocks | An optional part, taken when its guard holds. | `opt "3-D Secure required"` |
| `loop [guard] [id=<id>]` | top level and inside blocks | A repetition while the guard holds. | `loop "at most 3 times" id=retry` |
| `par [guard] [id=<id>]` | top level and inside blocks | Parallel operands, separated by `and`; their events interleave freely. | `par` |
| `and [guard]` | inside `par`, `seq`, `strict` | The next operand of `par`, `seq` or `strict`, written inside the fragment with its statements indented below it. | `and` |
| `break [guard] [id=<id>]` | top level and inside blocks | Ends the enclosing interaction when the guard holds. | `break "timeout"` |
| `critical [guard] [id=<id>]` | top level and inside blocks | A critical region: its events are not interleaved. | `critical` |
| `seq [guard] [id=<id>]` | top level and inside blocks | Weak sequencing of operands, separated by `and`. | `seq` |
| `strict [guard] [id=<id>]` | top level and inside blocks | Strict sequencing of operands, separated by `and`. | `strict` |
| `neg [guard] [id=<id>]` | top level and inside blocks | An invalid trace: what must not happen. | `neg` |
| `assert [guard] [id=<id>]` | top level and inside blocks | The only valid trace at this point. | `assert` |
| `ignore [guard] [id=<id>]` | top level and inside blocks | Messages that may appear anywhere and are ignored; the guard lists their names and shows as `ignore {...}`. | `ignore "ping, status"` |
| `consider [guard] [id=<id>]` | top level and inside blocks | Only the listed messages are considered; the guard lists their names and shows as `consider {...}`. | `consider "order, pay"` |
| `duration <from> <to> <text>` | top level | A duration constraint between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. | `duration request response "≤ 300 ms"` |
| `time <at> <text>` | top level | A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`. | `time request "t = now"` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `msg`: `->` synchronous call (filled head), `~>` asynchronous message (open head), `-->` reply (dashed, open head).

The rules of `sequence` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `U400` | error | Message ends and `over=` lists name declared lifelines. `lang` checks the other references; these can also be gates, so the plugin checks them. UML 2.5.1: 17.3.3.1 Lifeline. |
| `U401` | error | Inside a fragment, the statements of an operand are indented below its `else` or `and`. A statement at the level of the marker after it would silently join the operand above. UML 2.5.1: 17.6.3.1 Operand of a combined fragment. |
| `U403` | error | A reply `-->` answers an open synchronous call in the opposite direction; the model pairs them innermost first. UML 2.5.1: 17.4.3.1 Reply to a call, 17.4.3.1 Synchronous call. |
| `U404` | error | Before its creation and after its destruction a lifeline does not exist; each happens at most once. UML 2.5.1: 17.4.3.1 Message that creates a lifeline, 17.4.3.4 End of a lifeline (destruction). |
| `U405` | error | `deactivate` ends a bar that `activate` started on the same lifeline. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar). |
| `U408` | error | A lost message has no receiver, a found one no sender: `lost` only on the right, `found` only on the left, both only on a call or asynchronous message, and neither as a lifeline id. UML 2.5.1: 17.4.3.1 Lost message, without receiver, 17.4.3.1 Found message, without sender. |
| `U450` | error | A gate links a message with the frame of the interaction: `gate` is no lifeline id and stands at one end of a message only, never with `lost`, `found` or a creation. UML 2.5.1: 17.4.3.5 Gate on the frame of the interaction. |
| `U451` | error | `ignore` and `consider` name the messages they ignore or consider, written as their guard. UML 2.5.1: 17.6.3.15 Ignored messages (`ignore`), 17.6.3.15 Considered messages (`consider`). |
| `U452` | error | A note and a reference need `over=`, a state invariant needs `on=`: they stand on lifelines. UML 2.5.1: 17.2.3.5 State invariant, 17.7.3.1 Use of another interaction (`ref`). |
| `U453` | error | A coregion is the short form of a `par` whose operands hold one event each on the same lifeline; every message in it is sent or received by that lifeline. The tables allow only `msg`, `activate`, `deactivate` and `note` in it. UML 2.5.1: 17.6.4.10 Coregion, unordered events on one lifeline. |
| `U454` | error | A gate links a message with the edge of a reference (actual gate) or of a combined fragment. At a reference the message comes from a lifeline outside it and follows it, with only events beside it in between; at a fragment it stands inside. The frame name is its own. UML 2.5.1: 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |
| `U900` | warning | UML allows `alt` and `par` with one operand, but `opt` or no fragment says it more clearly. UML 2.5.1: 17.6.3.7 Alternatives (`alt`), 17.6.3.10 Parallel (`par`). |
| `U901` | warning | UML allows leaving out the reply; it is still named. Exempt are self calls and calls made while the caller handles a call it answers later: that reply implies the inner call returned. Lost and found messages are U907. UML 2.5.1: 17.4.3.1 Synchronous call, 17.4.3.1 Reply to a call. |
| `U902` | warning | A lifeline no message, note or reference touches says nothing; remove it or add what it does. UML 2.5.1: 17.3.3.1 Lifeline. |
| `U903` | warning | An operand without events draws an empty band; fill it or remove it. UML 2.5.1: 17.6.3.1 Operand of a combined fragment. |
| `U904` | warning | In `alt` every operand but the last needs a guard; the last one may stand for `[else]`. UML 2.5.1: 17.6.3.7 Alternatives (`alt`), 17.6.3.2 Guard of an operand. |
| `U905` | warning | `activate` without `deactivate`: the bar reaches to the end of the diagram. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar). |
| `U906` | warning | A duration runs from the earlier to the later message; swapped, Diagrist still draws it. UML 2.5.1: 8.5.3.2 Duration constraint. |
| `U907` | warning | No reply can follow a lost or found message, so as a synchronous call it would wait forever; use `~>`. UML 2.5.1: 17.4.3.1 Lost message, without receiver, 17.4.3.1 Found message, without sender, 17.4.3.1 Synchronous call. |
| `U908` | warning | `duration=` slopes the arrow. A self call is a loop and a creation ends at the head at its height: there the arrow stays level and the duration is missing from the picture. UML 2.5.1: 8.5.3.2 Duration constraint. |
| `U909` | warning | A coregion with fewer than two messages leaves no order open and says nothing. UML 2.5.1: 17.6.4.10 Coregion, unordered events on one lifeline. |
| `U950` | warning | `id=` on a reference or fragment only serves gates; without a message at its edge it has no effect. UML 2.5.1: 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |
| `U951` | warning | A gate is a point on the frame with one message per side; two messages through the same named gate in the same direction leave open which one is meant. UML 2.5.1: 17.4.3.5 Gate on the frame of the interaction, 17.4.3.5 Gate on an interaction use, 17.4.3.5 Gate on a combined fragment. |

## Kind `usecase`

A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. Diagrist lays it out by itself: use cases in columns by include and extend, actors left or right at the height of their use cases, an order with as few crossings as it finds. Full reference: `dgr grammar usecase`.

```text
diagram usecase "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `actor <id> <label> [kind=<person\|system>] [side=<left\|right>] [tone=<oneOf>] [mark=<ref>] [emph]` | top level | An actor: a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. | `actor customer "Customer"` |
| `subject <id> <label> [tone=<oneOf>]` | top level | A subject: the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it. | `subject shop "Online shop"` |
| `usecase <id> <label> [in <ref>] [points=<text>] [form=<ellipse\|classifier>] [stereotype=<text>] [tone=<oneOf>] [mark=<ref>] [emph]` | top level | A use case: an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. | `usecase order "Place order" in shop points="before checkout"` |
| `rel <from> <arrow> <to> [label] [source=<multiplicity>] [card=<multiplicity>] [when=<text>] [at=<text>] [include] [extend] [emph]` | top level | A relation, read from `from` to `to`. | `rel customer -- order source=1 card=0..*` |
| `note <text> [on <ref>]` | top level | A comment on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. | `note "Only private customers" on shop` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `rel`: `--` association between an actor and a use case, `-|>` generalization from the special to the general actor or use case, hollow triangle at the general one, `-->` include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend`.

The rules of `usecase` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `U421` | error | `include` and `extend` join two use cases, never an actor. An actor takes part through an association `--`. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend. |
| `U422` | error | An association joins an actor with a use case: not two actors, not two use cases, not an element with itself. UML 2.5.1: 18.1.3.1 Association of an actor with a use case. |
| `U423` | error | A generalization joins an actor with an actor or a use case with a use case, never one with itself, and runs in no cycle: the triangle points at the more general one. UML 2.5.1: 9.2.3.2 Generalization between actors or between use cases. |
| `U424` | error | The extension points named by `at=` of an `extend` belong to the extended use case `to`, and the points of one use case have distinct names. UML 2.5.1: 18.1.3.2 Extension point, 18.1.3.2 Extend. |
| `U425` | error | A use case includes itself neither directly nor through others. The arrow points from the base to the included case. UML 2.5.1: 18.1.3.3 Include. |
| `U426` | error | `-->` names exactly one of the flags `include` and `extend`; `--` and `-\|>` name neither. Multiplicities `source=` and `card=` belong to associations, `when=` and `at=` to `extend`. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend, 18.1.3.1 Multiplicity at an end of that association, 18.1.3.2 Condition of an extend. |
| `U427` | error | `«include»` and `«extend»` mark relations, `«actor»` an actor and `«subsystem»` a subject. As the stereotype of a use case the picture claims something the model is not. UML 2.5.1: 18.1.4 Keyword or stereotype above a use case. |
| `U428` | error | A note in a use case diagram is a comment on one element: it names its actor, use case or subject with `on`. UML 2.5.1: 7.2.3.2 Comment (note). |
| `U920` | warning | UML allows use cases without a subject, but in a diagram with one, exam practice expects every use case inside it. UML 2.5.1: 18.1.3.1 Subject a use case applies to. |
| `U921` | warning | A use case yields a result for an actor. It is reached when an actor takes part in it, or through `include`, `extend` or a generalization from a reached use case; otherwise an association is probably missing. UML 2.5.1: 18.1.3.1 Association of an actor with a use case. |
| `U922` | warning | In UML the condition of an `extend` is optional; without it the extension always applies. Exam practice asks for it, and for the extension point when the extended use case has some. UML 2.5.1: 18.1.3.2 Condition of an extend, 18.1.3.2 Extension point. |
| `U923` | warning | An actor without an association or generalization takes part in nothing, and a diagram without actors describes no use of the system. Both are valid UML. UML 2.5.1: 18.1.3.1 Actor. |
| `U924` | warning | Between two use cases behaviour is either always part (`include`) or optional (`extend`), not both; usually one direction is swapped. UML 2.5.1: 18.1.3.3 Include, 18.1.3.2 Extend. |
| `U926` | warning | A subject encloses the use cases of its system. Without one it has no content and is not drawn; a note on it finds no frame. UML 2.5.1: 18.1.3.1 Subject a use case applies to. |
| `U927` | warning | `direction=` places several subjects side by side or below each other; with fewer than two it changes nothing. |

## Kind `activity`

A UML activity diagram (UML 2.5.1, chapters 15 and 16): nodes and edges in layers from top to bottom, one vertical swimlane per `partition`. Diagrist lays it out by itself: layers by the longest path, alternatives symmetric below their decision, parallel branches side by side below their fork, a hand-over into another lane level and horizontal when its line is free, loops back up on the right. Full reference: `dgr grammar activity`.

```text
diagram activity "Title" [subtitle=<text>] [look=<plain|cards>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `partition <id> <label> [tone=<oneOf>]` | top level | A partition, drawn as a vertical swimlane with its name in a head. | `partition customer "Customer"` |
| `interruptible <id> [label]` | top level | An interruptible activity region: a dashed, rounded frame around the nodes with `interruptible=id`. | `interruptible cancel "Cancellation by the customer"` |
| `expansion <id> [label] [mode=<iterative\|parallel\|stream>] [input=<text>] [output=<text>]` | top level | An expansion region: a dashed, rounded frame around the nodes with `expansion=id`, run once per element of a collection, with its mode as `«iterative»`, `«parallel»` or `«stream»` at the top left. | `expansion each "Check every item" mode=parallel` |
| `initial <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | An initial node: a filled circle where the flow starts. | `initial start in customer` |
| `final <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | An activity final node: a circle with a filled core. | `final done in customer` |
| `flowfinal <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | A flow final node: a circle with a cross. | `flowfinal mailed` |
| `action <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>] [input=<text>] [output=<text>] [call]` | top level | An action: a rounded box with its text; texts wider than 208 pixels wrap into two lines. | `action order "Place order" in customer` |
| `decision <id> [question] [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | A decision node: a diamond with one incoming edge and alternatives going out, each with a guard on its `go`. | `decision stock "Enough stock?" in warehouse` |
| `merge <id> [label] [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | A merge node: a diamond that brings alternative branches together without waiting for each other, with exactly one outgoing edge. | `merge together in support` |
| `fork <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | A fork node: a bar across the flow that starts all its outgoing branches at the same time. | `fork split in warehouse` |
| `join <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | A join node: a bar across the flow that waits for all incoming branches and then continues on its one outgoing edge. | `join done in service` |
| `object <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>] [state=<text>]` | top level | An object node: a rectangle with the object type, its state below in brackets. | `object invoice "Invoice" state="open" in billing` |
| `datastore <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>]` | top level | A data store: an object node with `«datastore»` above its name, whose data outlive the activity. | `datastore accounts "Customer accounts" in payment` |
| `buffer <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>]` | top level | A central buffer: an object node with `«centralBuffer»` above its name that collects objects from several flows. | `buffer receipts "Receipts" in accounting` |
| `send <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>] [input=<text>]` | top level | A send signal action: a pentagon pointing right with the signal. | `send refusal "Refusal" in service` |
| `accept <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<oneOf>] [mark=<ref>] [output=<text>]` | top level | An accept event action: a box with a notch on the left that waits for a signal. | `accept cancel "Cancellation requested" in warehouse interruptible=cancel` |
| `wait <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>]` | top level | An accept time event action: an hourglass with the time beside it; the flow waits there until the time has come. | `wait period "14 days" in billing` |
| `go <from> <arrow> <to> [guard] [pin=<text>] [weight=<number>] [else]` | top level | An activity edge from `from` to `to`. | `go start -> order` |
| `handler <protected> <arrow> <handler> <exception>` | top level | An exception handler: when the protected action throws an exception of the type, the handler action takes over, and the flow goes on at the output of the protected action. | `handler capture -> open "Direct debit refused"` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `go`: `->` control flow, `=>` object flow, with an object node or pin at one end at least, `~>` interrupting edge out of an interruptible region, drawn with a lightning bolt.

The rules of `activity` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `U430` | error | An initial node has no incoming edge, an activity final and a flow final node have no outgoing one. UML 2.5.1: 15.3.3.1 Initial node, 15.3.3.2 Activity final node, ending every flow, 15.3.3.2 Flow final node, ending one flow. |
| `U431` | error | A decision has one incoming edge; bringing flows together is the job of a merge in front of it. UML 2.5.1: 15.3.3.6 Decision node. |
| `U432` | error | A merge and a join have exactly one outgoing edge, a fork exactly one incoming edge. UML 2.5.1: 15.3.3.5 Merge node, 15.3.3.4 Join node, 15.3.3.3 Fork node. |
| `U433` | error | The guards of a decision exclude each other, so none appears twice, and `else` appears at most once and only on an edge out of a decision. UML 2.5.1: 15.2.3.3 Guard on an activity edge, 15.3.3.6 Predefined guard else. |
| `U434` | error | A control flow touches no object node, and an object flow has an object node, a pin or a control node it passes at one end at least. UML 2.5.1: 15.2.3.3 Control flow, 15.2.3.4 Object flow. |
| `U435` | error | A join waits for all its incoming edges. When they come from alternatives of one decision, only one of them runs and the activity hangs; a merge is meant. UML 2.5.1: 15.3.3.4 Join node. |
| `U437` | error | An interrupting edge `~>` starts inside an interruptible region and ends outside it. UML 2.5.1: 15.6.3.2 Edge that interrupts its region. |
| `U455` | error | Pins are named object nodes of an action: a name stands once per side, and `pin=` on an object flow names an output pin of its source or an input pin of its target, or a named expansion node. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |
| `U456` | error | An exception handler joins two different actions. The handler action has no edges of its own, no input pin besides the exception pin, and as many output pins as the protected action: after it the flow goes on at the output of the protected action. UML 2.5.1: 15.5.3.1 Exception handler of an executable node. |
| `U457` | error | An expansion region gets the collection it runs over as an object flow `=>` from outside into each of its inputs. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |
| `U458` | error | Expansion nodes are object nodes: only object flows `=>` start or end at an expansion region. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |
| `U930` | warning | UML allows no initial node or several; exam practice expects exactly one. UML 2.5.1: 15.3.3.1 Initial node. |
| `U931` | warning | UML asks for one outgoing edge at least; a decision with fewer than two decides nothing. UML 2.5.1: 15.3.3.6 Decision node. |
| `U932` | warning | A merge or join with fewer than two incoming edges, and a fork with fewer than two outgoing ones, has no effect. UML 2.5.1: 15.3.3.5 Merge node, 15.3.3.4 Join node, 15.3.3.3 Fork node. |
| `U933` | warning | Every alternative of a decision needs a guard; otherwise it is open when it applies. UML 2.5.1: 15.2.3.3 Guard on an activity edge. |
| `U934` | warning | The guards of a decision should cover every case together. Without `else` that shows only for obvious pairs such as yes and no; otherwise the flow may stop. UML 2.5.1: 15.2.3.3 Guard on an activity edge, 15.3.3.6 Predefined guard else. |
| `U935` | warning | Every node should be reachable from a start: an initial node, or an accept event, time event or data store without incoming edge, which start a flow from outside. A handler counts when the action it protects does. |
| `U936` | warning | UML allows an activity without end; exam practice expects one. A node without outgoing edge that is no end lets its flow run out; after a handler the flow goes on at its protected action. UML 2.5.1: 15.3.3.2 Activity final node, ending every flow, 15.3.3.2 Flow final node, ending one flow. |
| `U937` | warning | A merge does not synchronize: when its incoming edges come from parallel branches of a fork, everything after it runs several times. Valid UML, but usually a join is meant. UML 2.5.1: 15.3.3.5 Merge node. |
| `U938` | warning | An activity final ends every flow. When two parallel branches end in an activity final each without a join, the faster one stops the other: the main branch ends with `final`, side branches with `flowfinal`. UML 2.5.1: 15.3.3.2 Activity final node, ending every flow. |
| `U939` | warning | An action with several incoming edges waits for all of them (implicit join), with several outgoing ones it starts all of them (implicit fork). Usually a merge or a decision is meant. Object flows at pins do not count: each pin is an object node of its own. UML 2.5.1: 16.2.3.1 Action. |
| `U955` | warning | An interruptible region without an interrupting edge `~>` interrupts nothing: usually the edge is missing, or the frame only groups. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `U956` | warning | An edge that crosses the frame of an expansion region without an expansion node is valid UML, but leaves open whether it acts once per element or once for the whole region. The way through the input or output is clearer. UML 2.5.1: 16.12.3 Expansion region. |
| `U957` | warning | An expansion region without nodes, or without an edge from its input inside, processes nothing: usually `expansion=` on the nodes or `go region => first` is missing. UML 2.5.1: 16.12.3 Expansion region. |

## Kind `context`

A C4 system context diagram (level 1): the system as one box, the people who use it and the systems around it, placed in a named grid. Full reference: `dgr grammar context`.

```text
diagram context "Title" [subtitle=<text>] [label=<text>] [look=<plain|cards|blocks>] [layout=<adaptive>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `grid <axis> <names>` | top level | The named columns from left to right, or the rows from top to bottom. | `grid cols user,backend.1,backend.2,edge` |
| `layer <row> <label>` | top level | Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`. | `layer business "Business logic"` |
| `group <id> <title> [in <ref>] [team=<text>] [heading=<top\|side>] [tag=<text>] [cover=<grid-name>] [tone=<oneOf>] [own] [shared] [external]` | top level | A frame around elements by responsibility; it grows from its members. | `group backend "Backend" own team="Spring Boot · Team Radverleih"` |
| `style <id> [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>]` | top level | Named values for elements, and a tone for edges, so sizes and colours stand in one place. | `style component height=80` |
| `person <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A person who uses the system, drawn as a stick figure with name and role below it. | `person customer "Customer" tech="account holder" at user/main` |
| `system <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A software system, as a box with name and a second line. | `system shop "Web shop" tech="sells online" at core/main emph mark=E1` |
| `node <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A neutral element for any level, such as a queue, a job or a layer of a pattern. | `node orders "Orders" tech="business logic" replicas=3 at web/business in cloud` |
| `edge <from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<oneOf>] [style=<ref>]` | top level | An edge outside of flows, without number. | `edge abgleich => db "check inventory" schedule="daily 03:00"` |
| `flow <id> [primary] [accent]` | top level | A numbered path: its steps are indented below it. | `flow import primary` |
| `note <text> [on <ref>]` | top level | A dashed note above an element, with a tip pointing at it. | `note "replaced in Q3" on portal` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `edge`: `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end).

The rules of `context` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `A001` | error | A note names the element it points at with `on`. |
| `A007` | error | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| `A008` | error | Every element has a place in the grid with `at column/row`. |
| `A103` | error | Column and row of `at` are names of the grid. |
| `A105` | error | An edge connects two different elements or groups. |
| `A106` | error | Every column and every row is named once. |
| `A107` | error | An edge does not lead from an element to the group that holds it, or back. |
| `A109` | error | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| `A710` | warning | An edge says what happens: a label or a protocol (`via=`). |
| `A801` | warning | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |

## Kind `container`

A C4 container diagram (level 2): the applications and data stores of a system, grouped by responsibility, placed in a named grid. Full reference: `dgr grammar container`.

```text
diagram container "Title" [subtitle=<text>] [label=<text>] [look=<plain|cards|blocks>] [layout=<adaptive>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `grid <axis> <names>` | top level | The named columns from left to right, or the rows from top to bottom. | `grid cols user,backend.1,backend.2,edge` |
| `layer <row> <label>` | top level | Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`. | `layer business "Business logic"` |
| `group <id> <title> [in <ref>] [team=<text>] [heading=<top\|side>] [tag=<text>] [cover=<grid-name>] [tone=<oneOf>] [own] [shared] [external]` | top level | A frame around elements by responsibility; it grows from its members. | `group backend "Backend" own team="Spring Boot · Team Radverleih"` |
| `style <id> [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>]` | top level | Named values for elements, and a tone for edges, so sizes and colours stand in one place. | `style component height=80` |
| `person <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A person who uses the system, drawn as a stick figure with name and role below it. | `person customer "Customer" tech="account holder" at user/main` |
| `system <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A software system, as a box with name and a second line. | `system shop "Web shop" tech="sells online" at core/main emph mark=E1` |
| `container <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A container: an application or data store that runs on its own, such as a service or a database. | `container db "Database" tech="PostgreSQL" icon=postgresql at infra/data in infra` |
| `node <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A neutral element for any level, such as a queue, a job or a layer of a pattern. | `node orders "Orders" tech="business logic" replicas=3 at web/business in cloud` |
| `edge <from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<oneOf>] [style=<ref>]` | top level | An edge outside of flows, without number. | `edge abgleich => db "check inventory" schedule="daily 03:00"` |
| `flow <id> [primary] [accent]` | top level | A numbered path: its steps are indented below it. | `flow import primary` |
| `note <text> [on <ref>]` | top level | A dashed note above an element, with a tip pointing at it. | `note "replaced in Q3" on portal` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `edge`: `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end).

The rules of `container` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `A001` | error | A note names the element it points at with `on`. |
| `A007` | error | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| `A008` | error | Every element has a place in the grid with `at column/row`. |
| `A103` | error | Column and row of `at` are names of the grid. |
| `A105` | error | An edge connects two different elements or groups. |
| `A106` | error | Every column and every row is named once. |
| `A107` | error | An edge does not lead from an element to the group that holds it, or back. |
| `A109` | error | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| `A710` | warning | An edge says what happens: a label or a protocol (`via=`). |
| `A801` | warning | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |

## Kind `component`

A C4 component diagram (level 3): the components inside a container and what they depend on, placed in a named grid. Full reference: `dgr grammar component`.

```text
diagram component "Title" [subtitle=<text>] [label=<text>] [look=<plain|cards|blocks>] [layout=<adaptive>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `grid <axis> <names>` | top level | The named columns from left to right, or the rows from top to bottom. | `grid cols user,backend.1,backend.2,edge` |
| `layer <row> <label>` | top level | Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`. | `layer business "Business logic"` |
| `group <id> <title> [in <ref>] [team=<text>] [heading=<top\|side>] [tag=<text>] [cover=<grid-name>] [tone=<oneOf>] [own] [shared] [external]` | top level | A frame around elements by responsibility; it grows from its members. | `group backend "Backend" own team="Spring Boot · Team Radverleih"` |
| `style <id> [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>]` | top level | Named values for elements, and a tone for edges, so sizes and colours stand in one place. | `style component height=80` |
| `person <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A person who uses the system, drawn as a stick figure with name and role below it. | `person customer "Customer" tech="account holder" at user/main` |
| `container <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A container: an application or data store that runs on its own, such as a service or a database. | `container db "Database" tech="PostgreSQL" icon=postgresql at infra/data in infra` |
| `component <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A component inside a container, such as a module or an adapter. | `component api "REST API" tech="Spring Boot" icon=springboot at backend.2/main in backend` |
| `node <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<oneOf>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<oneOf>] [form=<card\|circle\|text>] [status=<planned\|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]` | top level | A neutral element for any level, such as a queue, a job or a layer of a pattern. | `node orders "Orders" tech="business logic" replicas=3 at web/business in cloud` |
| `edge <from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<oneOf>] [style=<ref>]` | top level | An edge outside of flows, without number. | `edge abgleich => db "check inventory" schedule="daily 03:00"` |
| `flow <id> [primary] [accent]` | top level | A numbered path: its steps are indented below it. | `flow import primary` |
| `note <text> [on <ref>]` | top level | A dashed note above an element, with a tip pointing at it. | `note "replaced in Q3" on portal` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `edge`: `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end).

The rules of `component` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `A001` | error | A note names the element it points at with `on`. |
| `A007` | error | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| `A008` | error | Every element has a place in the grid with `at column/row`. |
| `A103` | error | Column and row of `at` are names of the grid. |
| `A105` | error | An edge connects two different elements or groups. |
| `A106` | error | Every column and every row is named once. |
| `A107` | error | An edge does not lead from an element to the group that holds it, or back. |
| `A109` | error | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| `A710` | warning | An edge says what happens: a label or a protocol (`via=`). |
| `A801` | warning | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |

## Diagnostic codes

The letter of a code names who reports it. Messages show values as `{name}`; in `--json` they are the `values` of the diagnostic. These come from the language:

| Code | Message |
|---|---|
| `L001` | Text is missing its closing quote. |
| `L002` | A line starts with a keyword, not with {found}. |
| `L003` | Indent with spaces, not tabs. |
| `L004` | Attribute {key} is set twice; the last value wins. |
| `L100` | A diagram starts with `diagram {kind} "Title"`. Registered kinds: {allowed}. Example: `{example}` |
| `L101` | Unknown keyword `{found}` here; did you mean `{suggestion}`? Allowed: {allowed}. |
| `L102` | `{statement}` needs {name}: {expected}. Example: `{example}` |
| `L103` | `{found}` is not valid for {name}; expected {expected}. |
| `L104` | `{found}` is not expected in `{statement}`. Allowed after the arguments: {allowed}. Example: `{example}` |
| `L105` | `{statement}` has no attribute `{key}`. Allowed: {allowed}. |
| `L106` | `{statement}` takes no indented lines without a keyword. Allowed child keywords: {allowed}. |
| `L107` | `{found}` is not declared; {name} must be {expected}. Declared: {known}. |
| `L108` | The id `{found}` is already declared in line {first}. Ids are unique within a diagram. |

These come from the kernel:

| Code | Message |
|---|---|
| `G400` | `{first}` overlaps `{second}`. Shorten a text, or change what the layout places here. |
| `G401` | `{key}` reaches outside the picture. |
| `G402` | `{key}` does not fit into `{within}`. Shorten the text or give `{within}` more room. |
| `K100` | No plugin draws the diagram kind `{found}`. Registered kinds: {allowed}. A diagram starts with `diagram <kind> "Title"`. |
| `K101` | The kind `{kind}` is registered twice, by {plugins}; the first one is used. |
| `K102` | The picture uses the icon `{icon}`, which the style table does not have. Icons: {known}. |
