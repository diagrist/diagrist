<!-- Generated from the statement tables of the kind `vocabulary` (plugin `concept`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `vocabulary`

A vocabulary of a business subject: the types of things and the types of relations between them, with the rules each relation keeps. A concept picture names the file with `use=` and writes only items and relations; drawn on its own, the vocabulary shows its types and links as a picture of the subject.

This page lists everything a `vocabulary` diagram may contain. The same grammar is available as data with `dgr grammar vocabulary --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram vocabulary "Title" [subtitle=<text>] [locale=<en|de>]
```

Every vocabulary diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram vocabulary "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `vocabulary` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`type`](#type) | top level | A type of thing the picture shows, such as a role, a task or a document. |
| [`link`](#link) | top level | A type of relation between items of the types it lists. |

### `type`

```text
type <id> <label> [shape=<box|round|person|store|doc>] [de=<text>] [explain]
```

A type of thing the picture shows, such as a role, a task or a document. Every item names its type with `is`, and the legend shows each type in use with its shape.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `is` of the items and `from=` and `to=` of the links name. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name of the type in the legend. |
| `shape=` | attribute | one of `box`, `round`, `person`, `store`, `doc` | How its items are drawn: `box` (default), `round` corners, `person` with a figure, `store` as a cylinder, `doc` with a folded corner. |
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

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `vocabulary` report these. An error stops the build; a warning is printed and the picture is still drawn.

| Code | Severity | What it checks |
|---|---|---|
| `M112` | error | A link lists the types it joins with `from=` and `to=`, each a declared type. |
