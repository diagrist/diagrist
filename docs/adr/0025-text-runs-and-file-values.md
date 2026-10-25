# 25. Text runs and file values in the kernel, highlighting in a package of its own

Date: 2026-10-25. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0004, 0013, 0021
and 0022.

## Context

The exploration of code in diagrams (branch `explore/code-in-diagrams`) showed that highlighted source fits Diagrist
without a browser: Shiki splits Java, SQL or YAML into tokens, each token is a `<tspan>` in the picture's own font,
and resvg draws it as Chromium does. Its real gain is the file as the source: a picture that shows a method read
from the repository breaks the build when the method is renamed, instead of showing a stale copy. Two pieces of
that work are not about code at all. A text has to be drawn in parts with roles of their own, and a value has to
bring the text of a file into the reading. The exploration built the second as a second way to read files beside
`use`, without the confinement `use` has, and found that an argument named `lines` is silently overwritten.

## Decision

A scene text may carry `runs`, each a part of the line with an optional style role and font role. The SVG writes a
run with a role as a `<tspan>` with the classes of that role and a run without one as plain text, and it writes
`xml:space="preserve"` only when the line has whitespace that SVG would strip or collapse, such as indentation. The
text keeps `text`, the whole line, because the placement check, descriptions and tests read one line; runs that
join to another line are a bug of the plugin and stop the picture with K104. `runsWidth` measures the parts in one
sum over every glyph and rounds once, and `textWidth` is `runsWidth` of a single part, so no width changes. A text
without runs is written byte for byte as before.

`file()` is a value type of the tables: a quoted path relative to the diagram whose text the line needs, typed as
`FileText` with the resolved path and the text. It is read through the one mechanism ADR 0021 introduced and no
other: `resolvePath` checks how the path is written (L119), the reading lists the file in its `needs` with the span
that asks, which `compile` returns beside the files of `use`, and until the host hands the text over in `files` the
line is L118. The CLI reads it through `Io`, confined by real path to the folder `dgr` runs in and to 1 MB, refuses
with C018 when it cannot, and `--watch` watches it like a used file. A path in a used file is resolved against that
file. Since L118, L119 and C018 already say what happened and what to do, files add no code. The kind receives the
text in its reading and stays pure; neither `Kind` nor `KindContext` change.

`checkKind` rejects an argument that takes a name the read values give every line (`line`, `span`, `origin`,
`flags`, `clauses`, `attributes`) or every statement (`keyword`, `children`, `lines`), since reading would overwrite
it without a word.

Runs and file values live in the kernel and `lang` because any kind may use them: a bold word in a label, a legend
read from a file, a state machine checking the submachine its `file=` names. They are small and need no dependency.
Highlighting is different. It needs Shiki's engine and a grammar per language, some hundred kilobytes even with the
grammars vendored instead of the 11 MB of `@shikijs/langs`, and only kinds that show code should pay for that.
Plugins may not depend on each other, so it becomes a library like `layout-grid`, `@diagrist/code`, that turns a
`FileText` and a language into lines of runs whose roles (keyword, type, comment and so on) a style table paints, so
a theme recolours code like everything else.

## Consequences

The kernel can draw parts of a line and read files a line names, and every example keeps its bytes. The next step,
`@diagrist/code`, builds on `FileText` and `runs` only: it vendors the grammars of Java, Kotlin, SQL, YAML, JSON and
XML, runs Shiki's JavaScript engine with `tokenizeTimeLimit: 0` so a slow machine splits lines the same way, cuts
excerpts by `symbol=`, `region=` or `lines=`, and hands out runs with roles and a style table for them. The kind
`code` and the C4 card follow it. A test kind in the CLI tests is the only user of both pieces until then.
