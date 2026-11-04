<!-- Generated from the statement tables and the rules of `code` by `pnpm docs:generate`. Do not edit. -->

# Kind `code`

A code diagram: excerpts of real source files as highlighted cards, one below the other, with marked lines, numbered notes below each card and arrows from a call to what it calls. The files are read when the picture is built, so a renamed method fails the build instead of leaving a stale picture. Java, Kotlin, SQL, YAML, JSON and XML are highlighted. Full reference with every argument: `dgr grammar code --json`.

```text
diagram code "Title" [subtitle=<text>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `source <id> <title> [src=<file>] [symbol=<word>] [region=<word>] [lines=<lineRange>] [lang=<choice>] [area=<ref>] [outline]` | top level | A card of highlighted code read from a file when the picture is built, so it shows the code as it is now and the build fails when the code it points to is gone. | `source submit "TransferService.submit" src="TransferService.java" symbol=submit` |
| `mark <range> [note]` | inside `source` | Marks lines of the card with a band and a number, counted across the picture; the note stands under that number below the card. | `mark 27-30 "A second call with the same key returns the first transfer"` |
| `link <from> <fromLine> <arrow> <to> [label] [area=<ref>]` | top level | An arrow from a line of one card to another card: this call leads there. | `link submit 34 -> publish "outbox.publish(event)"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `link`: `->` leads to.

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `code` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `S100` | error | Every card names its file with `src=`; the picture shows that file as it is when it is built. |
| `S101` | error | A card selects its lines in one way at most: `symbol=`, `region=` or `lines=`. |
| `S102` | error | The declaration, region or lines a card selects exist in its file as it is now. The finding names what the file declares or marks instead, and the nearest name. |
| `S103` | error | A mark names lines its card shows, counted as in the file. |
| `S104` | error | A link starts at a line its card shows and leads to another card. |
| `S600` | warning | A card shows at most 40 lines; more is read in the editor, not in a picture. |
