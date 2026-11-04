<!-- Generated from the statement tables and the rules of `sequence` by `pnpm docs:generate`. Do not edit. -->

# Kind `sequence`

A UML sequence diagram (UML 2.5.1, chapter 17): lifelines from left to right in source order, messages and fragments from top to bottom. Fragments nest by indentation. Full reference with every argument: `dgr grammar sequence --json`.

```text
diagram sequence "Title" [subtitle=<text>] [look=<plain|cards>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `participant <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as a box, from left to right in source order. | `participant api "api-service" stereotype="service"` |
| `actor <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as a stick figure, from left to right in source order. | `actor customer "Customer"` |
| `database <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as a cylinder, from left to right in source order. | `database db "Orders DB"` |
| `queue <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as a horizontal tube, from left to right in source order. | `queue broker "Kafka"` |
| `boundary <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as the boundary symbol of robustness analysis, from left to right in source order. | `boundary form "Order form"` |
| `control <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as the control symbol of robustness analysis, from left to right in source order. | `control checkout "Checkout"` |
| `entity <id> <label> [stereotype=<text>] [tone=<choice>] [area=<ref>] [external]` | top level | A lifeline drawn as the entity symbol of robustness analysis, from left to right in source order. | `entity order "Order"` |
| `autonumber` | top level | Numbers all messages in source order (1, 2, 3 ...), across fragments; the number stands before the label. | `autonumber` |
| `frame [label]` | top level | A frame around the whole interaction with `sd Name` in its tag. | `frame "OAuth callback"` |
| `msg <from> <arrow> <to> [label] [area=<ref>] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A message in source order; its arrow says what kind. | `msg client -> api "GET /orders" id=request` |
| `create <from> <arrow> <to> [label] [area=<ref>] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A creation message: dashed with an open head, and the head of the receiver stands at its height. | `create client -> meter "new MeterData()"` |
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
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `msg`: `->` synchronous call (filled head), `~>` asynchronous message (open head), `-->` reply (dashed, open head).

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

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
