# 17. UML 2.5.1 as a catalog in `plugin-uml`, coverage derived from marks on the tables

Date: 2026-10-24. Status: accepted. Builds on ADR 0004, 0005 and 0008 Nr. 6.

## Context

The tables and rules of `plugin-uml` cited the specification by hand, as `(UML 2.5.1, 17.3)` in a doc. Nothing
checked those numbers, and several were wrong: gates are defined in 17.4.3.5, not in 17.3, the classifier notation
of a use case in 18.1.4, not in 18.2.4 (that is `Include`), duration constraints in 8.5.3.2, not in 8.4. Nor could
anybody tell which elements of a chapter Diagrist draws and which it leaves out, short of reading every table.

## Decision

1. **A catalog per kind** in `plugins/plugin-uml/src/spec`: the elements a diagram of the kind can show, each with
   the deepest section of UML 2.5.1 that defines it and a short title in our own words. No text and no figure of
   the specification is copied. The catalog has no status: it does not say what is planned or out of scope.
2. **The tables say what they implement.** `implementing(marks, part)` marks a statement definition, an argument,
   a clause, an attribute or a rule with catalog elements, as a whole (`uml`), per value such as an arrow
   (`values`), or per flag (`flags`). Plugin tables such as `ARROWS` carry the element beside the meaning, and the
   marks of the arrow argument are derived from them. References are catalog entries, not strings, and values and
   flags are typed by the part, so a misspelt element, arrow or flag does not compile. A test checks that every
   mark points into the kind's own catalog.
3. **No change to `lang`.** `statement()` keeps properties it does not know in its result, so the marks travel with
   the tables. To reach agents, `implementing` adds a sentence such as `UML 2.5.1: 17.4.3.1 Lost message.` to the
   doc of the part; `grammarOf`, the language spec, the skill and the README take it from there. The grammar's
   shape and its JSON schema stay as they are. A typed field in `lang` waits for a second plugin that cites a
   standard (ADR 0008 Nr. 6); `docs/burn-down.md` lists it.
4. **Coverage is derived.** `src/spec/coverage.ts` walks the tables and rules for marks, reads every example with
   the kind's tables and matches what it uses. `docs/spec-coverage.md` shows per element what implements it, or
   that nothing does, and the share per kind; `pnpm docs:generate` writes it and a test fails when it is stale.

## Consequences

Adding a statement for an element is one change: the mark on the table moves the element to covered, adds the
citation to the docs and lists the examples that use it. The marks live beside `lang`'s own fields as extra
properties, which `lang` must keep passing along; a new kind in `plugin-uml` brings its own catalog and an entry in
`test/derived.test.ts`.
