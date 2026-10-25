<!-- Generated from the statement tables of the kind `context` (plugin `architecture`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `context`

A C4 system context diagram (level 1): the system as one box, the people who use it and the systems around it, placed in a named grid.

This page lists everything a `context` diagram may contain. The same grammar is available as data with `dgr grammar context --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram context "Title" [subtitle=<text>] [label=<text>] [look=<plain|cards|blocks|paper>] [layout=<adaptive>] [locale=<en|de>]
```

Every context diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `label=` | attribute | a text in double quotes like `"Order service"` | Name before the title instead of the kind; an empty `label=""` leaves only the title. |
| `look=` | attribute | one of `plain`, `cards`, `blocks`, `paper` | `plain` (default) boxes with a legend, `cards` toned icon cards, `blocks` filled blocks as in pattern books, `paper` a quiet print look: Inter on paper, zones as areas, the core in yellow, decisions in the margin. |
| `layout=` | attribute | one of `adaptive` | Columns grow to their content and edges find their own way around obstacles; without it the grid is fixed. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram context "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `context` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`grid`](#grid) | top level | The named columns from left to right, or the rows from top to bottom. |
| [`layer`](#layer) | top level | Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`. |
| [`group`](#group) | top level | A frame around elements by responsibility; it grows from its members. |
| [`style`](#style) | top level | Named values for elements, and a tone for edges, so sizes and colours stand in one place. |
| [`person`](#person) | top level | A person who uses the system, drawn as a stick figure with name and role below it. |
| [`system`](#system) | top level | A software system, as a box with name and a second line. |
| [`node`](#node) | top level | A neutral element for any level, such as a queue, a job or a layer of a pattern. |
| [`edge`](#edge) | top level | An edge outside of flows, without number. |
| [`flow`](#flow) | top level | A numbered path: its steps are indented below it. |
| [`note`](#note) | top level | A dashed note above an element, with a tip pointing at it. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `grid`

```text
grid <axis> <names>
```

The named columns from left to right, or the rows from top to bottom. Names with the same prefix before a dot stand close, such as `api.1,api.2`.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<axis>` | argument | one of `cols`, `rows` | `cols` for the columns, `rows` for the rows. |
| `<names>` | argument | names separated by commas without spaces, like `user,api.1,api.2` | The names in order, separated by commas without spaces. |

Examples:

```dgr
grid cols user,backend.1,backend.2,edge
grid rows top,main,data
```

### `layer`

```text
layer <row> <label>
```

Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<row>` | argument | a column or row name like `api` or `backend.1` | The row it names. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the layer. |

Example:

```dgr
layer business "Business logic"
```

### `group`

```text
group <id> <title> [in <ref>] [team=<text>] [heading=<top|side>] [tag=<text>] [cover=<grid-name>] [tone=<choice>] [own] [shared] [external]
```

A frame around elements by responsibility; it grows from its members. Exactly one of `own`, `shared`, `external`. `in` nests it into another group; an empty title draws only the frame.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `in` of elements and groups and the ends of edges use. |
| `<title>` | argument | a text in double quotes like `"Order service"` | Title in the head of the frame. |
| `in <ref>` | clause | the id of a `group` declared in this diagram | The group whose frame holds this one. |
| `team=` | attribute | a text in double quotes like `"Order service"` | Who is responsible; second line of the head, else the role in words. |
| `heading=` | attribute | one of `top`, `side` | `top` (default) or `side`: title left in the middle, as for layer bands. |
| `tag=` | attribute | a text in double quotes like `"Order service"` | A tag right in the frame, such as `"CLOSED"` for a closed layer. |
| `cover=` | attribute | a column or row name like `api` or `backend.1` | A column the frame also covers, at the height of its members; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Fills the frame lightly in this tone; in `look=blocks` the colour of its area. |
| `own` | flag |  | Our own system: a solid frame on a light area. |
| `shared` | flag |  | Shared infrastructure: its elements are drawn muted. |
| `external` | flag |  | Someone else’s system: a dashed frame. |

Examples:

```dgr
group backend "Backend" own team="Spring Boot · Team Radverleih"
group api "API" own in backend
```

### `style`

```text
style <id> [icon=<choice>] [shape=<db|queue|store|job|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card|circle|text>]
```

Named values for elements, and a tone for edges, so sizes and colours stand in one place. `style=name` applies them where the element or edge sets none.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name that `style=` refers to. |
| `icon=` | attribute | one of `apachekafka`, `archive`, `boxes`, `brick-wall`, `building-2`, `chart-line`, `cloud`, `container`, `copy`, `cpu`, `database`, `earth`, `file-cog`, `file-text`, `files`, `flame`, `folder`, `gauge`, `globe`, `hard-drive`, `hexagon`, `key-round`, `keycloak`, `kubernetes`, `layers`, `layout-dashboard`, `lock`, `map-pin`, `minio`, `monitor`, `network`, `package`, `postgresql`, `puzzle`, `receipt`, `route`, `router`, `server`, `server-cog`, `settings`, `shield`, `shield-check`, `smartphone`, `split`, `springboot`, `terminal`, `user-cog`, `user-round`, `users`, `vuedotjs`, `warehouse`, `waypoints`, `workflow` | Pictogram before the name: the technology or the role of the element. |
| `shape=` | attribute | one of `db`, `queue`, `store`, `job`, `app` | Form of the box: `db` cylinder, `queue` tube, `store` folded sheet, `job`, `app`. |
| `width=` | attribute | a whole number from 48 to 960 | Width of the box in pixels; needs `layout=adaptive`. |
| `height=` | attribute | a whole number from 24 to 480 | Height of the box in pixels; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the icon circle in `look=cards` and of the block in `look=blocks`. |
| `form=` | attribute | one of `card`, `circle`, `text` | `card` or `circle` in `look=cards`; `text` draws only the name in `look=blocks`. |

Examples:

```dgr
style component height=80
style store shape=db height=96
```

### `person`

```text
person <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db|queue|store|job|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card|circle|text>] [status=<planned|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]
```

A person who uses the system, drawn as a stick figure with name and role below it. `at` places it in the grid, `in` puts it into a group. `emph` marks a core decision with a thick border.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that edges, flows, notes and `in` use for this element. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name in the picture. |
| `at <place>` | clause | a place `column/row` like `backend.1/main` | Place in the grid as `column/row`. Required. |
| `in <ref>` | clause | the id of a `group` declared in this diagram | The group whose frame holds the element. |
| `tech=` | attribute | a text in double quotes like `"Order service"` | Second line: technology or role, such as `"PostgreSQL"`. |
| `icon=` | attribute | one of `apachekafka`, `archive`, `boxes`, `brick-wall`, `building-2`, `chart-line`, `cloud`, `container`, `copy`, `cpu`, `database`, `earth`, `file-cog`, `file-text`, `files`, `flame`, `folder`, `gauge`, `globe`, `hard-drive`, `hexagon`, `key-round`, `keycloak`, `kubernetes`, `layers`, `layout-dashboard`, `lock`, `map-pin`, `minio`, `monitor`, `network`, `package`, `postgresql`, `puzzle`, `receipt`, `route`, `router`, `server`, `server-cog`, `settings`, `shield`, `shield-check`, `smartphone`, `split`, `springboot`, `terminal`, `user-cog`, `user-round`, `users`, `vuedotjs`, `warehouse`, `waypoints`, `workflow` | Pictogram before the name: the technology or the role of the element. |
| `shape=` | attribute | one of `db`, `queue`, `store`, `job`, `app` | Form of the box: `db` cylinder, `queue` tube, `store` folded sheet, `job`, `app`. |
| `width=` | attribute | a whole number from 48 to 960 | Width of the box in pixels; needs `layout=adaptive`. |
| `height=` | attribute | a whole number from 24 to 480 | Height of the box in pixels; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the icon circle in `look=cards` and of the block in `look=blocks`. |
| `form=` | attribute | one of `card`, `circle`, `text` | `card` or `circle` in `look=cards`; `text` draws only the name in `look=blocks`. |
| `status=` | attribute | one of `planned`, `deprecated` | `planned` draws the box dashed, `deprecated` grey; both name it beside `tech`. |
| `replicas=` | attribute | a whole number from 2 to 99 | Number of instances from 2, shown as `x3` in the corner. |
| `span=` | attribute | the last column like `mobile`, or `column/row` like `edge/data` | Last column, or `column/row`, of the area the element covers; needs `layout=adaptive`. |
| `slot=` | attribute | `i/n` with 1 ≤ i ≤ n ≤ 64, like `2/3` | Takes place `i` of `n` equal places in its area, like `2/3`; needs `layout=adaptive`. |
| `style=` | attribute | the id of a `style` declared in this diagram | A `style` whose values apply where the element sets none. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the bar below, such as `E1`; the mark stands at the corner. |
| `emph` | flag |  | Draws the border thick: the core decision of the picture. |

Example:

```dgr
person customer "Customer" tech="account holder" at user/main
```

### `system`

```text
system <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db|queue|store|job|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card|circle|text>] [status=<planned|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]
```

A software system, as a box with name and a second line. `at` places it in the grid, `in` puts it into a group. `emph` marks a core decision with a thick border.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that edges, flows, notes and `in` use for this element. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name in the picture. |
| `at <place>` | clause | a place `column/row` like `backend.1/main` | Place in the grid as `column/row`. Required. |
| `in <ref>` | clause | the id of a `group` declared in this diagram | The group whose frame holds the element. |
| `tech=` | attribute | a text in double quotes like `"Order service"` | Second line: technology or role, such as `"PostgreSQL"`. |
| `icon=` | attribute | one of `apachekafka`, `archive`, `boxes`, `brick-wall`, `building-2`, `chart-line`, `cloud`, `container`, `copy`, `cpu`, `database`, `earth`, `file-cog`, `file-text`, `files`, `flame`, `folder`, `gauge`, `globe`, `hard-drive`, `hexagon`, `key-round`, `keycloak`, `kubernetes`, `layers`, `layout-dashboard`, `lock`, `map-pin`, `minio`, `monitor`, `network`, `package`, `postgresql`, `puzzle`, `receipt`, `route`, `router`, `server`, `server-cog`, `settings`, `shield`, `shield-check`, `smartphone`, `split`, `springboot`, `terminal`, `user-cog`, `user-round`, `users`, `vuedotjs`, `warehouse`, `waypoints`, `workflow` | Pictogram before the name: the technology or the role of the element. |
| `shape=` | attribute | one of `db`, `queue`, `store`, `job`, `app` | Form of the box: `db` cylinder, `queue` tube, `store` folded sheet, `job`, `app`. |
| `width=` | attribute | a whole number from 48 to 960 | Width of the box in pixels; needs `layout=adaptive`. |
| `height=` | attribute | a whole number from 24 to 480 | Height of the box in pixels; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the icon circle in `look=cards` and of the block in `look=blocks`. |
| `form=` | attribute | one of `card`, `circle`, `text` | `card` or `circle` in `look=cards`; `text` draws only the name in `look=blocks`. |
| `status=` | attribute | one of `planned`, `deprecated` | `planned` draws the box dashed, `deprecated` grey; both name it beside `tech`. |
| `replicas=` | attribute | a whole number from 2 to 99 | Number of instances from 2, shown as `x3` in the corner. |
| `span=` | attribute | the last column like `mobile`, or `column/row` like `edge/data` | Last column, or `column/row`, of the area the element covers; needs `layout=adaptive`. |
| `slot=` | attribute | `i/n` with 1 ≤ i ≤ n ≤ 64, like `2/3` | Takes place `i` of `n` equal places in its area, like `2/3`; needs `layout=adaptive`. |
| `style=` | attribute | the id of a `style` declared in this diagram | A `style` whose values apply where the element sets none. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the bar below, such as `E1`; the mark stands at the corner. |
| `emph` | flag |  | Draws the border thick: the core decision of the picture. |

Example:

```dgr
system shop "Web shop" tech="sells online" at core/main emph mark=E1
```

### `node`

```text
node <id> <label> [at <place>] [in <ref>] [tech=<text>] [icon=<choice>] [shape=<db|queue|store|job|app>] [width=<integer>] [height=<integer>] [tone=<choice>] [form=<card|circle|text>] [status=<planned|deprecated>] [replicas=<integer>] [span=<span>] [slot=<slot>] [style=<ref>] [mark=<ref>] [emph]
```

A neutral element for any level, such as a queue, a job or a layer of a pattern. `at` places it in the grid, `in` puts it into a group. `emph` marks a core decision with a thick border.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that edges, flows, notes and `in` use for this element. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name in the picture. |
| `at <place>` | clause | a place `column/row` like `backend.1/main` | Place in the grid as `column/row`. Required. |
| `in <ref>` | clause | the id of a `group` declared in this diagram | The group whose frame holds the element. |
| `tech=` | attribute | a text in double quotes like `"Order service"` | Second line: technology or role, such as `"PostgreSQL"`. |
| `icon=` | attribute | one of `apachekafka`, `archive`, `boxes`, `brick-wall`, `building-2`, `chart-line`, `cloud`, `container`, `copy`, `cpu`, `database`, `earth`, `file-cog`, `file-text`, `files`, `flame`, `folder`, `gauge`, `globe`, `hard-drive`, `hexagon`, `key-round`, `keycloak`, `kubernetes`, `layers`, `layout-dashboard`, `lock`, `map-pin`, `minio`, `monitor`, `network`, `package`, `postgresql`, `puzzle`, `receipt`, `route`, `router`, `server`, `server-cog`, `settings`, `shield`, `shield-check`, `smartphone`, `split`, `springboot`, `terminal`, `user-cog`, `user-round`, `users`, `vuedotjs`, `warehouse`, `waypoints`, `workflow` | Pictogram before the name: the technology or the role of the element. |
| `shape=` | attribute | one of `db`, `queue`, `store`, `job`, `app` | Form of the box: `db` cylinder, `queue` tube, `store` folded sheet, `job`, `app`. |
| `width=` | attribute | a whole number from 48 to 960 | Width of the box in pixels; needs `layout=adaptive`. |
| `height=` | attribute | a whole number from 24 to 480 | Height of the box in pixels; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the icon circle in `look=cards` and of the block in `look=blocks`. |
| `form=` | attribute | one of `card`, `circle`, `text` | `card` or `circle` in `look=cards`; `text` draws only the name in `look=blocks`. |
| `status=` | attribute | one of `planned`, `deprecated` | `planned` draws the box dashed, `deprecated` grey; both name it beside `tech`. |
| `replicas=` | attribute | a whole number from 2 to 99 | Number of instances from 2, shown as `x3` in the corner. |
| `span=` | attribute | the last column like `mobile`, or `column/row` like `edge/data` | Last column, or `column/row`, of the area the element covers; needs `layout=adaptive`. |
| `slot=` | attribute | `i/n` with 1 ≤ i ≤ n ≤ 64, like `2/3` | Takes place `i` of `n` equal places in its area, like `2/3`; needs `layout=adaptive`. |
| `style=` | attribute | the id of a `style` declared in this diagram | A `style` whose values apply where the element sets none. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the bar below, such as `E1`; the mark stands at the corner. |
| `emph` | flag |  | Draws the border thick: the core decision of the picture. |

Example:

```dgr
node orders "Orders" tech="business logic" replicas=3 at web/business in cloud
```

### `edge`

```text
edge <from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<choice>] [style=<ref>]
```

An edge outside of flows, without number. Its ends may be groups too.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `person`, `system`, `node` or `group` declared in this diagram | Where it starts: an element or a group. |
| `<arrow>` | argument | one of the arrows `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end) | The kind of edge, which also decides how it is drawn. |
| `<to>` | argument | the id of a `person`, `system`, `node` or `group` declared in this diagram | Where it ends: an element or a group. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | What happens, such as `"reads documents"`; first line of the label. |
| `via=` | attribute | a text in double quotes like `"Order service"` | Protocol or transport, such as `HTTPS`; second line of the label. |
| `schedule=` | attribute | a text in double quotes like `"Order service"` | When it runs, such as `"nightly 02:00"`; joins the second line. |
| `volume=` | attribute | a text in double quotes like `"Order service"` | How much, such as `"10k/day"`; joins the second line. |
| `sla=` | attribute | a text in double quotes like `"Order service"` | What is promised, such as `"< 200 ms"`; joins the second line. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the bar below, such as `E1`; the mark stands near the end. |
| `bundle=` | attribute | a single word without quotes | Edges with the same bundle and a shared end share one trunk; needs `layout=adaptive`. |
| `lane=` | attribute | a column or row name like `api` or `backend.1` | Column a vertical edge runs in, reaching into frames at its ends; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of line and heads, such as `red` for a highlighted way. |
| `style=` | attribute | the id of a `style` declared in this diagram | A `style` whose `tone` applies when the edge sets none. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | synchronous call (filled head) |
| `~>` | asynchronous message or event (dashed, open head) |
| `-->` | dependency (dashed, open head) |
| `=>` | data flow (thick line, filled head) |
| `--` | connection without direction (no head) |
| `<->` | call in both directions (a head at each end) |

Examples:

```dgr
edge abgleich => db "check inventory" schedule="daily 03:00"
edge web -> gateway via=HTTPS
```

### `flow`

```text
flow <id> [primary] [accent]
```

A numbered path: its steps are indented below it. Numbers run on across all flows in source order.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Name of the flow, shown in the legend. |
| `primary` | flag |  | Draws the steps in the line colour (default). |
| `accent` | flag |  | Draws the steps, their labels and numbers in the accent colour. |

Example:

```dgr
flow import primary
```

Indented lines that start without one of these keywords have this form:

```text
<from> <arrow> <to> [label] [via=<text>] [schedule=<text>] [volume=<text>] [sla=<text>] [mark=<ref>] [bundle=<word>] [lane=<grid-name>] [tone=<choice>] [style=<ref>]
```

A step of the flow: an edge without keyword, numbered after the steps before it, across all flows.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `person`, `system`, `node` or `group` declared in this diagram | Where it starts: an element or a group. |
| `<arrow>` | argument | one of the arrows `->` synchronous call (filled head), `~>` asynchronous message or event (dashed, open head), `-->` dependency (dashed, open head), `=>` data flow (thick line, filled head), `--` connection without direction (no head), `<->` call in both directions (a head at each end) | The kind of edge, which also decides how it is drawn. |
| `<to>` | argument | the id of a `person`, `system`, `node` or `group` declared in this diagram | Where it ends: an element or a group. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | What happens, such as `"reads documents"`; first line of the label. |
| `via=` | attribute | a text in double quotes like `"Order service"` | Protocol or transport, such as `HTTPS`; second line of the label. |
| `schedule=` | attribute | a text in double quotes like `"Order service"` | When it runs, such as `"nightly 02:00"`; joins the second line. |
| `volume=` | attribute | a text in double quotes like `"Order service"` | How much, such as `"10k/day"`; joins the second line. |
| `sla=` | attribute | a text in double quotes like `"Order service"` | What is promised, such as `"< 200 ms"`; joins the second line. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the bar below, such as `E1`; the mark stands near the end. |
| `bundle=` | attribute | a single word without quotes | Edges with the same bundle and a shared end share one trunk; needs `layout=adaptive`. |
| `lane=` | attribute | a column or row name like `api` or `backend.1` | Column a vertical edge runs in, reaching into frames at its ends; needs `layout=adaptive`. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of line and heads, such as `red` for a highlighted way. |
| `style=` | attribute | the id of a `style` declared in this diagram | A `style` whose `tone` applies when the edge sets none. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | synchronous call (filled head) |
| `~>` | asynchronous message or event (dashed, open head) |
| `-->` | dependency (dashed, open head) |
| `=>` | data flow (thick line, filled head) |
| `--` | connection without direction (no head) |
| `<->` | call in both directions (a head at each end) |

Examples:

```dgr
kafka ~> importer "consume event"
storage -> bucket "read object" via="S3 HEAD"
```

### `note`

```text
note <text> [on <ref>]
```

A dashed note above an element, with a tip pointing at it. It is no element and no edge.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says. |
| `on <ref>` | clause | the id of a `person`, `system` or `node` declared in this diagram | The element it points at. Required. |

Example:

```dgr
note "replaced in Q3" on portal
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

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `context` report these. An error stops the build; a warning is printed and the picture is still drawn.

| Code | Severity | What it checks |
|---|---|---|
| `A001` | error | A note names the element it points at with `on`. |
| `A007` | error | A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements. |
| `A008` | error | Every element has a place in the grid with `at column/row`. |
| `A103` | error | Column and row of `at` are names of the grid. |
| `A105` | error | An edge connects two different elements or groups. |
| `A106` | error | Every column and every row is named once. |
| `A107` | error | An edge does not lead from an element to the group that holds it, or back. |
| `A109` | error | Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer. |
| `A710` | warning | An edge says what happens: a label or a protocol (`via=`). |
| `A801` | warning | A decision of the bar has a mark in the picture, on an element or a step (`mark=`). |
