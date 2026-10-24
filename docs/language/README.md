<!-- Generated from the statement tables of every kind and the catalogues of the language and the kernel by `pnpm docs:generate`. Do not edit. -->

# The Diagrist language

A `.dgr` file holds one diagram. Its first line names the kind and the title, `diagram sequence "Checkout"`, followed by the attributes of the header. Every other line is a statement: a keyword, then its arguments in the order the table gives, then flags, clauses and `key=value` attributes in any order.

Texts stand in double quotes and may contain `\"`. Ids are single words of letters, digits, `_` and `-` that start with a letter; a statement declares an id, and other statements refer to it by that word. An attribute value is a single word or a text in quotes, as in `stereotype="web app"`.

Indentation nests: a line belongs to the nearest line above it with less indent, so the statements of a block such as a fragment are indented below it. `dgr fmt` writes two spaces per level and keeps at most one blank line. `#` starts a comment that runs to the end of the line.

## Kinds

Each kind has its own page with every statement, its parts, examples and the codes of its rules.

| Kind | Plugin | What it draws |
|---|---|---|
| [`sequence`](sequence.md) | `uml` | A UML sequence diagram (UML 2.5.1, chapter 17): lifelines from left to right in source order, messages and fragments from top to bottom. |

## The grammar as data

`dgr grammar <kind> --json` prints the grammar of a kind as data, derived from the same tables as these pages. It validates against the JSON Schema [`schemas/grammar.schema.json`](../../schemas/grammar.schema.json). Editors and the language server ask `complete` from `@diagrist/lang` what may be written at a position; it reads the same tables.

## Diagnostic codes

Every finding has a stable code whose letter names who reports it: `L` the language, `K` and `G` the kernel, and one letter per plugin, such as `U` for `uml`. The codes of a kind are on its page. The messages below show each value as `{name}`; with `--json` the same values come as `values`, so tools need not parse the text.

The language reports these while it reads a file against the tables of its kind:

| Code | Message |
|---|---|
| `L001` | Text is missing its closing quote. |
| `L002` | A line starts with a keyword, not with {found}. |
| `L003` | Indent with spaces, not tabs. |
| `L004` | Attribute {key} is set twice; the last value wins. |
| `L100` | A diagram starts with `diagram {kind} "Title"`. Registered kinds: {allowed}. Example: `{example}` |
| `L101` | Unknown keyword `{found}` here; did you mean `{suggestion}`? Allowed: {allowed}. |
| `L102` | `{statement}` needs {name}: {expected}. Example: `{example}` |
| `L103` | `{found}` is not valid for {name}; expected {expected}. |
| `L104` | `{found}` is not expected in `{statement}`. Allowed after the arguments: {allowed}. Example: `{example}` |
| `L105` | `{statement}` has no attribute `{key}`. Allowed: {allowed}. |
| `L106` | `{statement}` takes no indented lines without a keyword. Allowed child keywords: {allowed}. |
| `L107` | `{found}` is not declared; {name} must be {expected}. Declared: {known}. |
| `L108` | The id `{found}` is already declared in line {first}. Ids are unique within a diagram. |

The kernel reports these about kinds, icons and the placement of what the layout drew:

| Code | Message |
|---|---|
| `G400` | `{first}` overlaps `{second}`. Shorten a text, or change what the layout places here. |
| `G401` | `{key}` reaches outside the picture. |
| `G402` | `{key}` does not fit into `{within}`. Shorten the text or give `{within}` more room. |
| `K100` | No plugin draws the diagram kind `{found}`. Registered kinds: {allowed}. A diagram starts with `diagram <kind> "Title"`. |
| `K101` | The kind `{kind}` is registered twice, by {plugins}; the first one is used. |
| `K102` | The picture uses the icon `{icon}`, which the style table does not have. Icons: {known}. |
