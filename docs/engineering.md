# Engineering principles

How Diagrist is built. Short on purpose; if a rule is not here, prefer what makes the code easier to read.

## Working together

- **Small steps, one pull request each.** The description says what changed, why, how it was tested, and what
  was deliberately left out.
- **Understand before porting.** Code from the predecessor project is reviewed area by area and taken over,
  reworked, rewritten or dropped on purpose. Nothing is copied blindly.
- **Decisions are recorded briefly** in `docs/adr/`: context, decision, consequences, a few lines each.
- **When in doubt, ask** instead of building on an assumption.
- **Work in parallel through ports** (ADR 0009). A stream owns its paths, builds against a port that the consumer
  defines, and joins in a separate small change. Fakes exist only in tests, and only for ports.

## Code

- **One source, everything else derived** (ADR 0004). Before writing something by hand, check whether it can be
  derived from an existing source; if it can, derive it.
- **Agents first** (ADR 0005). Every statement, attribute and diagnostic tells an agent what is allowed and what
  happens, with an example.

- **Readable over clever.** Names say what a thing is. A function does one job.
- **Data in, data out.** No hidden side effects, no global state. Errors are diagnostics (data with line and code),
  not exceptions.
- **Deterministic.** Same input, same bytes. No clock, no randomness without a seed, no network.
- **No abstraction without a second real user.** No code "for later".
- **Small public API.** Everything exported is documented (TSDoc) and typed explicitly; everything else stays internal.
- **No comments, only TSDoc.** Names and structure explain the code; when a declaration needs more, it gets a
  TSDoc block (`/** ... */`). Line and block comments are rejected by `test/architecture/comments.test.ts`.
  Code, TSDoc, commits and public docs are in English.
- Files stay small: at most 200 lines. A longer file usually does two things.
- **Enforced as tests** in `test/architecture`: TSDoc-only comments that say more than the name, purity of kernel
  and plugins (no clock, randomness, console, Node APIs), package boundaries derived from `package.json`, file size.
  knip rejects dead code. See `AGENTS.md` for the full list.

## Tests

- **Test behaviour through the public API**, never internals, so code can be reshaped without rewriting tests.
- **Every test must be able to catch a bug we can name.** No tests for the trivial.
- **Golden files sparingly:** a few representative examples per diagram kind. A golden file proves that nothing
  changed, not that it is right; specific tests next to it check the rules.
- **Every bug gets a failing test first**, then the fix.
