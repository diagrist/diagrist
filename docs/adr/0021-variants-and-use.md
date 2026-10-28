# 21. Variants and `use`: one base, several pictures, no macros

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0002, 0004, 0005,
0011 and 0016.

## Context

The owner draws work states: as-is and to-be, the phases of a new vertical, option A against option B for a
decision paper. Each was a file, and a target picture and an option repeated the same grid, groups and
nodes, which breaks ADR 0004 for the most common task. PlantUML has `!include`, D2 scenarios, Structurizr and LikeC4
a model with views. Diagrist must never get a macro language or computation in files, and rendering must stay pure
and offline. The C4 grid places elements by hand, so a view that merely filters a model would leave holes, and the
value of comparing pictures is that elements stay where they are.

## Decision

1. **Four statements every kind has, read by `lang`:** `use <file>`, `variant <id> <title> [from <variant>]
   [subtitle=] [diff]`, and inside a variant `set <id> ...` and `drop <keyword> <arguments...>`. A statement of the
   kind in a variant adds a line, `set` changes clauses, attributes and flags of a top-level line against that line's
   own table, `drop` removes exactly one line matched by keyword and leading arguments. Arguments are not set; the
   line is dropped and declared again. Blocks are restated whole. A kind may not declare these keywords itself.
2. **The merge is a transformation of the statement tree** in `lang` (`unfold`), next to `readKind`. It keeps two
   orders: `set` changes a line where it stands, a line declared again after its `drop` takes the dropped line's
   place, and a new line goes before the next line of its keyword the variant declares again, else after the last
   line of its keyword. With this rule a target picture and an option written as variants come out byte for
   byte as the files written out by hand. In a diff picture every line carries its origin (`base`, `added`, `changed`, `removed`) on the tree and on
   the typed values; a restated block compares its indented lines one by one, so an unchanged flow step stays
   `base`. A picture without `diff` carries none and reads exactly like the file written out by hand.
3. **Every base is a picture.** `compile` returns the base and one picture per own variant; variants of a used file
   are only something to build on. `dgr build` writes `<source>.svg` and `<source>.<variant>.svg`, `--variant` picks
   one (C016), `-o` with several pictures is refused (C017). A finding every picture has is reported once; the others
   name their variant in `picture`, printed as `[soll]`.
4. **One way to read files.** `compile` names the files a source needs (`needs`, with the span asking), the host
   reads them and hands them back in `files`, and compiles again; the kernel stays pure. `resolvePath` in `lang` is
   the single check of how a path is written: relative, inside the folder the host runs in, no hidden files (L119).
   A chain of `use` holds at most 16 files (L120), a cycle is L111, a file not handed over L118. The CLI's `Io`
   confines what it reads by real path, so a link out of the folder is refused, and by size, 1 MB (C018). File
   values of other kinds will use the same path.
5. **`diff` is drawn by the kind.** A kind that sets `diff: true` receives a diff variant with its removed lines
   tagged `removed` and draws added, removed and changed with a legend; `plugin-architecture` does so with roles in
   its style table, so a theme can repaint them. Each change also reads without colour: added boxes and edges are
   thick, removed ones dashed or dotted and grey, and boxes, edge labels and the legend carry a sign (`+`, `×`, `~`).
   A removed flow step keeps no number, so the others keep theirs. Other kinds report K103.
6. **Positions are stable by construction, sizes not yet.** Grid and `at` are inherited, so an element keeps its
   cell in every picture. Shared cell sizes across the pictures of one file need an optional `measure` hook on
   `Kind`, listed in `docs/burn-down.md`.

The draft proposed a separate `compileAll` and an `Engine.uses`; `compile` with `needs` and `files` does both and
serves file values of other kinds too. The codes L118 to L120 were added for hosts that do not hand a file over, for
paths and for the depth of a chain. The draft tagged origins in every variant; they are now only in diff pictures, so
no kind can draw a comparison by accident. Option B lives in the decision paper rather than in the container file, so it
exists once.

## Consequences

The bike rental examples (`radverleih`) are one container file with the as-is base, the target picture `soll` drawn as a diff and
option `a`, and a decision paper that uses it and draws option `b` as a diff against `a`. Files without variants keep their output names and bytes. An agent learns three verbs with
table-driven diagnostics instead of a filter language, and `dgr grammar` and the JSON schema carry them. The
`Engine` port and the JSON of `build` gain a list of pictures. Nothing in a file computes, and nothing is read from
the network.
