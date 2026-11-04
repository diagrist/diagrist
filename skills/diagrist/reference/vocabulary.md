<!-- Generated from the statement tables and the rules of `vocabulary` by `pnpm docs:generate`. Do not edit. -->

# Kind `vocabulary`

A vocabulary of a business subject: the types of things and the types of relations between them, with the rules each relation keeps. A concept picture names the file with `use=` and writes only items and relations; drawn on its own, the vocabulary shows its types and links as a picture of the subject. Full reference with every argument: `dgr grammar vocabulary --json`.

```text
diagram vocabulary "Title" [subtitle=<text>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `type <id> <label> [shape=<box\|round\|person\|store\|doc>] [de=<text>] [explain]` | top level | A type of thing the picture shows, such as a role, a task or a document. | `type rolle "Rolle" shape=person` |
| `link <id> <label> [from=<type-names>] [to=<type-names>] [line=<solid\|dashed\|dotted>] [head=<arrow\|open\|triangle\|diamond\|none>] [each=<from\|to\|both>] [single=<from\|to\|both>] [back=<text>] [de=<text>] [acyclic] [upward] [beside] [bare]` | top level | A type of relation between items of the types it lists. | `link fuehrt "führt aus" from=rolle to=aufgabe each=to` |

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `vocabulary` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `M112` | error | A link lists the types it joins with `from=` and `to=`, each a declared type. |
