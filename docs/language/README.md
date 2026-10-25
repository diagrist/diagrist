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
| [`usecase`](usecase.md) | `uml` | A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. |
| [`activity`](activity.md) | `uml` | A UML activity diagram (UML 2.5.1, chapters 15 and 16): nodes and edges in layers from top to bottom, one vertical swimlane per `partition`. |
| [`class`](class.md) | `uml` | A UML class diagram (UML 2.5.1, chapters 9 to 12): classes, interfaces and enumerations with their members, packages, and the relations between them. |
| [`state`](state.md) | `uml` | A UML state machine diagram (UML 2.5.1, chapter 14): states and pseudostates joined by transitions, composite states with substates or orthogonal regions, entry and exit points on their border. |
| [`context`](context.md) | `architecture` | A C4 system context diagram (level 1): the system as one box, the people who use it and the systems around it, placed in a named grid. |
| [`container`](container.md) | `architecture` | A C4 container diagram (level 2): the applications and data stores of a system, grouped by responsibility, placed in a named grid. |
| [`component`](component.md) | `architecture` | A C4 component diagram (level 3): the components inside a container and what they depend on, placed in a named grid. |

## Statements of every kind

Every kind also has `use`, `variant`, `set` and `drop`. A file holds one base picture and any number of variants: a `variant` block repeats only the lines that differ, so as-is and to-be, phases or option A and B stay one source. A statement of the kind inside a variant adds a line, `set` changes the clauses, attributes and flags of a declared line, `drop` removes one. `from` builds a variant on one declared above it, and `diff` draws it as a comparison with what it builds on, if the kind can (C4 can).

Where a line goes: `set` keeps the line in its place, and a line declared again after its `drop` takes the dropped line’s place. A new line goes before the next line of its keyword that the variant declares again, otherwise after the last line of its keyword, so lines keep the order they are written in. The grid and `at` are inherited, so an element keeps its cell in every picture.

`use "file.dgr"` puts the lines and variants of another file of the same kind before the file’s own, so a decision paper can build on a shared base. Paths are relative to the file, stay inside the folder `dgr` runs in and name no hidden file. `dgr build` writes the base as `<file>.svg` and each variant as `<file>.<variant>.svg`; `--variant` builds one.

### `use`

```text
use <file>
```

Puts the statements and variants of another `.dgr` file of the same kind before this file's own, as if they were written here, so a variant may build on them. The other file's header is not taken. `use` lines stand directly after the header.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<file>` | argument | a text in double quotes like `"Order service"` | Path of the file relative to this one. It stays inside the folder `dgr` runs in and names no hidden file or folder. |

Example:

```dgr
use "radverleih.dgr"
```

### `variant`

```text
variant <id> <title> [from <ref>] [subtitle=<text>] [diff]
```

One more picture from the same base, written as the lines that differ: a statement of the kind adds a line, `set` changes one and `drop` removes one. A new line goes before the next line of its keyword the variant declares again, else after the last line of its keyword, so lines keep the order they are written in. `dgr build` writes it as `<file>.<id>.svg`.

Written at the top level. Indented below it: `set`, `drop`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id of the variant, part of the file name of its picture. |
| `<title>` | argument | a text in double quotes like `"Order service"` | Title of its picture, in place of the title of the header. |
| `from <ref>` | clause | the id of a `variant` declared in this diagram | A variant declared above to build on; without it the variant builds on the base. |
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Subtitle of its picture, in place of the one of the header. |
| `diff` | flag |  | Draws the picture as a comparison with what it builds on: added, removed and changed lines marked, with a legend. Kinds that cannot draw it report K103. |

Examples:

```dgr
variant target "Target 2027" subtitle="For review" diff
variant a "Option A: stream through the backend" from target
```

### `set`

```text
set <id>
```

Changes the line that declares `id`, where it stands. What follows the id is checked against that line's own table: a clause or attribute written again replaces its value, a flag written turns it on. Arguments such as the label cannot be set: drop the line and declare it again.

Written only inside `variant`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | the id a line at the top level of the picture declares, such as `db` | The id of the line to change. |

Examples:

```dgr
set db tech="PostgreSQL 17"
set portal status=deprecated
```

### `drop`

```text
drop <keyword> [arguments]
```

Removes one line of the picture: its keyword and as many of its first arguments as make it unique, matched from the left. It must match exactly one line, and no line left may refer to an id it removes. A line declared again after its `drop` takes its place. Lines inside a block are not dropped singly: drop the block and declare it again.

Written only inside `variant`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<keyword>` | argument | a single word without quotes | The keyword of the line, such as `node`. |
| `[arguments]` | optional argument | the first words, texts and operators of the line as written, such as `doc -> portal` | Its first arguments as written, as many as make it unique. |

Examples:

```dgr
drop node portal
drop edge doc -> portal
drop grid rows
```

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
| `L005` | The character {found} cannot stand in a diagram: the picture is SVG, and XML has no way to write it. Delete it; tabs, line breaks and every printable character are allowed. |
| `L006` | Statements nest at most {limit} levels deep, and this one would be deeper; it and the lines indented below it are not read. Move it up a level or split the diagram. |
| `L100` | A diagram starts with `diagram {kind} "Title"`. Registered kinds: {allowed}. Example: `{example}` |
| `L101` | Unknown keyword `{found}` here; did you mean `{suggestion}`? Allowed: {allowed}. |
| `L102` | `{statement}` needs {name}: {expected}. Example: `{example}` |
| `L103` | `{found}` is not valid for {name}; expected {expected}. |
| `L104` | `{found}` is not expected in `{statement}`. Allowed after the arguments: {allowed}. Example: `{example}` |
| `L105` | `{statement}` has no attribute `{key}`. Allowed: {allowed}. |
| `L106` | `{statement}` takes no indented lines without a keyword. Allowed child keywords: {allowed}. |
| `L107` | `{found}` is not declared; {name} must be {expected}. Declared: {known}. |
| `L108` | The id `{found}` is already declared in line {first}. Ids are unique within a diagram. |
| `L109` | `use` stands directly after the header, before `{found}` in line {line}. Example: `use "base.dgr"` |
| `L110` | `{file}` is a `{found}` diagram; `use` in a `{kind}` diagram needs a `{kind}` diagram. |
| `L111` | `{file}` uses itself through {chain}. Remove one `use`. |
| `L112` | `drop {found}` matches no line of the picture `{variant}` builds on. Lines with keyword `{keyword}`: {known}. Example: `{example}` |
| `L113` | `drop {found}` matches the lines {lines}. Add arguments until exactly one matches, for example `{example}`. |
| `L114` | `{id}` is dropped in variant `{variant}`, but {name} of this line still refers to it. Drop this line too, or keep `{id}`. |
| `L115` | `set {id}` changes nothing. Write at least one attribute, clause or flag of `{keyword}`: {allowed}. Example: `set {id} {example}` |
| `L116` | `variant {found}` builds on `{from}`, which is declared later in line {line}. Declare `{from}` first. |
| `L117` | `{found}` is already declared in line {first}. In a variant, change it with `set {found} ...` or remove it with `drop {keyword} {found}`. |
| `L118` | `{file}` was not handed over, so it cannot be read. Hosts read every file a diagram needs before they compile it; `dgr` does so and reports C018 when it cannot. |
| `L119` | `{found}` is no allowed path: {case}. A path is relative to the diagram, stays inside the folder `dgr` runs in and names no hidden file or folder. Example: `"../shared/base.dgr"` |
| `L120` | `{file}` would be the {depth}th file in a chain of `use`, and a chain holds at most {max}. Use the file that holds the lines directly, such as `use "../shared/base.dgr"`. |

The kernel reports these about kinds, icons and the placement of what the layout drew:

| Code | Message |
|---|---|
| `G400` | `{first}` overlaps `{second}`. Shorten a text, or change what the layout places here. |
| `G401` | `{key}` reaches outside the picture. |
| `G402` | `{key}` does not fit into `{within}`. Shorten the text or give `{within}` more room. |
| `G403` | `{key}` reaches into the frame `{frame}` without belonging to it, so the picture says it is part of it. Make `{key}` a member of `{frame}`, or split the frame. |
| `K100` | No plugin draws the diagram kind `{found}`. Registered kinds: {allowed}. A diagram starts with `diagram <kind> "Title"`. |
| `K101` | The kind `{kind}` is registered twice, by {plugins}; the first one is used. |
| `K102` | The picture uses the icon `{icon}`, which the style table does not have. Icons: {known}. |
| `K103` | The kind `{kind}` draws no diff pictures; remove `diff` from `variant {variant}`. Kinds with diff pictures: {allowed}. |
| `K104` | A text of the picture reads `{text}`, but its runs read `{runs}`. This is a bug of the plugin, not a mistake in the diagram: the runs of a text join to its text. |
| `K110` | The plugin `{plugin}` failed while drawing the kind `{kind}`: {error}. This is a bug, not a mistake in the diagram; please report it with the diagram at https://github.com/diagrist/diagrist/issues. |
