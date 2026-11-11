<!-- Generated from the statement tables and the rules of `component` by `pnpm docs:generate`. Do not edit. -->

# Kind `component`

A C4 component diagram (level 3): the components inside a container and what they depend on, placed in a named grid. Full reference with every argument: `dgr grammar component --json`.

```text
diagram component "Title" [subtitle=<text>] [label=<text>] [look=<plain|cards|blocks|paper|columns|lowfi>] [decisions=<right|below|auto>] [layout=<adaptive>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `grid <axis> <names>` | top level | The named columns from left to right, or the rows from top to bottom. | `grid cols user,backend.1,backend.2,edge` |
| `layer <row> <label>` | top level | Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`. | `layer business "Business logic"` |
| `group <id> <title> [in <ref>] [team=<text>] [heading=<top\|side>] [tag=<text>] [cover=<grid-name>] [tone=<choice>] [area=<ref>] [own] [shared] [external]` | top level | A frame around elements by responsibility; it grows from its members. | `group backend "Backend" own team="Kotlin · Team Ausleihe"` |
| `style <id> [icon=<choice>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card\|circle\|text>]` | top level | Named values for elements, and a tone for edges, so sizes and colours stand in one place. | `style component height=80` |
| `person <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card\|circle\|text>] [status=<planned\|deprecated\|optional\|existing\|new>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [area=<ref>] [emph]` | top level | A person who uses the system, drawn as a stick figure with name and role below it. | `person customer "Customer" tech="account holder" at user/main` |
| `container <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card\|circle\|text>] [status=<planned\|deprecated\|optional\|existing\|new>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [area=<ref>] [emph]` | top level | A container: an application or data store that runs on its own, such as a service or a database. | `container db "Database" tech="PostgreSQL" icon=postgresql at infra/data in infra` |
| `component <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card\|circle\|text>] [status=<planned\|deprecated\|optional\|existing\|new>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [area=<ref>] [emph]` | top level | A component inside a container, such as a module or an adapter. | `component api "REST API" tech="Spring Boot" icon=springboot at backend.2/main in backend` |
| `node <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db\|queue\|store\|job\|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card\|circle\|text>] [status=<planned\|deprecated\|optional\|existing\|new>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [area=<ref>] [emph]` | top level | A neutral element for any level, such as a queue, a job or a layer of a pattern. | `node orders "Orders" tech="business logic" replicas=3 at web/business in cloud` |
| `edge <from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<choice>] [style=<ref>] [area=<ref>]` | top level | An edge outside of flows, without number. | `edge abgleich => db "check inventory" schedule="daily 03:00"` |
| `flow <id> [primary] [accent]` | top level | A numbered path: its steps are indented below it. | `flow import primary` |
| `note <text> [on <ref>] [tone=<choice>]` | top level | A dashed note above an element, with a tip pointing at it; without `on` a remark below the picture. | `note "replaced in Q3" on portal` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `edge`: `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end).

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `component` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `A007` | error | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| `A008` | error | Every element has a place in the grid with `at column/row`. |
| `A103` | error | Column and row of `at` are names of the grid. |
| `A105` | error | An edge connects two different elements or groups. |
| `A106` | error | Every column and every row is named once. |
| `A107` | error | An edge does not lead from an element to the group that holds it, or back. |
| `A109` | error | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| `A710` | warning | An edge says what happens: a label or a protocol (`via=`). |
| `A801` | warning | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |
