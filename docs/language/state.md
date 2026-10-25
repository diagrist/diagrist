<!-- Generated from the statement tables of the kind `state` (plugin `uml`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `state`

A UML state machine diagram (UML 2.5.1, chapter 14): states and pseudostates joined by transitions, composite states with substates or orthogonal regions, entry and exit points on their border. `{protocol}` in the title makes it a protocol state machine. Diagrist lays it out by itself: layers by the longest path from the initial pseudostate, final states last, back and skip transitions on rails beside the states, loops at a free corner.

This page lists everything a `state` diagram may contain. The same grammar is available as data with `dgr grammar state --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram state "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [locale=<en|de>]
```

Every state diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `look=` | attribute | one of `plain`, `cards` | `plain` (default) draws the UML notation, `cards` the same layout with states as cards with a toned name field. |
| `direction=` | attribute | one of `down`, `right` | `down` (default) lays the flow out from top to bottom, `right` from left to right. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram state "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `state` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`state`](#state) | top level | A state: a rounded box with the name, below it a compartment with `entry`, `do` and `exit`, deferred events and internal transitions. |
| [`initial`](#initial) | top level | The initial pseudostate: a filled circle. |
| [`final`](#final) | top level | A final state: a circle with a dot. |
| [`choice`](#choice) | top level | A choice pseudostate: a diamond. |
| [`junction`](#junction) | top level | A junction pseudostate: a small filled circle that joins or splits transitions without a decision of its own. |
| [`history`](#history) | top level | A history pseudostate inside a composite state: a circle with `H`, with `deep` `H*`. |
| [`fork`](#fork) | top level | A fork pseudostate: a bar across the flow, from one incoming to several outgoing transitions into states, often into the regions of a state. |
| [`join`](#join) | top level | A join pseudostate: a bar across the flow that waits for all its incoming transitions from states. |
| [`terminate`](#terminate) | top level | A terminate pseudostate: a cross. |
| [`entrypoint`](#entrypoint) | top level | An entry point: a small circle on the border of its state. |
| [`exitpoint`](#exitpoint) | top level | An exit point: a small circle with a cross on the border of its state. |
| [`region`](#region) | top level | An orthogonal region of a state: the regions of a state are active at the same time and stand side by side, separated by dashed lines, the name at the top left. |
| [`go`](#go) | top level | A transition from `from` to `to`, labelled `trigger [guard] / effect`; without all three it is a completion transition. |
| [`internal`](#internal) | top level | An internal transition: a line `trigger [guard] / effect` in the compartment of its state. |
| [`note`](#note) | top level | A comment on a vertex: a dashed box above it with a tip down to it, below it when lines run above. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `state`

```text
state <id> <label> [in <ref>] [entry=<text>] [do=<text>] [exit=<text>] [defer=<text>] [submachine=<text>] [file=<text>] [tone=<choice>] [mark=<ref>] [emph]
```

A state: a rounded box with the name, below it a compartment with `entry`, `do` and `exit`, deferred events and internal transitions. A state with vertices `in` it is a composite state, drawn as a frame around them; with `submachine=` it calls another state machine. Diagrist lays states out in layers from the initial pseudostate to the final state. UML 2.5.1: 14.2.3.4 Simple state.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go`, `in`, `internal` and `note` use for this state. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the state. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |
| `entry=` | attribute | a text in double quotes like `"Order service"` | Behaviour on entering, shown as `entry / ...`. UML 2.5.1: 14.2.4 Entry, do and exit behavior in the compartment of a state. |
| `do=` | attribute | a text in double quotes like `"Order service"` | Behaviour while in the state, `do / ...`. UML 2.5.1: 14.2.4 Entry, do and exit behavior in the compartment of a state. |
| `exit=` | attribute | a text in double quotes like `"Order service"` | Behaviour on leaving, `exit / ...`. UML 2.5.1: 14.2.4 Entry, do and exit behavior in the compartment of a state. |
| `defer=` | attribute | a text in double quotes like `"Order service"` | Events the state defers, separated by commas; each shows as `event / defer`. UML 2.5.1: 14.2.4 Deferred event in the compartment of a state. |
| `submachine=` | attribute | a text in double quotes like `"Order service"` | Name of the state machine the state calls: the box reads `Name : Machine` and carries the submachine symbol. Entry and exit points `in` it are its connection point references. UML 2.5.1: 14.2.3.4 Submachine state calling another state machine. |
| `file=` | attribute | a text in double quotes like `"Order service"` | File of the called state machine, relative to this one; named in the description, not checked yet. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the name field in `look=cards`; without it slate. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `emph` | flag |  | Highlights the state in the accent colour. |

Examples:

```dgr
state open "Open" entry="set deadline"
state check "Check" submachine="Credit check"
```

### `initial`

```text
initial <id> [label] [in <ref>]
```

The initial pseudostate: a filled circle. Each region, the top level included, has at most one; its transition has neither trigger nor guard. UML 2.5.1: 14.2.3 Initial pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
initial start
```

### `final`

```text
final <id> [label] [in <ref>]
```

A final state: a circle with a dot. No transition leaves it. Diagrist puts final states into the last layer. UML 2.5.1: 14.2.3 Final state.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
final end
```

### `choice`

```text
choice <id> [label] [in <ref>]
```

A choice pseudostate: a diamond. Its outgoing transitions carry guards, one of them `when=else`. UML 2.5.1: 14.2.3 Choice pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
choice paid
```

### `junction`

```text
junction <id> [label] [in <ref>]
```

A junction pseudostate: a small filled circle that joins or splits transitions without a decision of its own. UML 2.5.1: 14.2.3 Junction pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
junction merge
```

### `history`

```text
history <id> [label] [in <ref>] [deep]
```

A history pseudostate inside a composite state: a circle with `H`, with `deep` `H*`. Entering it resumes the substate last active. UML 2.5.1: 14.2.3 Shallow and deep history pseudostates.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this pseudostate. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |
| `deep` | flag |  | Deep history: resumes the innermost substates too, drawn `H*`. |

Example:

```dgr
history resume in active deep
```

### `fork`

```text
fork <id> [label] [in <ref>]
```

A fork pseudostate: a bar across the flow, from one incoming to several outgoing transitions into states, often into the regions of a state. UML 2.5.1: 14.2.3 Fork pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
fork split
```

### `join`

```text
join <id> [label] [in <ref>]
```

A join pseudostate: a bar across the flow that waits for all its incoming transitions from states. UML 2.5.1: 14.2.3 Join pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
join done
```

### `terminate`

```text
terminate <id> [label] [in <ref>]
```

A terminate pseudostate: a cross. The state machine ends at once. UML 2.5.1: 14.2.3 Terminate pseudostate.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this vertex. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small beside the symbol. |
| `in <ref>` | clause | the id of a `state` or `region` declared in this diagram | The composite state or the region the vertex lies in; without it, the vertex stands at the top level. UML 2.5.1: 14.2.3.4 Composite state with substates. |

Example:

```dgr
terminate abort
```

### `entrypoint`

```text
entrypoint <id> [label] [in <ref>]
```

An entry point: a small circle on the border of its state. A transition from outside ends at it and continues inside; on a submachine state the way inside lies in the called machine. UML 2.5.1: 14.2.3 Entry point on the border of a state.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this point. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small outside the circle. |
| `in <ref>` | clause | the id of a `state` declared in this diagram | The composite or submachine state on whose border the point sits. Required. |

Example:

```dgr
entrypoint fresh "New customer" in check
```

### `exitpoint`

```text
exitpoint <id> [label] [in <ref>]
```

An exit point: a small circle with a cross on the border of its state. A transition from inside ends at it and continues outside. UML 2.5.1: 14.2.3 Exit point on the border of a state.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `go` uses for this point. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name shown small outside the circle. |
| `in <ref>` | clause | the id of a `state` declared in this diagram | The composite or submachine state on whose border the point sits. Required. |

Example:

```dgr
exitpoint rejected "Rejected" in check
```

### `region`

```text
region <id> [label] [in <ref>]
```

An orthogonal region of a state: the regions of a state are active at the same time and stand side by side, separated by dashed lines, the name at the top left. Vertices come in with `in`; each region has its own initial pseudostate unless a fork enters it. UML 2.5.1: 14.2.3.2 Orthogonal regions of a state, separated by dashed lines.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `in` uses for this region. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the region, shown at its top left. |
| `in <ref>` | clause | the id of a `state` declared in this diagram | The state the region belongs to. Required. |

Example:

```dgr
region payment "Payment" in processing
```

### `go`

```text
go <from> <arrow> <to> [on=<text>] [when=<text>] [do=<text>] [post=<text>] [emph]
```

A transition from `from` to `to`, labelled `trigger [guard] / effect`; without all three it is a completion transition. `when=else` is the else branch of a choice. A transition of a state to itself is a loop at its freest corner. In a protocol state machine (`{protocol}` in the title) it reads `[precondition] operation / [postcondition]`. UML 2.5.1: 14.2.3.8 Transition with trigger, guard and effect, 14.2.3.8 Completion transition without trigger.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `state`, `initial`, `final`, `choice`, `junction`, `history`, `fork`, `join`, `terminate`, `entrypoint` or `exitpoint` declared in this diagram | The vertex the transition leaves. |
| `<arrow>` | argument | one of the arrows `->` transition, with an open arrowhead at `to` | The arrow of a transition. |
| `<to>` | argument | the id of a `state`, `initial`, `final`, `choice`, `junction`, `history`, `fork`, `join`, `terminate`, `entrypoint` or `exitpoint` declared in this diagram | The vertex the transition enters. |
| `on=` | attribute | a text in double quotes like `"Order service"` | Trigger: the events that fire the transition, separated by commas. A time event is written `after(30 days)`, a change event `when(stock empty)`. In a protocol state machine the operation called. UML 2.5.1: 14.2.3.8 Transition with trigger, guard and effect. |
| `when=` | attribute | a text in double quotes like `"Order service"` | Guard, written without brackets; `else` is the predefined else branch. UML 2.5.1: 14.2.3.8 Predefined guard else. |
| `do=` | attribute | a text in double quotes like `"Order service"` | Effect: the behaviour the transition runs, shown after `/`. |
| `post=` | attribute | a text in double quotes like `"Order service"` | Postcondition of a protocol transition, written without brackets. UML 2.5.1: 14.4.3 Protocol transition with precondition and postcondition. |
| `emph` | flag |  | Highlights the line in the accent colour. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | transition, with an open arrowhead at `to` |

Examples:

```dgr
go open -> paid on="pay" when="amount covered" do="send receipt"
go choice -> open when=else
go open -> cancelled on="after(14 days)"
```

### `internal`

```text
internal <state> [on=<text>] [when=<text>] [do=<text>]
```

An internal transition: a line `trigger [guard] / effect` in the compartment of its state. The state is neither left nor entered again, so no entry or exit behaviour runs. UML 2.5.1: 14.2.4 Internal transition in the compartment of a state.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<state>` | argument | the id of a `state` declared in this diagram | The state whose compartment shows the transition. |
| `on=` | attribute | a text in double quotes like `"Order service"` | Trigger: the events that fire the transition, separated by commas. A time event is written `after(30 days)`, a change event `when(stock empty)`. In a protocol state machine the operation called. UML 2.5.1: 14.2.3.8 Transition with trigger, guard and effect. |
| `when=` | attribute | a text in double quotes like `"Order service"` | Guard, written without brackets. |
| `do=` | attribute | a text in double quotes like `"Order service"` | Effect, shown after `/`. |

Example:

```dgr
internal open on="change item" do="recalculate"
```

### `note`

```text
note <text> [on <ref>]
```

A comment on a vertex: a dashed box above it with a tip down to it, below it when lines run above. UML 2.5.1: 7.2.3.2 Comment (note).

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says, in one line. |
| `on <ref>` | clause | the id of a `state`, `initial`, `final`, `choice`, `junction`, `history`, `fork`, `join`, `terminate`, `entrypoint` or `exitpoint` declared in this diagram | The vertex the note belongs to. Required. |

Example:

```dgr
note "Only for new customers" on check
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

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `state` report these. An error stops the build; a warning is printed and the picture is still drawn.

| Code | Severity | What it checks |
|---|---|---|
| `U440` | error | No transition leaves a final state or a terminate pseudostate, and none enters an initial pseudostate: it is an entry only. UML 2.5.1: 14.2.3 Final state, 14.2.3 Initial pseudostate, 14.2.3 Terminate pseudostate. |
| `U441` | error | Each pseudostate has its number of ways in and out: initial and history at most one out, a fork one in and at least two out, a join at least two in and one out, choice and junction at least one each. UML 2.5.1: 14.2.3 Initial pseudostate, 14.2.3 Shallow and deep history pseudostates, 14.2.3 Fork pseudostate, 14.2.3 Join pseudostate, 14.2.3 Choice pseudostate, 14.2.3 Junction pseudostate. |
| `U442` | error | The transition from an initial pseudostate and the branches of fork and join have neither trigger nor guard; transitions leaving other pseudostates have no trigger. UML 2.5.1: 14.2.3.8 Transition with trigger, guard and effect. |
| `U443` | error | A region, the top level included, has at most one initial pseudostate, one shallow and one deep history. UML 2.5.1: 14.2.3 Initial pseudostate, 14.2.3 Shallow and deep history pseudostates. |
| `U444` | error | A history pseudostate remembers the active substate of a composite state, so it lies in one. UML 2.5.1: 14.2.3 Shallow and deep history pseudostates. |
| `U445` | error | Nesting with `in` forms no cycle, and an internal transition names its trigger: it fires on an event without leaving the state. UML 2.5.1: 14.2.3.4 Composite state with substates, 14.2.4 Internal transition in the compartment of a state. |
| `U446` | error | The branches of a fork end at states, the branches of a join start at states. UML 2.5.1: 14.2.3 Fork pseudostate, 14.2.3 Join pseudostate. |
| `U447` | error | The else branch applies when no other guard holds; two of them at one vertex contradict each other. UML 2.5.1: 14.2.3.8 Predefined guard else. |
| `U448` | error | A region belongs to a state; a state with regions keeps its substates in them; a transition never crosses the border between two regions of one state, they run at the same time; and the branches of a fork or join lie in different regions. UML 2.5.1: 14.2.3.2 Orthogonal regions of a state, separated by dashed lines, 14.2.3 Fork pseudostate, 14.2.3 Join pseudostate. |
| `U449` | error | Entry and exit points sit on the border of a state. An entry point is reached from outside and leads inside, an exit point the other way round. UML 2.5.1: 14.2.3 Entry point on the border of a state, 14.2.3 Exit point on the border of a state. |
| `U460` | error | Entry and exit points belong to a composite state, or as connection point references to a submachine state; a simple state has none. UML 2.5.1: 14.2.3 Entry point on the border of a state, 14.2.3 Exit point on the border of a state, 14.2.3.4 Submachine state calling another state machine. |
| `U461` | error | A submachine state calls another state machine and has no substates or regions of its own. At its points, transitions from outside end at the entry point and start at the exit point; the way inside lies in the called machine. UML 2.5.1: 14.2.3.4 Submachine state calling another state machine. |
| `U462` | error | A time event `after(duration)` and a change event `when(condition)` are triggers: they stand in `on=` with parentheses. In the guard `when=` they would be a condition, not an event. UML 2.5.1: 13.3.3 Time event as a trigger, after(...), 13.3.3 Change event as a trigger, when(...). |
| `U463` | error | A protocol state machine (`{protocol}` in the title) says which calls are allowed in which order. Its states have no entry, do or exit behaviour, its transitions no effect, and it has no history. UML 2.5.1: 14.4.3 Protocol state machine, 14.4.3 Protocol transition with precondition and postcondition. |
| `U464` | error | Only the transition of a protocol state machine has a postcondition `post=`. UML 2.5.1: 14.4.3 Protocol transition with precondition and postcondition. |
| `U465` | error | A note in a state machine diagram is a comment on one vertex: it names it with `on`. UML 2.5.1: 7.2.3.2 Comment (note). |
| `U940` | warning | A state machine starts at an initial pseudostate at the top level, and an initial pseudostate leads somewhere. A machine drawn as one state with its own entry and exit points starts at the caller instead. UML 2.5.1: 14.2.3 Initial pseudostate. |
| `U941` | warning | Every state can be reached from the initial pseudostate: entering a composite state reaches its inside, and being in a substate means being in its parents too. UML 2.5.1: 14.2.3.4 Simple state. |
| `U942` | warning | A simple state that no transition leaves, neither itself nor a parent nor an exit point of it, is a dead end; usually a transition to a final state is missing. UML 2.5.1: 14.2.3.4 Simple state, 14.2.3 Final state. |
| `U943` | warning | Every way out of a choice has a guard and one of them is `else`, so the machine never gets stuck there; `else` belongs to a choice or junction. UML 2.5.1: 14.2.3 Choice pseudostate, 14.2.3.8 Predefined guard else. |
| `U944` | warning | Two ways out of a state on the same trigger need guards that tell them apart; otherwise the machine is not deterministic. UML 2.5.1: 14.2.3.8 Transition with trigger, guard and effect. |
| `U945` | warning | A transition of a state to itself leaves and enters it again and runs its exit and entry behaviour; an internal transition does not. UML 2.5.1: 14.2.4 Internal transition in the compartment of a state, 14.2.4 Entry, do and exit behavior in the compartment of a state. |
| `U946` | warning | A transition that ends at the frame of a composite state enters it at its initial pseudostate; without one it is not clear where it continues. States with regions are checked per region. UML 2.5.1: 14.2.3.4 Composite state with substates, 14.2.3 Initial pseudostate. |
| `U947` | warning | What a fork splits, a join usually brings together again. UML 2.5.1: 14.2.3 Fork pseudostate, 14.2.3 Join pseudostate. |
| `U948` | warning | Each region of a state starts at its own initial pseudostate, unless every way into the state enters the region explicitly, as the branches of a fork do. UML 2.5.1: 14.2.3.2 Orthogonal regions of a state, separated by dashed lines, 14.2.3 Initial pseudostate. |
| `U949` | warning | An entry or exit point has a way in and a way out. On a submachine state only the outside counts, and on the frame of a machine drawn with its own points the outside lies with the caller. UML 2.5.1: 14.2.3 Entry point on the border of a state, 14.2.3 Exit point on the border of a state. |
| `U960` | warning | A state that defers an event and fires a transition on it in the same state: the transition wins and the deferral says nothing. UML 2.5.1: 14.2.4 Deferred event in the compartment of a state. |
| `U961` | warning | A deferred event waits for a later state that fires a transition on it; without one it waits forever. UML 2.5.1: 14.2.4 Deferred event in the compartment of a state. |
