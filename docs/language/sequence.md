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

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them.

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
| [`frame`](#frame) | top level | A frame around the whole interaction with `sd Name` in its tag (UML 2.5.1, 17.2). |
| [`msg`](#msg) | top level and inside blocks | A message in source order; its arrow says what kind. |
| [`create`](#create) | top level and inside blocks | A creation message: dashed with an open head, and the head of the receiver stands at its height. |
| [`destroy`](#destroy) | top level and inside blocks | Destruction: the lifeline ends here with an X. |
| [`activate`](#activate) | top level and inside blocks | Starts an activation bar by hand, for processing after an asynchronous message. |
| [`deactivate`](#deactivate) | top level and inside blocks | Ends the bar the last `activate` of this lifeline started. |
| [`note`](#note) | top level and inside blocks | A note at this point of the time axis, over the lifelines of `over=`. |
| [`ref`](#ref) | top level and inside blocks | A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. |
| [`invariant`](#invariant) | top level and inside blocks | A state invariant (UML 2.5.1, 17.2.4) at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box. |
| [`divider`](#divider) | top level | A divider on the time axis: a double line across all lifelines with the text in a box in the middle. |
| [`coregion`](#coregion) | top level and inside blocks | A coregion (UML 2.5.1, 17.6.3) on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. |
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
| [`duration`](#duration) | top level | A duration constraint (UML 2.5.1, 8.4) between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. |
| [`time`](#time) | top level | A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `participant`

```text
participant <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as a box, from left to right in source order. Messages, notes and references name it by its id.

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
actor <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as a stick figure, from left to right in source order. Messages, notes and references name it by its id.

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
database <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as a cylinder, from left to right in source order. Messages, notes and references name it by its id.

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
queue <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as a horizontal tube, from left to right in source order. Messages, notes and references name it by its id.

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
boundary <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as the boundary symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id.

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
control <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as the control symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id.

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
entity <id> <label> [stereotype=<text>] [tone=<oneOf>] [external]
```

A lifeline drawn as the entity symbol of robustness analysis, from left to right in source order. Messages, notes and references name it by its id.

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

A frame around the whole interaction with `sd Name` in its tag (UML 2.5.1, 17.2). Without a name it shows the title. Gates (`gate` in `msg`) draw the frame without this line too.

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

A message in source order; its arrow says what kind. Sender equal to receiver is a self call. Calls and replies activate the receiver by themselves. `found` as sender and `lost` as receiver are found and lost messages; `gate` is a gate on the frame of the interaction (`gate -> a` comes in from the left, `a --> gate` replies to the left, `a -> gate` leaves to the right), `gate.name` names it. The `id=` of a `ref` or fragment as an end leads the message to its edge.

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | a lifeline id like `api`, `found`, `lost`, `gate`, `gate.name`, or the `id=` of a `ref` or fragment, optionally with `.name` | Sender: a lifeline, `found`, `gate`, or a frame with `id=`. |
| `<arrow>` | argument | one of the arrows `->` synchronous call (filled head), `~>` asynchronous message (open head), `-->` reply (dashed, open head) | The kind of message, which also decides how it is drawn. |
| `<to>` | argument | a lifeline id like `api`, `found`, `lost`, `gate`, `gate.name`, or the `id=` of a `ref` or fragment, optionally with `.name` | Receiver: a lifeline, `lost`, `gate`, or a frame with `id=`. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | What is sent; without it the arrow has no label. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the message that `duration` and `time` refer to. |
| `mark=` | attribute | the id of a `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn after the label. |
| `duration=` | attribute | a text in double quotes like `"Order service"` | Duration of the transmission: the arrow slopes down and shows the text in `{...}`. |
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

A creation message: dashed with an open head, and the head of the receiver stands at its height. Before it the lifeline does not exist.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline that creates. |
| `<arrow>` | argument | one of the arrows `->` | Always `->`. |
| `<to>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline that is created. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | The constructor call; without it the arrow has no label. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the message that `duration` and `time` refer to. |
| `mark=` | attribute | the id of a `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn after the label. |
| `duration=` | attribute | a text in double quotes like `"Order service"` | Duration of the transmission: the arrow slopes down and shows the text in `{...}`. |
| `emph` | flag |  | Highlights the message in the accent colour. |

Example:

```dgr
create client -> meter "new MeterData()"
```

### `destroy`

```text
destroy <target>
```

Destruction: the lifeline ends here with an X. No message reaches it afterwards.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline that ends. |

Example:

```dgr
destroy session
```

### `activate`

```text
activate <target>
```

Starts an activation bar by hand, for processing after an asynchronous message. Calls and replies need none, their bars appear by themselves. Ends with `deactivate`.

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline whose bar starts at the last message. |

Example:

```dgr
activate worker
```

### `deactivate`

```text
deactivate <target>
```

Ends the bar the last `activate` of this lifeline started.

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<target>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline whose bar ends at the last message. |

Example:

```dgr
deactivate worker
```

### `note`

```text
note <text> [over=<lifelines>]
```

A note at this point of the time axis, over the lifelines of `over=`. Long texts wrap.

Written at the top level and inside `coregion`, `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

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

A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. With `id=r` the messages right after it that name `r` as an end run to its edge (actual gates, `r.name` names them), and the frame grows to hold them.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the referenced interaction. |
| `over=` | attribute | lifeline ids separated by commas without spaces, like `auftrag,lager` | Lifelines it spans, comma separated without spaces, like `over=auftrag,lager`. Required. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame, for messages that start or end at its edge. |
| `file=` | attribute | a text in double quotes like `"Order service"` | File of the referenced sequence diagram, relative to this one; named in the description. |

Example:

```dgr
ref "Authorize payment" over=payment,psp id=pay file="authorize-payment.dgr"
```

### `invariant`

```text
invariant <text> [on=<ref>] [state]
```

A state invariant (UML 2.5.1, 17.2.4) at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | The condition or state, without braces. |
| `on=` | attribute | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline the invariant holds on. Required. |
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

A coregion (UML 2.5.1, 17.6.3) on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. Only messages from or to it, `activate`, `deactivate` and `note` may stand in it.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `activate`, `deactivate`, `note`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<on>` | argument | the id of a `participant` or `actor` or `database` or `queue` or `boundary` or `control` or `entity` declared in this diagram | The lifeline whose events are unordered. |

Example:

```dgr
coregion notify
```

### `alt`

```text
alt [guard] [id=<id>]
```

Alternatives: the first operand whose guard holds is taken; further operands start with `else`. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `else`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
alt "token valid"
```

### `else`

```text
else [guard]
```

The next operand of `alt`, written inside `alt` with its statements indented below it. Without a guard it shows `[else]`. A dashed line separates the operands.

Written only inside `alt`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of this operand, without brackets. |

Example:

```dgr
else "invalid token"
```

### `opt`

```text
opt [guard] [id=<id>]
```

An optional part, taken when its guard holds. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
opt "3-D Secure required"
```

### `loop`

```text
loop [guard] [id=<id>]
```

A repetition while the guard holds. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
loop "at most 3 times" id=retry
```

### `par`

```text
par [guard] [id=<id>]
```

Parallel operands, separated by `and`; their events interleave freely. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
par
```

### `and`

```text
and [guard]
```

The next operand of `par`, `seq` or `strict`, written inside the fragment with its statements indented below it.

Written only inside `par`, `seq`, `strict`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of this operand, without brackets. |

Example:

```dgr
and
```

### `break`

```text
break [guard] [id=<id>]
```

Ends the enclosing interaction when the guard holds. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
break "timeout"
```

### `critical`

```text
critical [guard] [id=<id>]
```

A critical region: its events are not interleaved. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
critical
```

### `seq`

```text
seq [guard] [id=<id>]
```

Weak sequencing of operands, separated by `and`. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
seq
```

### `strict`

```text
strict [guard] [id=<id>]
```

Strict sequencing of operands, separated by `and`. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
strict
```

### `neg`

```text
neg [guard] [id=<id>]
```

An invalid trace: what must not happen. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
neg
```

### `assert`

```text
assert [guard] [id=<id>]
```

The only valid trace at this point. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
assert
```

### `ignore`

```text
ignore [guard] [id=<id>]
```

Messages that may appear anywhere and are ignored; the guard lists their names and shows as `ignore {...}`. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
ignore "ping, status"
```

### `consider`

```text
consider [guard] [id=<id>]
```

Only the listed messages are considered; the guard lists their names and shows as `consider {...}`. The statements indented below it belong to the fragment; fragments nest.

Written at the top level and inside `alt`, `else`, `opt`, `loop`, `par`, `and`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`. Indented below it: `msg`, `create`, `destroy`, `activate`, `deactivate`, `note`, `ref`, `invariant`, `coregion`, `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `[guard]` | optional argument | a text in double quotes like `"Order service"` | Condition of the first operand, without brackets; Diagrist adds `[...]`. |
| `id=` | attribute | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the frame: a message with this name as an end starts or ends at its edge (formal gate, `f.name` names it). |

Example:

```dgr
consider "order, pay"
```

### `duration`

```text
duration <from> <to> <text>
```

A duration constraint (UML 2.5.1, 8.4) between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. The text is written without braces; Diagrist adds `{...}`.

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

A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`.

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
| `U400` | error | Message ends and `over=` lists name declared lifelines. `lang` checks the other references; these can also be gates, so the plugin checks them. |
| `U401` | error | Inside a fragment, the statements of an operand are indented below its `else` or `and`. A statement at the level of the marker after it would silently join the operand above. |
| `U403` | error | A reply `-->` answers an open synchronous call in the opposite direction; the model pairs them innermost first. |
| `U404` | error | Before its creation and after its destruction a lifeline does not exist; each happens at most once (UML 2.5.1, 17.3). |
| `U405` | error | `deactivate` ends a bar that `activate` started on the same lifeline. |
| `U408` | error | A lost message has no receiver, a found one no sender (UML 2.5.1, 17.4.3): `lost` only on the right, `found` only on the left, both only on a call or asynchronous message, and neither as a lifeline id. |
| `U450` | error | A gate links a message with the frame of the interaction (UML 2.5.1, 17.3): `gate` is no lifeline id and stands at one end of a message only, never with `lost`, `found` or a creation. |
| `U451` | error | `ignore` and `consider` name the messages they ignore or consider (UML 2.5.1, 17.6.3), written as their guard. |
| `U452` | error | A note and a reference need `over=`, a state invariant needs `on=`: they stand on lifelines (UML 2.5.1, 17.2.4). |
| `U453` | error | A coregion is the short form of a `par` whose operands hold one event each on the same lifeline (UML 2.5.1, 17.6.3); every message in it is sent or received by that lifeline. The tables allow only `msg`, `activate`, `deactivate` and `note` in it. |
| `U454` | error | A gate links a message with the edge of a reference (actual gate) or a fragment (formal gate), UML 2.5.1, 17.3. At a reference the message comes from a lifeline outside it and follows it, with only events beside it in between; at a fragment it stands inside. The frame name is its own. |
| `U900` | warning | UML allows `alt` and `par` with one operand, but `opt` or no fragment says it more clearly. |
| `U901` | warning | UML allows leaving out the reply; it is still named. Exempt are self calls and calls made while the caller handles a call it answers later: that reply implies the inner call returned. Lost and found messages are U907. |
| `U902` | warning | A lifeline no message, note or reference touches says nothing; remove it or add what it does. |
| `U903` | warning | An operand without events draws an empty band; fill it or remove it. |
| `U904` | warning | In `alt` every operand but the last needs a guard; the last one may stand for `[else]`. |
| `U905` | warning | `activate` without `deactivate`: the bar reaches to the end of the diagram. |
| `U906` | warning | A duration runs from the earlier to the later message; swapped, Diagrist still draws it. |
| `U907` | warning | No reply can follow a lost or found message, so as a synchronous call it would wait forever; use `~>`. |
| `U908` | warning | `duration=` slopes the arrow. A self call is a loop and a creation ends at the head at its height: there the arrow stays level and the duration is missing from the picture. |
| `U909` | warning | A coregion with fewer than two messages leaves no order open and says nothing. |
| `U950` | warning | `id=` on a reference or fragment only serves gates; without a message at its edge it has no effect. |
| `U951` | warning | A gate is a point on the frame with one message per side (UML 2.5.1, 17.3); two messages through the same named gate in the same direction leave open which one is meant. |
