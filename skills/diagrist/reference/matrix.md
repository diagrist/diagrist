<!-- Generated from the statement tables and the rules of `matrix` by `pnpm docs:generate`. Do not edit. -->

# Kind `matrix`

A matrix: columns, rows and one scale, with the values of the scale in the cells. The scale carries rules that are checked: `raci` asks every row for exactly one A and at least one R, `crud` every column for a C and an R, `cover` every row and column for a mark. Full reference with every argument: `dgr grammar matrix --json`.

```text
diagram matrix "Title" [subtitle=<text>] [scale=<raci|crud|cover>] [cover=<rows|cols|both>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `col <id> <label> [area=<ref>]` | top level | A column, such as a role, an object or a building block. | `col station "Stationsteam"` |
| `group <id> <label>` | top level | A band over rows that belong together, such as the steps of one process. | `group vorgang "Vorgang"` |
| `row <id> <label> [in <ref>] [area=<ref>]` | top level | A row, such as a task, a use case or a requirement, from top to bottom in the order written. | `row ausleihen "Rad ausleihen" in vorgang` |
| `note <text> [on <ref>]` | top level | A numbered note below the matrix. | `note "Bei Schäden über 500 Euro entscheidet die Versicherung." on schaden` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `matrix` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `M100` | error | The header names the scale of the cells with `scale=`, since its values and rules decide what the cells may hold. |
| `M101` | error | A cell holds only values of the scale the header names, written as the scale writes them, such as `A` and not `a`. |
| `M102` | error | A cell names a value once, and only one value when its scale allows one per cell, as `cover` does. |
| `M103` | error | A row names each column once; all values of a cell stand in one line, separated by commas. |
| `M104` | error | Every row holds the values its scale asks for: with `raci` exactly one A and at least one R. |
| `M105` | error | Every column holds the values its scale asks for: with `crud` at least one C and one R, so every object is created and read somewhere. |
| `M106` | error | Under `cover=` every row, every column or both hold at least one value; `scale=cover` asks for both, so a requirement no building block meets and a building block that meets none show up. |
| `M107` | error | The rows of a group stand one after another, since its band stands above its first row only. |
| `M600` | warning | A matrix has at most 12 columns and 40 rows; a larger one no longer fits a page and is read better as two. |
