<!-- Generated from the statement tables of the kind `sequence` (plugin `uml`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `sequence`

A UML sequence diagram (UML 2.5.1, chapter 17): lifelines from left to right in source order, messages and fragments from top to bottom. Fragments nest by indentation.

This page lists everything a `sequence` diagram may contain. The same grammar is available as data with `dgr grammar sequence --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram sequence "Title" [subtitle=<text>] [look=<plain|cards>] [locale=<en|de>]
```

Every sequence diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `look=` | attribute | one of `plain`, `cards` | `plain` (default) draws the UML notation, `cards` toned cards. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram sequence "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `sequence` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`participant`](#participant) | top level | A lifeline drawn as a box, from left to right in source order. |
| [`actor`](#actor) | top level | A lifeline drawn as a stick figure, from left to right in source order. |
| [`database`](#database) | top level | A lifeline drawn as a cylinder, from left to right in source order. |
| [`queue`](#queue) | top level | A lifeline drawn as a horizontal tube, from left to right in source order. |
| [`boundary`](#boundary) | top level | A lifeline drawn as the boundary symbol of robustness analysis, from left to right in source order. |
| [`control`](#control) | top level | A lifeline drawn as the control symbol of robustness analysis, from left to right in source order. |
| [`entity`](#entity) | top level | A lifeline drawn as the entity symbol of robustness analysis, from left to right in source order. |
| [`autonumber`](#autonumber) | top level | Numbers all messages in source order (1, 2, 3 ...), across fragments; the number stands before the label. |
| [`frame`](#frame) | top level | A frame around the whole interaction with `sd Name` in its tag. |
| [`msg`](#msg) | top level and inside blocks | A message in source order; its arrow says what kind. |
| [`create`](#create) | top level and inside blocks | A creation message: dashed with an open head, and the head of the receiver stands at its height. |
| [`destroy`](#destroy) | top level and inside blocks | Destruction: the lifeline ends here with an X. |
| [`activate`](#activate) | top level and inside blocks | Starts an activation bar by hand, for processing after an asynchronous message. |
| [`deactivate`](#deactivate) | top level and inside blocks | Ends the bar the last `activate` of this lifeline started. |
| [`note`](#note) | top level and inside blocks | A note at this point of the time axis, over the lifelines of `over=`. |
| [`ref`](#ref) | top level and inside blocks | A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. |
| [`invariant`](#invariant) | top level and inside blocks | A state invariant at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box. |
| [`divider`](#divider) | top level | A divider on the time axis: a double line across all lifelines with the text in a box in the middle. |
| [`coregion`](#coregion) | top level and inside blocks | A coregion on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. |
| [`alt`](#alt) | top level and inside blocks | Alternatives: the first operand whose guard holds is taken; further operands start with `else`. |
| [`else`](#else) | inside `alt` | The next operand of `alt`, written inside `alt` with its statements indented below it. |
| [`opt`](#opt) | top level and inside blocks | An optional part, taken when its guard holds. |
| [`loop`](#loop) | top level and inside blocks | A repetition while the guard holds. |
| [`par`](#par) | top level and inside blocks | Parallel operands, separated by `and`; their events interleave freely. |
| [`and`](#and) | inside `par`, `seq`, `strict` | The next operand of `par`, `seq` or `strict`, written inside the fragment with its statements indented below it. |
| [`break`](#break) | top level and inside blocks | Ends the enclosing interaction when the guard holds. |
| [`critical`](#critical) | top level and inside blocks | A critical region: its events are not interleaved. |
| [`seq`](#seq) | top level and inside blocks | Weak sequencing of operands, separated by `and`. |
| [`strict`](#strict) | top level and inside blocks | Strict sequencing of operands, separated by `and`. |
| [`neg`](#neg) | top level and inside blocks | An invalid trace: what must not happen. |
| [`assert`](#assert) | top level and inside blocks | The only valid trace at this point. |
| [`ignore`](#ignore) | top level and inside blocks | Messages that may appear anywhere and are ignored; the guard lists their names and shows as `ignore {...}`. |
| [`consider`](#consider) | top level and inside blocks | Only the listed messages are considered; the guard lists their names and shows as `consider {...}`. |
| [`duration`](#duration) | top level | A duration constraint between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. |
| [`time`](#time) | top level | A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `participant`

```text
participant <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as a box, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
participant api "api-service" stereotype="service"
```

### `actor`

```text
actor <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as a stick figure, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
actor customer "Customer"
```

### `database`

```text
database <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as a cylinder, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
database db "Orders DB"
```

### `queue`

```text
queue <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as a horizontal tube, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
queue broker "Kafka"
```

### `boundary`

```text
boundary <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as the boundary symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
boundary form "Order form"
```

### `control`

```text
control <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as the control symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
control checkout "Checkout"
```

### `entity`

```text
entity <id> <label> [stereotype=<text>] [tone=<choice>] [external]
```

A lifeline drawn as the entity symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id. UML 2.5.1: 17.3.3.1 Lifeline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that messages, `activate`, `note` and `ref` use for this lifeline. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the head. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `service` shows `«service»`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the head and its bars in `look=cards`; without it the head is slate. |
| `external` | flag |  | Draws the head dashed: the system is outside the scope of the diagram. |

Example:

```dgr
entity order "Order"
```

### `autonumber`

```text
autonumber
```

Numbers all messages in source order (1, 2, 3 ...), across fragments; the number stands before the label.

Written at the top level.

Example:

```dgr
autonumber
```

### `frame`

```text
frame [label]
```

A frame around the whole interaction with `sd Name` in its tag. Without a name it shows the title. Gates (`gate` in `msg`) draw the frame without this line too. UML 2.5.1: 17.2.3.1 Interaction, drawn as a frame.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the interaction in the tag; defaults to the title. |

Example:

```dgr
frame "OAuth callback"
```

### `msg`

```text
msg <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]
```

A message in source order; its arrow says what kind. Sender equal to receiver is a self call. Calls and replies activate the receiver by themselves. `found` as sender and `lost` as receiver are found and lost messages; `gate` is a gate on the frame of the interaction (`gate -> a` comes in from the left, `a --> gate` replies to the left, `a -> gate` leaves to the right), `gate.name` names it. The `id=` of a `ref` or fragment as an end leads the message to its edge. UML 2.5.1: 17.4.3.1 Message.

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | a lifeline id like `api`, `found`, `lost`, `gate`, `gate.name`, or the `id=` of a `ref` or fragment, optionally with `.name` | Sender: a lifeline, `found`, `gate`, or a frame with `id=`. UML 2.5.1: `found` 17.4.3.1 Found message, without sender; `gate` 17.4.3.5 Gate on the frame of the interaction. |
| `<arrow>` | argument | one of the arrows `->` synchronous call (filled head), `~>` asynchronous message (open head), `-->` reply (dashed, open head) | The kind of message, which also decides how it is drawn. UML 2.5.1: `->` 17.4.3.1 Synchronous call; `~>` 17.4.3.1 Asynchronous call or signal; `-->` 17.4.3.1 Reply to a call. |
| `<to>` | argument | a lifeline id like `api`, `found`, `lost`, `gate`, `gate.name`, or the `id=` of a `ref` or fragment, optionally with `.name` | Receiver: a lifeline, `lost`, `gate`, or a frame with `id=`. UML 2.5.1: `lost` 17.4.3.1 Lost message, without receiver; `gate` 17.4.3.5 Gate on the frame of the interaction. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | What is sent; without it the arrow has no label. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the message that `duration` and `time` refer to. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn after the label. |
| `duration=` | attribute | a text in double quotes like `"Order service"` | Duration of the transmission: the arrow slopes down and shows the text in `{...}`. UML 2.5.1: 8.5.3.2 Duration constraint. |
| `emph` | flag |  | Highlights the message in the accent colour. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | synchronous call (filled head) |
| `~>` | asynchronous message (open head) |
| `-->` | reply (dashed, open head) |

Examples:

```dgr
msg client -> api "GET /orders" id=request
msg api --> client "200 OK"
msg gate.order -> api "place(order)" emph
```

### `create`

```text
create <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]
```

A creation message: dashed with an open head, and the head of the receiver stands at its height. Before it the lifeline does not exist. UML 2.5.1: 17.4.3.1 Message that creates a lifeline.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline that creates. |
| `<arrow>` | argument | one of the arrows `->` | Always `->`. |
| `<to>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline that is created. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | The constructor call; without it the arrow has no label. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the message that `duration` and `time` refer to. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn after the label. |
| `duration=` | attribute | a text in double quotes like `"Order service"` | Duration of the transmission: the arrow slopes down and shows the text in `{...}`. UML 2.5.1: 8.5.3.2 Duration constraint. |
| `emph` | flag |  | Highlights the message in the accent colour. |

Example:

```dgr
create client -> meter "new MeterData()"
```

### `destroy`

```text
destroy <target>
```

Destruction: the lifeline ends here with an X. No message reaches it afterwards. UML 2.5.1: 17.4.3.4 End of a lifeline (destruction).

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline that ends. |

Example:

```dgr
destroy session
```

### `activate`

```text
activate <target>
```

Starts an activation bar by hand, for processing after an asynchronous message. Calls and replies need none, their bars appear by themselves. Ends with `deactivate`. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar).

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline whose bar starts at the last message. |

Example:

```dgr
activate worker
```

### `deactivate`

```text
deactivate <target>
```

Ends the bar the last `activate` of this lifeline started. UML 2.5.1: 17.2.3.4 Execution on a lifeline (activation bar).

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline whose bar ends at the last message. |

Example:

```dgr
deactivate worker
```

### `note`

```text
note <text> [over=<lifelines>]
```

A note at this point of the time axis, over the lifelines of `over=`. Long texts wrap. UML 2.5.1: 7.2.3.2 Comment (note).

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says. |
| `over=` | attribute | lifeline ids separated by commas without spaces, like `auftrag,lager` | Lifelines it spans, comma separated without spaces, like `over=auftrag,lager`. Required. |

Example:

```dgr
note "Idempotency key = order number" over=api,db
```

### `ref`

```text
ref <label> [over=<lifelines>] [id=<id>] [file=<text>]
```

A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. With `id=r` the messages right after it that name `r` as an end run to its edge (actual gates, `r.name` names them), and the frame grows to hold them. UML 2.5.1: 17.7.3.1 Use of another interaction (`ref`).

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the referenced interaction. |
| `over=` | attribute | lifeline ids separated by commas without spaces, like `auftrag,lager` | Lifelines it spans, comma separated without spaces, like `over=auftrag,lager`. Required. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame, for messages that start or end at its edge. UML 2.5.1: 17.4.3.5 Gate on an interaction use. |
| `file=` | attribute | a text in double quotes like `"Order service"` | File of the referenced sequence diagram, relative to this one; named in the description. |

Example:

```dgr
ref "Authorize payment" over=payment,psp id=pay file="authorize-payment.dgr"
```

### `invariant`

```text
invariant <text> [on=<ref>] [state]
```

A state invariant at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box. UML 2.5.1: 17.2.3.5 State invariant.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | The condition or state, without braces. |
| `on=` | attribute | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline the invariant holds on. Required. |
| `state` | flag |  | Draws a state in a rounded box instead of a condition in braces. |

Example:

```dgr
invariant "logged in" on=bff state
```

### `divider`

```text
divider [label]
```

A divider on the time axis: a double line across all lifelines with the text in a box in the middle. Only at the top level, not inside a fragment.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the section that starts here. |

Example:

```dgr
divider "Accept the webhook"
```

### `coregion`

```text
coregion <on>
```

A coregion on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. Only messages from or to it, `activate`, `deactivate` and `note` may stand in it. UML 2.5.1: 17.6.4.10 Coregion, unordered events on one lifeline.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `activate`, `deactivate`, `note`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<on>` | argument | the id of a `participant`, `actor`, `database`, `queue`, `boundary`, `control` or `entity` declared in this diagram | The lifeline whose events are unordered. |

Example:

```dgr
coregion notify
```

### `alt`

```text
alt [guard] [id=<id>]
```

Alternatives: the first operand whose guard holds is taken; further operands start with `else`. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.7 Alternatives (`alt`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `else`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
alt "token valid"
```

### `else`

```text
else [guard]
```

The next operand of `alt`, written inside `alt` with its statements indented below it. Without a guard it shows `[else]`. A dashed line separates the operands. UML 2.5.1: 17.6.3.1 Operand of a combined fragment.

Written only inside `alt`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of this operand, without brackets. UML 2.5.1: 17.6.3.2 Guard of an operand. |

Example:

```dgr
else "invalid token"
```

### `opt`

```text
opt [guard] [id=<id>]
```

An optional part, taken when its guard holds. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.8 Option (`opt`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
opt "3-D Secure required"
```

### `loop`

```text
loop [guard] [id=<id>]
```

A repetition while the guard holds. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.17 Loop (`loop`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
loop "at most 3 times" id=retry
```

### `par`

```text
par [guard] [id=<id>]
```

Parallel operands, separated by `and`; their events interleave freely. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.10 Parallel (`par`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
par
```

### `and`

```text
and [guard]
```

The next operand of `par`, `seq` or `strict`, written inside the fragment with its statements indented below it. UML 2.5.1: 17.6.3.1 Operand of a combined fragment.

Written only inside `par`, `seq` or `strict`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of this operand, without brackets. UML 2.5.1: 17.6.3.2 Guard of an operand. |

Example:

```dgr
and
```

### `break`

```text
break [guard] [id=<id>]
```

Ends the enclosing interaction when the guard holds. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.9 Break (`break`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
break "timeout"
```

### `critical`

```text
critical [guard] [id=<id>]
```

A critical region: its events are not interleaved. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.14 Critical region (`critical`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
critical
```

### `seq`

```text
seq [guard] [id=<id>]
```

Weak sequencing of operands, separated by `and`. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.11 Weak sequencing (`seq`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
seq
```

### `strict`

```text
strict [guard] [id=<id>]
```

Strict sequencing of operands, separated by `and`. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.12 Strict sequencing (`strict`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
strict
```

### `neg`

```text
neg [guard] [id=<id>]
```

An invalid trace: what must not happen. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.13 Invalid traces (`neg`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
neg
```

### `assert`

```text
assert [guard] [id=<id>]
```

The only valid trace at this point. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.16 Assertion (`assert`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. UML 2.5.1: 17.6.3.2 Guard of an operand. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
assert
```

### `ignore`

```text
ignore [guard] [id=<id>]
```

Messages that may appear anywhere and are ignored; the guard lists their names and shows as `ignore {...}`. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.15 Ignored messages (`ignore`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
ignore "ping, status"
```

### `consider`

```text
consider [guard] [id=<id>]
```

Only the listed messages are considered; the guard lists their names and shows as `consider {...}`. The statements indented below it belong to the fragment; fragments nest. UML 2.5.1: 17.6.3.3 Combined fragment, 17.6.3.15 Considered messages (`consider`), 17.6.3.1 Operand of a combined fragment.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore` or `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it). UML 2.5.1: 17.4.3.5 Gate on a combined fragment. |

Example:

```dgr
consider "order, pay"
```

### `duration`

```text
duration <from> <to> <text>
```

A duration constraint between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. The text is written without braces; Diagrist adds `{...}`. UML 2.5.1: 8.5.3.2 Duration constraint.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `msg` or `create` declared in this diagram | The earlier message. |
| `<to>` | argument | the id of a `msg` or `create` declared in this diagram | The later message. |
| `<text>` | argument | a text in double quotes like `"Order service"` | The constraint, without braces. |

Example:

```dgr
duration request response "≤ 300 ms"
```

### `time`

```text
time <at> <text>
```

A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`. UML 2.5.1: 8.5.3.2 Time constraint.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<at>` | argument | the id of a `msg` or `create` declared in this diagram | The message. |
| `<text>` | argument | a text in double quotes like `"Order service"` | The constraint, without braces. |

Example:

```dgr
time request "t = now"
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

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `sequence` report these. An error stops the build; a warning is printed and the picture is still drawn.

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
