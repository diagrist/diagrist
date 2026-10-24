<!-- Generated from the catalogs in src/spec and the marks on the tables and rules by `pnpm docs:generate`. Do not edit. -->

# UML 2.5.1 coverage

This report shows which elements of UML 2.5.1 the kinds of `plugin-uml` implement. Each kind has a catalog in `src/spec`: the elements a diagram of that kind can show, each with the section of the specification that defines it and a short title in our own words. The catalog quotes no text of the specification.

Nobody declares an element covered. A statement, an argument, a value such as an arrow, a flag or a rule says which elements it implements, with `implementing` in the tables and rules (ADR 0017), and this report is derived from those marks. The same marks add a sentence like `UML 2.5.1: 17.4.3.1 Lost message.` to the docs of the tables, so the grammar, the language spec and the agent skill name the elements too. An element nothing points at is not covered. The examples column lists the files under `examples/` that use a part implementing the element.

## `sequence`: chapter 17, Interactions

35 of 41 elements are covered (85 %).

| Element | Section | Covered by | Examples |
|---|---|---|---|
| Interaction, drawn as a frame | 17.2.3.1 | `frame` | `oauth-callback` |
| Execution on a lifeline (activation bar) | 17.2.3.4 | `activate`, `deactivate`, U405, U905 | `bestellung-bestaetigen` and 4 more |
| State invariant | 17.2.3.5 | `invariant`, U452 | `oauth-callback` |
| Lifeline | 17.3.3.1 | `participant`, `actor`, `database`, `queue`, `boundary`, `control`, `entity`, U400, U902 | `bericht-abfragen` and 14 more |
| Message | 17.4.3.1 | `msg` | `bericht-abfragen` and 14 more |
| Synchronous call | 17.4.3.1 | `msg` with `->`, U403, U901, U907 | `bericht-abfragen` and 14 more |
| Asynchronous call or signal | 17.4.3.1 | `msg` with `~>` | `bericht-abfragen` and 9 more |
| Reply to a call | 17.4.3.1 | `msg` with `-->`, U403, U901 | `bericht-abfragen` and 14 more |
| Message that creates a lifeline | 17.4.3.1 | `create`, U404 | `observer` |
| Message that deletes a lifeline | 17.4.3.1 | not covered |  |
| Lost message, without receiver | 17.4.3.1 | `msg` with `lost`, U408, U907 | `zahlung-webhook` |
| Found message, without sender | 17.4.3.1 | `msg` with `found`, U408, U907 | `zahlung-webhook` |
| End of a lifeline (destruction) | 17.4.3.4 | `destroy`, U404 |  |
| Gate on the frame of the interaction | 17.4.3.5 | `msg` with `gate`, U450, U951 | `bestellung-bestaetigen` and 2 more |
| Gate on an interaction use | 17.4.3.5 | `ref` with `id=`, U454, U950, U951 | `bestellung-bestaetigen` and 1 more |
| Gate on a combined fragment | 17.4.3.5 | `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider` with `id=`, U454, U950, U951 | `bestellung-bestaetigen` and 1 more |
| Order between two occurrences | 17.5.3.4 | not covered |  |
| Operand of a combined fragment | 17.6.3.1 | `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider`, `and`, `else`, U401, U903 | `bestellung-bestaetigen` and 12 more |
| Guard of an operand | 17.6.3.2 | `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `and`, `else` with `<guard>`, U904 | `bestellung-bestaetigen` and 11 more |
| Combined fragment | 17.6.3.3 | `alt`, `opt`, `loop`, `par`, `break`, `critical`, `seq`, `strict`, `neg`, `assert`, `ignore`, `consider` | `bestellung-bestaetigen` and 12 more |
| Continuation | 17.6.3.5 | not covered |  |
| Alternatives (`alt`) | 17.6.3.7 | `alt`, U900, U904 | `bestellung-saga` and 6 more |
| Option (`opt`) | 17.6.3.8 | `opt` | `zahlung-autorisieren` |
| Break (`break`) | 17.6.3.9 | `break` | `bestellung-saga` and 1 more |
| Parallel (`par`) | 17.6.3.10 | `par`, U900 |  |
| Weak sequencing (`seq`) | 17.6.3.11 | `seq` |  |
| Strict sequencing (`strict`) | 17.6.3.12 | `strict` |  |
| Invalid traces (`neg`) | 17.6.3.13 | `neg` | `oauth-callback` |
| Critical region (`critical`) | 17.6.3.14 | `critical` |  |
| Ignored messages (`ignore`) | 17.6.3.15 | `ignore`, U451 |  |
| Considered messages (`consider`) | 17.6.3.15 | `consider`, U451 |  |
| Assertion (`assert`) | 17.6.3.16 | `assert` |  |
| Loop (`loop`) | 17.6.3.17 | `loop` | `bestellung-bestaetigen` and 5 more |
| Coregion, unordered events on one lifeline | 17.6.4.10 | `coregion`, U453, U909 | `bestellung-bestaetigen` |
| Use of another interaction (`ref`) | 17.7.3.1 | `ref`, U452 | `bestellung-bestaetigen` and 3 more |
| Lifeline decomposed into an interaction | 17.7.3.2 | not covered |  |
| Observed point in time | 8.4.3.2 | not covered |  |
| Observed duration | 8.4.3.2 | not covered |  |
| Time constraint | 8.5.3.2 | `time` |  |
| Duration constraint | 8.5.3.2 | `duration`, `msg`, `create` with `duration=`, U906, U908 | `bericht-abfragen` and 5 more |
| Comment (note) | 7.2.3.2 | `note` | `bestellung-saga` and 4 more |

## `usecase`: chapter 18, Use Cases

16 of 19 elements are covered (84 %).

| Element | Section | Covered by | Examples |
|---|---|---|---|
| Use case | 18.1.3.1 | `usecase` | `auftragsabwicklung` and 8 more |
| Actor | 18.1.3.1 | `actor`, U923 | `auftragsabwicklung` and 8 more |
| Subject a use case applies to | 18.1.3.1 | `subject`, `usecase` with `in`, U920, U926 | `auftragsabwicklung` and 8 more |
| Association of an actor with a use case | 18.1.3.1 | `rel` with `--`, U422, U921 | `auftragsabwicklung` and 8 more |
| Multiplicity at an end of that association | 18.1.3.1 | `rel` with `source=`, `rel` with `card=`, U426 | `auftragsabwicklung` and 3 more |
| Extend | 18.1.3.2 | `rel` with `extend`, U421, U424, U426, U924 | `auftragsabwicklung` and 4 more |
| Extension point | 18.1.3.2 | `usecase` with `points=`, `rel` with `at=`, U424, U922 | `auftragsabwicklung` and 4 more |
| Condition of an extend | 18.1.3.2 | `rel` with `when=`, U426, U922 | `auftragsabwicklung` and 4 more |
| Include | 18.1.3.3 | `rel` with `include`, U421, U425, U426, U924 | `auftragsabwicklung` and 6 more |
| Keyword or stereotype above a use case | 18.1.4 | `usecase` with `stereotype=`, U427 |  |
| Keyword or stereotype above a subject | 18.1.4 | not covered |  |
| Compartment listing the extension points | 18.1.4 | `usecase` with `points=` | `auftragsabwicklung` and 4 more |
| Use case as a rectangle with an ellipse icon | 18.1.4 | `usecase` with `form=classifier` |  |
| Condition and extension points in a note on the extend | 18.1.4 | `rel` with `when=`, `rel` with `at=` | `auftragsabwicklung` and 4 more |
| Actor as a rectangle with the keyword «actor» | 18.1.4 | `actor` with `kind=system` | `auftragsabwicklung` and 5 more |
| Actor drawn with an icon of its own | 18.1.4 | not covered |  |
| Use cases in a compartment of the classifier that owns them | 18.1.4 | not covered |  |
| Generalization between actors or between use cases | 9.2.3.2 | `rel` with `-\|>`, U423 | `onlineshop` and 2 more |
| Comment (note) | 7.2.3.2 | `note`, U428 | `zwei-systeme` |

## `activity`: chapters 15, Activities, and 16, Actions

31 of 34 elements are covered (91 %).

| Element | Section | Covered by | Examples |
|---|---|---|---|
| Control flow | 15.2.3.3 | `go` with `->`, U434 | `auftragsabwicklung` and 11 more |
| Guard on an activity edge | 15.2.3.3 | `go` with `<guard>`, U433, U933, U934 | `auftragsabwicklung` and 6 more |
| Weight of an activity edge | 15.2.3.3 | `go` with `weight=` | `zahlung-ausnahme` |
| Object flow | 15.2.3.4 | `go` with `=>`, U434 | `auftragsabwicklung` and 6 more |
| Initial node | 15.3.3.1 | `initial`, U430, U930 | `auftragsabwicklung` and 11 more |
| Activity final node, ending every flow | 15.3.3.2 | `final`, U430, U936, U938 | `auftragsabwicklung` and 11 more |
| Flow final node, ending one flow | 15.3.3.2 | `flowfinal`, U430, U936 | `bestellbestaetigung` |
| Fork node | 15.3.3.3 | `fork`, U432, U932 | `auftragsabwicklung` and 5 more |
| Join node | 15.3.3.4 | `join`, U432, U435, U932 | `auftragsabwicklung` and 4 more |
| Merge node | 15.3.3.5 | `merge`, U432, U932, U937 | `auftragsabwicklung` and 6 more |
| Decision node | 15.3.3.6 | `decision`, U431, U931 | `auftragsabwicklung` and 6 more |
| Predefined guard else | 15.3.3.6 | `go` with `else`, U433, U934 | `auftragsabwicklung` and 3 more |
| Object node | 15.4.3.1 | `object` | `auftragsabwicklung` and 2 more |
| Activity parameter node on the border of the activity | 15.4.3.2 | not covered |  |
| Central buffer node | 15.4.3.3 | `buffer` | `zahlung-ausnahme` |
| Data store node | 15.4.3.4 | `datastore` | `zahlung-ausnahme` |
| States of an object node in brackets below its name | 15.4.4.1 | `object` with `state=` | `auftragsabwicklung` and 1 more |
| Exception handler of an executable node | 15.5.3.1 | `handler`, U456 | `karten-belasten` and 1 more |
| Activity partition (swimlane) | 15.6.3.1 | `partition`, `initial`, `final`, `flowfinal`, `action`, `decision`, `merge`, `fork`, `join`, `object`, `datastore`, `buffer`, `send`, `accept`, `wait` with `in` | `auftragsabwicklung` and 8 more |
| Interruptible activity region | 15.6.3.2 | `interruptible`, `initial`, `final`, `flowfinal`, `action`, `decision`, `merge`, `fork`, `join`, `object`, `datastore`, `buffer`, `send`, `accept`, `wait` with `interruptible=`, U955 | `auftragsabwicklung` and 1 more |
| Edge that interrupts its region | 15.6.3.2 | `go` with `~>`, U437 | `auftragsabwicklung` and 1 more |
| Action | 16.2.3.1 | `action`, U939 | `auftragsabwicklung` and 11 more |
| Input and output pin of an action | 16.2.3.3 | `action`, `send` with `input=`, `action`, `accept` with `output=`, `go` with `pin=`, U455 | `auftragsabwicklung` and 6 more |
| Send signal action | 16.3.3.2 | `send` | `auftragsabwicklung` and 1 more |
| Call behavior action with the rake symbol | 16.3.4.1 | `action` with `call` | `auftragsabwicklung` and 1 more |
| Call operation action | 16.3.4.2 | not covered |  |
| Accept event action | 16.10.3.1 | `accept` | `auftragsabwicklung` and 1 more |
| Accept time event action drawn as an hourglass | 16.10.4 | `wait` | `auftragsabwicklung` and 1 more |
| Structured activity node | 16.11.3.1 | not covered |  |
| Expansion region | 16.12.3 | `expansion`, `initial`, `final`, `flowfinal`, `action`, `decision`, `merge`, `fork`, `join`, `object`, `datastore`, `buffer`, `send`, `accept`, `wait` with `expansion=`, U956, U957 | `karten-belasten` and 3 more |
| Expansion node on the border of its region | 16.12.3 | `expansion`, `expansion` with `input=`, `expansion` with `output=`, U457, U458 | `karten-belasten` and 3 more |
| Expansion mode iterative | 16.12.3 | `expansion` with `mode=iterative` | `karten-belasten` and 1 more |
| Expansion mode parallel | 16.12.3 | `expansion` with `mode=parallel` | `positionen-pruefen` and 1 more |
| Expansion mode stream | 16.12.3 | `expansion` with `mode=stream` |  |
