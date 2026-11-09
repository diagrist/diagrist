<!-- Generated from the command tables and the statement tables by `pnpm docs:generate`. Do not edit. -->

# The language and the commands

A `.dgr` file holds one diagram. Its first line names the kind and the title, `diagram sequence "Checkout"`, followed by the attributes of the header. Every other line is a statement: a keyword, then its arguments in the order the table gives, then flags, clauses and `key=value` attributes in any order.

Texts stand in double quotes and may contain `\"`. Ids are single words of letters, digits, `_` and `-` that start with a letter; a statement declares an id, and other statements refer to it by that word. An attribute value is a single word or a text in quotes, as in `stereotype="web app"`.

Indentation nests: a line belongs to the nearest line above it with less indent, so the statements of a block such as a fragment are indented below it. `dgr fmt` writes two spaces per level and keeps at most one blank line. `#` starts a comment that runs to the end of the line.

## Commands

Every command takes `--json` for one JSON document on stdout.

| Command | What it does |
|---|---|
| `dgr fmt <files...> [options]` | Formats .dgr files in place. |
| `dgr check <file> [options]` | Checks a diagram against the grammar, the rules of its kind, the placement and the lines of its pictures and prints every finding, those about one picture of a file with variants marked with the variant. |
| `dgr build <file> [options]` | Renders a diagram as SVG, and with `--png` also as PNG: the base picture as `<file>.svg` and each variant as `<file>.<variant>.svg`. |
| `dgr export <target> <files...> [options]` | Exports diagrams for another tool. |
| `dgr grammar [kind] [options]` | Shows what a diagram kind allows. |
| `dgr help [command] [options]` | Explains the commands. |

## Statements of every kind

Every kind also has `use`, `variant`, `set` and `drop`. A file holds one base picture and any number of variants: a `variant` block repeats only the lines that differ, so as-is and to-be, phases or option A and B stay one source. A statement of the kind inside a variant adds a line, `set` changes the clauses, attributes and flags of a declared line, `drop` removes one. `from` builds a variant on one declared above it, and `diff` draws it as a comparison with what it builds on, if the kind can (C4 can).

Where a line goes: `set` keeps the line in its place, and a line declared again after its `drop` takes the dropped line’s place. A new line goes before the next line of its keyword that the variant declares again, otherwise after the last line of its keyword, so lines keep the order they are written in. The grid and `at` are inherited, so an element keeps its cell in every picture.

`use "file.dgr"` puts the lines and variants of another file of the same kind before the file’s own, so a decision paper can build on a shared base. Paths are relative to the file, stay inside the folder `dgr` runs in and name no hidden file. `dgr build` writes the base as `<file>.svg` and each variant as `<file>.<variant>.svg`; `--variant` builds one.

| Line | Where | What it does | Example |
|---|---|---|---|
| `use <file>` | top level | Puts the statements and variants of another `.dgr` file of the same kind before this file's own, as if they were written here, so a variant may build on them. | `use "radverleih.dgr"` |
| `variant <id> <title> [from <ref>] [subtitle=<text>] [diff]` | top level | One more picture from the same base, written as the lines that differ: a statement of the kind adds a line, `set` changes one and `drop` removes one. | `variant target "Target 2027" subtitle="For review" diff` |
| `set <id>` | inside `variant` | Changes the line that declares `id`, where it stands. | `set db tech="PostgreSQL 17"` |
| `drop <keyword> [arguments]` | inside `variant` | Removes one line of the picture: its keyword and as many of its first arguments as make it unique, matched from the left. | `drop node portal` |
