<!-- Generated from the statement tables of the kind `usecase` (plugin `uml`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `usecase`

A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. Diagrist lays it out by itself: use cases in columns by include and extend, actors left or right at the height of their use cases, an order with as few crossings as it finds.

This page lists everything a `usecase` diagram may contain. The same grammar is available as data with `dgr grammar usecase --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram usecase "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [locale=<en|de>]
```

Every usecase diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `look=` | attribute | one of `plain`, `cards` | `plain` (default) draws the UML notation, `cards` the same layout with toned outlines and areas. |
| `direction=` | attribute | one of `down`, `right` | Several subjects: `right` side by side, `down` one below the other. Without it they stand below each other, unless an actor works in more than one or the picture would grow too tall; then side by side, more than three in rows of a grid, if that crosses no more lines. With fewer than two subjects it has no effect. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram usecase "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them.

| Statement | Where | What it does |
|---|---|---|
| [`actor`](#actor) | top level | An actor: a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. |
| [`subject`](#subject) | top level | A subject: the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it. |
| [`usecase`](#usecase) | top level | A use case: an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. |
| [`rel`](#rel) | top level | A relation, read from `from` to `to`. |
| [`note`](#note) | top level | A comment on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `actor`

```text
actor <id> <label> [kind=<person|system>] [side=<left|right>] [tone=<oneOf>] [mark=<ref>] [emph]
```

An actor: a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. It has no `in`: actors stand outside the subject. Diagrist puts it left or right of its use cases. UML 2.5.1: 18.1.3.1 Actor.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `rel` and `note` use for this actor. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the role. |
| `kind=` | attribute | one of `person`, `system` | `person` (default) draws a stick figure, `system` a box with `«actor»`. UML 2.5.1: `system` 18.1.4 Actor as a rectangle with the keyword «actor». |
| `side=` | attribute | one of `left`, `right` | Side of the subject the actor stands on; without it Diagrist chooses. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the figure or box in `look=cards`; without it slate. |
| `mark=` | attribute | the id of a `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `emph` | flag |  | Highlights it in the accent colour. |

Examples:

```dgr
actor customer "Customer"
actor psp "Payment provider" kind=system side=right
```

### `subject`

```text
subject <id> <label> [tone=<oneOf>]
```

A subject: the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it. UML 2.5.1: 18.1.3.1 Subject a use case applies to.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `usecase ... in` and `note ... on` use for this subject. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the system. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of its area in `look=cards`; without it slate. |

Example:

```dgr
subject shop "Online shop"
```

### `usecase`

```text
usecase <id> <label> [in <ref>] [points=<text>] [form=<ellipse|classifier>] [stereotype=<text>] [tone=<oneOf>] [mark=<ref>] [emph]
```

A use case: an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. `points=` lists extension points in a compartment, which `extend` names with `at=`. `form=classifier` draws a rectangle with a small ellipse instead. Diagrist places use cases in columns: included and extending cases right of their base, a special case below its general one. UML 2.5.1: 18.1.3.1 Use case.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `rel` and `note` use for this use case. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the goal, as a verb phrase. |
| `in <ref>` | clause | the id of a `subject` declared in this diagram | The subject the use case belongs to; without it it stands outside. UML 2.5.1: 18.1.3.1 Subject a use case applies to. |
| `points=` | attribute | a text in double quotes like `"Order service"` | Extension points separated by commas, like `"before checkout, after payment"`. UML 2.5.1: 18.1.3.2 Extension point, 18.1.4 Compartment listing the extension points. |
| `form=` | attribute | one of `ellipse`, `classifier` | `ellipse` (default), or `classifier`: a rectangle with an ellipse. UML 2.5.1: `classifier` 18.1.4 Use case as a rectangle with an ellipse icon. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `batch` shows `«batch»`. UML 2.5.1: 18.1.4 Keyword or stereotype above a use case. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the outline in `look=cards`; without it slate. |
| `mark=` | attribute | the id of a `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `emph` | flag |  | Highlights it in the accent colour. |

Example:

```dgr
usecase order "Place order" in shop points="before checkout"
```

### `rel`

```text
rel <from> <arrow> <to> [label] [source=<multiplicity>] [card=<multiplicity>] [when=<text>] [at=<text>] [include] [extend] [emph]
```

A relation, read from `from` to `to`. `a -- b` is an association between an actor and a use case, with multiplicities `source=` at `a` and `card=` at `b`. `a -|> b` is a generalization: `a` is a special kind of `b`, both actors or both use cases. `a --> b include` means `a` always includes `b`; `a --> b extend` means `a` extends `b` under the condition `when=` at the extension points `at=` of `b`, shown in a note on the line. Lines run straight from outline to outline.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `actor` or `usecase` declared in this diagram | Actor or use case the relation starts at. |
| `<arrow>` | argument | one of the arrows `--` association between an actor and a use case, `-\|>` generalization from the special to the general actor or use case, hollow triangle at the general one, `-->` include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend` | What kind of relation it is. UML 2.5.1: `--` 18.1.3.1 Association of an actor with a use case; `-\|>` 9.2.3.2 Generalization between actors or between use cases. |
| `<to>` | argument | the id of a `actor` or `usecase` declared in this diagram | Actor or use case the relation points to. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the relation, shown at the middle of the line. |
| `source=` | attribute | a UML multiplicity like `1`, `0..1`, `1..*` or `*`, the lower bound not above the upper one | Multiplicity at `from`, on an association only. UML 2.5.1: 18.1.3.1 Multiplicity at an end of that association. |
| `card=` | attribute | a UML multiplicity like `1`, `0..1`, `1..*` or `*`, the lower bound not above the upper one | Multiplicity at `to`, on an association only. UML 2.5.1: 18.1.3.1 Multiplicity at an end of that association. |
| `when=` | attribute | a text in double quotes like `"Order service"` | Condition of an `extend`, written without braces: Diagrist shows `{condition}` in a note. UML 2.5.1: 18.1.3.2 Condition of an extend, 18.1.4 Condition and extension points in a note on the extend. |
| `at=` | attribute | a text in double quotes like `"Order service"` | Extension points of the extended use case `to`, separated by commas; on an `extend` only. UML 2.5.1: 18.1.3.2 Extension point, 18.1.4 Condition and extension points in a note on the extend. |
| `include` | flag |  | With `-->`: `from` always includes the behaviour of `to` («include»). UML 2.5.1: 18.1.3.3 Include. |
| `extend` | flag |  | With `-->`: `from` extends `to` under a condition («extend»). UML 2.5.1: 18.1.3.2 Extend. |
| `emph` | flag |  | Highlights the line in the accent colour. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `--` | association between an actor and a use case |
| `-\|>` | generalization from the special to the general actor or use case, hollow triangle at the general one |
| `-->` | include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend` |

Examples:

```dgr
rel customer -- order source=1 card=0..*
rel regular -|> customer
rel order --> pay include
rel voucher --> order extend when="voucher present" at="before checkout"
```

### `note`

```text
note <text> [on <ref>]
```

A comment on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. On a subject it stands outside every subject. UML 2.5.1: 7.2.3.2 Comment (note).

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says; long texts wrap at word boundaries. |
| `on <ref>` | clause | the id of a `actor` or `usecase` or `subject` declared in this diagram | The element the note belongs to. Required. |

Example:

```dgr
note "Only private customers" on shop
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

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `usecase` report these. An error stops the build; a warning is printed and the picture is still drawn.

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
