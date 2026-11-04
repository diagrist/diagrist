<!-- Generated from the statement tables and the rules of `usecase` by `pnpm docs:generate`. Do not edit. -->

# Kind `usecase`

A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. Diagrist lays it out by itself: use cases in columns by include and extend, actors left or right at the height of their use cases, an order with as few crossings as it finds. Full reference with every argument: `dgr grammar usecase --json`.

```text
diagram usecase "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `actor <id> <label> [kind=<person\|system>] [side=<left\|right>] [tone=<choice>] [mark=<ref>] [area=<ref>] [emph]` | top level | An actor: a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. | `actor customer "Customer"` |
| `subject <id> <label> [tone=<choice>] [area=<ref>]` | top level | A subject: the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it. | `subject shop "Online shop"` |
| `usecase <id> <label> [in <ref>] [points=<text>] [form=<ellipse\|classifier>] [stereotype=<text>] [tone=<choice>] [mark=<ref>] [area=<ref>] [emph]` | top level | A use case: an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. | `usecase order "Place order" in shop points="before checkout"` |
| `rel <from> <arrow> <to> [label] [area=<ref>] [source=<multiplicity>] [card=<multiplicity>] [when=<text>] [at=<text>] [include] [extend] [emph]` | top level | A relation, read from `from` to `to`. | `rel customer -- order source=1 card=0..*` |
| `note <text> [on <ref>]` | top level | A comment on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. | `note "Only private customers" on shop` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `rel`: `--` association between an actor and a use case, `-|>` generalization from the special to the general actor or use case, hollow triangle at the general one, `-->` include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend`.

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

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
