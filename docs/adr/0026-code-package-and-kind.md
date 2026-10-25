# 26. Highlighting in `@diagrist/code`, the kind `code` in a plugin of its own

Date: 2026-10-25. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0004, 0005, 0011,
0021, 0022 and 0025.

## Context

ADR 0025 put text runs and `file()` into the kernel and announced a library for highlighting and a kind that shows
code. Two questions were open: where the highlighting ends and the kind begins, and whether the kind belongs into
one of the two diagram plugins. The C4 code card of step 4 will need the same highlighting and excerpts, and plugins
may not depend on each other.

## Decision

`@diagrist/code` is a library beside `layout-grid`: it depends on `core` and `lang` only, knows no kind and draws
nothing. It turns a `FileText` into lines of text runs with roles from a closed set (keyword, type, function, string,
literal, comment, annotation, key), gives a style table for these roles that a look fills with its palette and a
theme overrides by class, and cuts excerpts by `symbol`, `region` or `lines`, saying what the file offers when a
selection misses. Shiki runs with its JavaScript regex engine at a fixed target and without time limit; the grammars
of Java, Kotlin, SQL, YAML, JSON and XML are vendored with their licences. A card, its head, its gutter and its
marks are drawing, which differs between kinds, so they stay out of the library until a second kind draws them alike.

The kind `code` is the plugin `@diagrist/plugin-code`. It is neither UML nor C4: putting it into `plugin-uml` would
make UML hosts install Shiki, and putting it into `plugin-architecture` would tie it to the C4 tables and to a look
that is being refactored. A plugin of its own costs one package and keeps the kind's tables, rules and look in one
place; the C4 card of step 4 reaches the same highlighting through `@diagrist/code`, not through this plugin.

A card is `source <id> <title> src="<file>"` with one of `symbol=`, `region=` or `lines=`, the flag `outline`, and
indented `mark <range> "note"` lines; `link <card> <line> -> <card> "label"` draws an arrow from a line to another card.
Cards stand one below the other, all as wide as the widest, because the exploration found cards side by side too
wide; links run in lanes to the right. The picture shows the file's name without folders, so it is the same wherever
`dgr` runs. Rule codes start with `S` (source), since `C` is the CLI's. The look takes the colours and faces of the C4
sheet `paper` by value and the header, `wrap` and roles from `parts`; it imports nothing of the C4 plugin.

## Consequences

Kinds that show code depend on `@diagrist/code` and pay for Shiki (about 190 kB minified with the grammars, 2.5 MB
installed); others do not. The CLI ships the new plugin, and the docs, the schema and the skill describe the kind.
`symbol` reads braces, so it serves Java and Kotlin; a selection by key path for YAML and JSON waits for a diagram
that needs it, as `docs/burn-down.md` says. The C4 card and `zoom=` follow after the looks refactor of C4.
