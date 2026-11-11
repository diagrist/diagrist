<!-- Generated from the statement tables and the rules of `state` by `pnpm docs:generate`. Do not edit. -->

# Kind `state`

A UML state machine diagram (UML 2.5.1, chapter 14): states and pseudostates joined by transitions, composite states with substates or orthogonal regions, entry and exit points on their border. `{protocol}` in the title makes it a protocol state machine. Diagrist lays it out by itself: layers by the longest path from the initial pseudostate, final states last, back and skip transitions on rails beside the states, loops at a free corner. Full reference with every argument: `dgr grammar state --json`.

```text
diagram state "Title" [subtitle=<text>] [look=<plain|cards>] [direction=<down|right>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `state <id> <label> [in <ref>] [entry=<text>] [do=<text>] [exit=<text>] [defer=<text>] [submachine=<text>] [file=<text>] [tone=<choice>] [mark=<ref>] [area=<ref>] [emph]` | top level | A state: a rounded box with the name, below it a compartment with `entry`, `do` and `exit`, deferred events and internal transitions. | `state open "Open" entry="set deadline"` |
| `initial <id> [label] [in <ref>] [area=<ref>]` | top level | The initial pseudostate: a filled circle. | `initial start` |
| `final <id> [label] [in <ref>] [area=<ref>]` | top level | A final state: a circle with a dot. | `final end` |
| `choice <id> [label] [in <ref>] [area=<ref>]` | top level | A choice pseudostate: a diamond. | `choice paid` |
| `junction <id> [label] [in <ref>] [area=<ref>]` | top level | A junction pseudostate: a small filled circle that joins or splits transitions without a decision of its own. | `junction merge` |
| `history <id> [label] [in <ref>] [area=<ref>] [deep]` | top level | A history pseudostate inside a composite state: a circle with `H`, with `deep` `H*`. | `history resume in active deep` |
| `fork <id> [label] [in <ref>] [area=<ref>]` | top level | A fork pseudostate: a bar across the flow, from one incoming to several outgoing transitions into states, often into the regions of a state. | `fork split` |
| `join <id> [label] [in <ref>] [area=<ref>]` | top level | A join pseudostate: a bar across the flow that waits for all its incoming transitions from states. | `join done` |
| `terminate <id> [label] [in <ref>] [area=<ref>]` | top level | A terminate pseudostate: a cross. | `terminate abort` |
| `entrypoint <id> [label] [in <ref>] [area=<ref>]` | top level | An entry point: a small circle on the border of its state. | `entrypoint fresh "New customer" in check` |
| `exitpoint <id> [label] [in <ref>] [area=<ref>]` | top level | An exit point: a small circle with a cross on the border of its state. | `exitpoint rejected "Rejected" in check` |
| `region <id> [label] [in <ref>] [area=<ref>]` | top level | An orthogonal region of a state: the regions of a state are active at the same time and stand side by side, separated by dashed lines, the name at the top left. | `region payment "Payment" in processing` |
| `go <from> <arrow> <to> [on=<text>] [when=<text>] [do=<text>] [post=<text>] [area=<ref>] [side=<left\|right\|above\|below>] [emph]` | top level | A transition from `from` to `to`, labelled `trigger [guard] / effect`; without all three it is a completion transition. | `go open -> paid on="pay" when="amount covered" do="send receipt"` |
| `internal <state> [on=<text>] [when=<text>] [do=<text>]` | top level | An internal transition: a line `trigger [guard] / effect` in the compartment of its state. | `internal open on="change item" do="recalculate"` |
| `note <text> [on <ref>]` | top level | A comment on a vertex: a dashed box above it with a tip down to it, below it when lines run above. | `note "Only for new customers" on check` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `go`: `->` transition, with an open arrowhead at `to`.

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `state` report these codes:

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
| `U962` | warning | `side=` puts the target beside the source, across the flow: `left` or `right` in a flow down, `above` or `below` with `direction=right`. A side along the flow has no effect (ADR 0040). |
