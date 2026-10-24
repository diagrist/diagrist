# Engineering principles

How Diagrist is built. This page is short on purpose; where it says nothing, prefer what makes the code easier
to read. `AGENTS.md` has the practical side: where code lives, the commands, and the rules that fail the build.

## Working together

We work in small steps, one pull request each. Its description says what changed, why, how it was tested and
what was deliberately left out.

Code from the predecessor project is understood before it is ported. It is reviewed area by area and then taken
over, reworked, rewritten or dropped on purpose; nothing is copied blindly.

Decisions are recorded briefly in `docs/adr/`, with context, decision and consequences in a few lines each. When
in doubt, ask instead of building on an assumption.

Parallel work goes through ports (ADR 0009). A stream owns its paths, builds against a port that the consumer
defines, and joins the others in a separate small change. Fakes exist only in tests, and only for ports.

## Code

There is one source, and everything else is derived from it (ADR 0004). Before writing a list, a type or a doc by
hand, check whether it can be derived from an existing source; if it can, derive it. Agents come first
(ADR 0005): every statement, attribute and diagnostic tells an agent what is allowed and what happens, with an
example.

Readable beats clever. Names say what a thing is, and a function does one job. Code takes data in and gives data
out, with no hidden side effects and no global state. Errors are diagnostics, data with a line and a code, not
exceptions. Output is deterministic: the same input gives the same bytes, so there is no clock, no randomness
without a seed and no network.

There is no abstraction without a second real user, and no code "for later". The public API stays small:
everything exported is typed explicitly and documented with TSDoc, everything else stays internal.

Code has no comments, only TSDoc. Names and structure explain the code; when a declaration needs more, it gets a
TSDoc block (`/** ... */`). Code, TSDoc, commits and public docs are in English. Files stay at 200 lines or
less, because a longer file usually does two things.

Most of these rules are tests in `test/architecture`: TSDoc only, and saying more than the name; documented public
APIs listed name by name; purity of the kernel, the plugins, the tools and the CLI outside its host adapters; package
boundaries derived from `package.json`; imports that never reach from `src` into `test` and form no cycle; kinds that
import nothing from each other; diagnostic codes only in rules and catalogues; file size; no parked tests and no
raised time limits. knip rejects dead code. `AGENTS.md` lists them all.

## Tests

Tests check behaviour through the public API, never internals, so code can be reshaped without rewriting them.
Every test must be able to catch a bug we can name; the trivial is not tested.

Golden files are used sparingly, a few representative examples per diagram kind. A golden file proves that
nothing changed, not that it is right, so specific tests next to it check the rules. Every bug gets a failing
test first, then the fix.

## Docs

Docs are prose in short paragraphs, tables where they help, no bullet-point soup. A list is for things that
really are a list, such as steps in order or the crutches in `docs/burn-down.md`; reasons and rules are written
as sentences. Generated docs are never edited by hand: change their source and run `pnpm docs:generate`.
