<!-- Generated from the statement tables of the kind `matrix` (plugin `concept`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `matrix`

A matrix: columns, rows and one scale, with the values of the scale in the cells. The scale carries rules that are checked: `raci` asks every row for exactly one A and at least one R, `crud` every column for a C and an R, `cover` every row and column for a mark.

This page lists everything a `matrix` diagram may contain. The same grammar is available as data with `dgr grammar matrix --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram matrix "Title" [subtitle=<text>] [scale=<raci|crud|cover>] [cover=<rows|cols|both>] [locale=<en|de>]
```

Every matrix diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `scale=` | attribute | one of `raci`, `crud`, `cover` | The scale of every cell, required: `raci` (R responsible, A accountable, C consulted, I informed; several per cell), `crud` (C create, R read, U update, D delete; several per cell) or `cover` (`full` or `part`, one per cell). |
| `cover=` | attribute | one of `rows`, `cols`, `both` | Which lines need at least one value: every row, every column, or both. `scale=cover` asks for both by default. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram matrix "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `matrix` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`col`](#col) | top level | A column, such as a role, an object or a building block. |
| [`group`](#group) | top level | A band over rows that belong together, such as the steps of one process. |
| [`row`](#row) | top level | A row, such as a task, a use case or a requirement, from top to bottom in the order written. |
| [`note`](#note) | top level | A numbered note below the matrix. |

### `col`

```text
col <id> <label>
```

A column, such as a role, an object or a building block. Columns stand from left to right in the order written.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that the cells of the rows name. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Head of the column, wrapped when it is long. |

Example:

```dgr
col station "Stationsteam"
```

### `group`

```text
group <id> <label>
```

A band over rows that belong together, such as the steps of one process. Its rows name it with `in` and stand one after another.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `in` of the rows names. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Text of the band, above its first row. |

Example:

```dgr
group vorgang "Vorgang"
```

### `row`

```text
row <id> <label> [in <ref>]
```

A row, such as a task, a use case or a requirement, from top to bottom in the order written. Its cells stand indented below it, one line per column that holds a value.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that notes name with `on`. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Head of the row at the left, wrapped when it is long. |
| `in <ref>` | clause | the id of a `group` declared in this diagram | The group whose band it stands under. |

Examples:

```dgr
row ausleihen "Rad ausleihen" in vorgang
row mahnung "Mahnung senden"
```

Indented lines that start without one of these keywords have this form:

```text
<col> <values>
```

A cell of the row: the column and its values from the scale. A column the row does not name stays empty.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<col>` | argument | the id of a `col` declared in this diagram | The column of the cell. |
| `<values>` | argument | one value of the scale or several separated by commas without spaces, like `R` or `R,A` | The values, from the scale of the header; several only where the scale allows them. |

Examples:

```dgr
station A
kunde R,A
```

### `note`

```text
note <text> [on <ref>]
```

A numbered note below the matrix. With `on` its number also stands at the head of a row or column.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says. |
| `on <ref>` | clause | the id of a `row` or `col` declared in this diagram | The row or column the note is about. |

Examples:

```dgr
note "Bei Schäden über 500 Euro entscheidet die Versicherung." on schaden
note "Stand: Konzept 1.2"
```

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `matrix` report these. An error stops the build; a warning is printed and the picture is still drawn.

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
