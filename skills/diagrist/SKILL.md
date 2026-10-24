---
name: diagrist
description: Write, change, check and render Diagrist diagrams, text files ending in .dgr that the dgr command line turns into checked SVG and PNG pictures. Use it when a diagram such as a sequence or usecase diagram is wanted as code, when a .dgr file is created or edited, or when dgr reports a code such as L101 or U403.
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
| `frame [label]` | top level | A frame around the whole interaction with `sd Name` in its tag (UML 2.5.1, 17.2). | `frame "OAuth callback"` |
| `msg <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A message in source order; its arrow says what kind. | `msg client -> api "GET /orders" id=request` |
| `create <from> <arrow> <to> [label] [id=<id>] [mark=<ref>] [duration=<text>] [emph]` | top level and inside blocks | A creation message: dashed with an open head, and the head of the receiver stands at its height. | `create client -> meter "new MeterData()"` |
| `destroy <target>` | top level and inside blocks | Destruction: the lifeline ends here with an X. | `destroy session` |
| `activate <target>` | top level and inside blocks | Starts an activation bar by hand, for processing after an asynchronous message. | `activate worker` |
| `deactivate <target>` | top level and inside blocks | Ends the bar the last `activate` of this lifeline started. | `deactivate worker` |
| `note <text> [over=<lifelines>]` | top level and inside blocks | A note at this point of the time axis, over the lifelines of `over=`. | `note "Idempotency key = order number" over=api,db` |
| `ref <label> [over=<lifelines>] [id=<id>] [file=<text>]` | top level and inside blocks | A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. | `ref "Authorize payment" over=payment,psp id=pay file="authorize-payment.dgr"` |
| `invariant <text> [on=<ref>] [state]` | top level and inside blocks | A state invariant (UML 2.5.1, 17.2.4) at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box. | `invariant "logged in" on=bff state` |
| `divider [label]` | top level | A divider on the time axis: a double line across all lifelines with the text in a box in the middle. | `divider "Accept the webhook"` |
| `coregion <on>` | top level and inside blocks | A coregion (UML 2.5.1, 17.6.3) on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. | `coregion notify` |
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
| `duration <from> <to> <text>` | top level | A duration constraint (UML 2.5.1, 8.4) between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. | `duration request response "≤ 300 ms"` |
| `time <at> <text>` | top level | A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`. | `time request "t = now"` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `msg`: `->` synchronous call (filled head), `~>` asynchronous message (open head), `-->` reply (dashed, open head).

The rules of `sequence` report these codes:

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

## Kind `usecase`

A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. Diagrist lays it out by itself: use cases in columns by include and extend, actors left or right at the height of their use cases, an order with as few crossings as it finds. Full reference: `dgr grammar usecase`.

```text
diagram usecase "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `actor <id> <label> [kind=<person\|system>] [side=<left\|right>] [tone=<oneOf>] [mark=<ref>] [emph]` | top level | An actor (UML 2.5.1, 18.1.3): a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. | `actor customer "Customer"` |
| `subject <id> <label> [tone=<oneOf>]` | top level | A subject (UML 2.5.1, 18.1.3): the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it. | `subject shop "Online shop"` |
| `usecase <id> <label> [in <ref>] [points=<text>] [form=<ellipse\|classifier>] [stereotype=<text>] [tone=<oneOf>] [mark=<ref>] [emph]` | top level | A use case (UML 2.5.1, 18.1.3): an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. | `usecase order "Place order" in shop points="before checkout"` |
| `rel <from> <arrow> <to> [label] [source=<multiplicity>] [card=<multiplicity>] [when=<text>] [at=<text>] [include] [extend] [emph]` | top level | A relation, read from `from` to `to`. | `rel customer -- order source=1 card=0..*` |
| `note <text> [on <ref>]` | top level | A comment (UML 2.5.1, 7.2.4) on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. | `note "Only private customers" on shop` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |

The arrows of `rel`: `--` association between an actor and a use case, `-|>` generalization from the special to the general actor or use case, hollow triangle at the general one, `-->` include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend`.

The rules of `usecase` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `U421` | error | `include` and `extend` join two use cases, never an actor (UML 2.5.1, 18.1.3). An actor takes part through an association `--`. |
| `U422` | error | An association joins an actor with a use case (UML 2.5.1, 18.1.3): not two actors, not two use cases, not an element with itself. |
| `U423` | error | A generalization joins an actor with an actor or a use case with a use case, never one with itself, and runs in no cycle: the triangle points at the more general one. |
| `U424` | error | The extension points named by `at=` of an `extend` belong to the extended use case `to` (UML 2.5.1, 18.1.3), and the points of one use case have distinct names. |
| `U425` | error | A use case includes itself neither directly nor through others (UML 2.5.1, 18.1.3). The arrow points from the base to the included case. |
| `U426` | error | `-->` names exactly one of the flags `include` and `extend`; `--` and `-\|>` name neither. Multiplicities `source=` and `card=` belong to associations, `when=` and `at=` to `extend`. |
| `U427` | error | `«include»` and `«extend»` mark relations, `«actor»` an actor and `«subsystem»` a subject. As the stereotype of a use case the picture claims something the model is not. |
| `U428` | error | A note in a use case diagram is a comment on one element: it names its actor, use case or subject with `on`. |
| `U920` | warning | UML allows use cases without a subject, but in a diagram with one, exam practice expects every use case inside it. |
| `U921` | warning | A use case yields a result for an actor. It is reached when an actor takes part in it, or through `include`, `extend` or a generalization from a reached use case; otherwise an association is probably missing. |
| `U922` | warning | In UML the condition of an `extend` is optional; without it the extension always applies. Exam practice asks for it, and for the extension point when the extended use case has some. |
| `U923` | warning | An actor without an association or generalization takes part in nothing, and a diagram without actors describes no use of the system. Both are valid UML. |
| `U924` | warning | Between two use cases behaviour is either always part (`include`) or optional (`extend`), not both; usually one direction is swapped. |
| `U926` | warning | A subject encloses the use cases of its system. Without one it has no content and is not drawn; a note on it finds no frame. |
| `U927` | warning | `direction=` places several subjects side by side or below each other; with fewer than two it changes nothing. |

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
