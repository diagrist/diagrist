<!-- Generated from the statement tables of the kind `activity` (plugin `uml`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `activity`

A UML activity diagram (UML 2.5.1, chapters 15 and 16): nodes and edges in layers from top to bottom, one vertical swimlane per `partition`. Diagrist lays it out by itself: layers by the longest path, alternatives symmetric below their decision, parallel branches side by side below their fork, a hand-over into another lane level and horizontal when its line is free, loops back up on the right.

This page lists everything an `activity` diagram may contain. The same grammar is available as data with `dgr grammar activity --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram activity "Title" [subtitle=<text>] [look=<plain|cards>] [locale=<en|de>]
```

Every activity diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `look=` | attribute | one of `plain`, `cards` | `plain` (default) draws the UML notation, `cards` the same layout with actions, objects and signals as cards and toned lane heads; start, ends, diamonds, bars and hourglass stay UML symbols. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram activity "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them.

| Statement | Where | What it does |
|---|---|---|
| [`partition`](#partition) | top level | A partition, drawn as a vertical swimlane with its name in a head. |
| [`interruptible`](#interruptible) | top level | An interruptible activity region: a dashed, rounded frame around the nodes with `interruptible=id`. |
| [`expansion`](#expansion) | top level | An expansion region: a dashed, rounded frame around the nodes with `expansion=id`, run once per element of a collection, with its mode as `«iterative»`, `«parallel»` or `«stream»` at the top left. |
| [`initial`](#initial) | top level | An initial node: a filled circle where the flow starts. |
| [`final`](#final) | top level | An activity final node: a circle with a filled core. |
| [`flowfinal`](#flowfinal) | top level | A flow final node: a circle with a cross. |
| [`action`](#action) | top level | An action: a rounded box with its text; texts wider than 208 pixels wrap into two lines. |
| [`decision`](#decision) | top level | A decision node: a diamond with one incoming edge and alternatives going out, each with a guard on its `go`. |
| [`merge`](#merge) | top level | A merge node: a diamond that brings alternative branches together without waiting for each other, with exactly one outgoing edge. |
| [`fork`](#fork) | top level | A fork node: a bar across the flow that starts all its outgoing branches at the same time. |
| [`join`](#join) | top level | A join node: a bar across the flow that waits for all incoming branches and then continues on its one outgoing edge. |
| [`object`](#object) | top level | An object node: a rectangle with the object type, its state below in brackets. |
| [`datastore`](#datastore) | top level | A data store: an object node with `«datastore»` above its name, whose data outlive the activity. |
| [`buffer`](#buffer) | top level | A central buffer: an object node with `«centralBuffer»` above its name that collects objects from several flows. |
| [`send`](#send) | top level | A send signal action: a pentagon pointing right with the signal. |
| [`accept`](#accept) | top level | An accept event action: a box with a notch on the left that waits for a signal. |
| [`wait`](#wait) | top level | An accept time event action: an hourglass with the time beside it; the flow waits there until the time has come. |
| [`go`](#go) | top level | An activity edge from `from` to `to`. |
| [`handler`](#handler) | top level | An exception handler: when the protected action throws an exception of the type, the handler action takes over, and the flow goes on at the output of the protected action. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `partition`

```text
partition <id> <label> [tone=<choice>]
```

A partition, drawn as a vertical swimlane with its name in a head. Lanes stand from left to right in source order; nodes join one with `in`. Without any partition the activity has one invisible lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane).

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `in` uses for this lane. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Who is responsible, such as a role or a system. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the lane head in `look=cards`; without it slate. |

Examples:

```dgr
partition customer "Customer"
partition billing "Billing" tone=purple
```

### `interruptible`

```text
interruptible <id> [label]
```

An interruptible activity region: a dashed, rounded frame around the nodes with `interruptible=id`. An interrupting edge `~>` leaving it stops everything inside. The name stands small at the top left of the frame where there is room, otherwise one line lower, at the bottom, wrapped, or only in the description. UML 2.5.1: 15.6.3.2 Interruptible activity region.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `interruptible=` on nodes uses for this region. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the region. |

Example:

```dgr
interruptible cancel "Cancellation by the customer"
```

### `expansion`

```text
expansion <id> [label] [mode=<iterative|parallel|stream>] [input=<text>] [output=<text>]
```

An expansion region: a dashed, rounded frame around the nodes with `expansion=id`, run once per element of a collection, with its mode as `«iterative»`, `«parallel»` or `«stream»` at the top left. Its id in `go` stands for its expansion nodes, rows of four small boxes on the frame: `go a => region` from outside ends at the input on the top edge, `go region => x` inside starts there; `go y => region` from inside ends at the output on the bottom edge, `go region => b` outside starts there. The output is drawn only when an edge uses it. UML 2.5.1: 16.12.3 Expansion region, 16.12.3 Expansion node on the border of its region.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `expansion=` on nodes and the ends of `go` use for this region. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the region, beside its mode. |
| `mode=` | attribute | one of `iterative`, `parallel`, `stream` | How the elements run: `iterative` (default) one after the other, `parallel` at the same time, `stream` as a stream. UML 2.5.1: `iterative` 16.12.3 Expansion mode iterative; `parallel` 16.12.3 Expansion mode parallel; `stream` 16.12.3 Expansion mode stream. |
| `input=` | attribute | a text in double quotes like `"Order service"` | Named inputs separated by commas, side by side on the top edge; `pin=` on `go` picks one. Without it the region has one unnamed input. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |
| `output=` | attribute | a text in double quotes like `"Order service"` | Named outputs separated by commas, side by side on the bottom edge; `pin=` on `go` picks one. Without it the region has at most one unnamed output. UML 2.5.1: 16.12.3 Expansion node on the border of its region. |

Examples:

```dgr
expansion each "Check every item" mode=parallel
expansion prices "Price per item" input="Items, Price list" output="Prices, Errors"
```

### `initial`

```text
initial <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

An initial node: a filled circle where the flow starts. It has no text and no incoming edge. UML 2.5.1: 15.3.3.1 Initial node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
initial start in customer
```

### `final`

```text
final <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

An activity final node: a circle with a filled core. The first token to reach it ends the whole activity, every parallel branch included. It has no text and no outgoing edge. UML 2.5.1: 15.3.3.2 Activity final node, ending every flow.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
final done in customer
```

### `flowfinal`

```text
flowfinal <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

A flow final node: a circle with a cross. It ends only the branch that reaches it, the rest of the activity goes on. It has no text and no outgoing edge. UML 2.5.1: 15.3.3.2 Flow final node, ending one flow.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
flowfinal mailed
```

### `action`

```text
action <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>] [input=<text>] [output=<text>] [call]
```

An action: a rounded box with its text; texts wider than 208 pixels wrap into two lines. `input=` and `output=` put pins on its edges, `call` marks a call behavior action with a rake at the bottom right. An action with several incoming or outgoing edges waits for all of them or starts all of them; a `merge` or `decision` usually says what is meant. UML 2.5.1: 16.2.3.1 Action.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | What is done, as a verb phrase. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |
| `input=` | attribute | a text in double quotes like `"Order service"` | Input pins by object type, separated by commas like `"Order, Amount"`; small squares on the top edge, the type beside each. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |
| `output=` | attribute | a text in double quotes like `"Order service"` | Output pins by object type, separated by commas like `"Order, Amount"`; small squares on the bottom edge, the type beside each. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |
| `call` | flag |  | Calls an activity of its own (call behavior action): a rake at the bottom right of the box. UML 2.5.1: 16.3.4.1 Call behavior action with the rake symbol. |

Examples:

```dgr
action order "Place order" in customer
action invoice "Create invoice" in billing output="Invoice" call
```

### `decision`

```text
decision <id> [question] [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

A decision node: a diamond with one incoming edge and alternatives going out, each with a guard on its `go`. The optional question stands at the top beside the diamond. The outermost alternatives leave at the left and right corner, the others at the bottom. The decision bar below the picture is `adr`, not `decision`. UML 2.5.1: 15.3.3.6 Decision node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `[question]` | optional argument | a text in double quotes like `"Order service"` | Question the guards answer, shown beside the diamond. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Examples:

```dgr
decision stock "Enough stock?" in warehouse
decision paid
```

### `merge`

```text
merge <id> [label] [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

A merge node: a diamond that brings alternative branches together without waiting for each other, with exactly one outgoing edge. Branches leave a decision; parallel branches of a `fork` meet in a `join` instead. UML 2.5.1: 15.3.3.5 Merge node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Text beside the diamond. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
merge together in support
```

### `fork`

```text
fork <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

A fork node: a bar across the flow that starts all its outgoing branches at the same time. It has exactly one incoming edge; the bar is as wide as the branches below it. UML 2.5.1: 15.3.3.3 Fork node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
fork split in warehouse
```

### `join`

```text
join <id> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

A join node: a bar across the flow that waits for all incoming branches and then continues on its one outgoing edge. Alternatives of a decision meet in a `merge`; a join would wait forever for the branch not taken. UML 2.5.1: 15.3.3.4 Join node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
join done in service
```

### `object`

```text
object <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>] [state=<text>]
```

An object node: a rectangle with the object type, its state below in brackets. Only object flows `=>` touch it. UML 2.5.1: 15.4.3.1 Object node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Type of the object. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |
| `state=` | attribute | a text in double quotes like `"Order service"` | State of the object, drawn as `[state]` below the type. UML 2.5.1: 15.4.4.1 States of an object node in brackets below its name. |

Example:

```dgr
object invoice "Invoice" state="open" in billing
```

### `datastore`

```text
datastore <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>]
```

A data store: an object node with `«datastore»` above its name, whose data outlive the activity. A data store without incoming edge counts as a start. UML 2.5.1: 15.4.3.4 Data store node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the store. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |

Example:

```dgr
datastore accounts "Customer accounts" in payment
```

### `buffer`

```text
buffer <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>]
```

A central buffer: an object node with `«centralBuffer»` above its name that collects objects from several flows. UML 2.5.1: 15.4.3.3 Central buffer node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of what is buffered. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |

Example:

```dgr
buffer receipts "Receipts" in accounting
```

### `send`

```text
send <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>] [input=<text>]
```

A send signal action: a pentagon pointing right with the signal. It may take input pins, never output pins. UML 2.5.1: 16.3.3.2 Send signal action.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | The signal that is sent. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |
| `input=` | attribute | a text in double quotes like `"Order service"` | Input pins by object type, separated by commas like `"Order, Amount"`; small squares on the top edge, the type beside each. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |

Example:

```dgr
send refusal "Refusal" in service
```

### `accept`

```text
accept <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>] [tone=<choice>] [mark=<ref>] [output=<text>]
```

An accept event action: a box with a notch on the left that waits for a signal. It may give output pins, never input pins. Without an incoming edge it starts a flow of its own, such as the trigger of an interruptible region. UML 2.5.1: 16.10.3.1 Accept event action.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | The signal it waits for. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node. |
| `output=` | attribute | a text in double quotes like `"Order service"` | Output pins by object type, separated by commas like `"Order, Amount"`; small squares on the bottom edge, the type beside each. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |

Example:

```dgr
accept cancel "Cancellation requested" in warehouse interruptible=cancel
```

### `wait`

```text
wait <id> <label> [in <ref>] [interruptible=<ref>] [expansion=<ref>]
```

An accept time event action: an hourglass with the time beside it; the flow waits there until the time has come. Without an incoming edge it starts a flow at that time. UML 2.5.1: 16.10.4 Accept time event action drawn as an hourglass.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `handler` and `in` use for this node. |
| `<label>` | argument | a text in double quotes like `"Order service"` | The time or period, such as `"14 days"` or `"every Monday"`. |
| `in <ref>` | clause | the id of a `partition` declared in this diagram | The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane. UML 2.5.1: 15.6.3.1 Activity partition (swimlane). |
| `interruptible=` | attribute | the id of an `interruptible` declared in this diagram | The interruptible region the node belongs to; its dashed frame is drawn around all members. UML 2.5.1: 15.6.3.2 Interruptible activity region. |
| `expansion=` | attribute | the id of an `expansion` declared in this diagram | The expansion region the node belongs to, run once per element. UML 2.5.1: 16.12.3 Expansion region. |

Example:

```dgr
wait period "14 days" in billing
```

### `go`

```text
go <from> <arrow> <to> [guard] [pin=<text>] [weight=<number>] [else]
```

An activity edge from `from` to `to`. `->` is a control flow, `=>` an object flow, `~>` an interrupting edge that leaves an interruptible region. The guard is written without brackets and drawn as `[guard]` at the start of the edge; the flag `else` is the predefined guard `[else]`. Edges run down through the layers; an edge back up runs around the nodes on the right.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of an `initial`, `final`, `flowfinal`, `action`, `decision`, `merge`, `fork`, `join`, `object`, `datastore`, `buffer`, `send`, `accept`, `wait` or `expansion` declared in this diagram | Node or expansion region the edge starts at. |
| `<arrow>` | argument | one of the arrows `->` control flow, `=>` object flow, with an object node or pin at one end at least, `~>` interrupting edge out of an interruptible region, drawn with a lightning bolt | What kind of edge it is. UML 2.5.1: `->` 15.2.3.3 Control flow; `=>` 15.2.3.4 Object flow; `~>` 15.6.3.2 Edge that interrupts its region. |
| `<to>` | argument | the id of an `initial`, `final`, `flowfinal`, `action`, `decision`, `merge`, `fork`, `join`, `object`, `datastore`, `buffer`, `send`, `accept`, `wait` or `expansion` declared in this diagram | Node or expansion region the edge ends at. |
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Guard on an edge out of a decision, without brackets. UML 2.5.1: 15.2.3.3 Guard on an activity edge. |
| `pin=` | attribute | a text in double quotes like `"Order service"` | Pin the object flow starts or ends at, when an action or expansion region has several. Without it Diagrist takes the pin of the same name at the other end, else the next free one. UML 2.5.1: 16.2.3.3 Input and output pin of an action. |
| `weight=` | attribute | a number like `12` or `2.5`, at least 1 | Tokens per traversal, drawn as `{weight=n}`. UML 2.5.1: 15.2.3.3 Weight of an activity edge. |
| `else` | flag |  | The predefined guard `[else]`: taken when no other guard of the decision holds. UML 2.5.1: 15.3.3.6 Predefined guard else. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | control flow |
| `=>` | object flow, with an object node or pin at one end at least |
| `~>` | interrupting edge out of an interruptible region, drawn with a lightning bolt |

Examples:

```dgr
go start -> order
go stock -> split "yes"
go paid -> remind else
go capture => receipts weight=20
```

### `handler`

```text
handler <protected> <arrow> <handler> <exception>
```

An exception handler: when the protected action throws an exception of the type, the handler action takes over, and the flow goes on at the output of the protected action. The handler has no edges of its own. Diagrist puts it beside the protected action and draws a bolt to its exception pin with the type beside it; one handler may protect several actions. UML 2.5.1: 15.5.3.1 Exception handler of an executable node.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<protected>` | argument | the id of an `action` declared in this diagram | The action whose exception is handled. |
| `<arrow>` | argument | one of the arrows `->` | Points from the protected action to the handler. |
| `<handler>` | argument | the id of an `action` declared in this diagram | The action that handles the exception. |
| `<exception>` | argument | a text in double quotes like `"Order service"` | Type of the exception. |

Example:

```dgr
handler capture -> open "Direct debit refused"
```

### `adr`

```text
adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]
```

An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. `mark=` with its id puts the mark into the picture.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id of the decision, such as `E1`; `mark=E1` refers to it. |
| `<question>` | argument | a text in double quotes like `"Order service"` | The question that was decided. |
| `<equals>` | argument | one of the arrows `=` | Separates the question from the choice. |
| `<choice>` | argument | a text in double quotes like `"Order service"` | The chosen option. |
| `[then]` | optional argument | one of the arrows `=>` | Introduces the consequence. |
| `[consequence]` | optional argument | a text in double quotes like `"Order service"` | What follows from the choice. |
| `open=` | attribute | a text in double quotes like `"Order service"` | Who still decides an open question; the card is drawn dashed. |

Example:

```dgr
adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"
```

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `activity` report these. An error stops the build; a warning is printed and the picture is still drawn.

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
