<!-- Generated from the statement tables of the kind `code` (plugin `code`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `code`

A code diagram: excerpts of real source files as highlighted cards, one below the other, with marked lines, numbered notes below each card and arrows from a call to what it calls. The files are read when the picture is built, so a renamed method fails the build instead of leaving a stale picture. Java, Kotlin, SQL, YAML, JSON and XML are highlighted.

This page lists everything a `code` diagram may contain. The same grammar is available as data with `dgr grammar code --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram code "Title" [subtitle=<text>] [locale=<en|de>]
```

Every code diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram code "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them. Like every kind, `code` also has `use`, `variant`, `set` and `drop`, described in [the overview](README.md#statements-of-every-kind).

| Statement | Where | What it does |
|---|---|---|
| [`source`](#source) | top level | A card of highlighted code read from a file when the picture is built, so it shows the code as it is now and the build fails when the code it points to is gone. |
| [`mark`](#mark) | inside `source` | Marks lines of the card with a band and a number, counted across the picture; the note stands under that number below the card. |
| [`link`](#link) | top level | An arrow from a line of one card to another card: this call leads there. |

### `source`

```text
source <id> <title> [src=<file>] [symbol=<word>] [region=<word>] [lines=<lineRange>] [lang=<choice>] [outline]
```

A card of highlighted code read from a file when the picture is built, so it shows the code as it is now and the build fails when the code it points to is gone. `symbol` (a declaration by name) follows the code when lines move and is the first choice, `region` (between `#region` comments) the second, `lines` the last; without any of them the card shows the whole file. Cards stand one below the other in the order of the diagram; the lines keep the numbers of the source file.

Written at the top level. Indented below it: `mark`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id of the card, which `link` names. |
| `<title>` | argument | a text in double quotes like `"Order service"` | Caption in the head of the card, such as the class and the method. |
| `src=` | attribute | a path in double quotes, relative to the diagram, like `"src/OrderService.java"`; it stays inside the folder `dgr` runs in and names no hidden file or folder | The source file, a path in double quotes relative to the diagram. Required. |
| `symbol=` | attribute | a single word without quotes | Only the declaration of this method or type (Java, Kotlin): the annotations and the comment right above it, then everything to its closing brace. A call of the name does not count. |
| `region=` | attribute | a single word without quotes | Only the lines between `#region <name>` and `#endregion` comments in the file, in the comment syntax of its language (`// #region publish`, `-- #region find`, `<!-- #region deps -->`), without the markers. |
| `lines=` | attribute | a line like `31` or a range like `27-30`, counted from 1, the smaller number first | Only this range of lines, like `25-36`. Drifts when lines are added above it. |
| `lang=` | attribute | one of `java`, `kotlin`, `sql`, `yaml`, `json`, `xml`, `text` | Language of the code. Default: from the extension of `src` (`.java`, `.kt`, `.kts`, `.sql`, `.yaml`, `.yml`, `.json`, `.xml`, `.xsd`), else `text`, which draws the code without colours. |
| `outline` | flag |  | Zooms out: declarations, fields, annotations and member signatures, each member body folded into `{ … }`; package, imports, comments and blank lines go. |

Examples:

```dgr
source submit "TransferService.submit" src="TransferService.java" symbol=submit
source publish "Outbox.publish" src="Outbox.java" region=publish
source table "outbox_entry" src="outbox.sql" lines=2-9
source api "TransferService" src="TransferService.java" outline
```

### `mark`

```text
mark <range> [note]
```

Marks lines of the card with a band and a number, counted across the picture; the note stands under that number below the card. The lines are numbered as in the file, so they must be lines the card shows.

Written only inside `source`.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<range>` | argument | a line like `31` or a range like `27-30`, counted from 1, the smaller number first | A line or a range of lines in the numbers of the file, like `31` or `27-30`. |
| `[note]` | optional argument | a text in double quotes like `"Order service"` | What these lines do and why, listed below the card. Without it only the band and the number show. |

Examples:

```dgr
mark 27-30 "A second call with the same key returns the first transfer"
mark 34
```

### `link`

```text
link <from> <fromLine> <arrow> <to> [label]
```

An arrow from a line of one card to another card: this call leads there. It leaves the card at the right edge of the line and enters the other card at its head.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `source` declared in this diagram | The card the arrow starts in. |
| `<fromLine>` | argument | a number like `12` or `2.5`, at least 1 | The line the arrow starts at, in the numbers of the file; the card must show it. |
| `<arrow>` | argument | one of the arrows `->` leads to | Always `->`. |
| `<to>` | argument | the id of a `source` declared in this diagram | The card the arrow points to. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | What happens on the way, such as the call, written beside the arrow. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `->` | leads to |

Example:

```dgr
link submit 34 -> publish "outbox.publish(event)"
```

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `code` report these. An error stops the build; a warning is printed and the picture is still drawn.

| Code | Severity | What it checks |
|---|---|---|
| `S100` | error | Every card names its file with `src=`; the picture shows that file as it is when it is built. |
| `S101` | error | A card selects its lines in one way at most: `symbol=`, `region=` or `lines=`. |
| `S102` | error | The declaration, region or lines a card selects exist in its file as it is now. The finding names what the file declares or marks instead, and the nearest name. |
| `S103` | error | A mark names lines its card shows, counted as in the file. |
| `S104` | error | A link starts at a line its card shows and leads to another card. |
| `S600` | warning | A card shows at most 40 lines; more is read in the editor, not in a picture. |
