<!-- Generated from the statement tables and the rules of `activity` by `pnpm docs:generate`. Do not edit. -->

# Kind `activity`

A UML activity diagram (UML 2.5.1, chapters 15 and 16): nodes and edges in layers from top to bottom, one vertical swimlane per `partition`. Diagrist lays it out by itself: layers by the longest path, alternatives symmetric below their decision, parallel branches side by side below their fork, a hand-over into another lane level and horizontal when its line is free, loops back up on the right. Full reference with every argument: `dgr grammar activity --json`.

```text
diagram activity "Title" [subtitle=<text>] [look=<plain|cards>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `partition <id> <label> [tone=<choice>] [area=<ref>]` | top level | A partition, drawn as a vertical swimlane with its name in a head. | `partition customer "Customer"` |
| `interruptible <id> [label]` | top level | An interruptible activity region: a dashed, rounded frame around the nodes with `interruptible=id`. | `interruptible cancel "Cancellation by the customer"` |
| `expansion <id> [label] [mode=<iterative\|parallel\|stream>] [input=<text>] [output=<text>]` | top level | An expansion region: a dashed, rounded frame around the nodes with `expansion=id`, run once per element of a collection, with its mode as `«iterative»`, `«parallel»` or `«stream»` at the top left. | `expansion each "Check every item" mode=parallel` |
| `initial <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | An initial node: a filled circle where the flow starts. | `initial start in customer` |
| `final <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | An activity final node: a circle with a filled core. | `final done in customer` |
| `flowfinal <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | A flow final node: a circle with a cross. | `flowfinal mailed` |
| `action <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>] [input=<text>] [output=<text>] [call]` | top level | An action: a rounded box with its text; texts wider than 208 pixels wrap into two lines. | `action order "Place order" in customer` |
| `decision <id> [question] [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | A decision node: a diamond with one incoming edge and alternatives going out, each with a guard on its `go`. | `decision stock "Enough stock?" in warehouse` |
| `merge <id> [label] [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | A merge node: a diamond that brings alternative branches together without waiting for each other, with exactly one outgoing edge. | `merge together in support` |
| `fork <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | A fork node: a bar across the flow that starts all its outgoing branches at the same time. | `fork split in warehouse` |
| `join <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | A join node: a bar across the flow that waits for all incoming branches and then continues on its one outgoing edge. | `join done in service` |
| `object <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>] [state=<text>]` | top level | An object node: a rectangle with the object type, its state below in brackets. | `object invoice "Invoice" state="open" in billing` |
| `datastore <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>]` | top level | A data store: an object node with `«datastore»` above its name, whose data outlive the activity. | `datastore accounts "Customer accounts" in payment` |
| `buffer <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>]` | top level | A central buffer: an object node with `«centralBuffer»` above its name that collects objects from several flows. | `buffer receipts "Receipts" in accounting` |
| `send <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>] [input=<text>]` | top level | A send signal action: a pentagon pointing right with the signal. | `send refusal "Refusal" in service` |
| `accept <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>] [tone=<choice>] [mark=<ref>] [output=<text>]` | top level | An accept event action: a box with a notch on the left that waits for a signal. | `accept cancel "Cancellation requested" in warehouse interruptible=cancel` |
| `wait <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [area=<ref>]` | top level | An accept time event action: an hourglass with the time beside it; the flow waits there until the time has come. | `wait period "14 days" in billing` |
| `go <from> <arrow> <to> [guard] [area=<ref>] [pin=<text>] [weight=<number>] [else]` | top level | An activity edge from `from` to `to`. | `go start -> order` |
| `handler <protected> <arrow> <handler> <exception>` | top level | An exception handler: when the protected action throws an exception of the type, the handler action takes over, and the flow goes on at the output of the protected action. | `handler capture -> open "Direct debit refused"` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `go`: `->` control flow, `=>` object flow, with an object node or pin at one end at least, `~>` interrupting edge out of an interruptible region, drawn with a lightning bolt.

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

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
