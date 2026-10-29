<!-- Generated from the statement tables of the kind `concept` (plugin `concept`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `concept`

A picture of a business concept with its own vocabulary: the file declares types of things and types of relations with their rules, then writes items and relations, which are checked against the declarations. A vocabulary file named with `use=`, or one of the plugin such as `terms` or `roles`, brings the declarations of a subject.

This page lists everything a `concept` diagram may contain. The same grammar is available as data with `dgr grammar concept --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram concept "Title" [subtitle=<text>] [vocabulary=<terms|roles>] [arrange=<columns|layers>] [use=<file>] [locale=<en|de>]
```

Every concept diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `vocabulary=` | attribute | one of `terms`, `roles` | Declarations of the plugin the file builds on: `terms` (terms with definitions, broader and narrower, parts, synonyms) or `roles` (roles, who reports to whom, who stands in for whom). |
| `arrange=` | attribute | one of `columns`, `layers` | How the items stand: `columns`, a column per type in the order of their declaration, so a relation reads from left to right as a sentence; or `layers` along the relations. Without it, columns when the items are of more than one type. |
| `use=` | attribute | a path in double quotes, relative to the diagram, like `"src/OrderService.java"`; it stays inside the folder `dgr` runs in and names no hidden file or folder | A vocabulary file the picture builds on, such as `"iks.vocab.dgr"`: its types and links come first, after those of `vocabulary=`. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram concept "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `concept` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`type`](#type) | top level | A type of thing the picture shows, such as a role, a task or a document. |
| [`link`](#link) | top level | A type of relation between items of the types it lists. |
| [`item`](#item) | top level | One thing of a declared type. |
| [`rel`](#rel) | top level | One relation of a declared link from one item to another, written as a sentence: `rel kunde fuehrt ausleihen`. |

### `type`

```text
type <id> <label> [shape=<box|round|person|store|doc>] [tone=<blue|amber|teal|plum|slate>] [de=<text>] [explain]
```

A type of thing the picture shows, such as a role, a task or a document. Every item names its type with `is`, and the legend shows each type in use with its shape.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `is` of the items and `from=` and `to=` of the links name. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the type in the legend. |
| `shape=` | attribute | one of `box`, `round`, `person`, `store`, `doc` | How its items are drawn: `box` (default), `round` corners, `person` with a figure, `store` as a cylinder, `doc` with a folded corner. |
| `tone=` | attribute | one of `blue`, `amber`, `teal`, `plum`, `slate` | The muted tone of the bar on its items and of the head of its column, when the picture stands in columns: `blue`, `amber`, `teal`, `plum` or `slate`. Without it the columns take them in this order. |
| `de=` | attribute | a text in double quotes like `"Order service"` | Its name in German, for pictures with `locale=de`; without it the label stands in every locale. |
| `explain` | flag |  | Every item of the type has at least one indented entry, such as a definition. |

Examples:

```dgr
type rolle "Rolle" shape=person
type term "Term" de="Begriff" explain
```

### `link`

```text
link <id> <label> [from=<type-names>] [to=<type-names>] [line=<solid|dashed|dotted>] [head=<arrow|open|triangle|diamond|none>] [each=<from|to|both>] [single=<from|to|both>] [back=<text>] [de=<text>] [acyclic] [upward] [beside] [bare]
```

A type of relation between items of the types it lists. Every relation names its link, and the declared rules are checked: which types it joins, how many relations each item needs, and whether chains may loop.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that the relations name between their two items. |
| `<label>` | argument | a text in double quotes like `"Order service"` | What the relation says, read from the first item to the second; on the line and in the legend. |
| `from=` | attribute | the ids of one or more `type`s, separated by commas without spaces, like `rolle` or `rolle,team` | The types of the item a relation starts at. |
| `to=` | attribute | the ids of one or more `type`s, separated by commas without spaces, like `rolle` or `rolle,team` | The types of the item a relation ends at. |
| `line=` | attribute | one of `solid`, `dashed`, `dotted` | How the line is drawn: `solid` (default), `dashed` or `dotted`. |
| `head=` | attribute | one of `arrow`, `open`, `triangle`, `diamond`, `none` | The head at the second item: `arrow` (default), `open`, `triangle` and `diamond` hollow, or `none`. |
| `each=` | attribute | one of `from`, `to`, `both` | Every item of a `from` type, of a `to` type, or of both, has at least one such relation. |
| `single=` | attribute | one of `from`, `to`, `both` | Every item of a `from` type, of a `to` type, or of both, has at most one such relation. |
| `back=` | attribute | a text in double quotes like `"Order service"` | What the relation says read backwards, from the second item to the first, such as `"gemindert durch"` for `mindert`. A picture in columns then draws every line from left to right and writes this where the link points against the reading. |
| `de=` | attribute | a text in double quotes like `"Order service"` | Its name in German, for pictures with `locale=de`; without it the label stands in every locale. |
| `acyclic` | flag |  | No chain of such relations leads back to where it started. |
| `upward` | flag |  | The second item stands above the first, as a broader term above a narrower one or a lead above a team. |
| `beside` | flag |  | The two items stand side by side rather than one below the other, as a deputy beside the role it stands in for. |
| `bare` | flag |  | The line carries no label of the link, since its look tells it apart; the legend names it. |

Examples:

```dgr
link fuehrt "führt aus" from=rolle to=aufgabe each=to
link teil "ist Teil von" from=begriff to=begriff head=diamond acyclic bare
```

### `item`

```text
item <id> <label> [is <type-name>] [status=<planned|deprecated>]
```

One thing of a declared type. Its indented lines are entries drawn below its name.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that the relations name. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the item in its shape. |
| `is <type-name>` | clause | the id of a `type` declared in this diagram or in its vocabulary | Its type, declared with `type` or by the vocabulary. |
| `status=` | attribute | one of `planned`, `deprecated` | An item not there yet, drawn dashed, or one to give up, drawn dashed and muted. |

Examples:

```dgr
item kunde "Kunde" is rolle
item tarif "Tarif" is begriff status=deprecated
```

Indented lines that start without one of these keywords have this form:

```text
<text>
```

An entry of the item, such as a definition or a detail, drawn below its name.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the entry says. |

Example:

```dgr
"Vertrag über die Miete eines Rads für eine Zeit"
```

### `rel`

```text
rel <from> <link> <to> [label]
```

One relation of a declared link from one item to another, written as a sentence: `rel kunde fuehrt ausleihen`.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of an `item` declared in this diagram | The item the relation starts at. |
| `<link>` | argument | the id of a `link` declared in this diagram or in its vocabulary | Its link, declared with `link` or by the vocabulary. |
| `<to>` | argument | the id of an `item` declared in this diagram | The item the relation ends at. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Its own text on the line, instead of the label of the link. |

Examples:

```dgr
rel kunde fuehrt ausleihen
rel ausleihen erzeugt vertrag "bei Abschluss"
```

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `concept` report these. An error stops the build; a warning is printed and the picture is still drawn.

| Code | Severity | What it checks |
|---|---|---|
| `M120` | error | The vocabulary file of `use=` reads without errors, since a picture cannot build on declarations that are broken. |
| `M110` | error | An item names its type with `is`, and the type is declared with `type`, by the vocabulary file of `use=` or by the vocabulary of `vocabulary=`. |
| `M111` | error | A relation names a link declared with `link`, by the vocabulary file of `use=` or by the vocabulary of `vocabulary=`. |
| `M112` | error | A link lists the types it joins with `from=` and `to=`, each a declared type. |
| `M113` | error | The file adds types and links to its vocabulary, but does not declare one of the vocabulary again. |
| `M114` | error | A relation joins items of the types its link lists in `from=` and `to=`. |
| `M115` | error | Every item of the types a link counts with `each=` has at least one relation of that link. |
| `M116` | error | Every item of the types a link counts with `single=` has at most one relation of that link. |
| `M117` | error | Relations of an `acyclic` link never lead back to where they started, such as a term that is a kind of itself. |
| `M118` | error | A relation joins two different items; a role that stands in for itself or a term that is part of itself says nothing. |
| `M119` | error | Every item of an `explain` type has at least one indented entry, such as the definition of a term. |
| `M610` | warning | A type or link the file declares is used by an item or relation; an unused one is a slip or left over. |
| `M611` | warning | A picture shows at most 6 types; with more, shapes no longer tell them apart at a glance. Split it. |
| `M612` | warning | Where links are declared, every item takes part in a relation; an item without one stands in the picture unexplained. |
| `M613` | warning | Of two terms that mean the same, one is the term in use and the other is marked `status=deprecated`. |
