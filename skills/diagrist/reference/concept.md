<!-- Generated from the statement tables and the rules of `concept` by `pnpm docs:generate`. Do not edit. -->

# Kind `concept`

A picture of a business concept with its own vocabulary: the file declares types of things and types of relations with their rules, then writes items and relations, which are checked against the declarations. A vocabulary file named with `use=`, or one of the plugin such as `terms` or `roles`, brings the declarations of a subject. Full reference with every argument: `dgr grammar concept --json`.

```text
diagram concept "Title" [subtitle=<text>] [vocabulary=<terms|roles>] [arrange=<columns|layers|hub>] [use=<file>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `type <id> <label> [shape=<box\|round\|person\|store\|doc>] [de=<text>] [explain]` | top level | A type of thing the picture shows, such as a role, a task or a document. | `type rolle "Rolle" shape=person` |
| `link <id> <label> [from=<type-names>] [to=<type-names>] [line=<solid\|dashed\|dotted>] [head=<arrow\|open\|triangle\|diamond\|none>] [each=<from\|to\|both>] [single=<from\|to\|both>] [back=<text>] [de=<text>] [acyclic] [upward] [beside] [bare]` | top level | A type of relation between items of the types it lists. | `link fuehrt "führt aus" from=rolle to=aufgabe each=to` |
| `item <id> <label> [is <type-name>] [status=<planned\|deprecated>] [area=<ref>]` | top level | One thing of a declared type. | `item kunde "Kunde" is rolle` |
| `rel <from> <link> <to> [label] [area=<ref>]` | top level | One relation of a declared link from one item to another, written as a sentence: `rel kunde fuehrt ausleihen`. | `rel kunde fuehrt ausleihen` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `concept` report these codes:

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
