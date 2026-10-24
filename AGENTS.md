# AGENTS.md

Diagrist turns text (`.dgr`) into checked, deterministic diagrams. This file is the entry point for coding agents
working **on** Diagrist. Read it fully before changing code; details live in `docs/engineering.md` and `docs/adr/`.

## Glossary

| Term | Meaning |
|---|---|
| statement | One line of a `.dgr` file as data: keyword, arguments, attributes, children (`packages/lang/src/tree.ts`). |
| entry | An indented line that starts with a text, owned by the statement above it, e.g. a UML member (ADR 0003). |
| line form | The shape a block gives its indented lines without keyword, e.g. flow steps `a -> b` (ADR 0006). |
| kind | A diagram kind such as `sequence`, described as statement tables (`packages/lang/src/grammar`). |
| table | The single source of a statement: arguments, clauses, attributes, flags, doc, examples. Types, validation, grammar JSON and docs are derived from it (ADR 0004). |
| diagnostic | A finding as data: code, severity, span, values. Text comes from `formatDiagnostic` (en, de). |
| plugin | A package under `plugins/` that adds kinds, looks, exporters or adapters through the public API. |

## Where code lives

| Path | What |
|---|---|
| `packages/lang` | Scanner, statement tree, printer, statement tables, diagnostics. No Node APIs. |
| `packages/testkit` | Golden-file comparison for tests. Node only. |
| `plugins/*` | Diagram families, looks, exporters (none yet). |
| `test/architecture` | Rules enforced as tests: comments, purity, package boundaries, file size. |
| `docs/adr` | Decisions. Short; read the ones touching your change. |

## Commands

```sh
pnpm install          # also activates the git hooks
pnpm check            # lint, typecheck, tests, knip: must be green before every push
pnpm format           # Biome format and safe fixes
pnpm exec vitest run --project lang   # one package
```

## Rules that fail the build

- **Comments:** TSDoc only (`/** ... */`), and it must say more than the name. No `//`, no `/* */`, hence no
  suppressions either. Make the code explain itself instead.
- **Purity:** no `Date`, `Math.random`, `console`, timers, `fetch`, `process` or `node:` imports in `packages/lang/src`,
  `packages/core/src` and `plugins/*/src`. Same input, same bytes.
- **Boundaries:** import another `@diagrist/*` package only if it is in your `package.json`; plugins never depend on
  other plugins; relative imports stay inside the package.
- **Size:** at most 200 lines per source file.
- **Dead code:** knip rejects unused files, exports and dependencies.
- **Commits:** Conventional Commits, signed off (`git commit -s`). gitleaks and a forbidden-content check run in hooks
  and CI.

## How to work

1. **Derive, do not repeat** (ADR 0004). Before writing a list, type, schema or doc by hand, check whether it can be
   derived from a table or another source.
2. **Agents first** (ADR 0005). Every statement, argument, attribute and flag has a `doc`; every statement has an
   example; `checkKind` must return no problems.
3. **Test behaviour through the public API.** Each test must be able to catch a bug you can name. Golden files only
   for a few representative examples.
4. **Small public API.** Export only what another package needs; knip will tell you.
5. **English** in code, TSDoc, commits and docs.
6. **No Effect** (ADR 0007).

## Do not

- Copy code from the predecessor project without reviewing it; migration happens area by area.
- Add dependencies without a reason in the pull request; new versions are installed only after 24 hours.
- Commit generated files by hand; regenerate them from their source.
