# Engineering principles

How Diagrist is built. Short on purpose; if a rule is not here, prefer what makes the code easier to read.

## Working together

- **Small steps, one pull request each.** The description says what changed, why, how it was tested, and what
  was deliberately left out.
- **Understand before porting.** Code from the predecessor project is reviewed area by area and taken over,
  reworked, rewritten or dropped on purpose. Nothing is copied blindly.
- **Decisions are recorded briefly** in `docs/adr/`: context, decision, consequences, a few lines each.
- **When in doubt, ask** instead of building on an assumption.

## Code

- **Readable over clever.** Names say what a thing is. A function does one job.
- **Data in, data out.** No hidden side effects, no global state. Errors are diagnostics (data with line and code),
  not exceptions.
- **Deterministic.** Same input, same bytes. No clock, no randomness without a seed, no network.
- **No abstraction without a second real user.** No code "for later".
- **Small public API.** Everything exported is documented (TSDoc) and typed explicitly; everything else stays internal.
- **Comments explain why**, not what. Code, comments, commits and public docs are in English.
- Files stay small (around 200 lines). If a file grows past that, it usually does two things.

## Tests

- **Test behaviour through the public API**, never internals, so code can be reshaped without rewriting tests.
- **Every test must be able to catch a bug we can name.** No tests for the trivial.
- **Golden files sparingly:** a few representative examples per diagram kind. A golden file proves that nothing
  changed, not that it is right; specific tests next to it check the rules.
- **Every bug gets a failing test first**, then the fix.
