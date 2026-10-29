# AGENTS.md

Diagrist turns text (`.dgr`) into checked, deterministic diagrams. This file is the entry point for coding agents
working **on** Diagrist. Read it fully before changing code. The principles behind it are in
`docs/engineering.md`, the decisions in `docs/adr/`, and what Diagrist draws and refuses to draw in `docs/scope.md`.

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
| `packages/core` | The kernel: plugin registry, `compile`, scene, text metrics, SVG, placement check, and the standard look (`src/standard`: palette, strokes, font roles, base rules) that themes overlay (ADR 0014). No Node APIs. |
| `packages/parts` | Pieces several plugins draw alike: title header in both forms, decision bar with the `adr` table, legend mechanics, the sheet with margin notes and sentence legend, `wrap`, note geometry, card and note rules, their roles and words (ADR 0014, 0023). No Node APIs, no kinds. |
| `packages/layout-grid` | Grid layout library for plugins: places measured nodes and frames, routes edges, places labels, layers graphs (ADR 0015). Depends on `core` only, knows no kind. |
| `packages/layout-matrix` | Table layout library for plugins: heads across the top and down the side, bands, cells of equal width (ADR 0031). Depends on `core` only, knows no kind; the caller wraps and measures its texts. |
| `packages/code` | Highlighted source code for kinds that show it (ADR 0025): Shiki's JavaScript regex engine with the grammars of Java, Kotlin, SQL, YAML, JSON and XML vendored in `src/grammars` (provenance in `GRAMMARS.md`), lines of text runs with roles, a style table that paints them, and excerpts by `symbol`, `region` or `lines`. Depends on `core` and `lang`, knows no kind. |
| `packages/testkit` | Golden-file comparison and a strict JSON Schema check for tests. Node only. |
| `packages/cli` | The command line `dgr` (also `diagrist`). Commands are tables in `src/commands`; the kernel is reached through the `Engine` port. Published as `diagrist`. `src/tables.ts` hands the tables to `tools/docs` as `diagrist/tables`, a subpath that resolves inside the workspace only and that `publishConfig.exports` leaves out of the tarball. |
| `plugins/plugin-uml` | UML kinds `sequence`, `usecase`, `activity`, `class`, `state`, each in `src/<kind>` with the same folders, its words in `describe/` and its own entry `@diagrist/plugin-uml/<kind>` (ADR 0024); pieces two kinds share in `src/shared`, the UML 2.5.1 catalogs in `src/spec`. |
| `plugins/plugin-architecture` | C4 kinds `context`, `container`, `component`, built from one set of tables (ADR 0016). |
| `plugins/plugin-code` | The kind `code` (ADR 0026): cards of highlighted source read from files with `file()`, marks with notes, links between cards, drawn in the colours of the C4 sheet `paper` without importing the C4 plugin. Highlighting and excerpts come from `packages/code`. |
| `plugins/plugin-concept` | The kind `matrix` (ADR 0031) in `src/matrix`: columns, rows and a scale from `scales.ts` (`raci`, `crud`, `cover`) whose rules the kind checks, drawn in the standard look with `layout-matrix`. The kind `concept` (ADR 0030) joins it later. |
| `plugins/export-png` | PNG from the kernel's SVG with resvg (WebAssembly) and the bundled fonts in `packages/core/fonts`. |
| `tools/docs` | Private workspace tool, never built or published: generates every derived file (`derivedFiles`) and tests that the checked-in ones are current. |
| `test/package` | `check.ts`, run after a build: what `package.json` promises exists and `dist` holds nothing an earlier build left, the published packages pack and install from their tarballs into an empty project, and the installed `dgr` builds one example per diagram plugin to the hashes its tests keep. |
| `test/architecture` | Rules enforced as tests: comments, purity, package boundaries, imports, kinds apart, diagnostic codes, translated messages, hashed examples, public API, file size, parked tests and raised time limits, kernel, parts and layout libraries without kinds, C4 looks read by their options. |
| `docs/adr` | Decisions. Short; read the ones touching your change. |
| `docs/burn-down.md` | Debt we accept on purpose, by package, each with what removes it. |
| `docs/cli.md`, `docs/language`, `docs/images`, `schemas`, `skills/diagrist` | Generated by `tools/docs`: CLI reference, language spec per kind, pictures of the README examples, JSON Schema of the grammar, agent skill. Never edited by hand. |
| `NOTICE` in each published package | Copies of the root `NOTICE`, which lists the third-party material (fonts, icons) and its licences. Edit the root file, then `pnpm docs:generate` copies it. |
| `plugins/plugin-uml/docs`, the code tables of the plugin READMEs | Generated by the plugins' tests with `pnpm docs:generate`: the UML coverage report and the codes of every rule. Never edited by hand. |

## Commands

```sh
pnpm install          # also activates the git hooks
pnpm check            # lint, typecheck, tests, knip: must be green before every push
pnpm format           # Biome format and safe fixes
pnpm exec vitest run --project lang   # one package
pnpm docs:generate    # regenerate every derived file: docs/cli.md, docs/language, README pictures, schemas, skills, UML codes, NOTICE copies
pnpm docs:uml         # only the code tables in plugins/plugin-uml/README.md
pnpm build            # build packages/* and plugins/*; needed before running node packages/cli/dist/main.js
node test/package/check.ts            # after a build: pack, install the tarballs, run the installed dgr (CI runs it)
```

Golden files (SVGs, generated docs, font metrics, example hashes) are rewritten by running their test with
`UPDATE_GOLDEN=1`. Review the diff before committing it.

`pnpm --filter <package> build` writes the same files as `pnpm build`, because every package's `tsdown.config.ts`
spreads the shared one at the root. `tools/*` is never built: its packages are private and run only in tests.

## Rules that fail the build

Most rules are tests in `test/architecture`, and their failures name the offending files.

| Rule | What the build rejects |
|---|---|
| Comments | Anything but TSDoc (`/** ... */`), and TSDoc that only repeats the name. No `//`, no `/* */`, hence no suppressions either: make the code explain itself. |
| Purity | `Date`, `Math.random`, `console`, timers, `fetch`, `Intl`, `localeCompare` and the other `toLocale…` methods, `process` and `node:` imports in the `src` of every package but the testkit, which only tests use. Same input, same bytes. |
| Purity of the CLI | The same in `packages/cli/src`, except that its host adapters `main.ts`, `node-io.ts` and `node-watcher.ts` may use `process` and `node:` modules, and `node:util` is allowed for `parseArgs`. |
| Host entries | A plugin that needs the disk keeps it in one Node entry, listed in the test. So far that is `plugins/export-png/src/node.ts`, published as `@diagrist/export-png/node`. |
| Boundaries | Importing a `@diagrist/*` package that your `package.json` does not declare, a plugin depending on another plugin, and relative imports that leave the package. |
| Imports | A file in `src` importing from `test`, and modules of one package importing values from each other in a cycle. |
| Kinds | A file in a kind's folder (one that holds a `kind.ts`) reaching another kind's folder, directly or through files beside the kinds, type imports included. Shared pieces go to a folder of their own that imports no kind, such as `plugins/plugin-uml/src/shared`. |
| Kind words | A string or TSDoc in `core`, `parts` or a layout library naming a kind or one of its elements: the kinds' names and table keywords, read from the plugins, and a few elements without keyword. |
| Codes | A plugin's diagnostic code (a key of the catalogues of the plugin objects it exports) outside `rules` and `messages` (ADR 0011), written out or put together in a template or sum. |
| Messages | A German message that reads or shows other values than the English one, or repeats its text. |
| Examples | An example under `plugins/*/examples` whose path no `*.sha256` golden file of its plugin lists. |
| Looks | In `plugins/plugin-architecture/src`, reading `model.look` or comparing with the name of a look outside `src/looks` and `src/model/build.ts`, and a file of `src/looks` that exports anything but one `Look` (ADR 0023). |
| Public API | `export *`, and an exported declaration without TSDoc. The entries are read from `exports` in `package.json`. |
| Release | A published package (not `private`) without licence, repository directory, homepage, bugs, engines, `publishConfig` with provenance, or `NOTICE` in `files`, or with another version than the others. |
| Size | A source file over 200 lines. |
| Tests | A test parked with `.skip` or `.todo`: delete it or fix it. A raised time limit (`timeout`, `testTimeout`, a number after the test function): make the test fast instead. |
| Dead code | Unused files, exports and dependencies (knip). |
| Commits | Commits that are not Conventional Commits or not signed off (`git commit -s`). gitleaks and a forbidden-content check run in the hooks and in CI. |

## How to work

A pull request stays under about 3,000 changed lines. Bigger work goes into follow-up pull requests, each green on
its own and stacked on the one before when it builds on it; a reviewer has to be able to read every line.

Derive, do not repeat (ADR 0004). Before writing a list, type, schema or doc by hand, check whether it can be
derived from a table or another source.

Agents come first (ADR 0005). Every statement, argument, attribute and flag has a `doc`, every statement has an
example, and `checkKind` must return no problems.

Test behaviour through the public API. Each test must be able to catch a bug you can name; golden files are only
for a few representative examples.

Keep the public API small. Export only what another package needs; knip will tell you.

Write English in code, TSDoc, commits and docs, and write docs as prose in short paragraphs, with tables where
they help and lists only for real enumerations (`docs/engineering.md`). Do not use Effect (ADR 0007).

A diagnostic code lives in its rule and its catalogue, nowhere else (ADR 0011). Models name cases, and the docs
generate their code tables. Declare kinds with `defineKind`, which ties the model to the kind's own tables
(`Kind<M, S>`).

Debt is listed in `docs/burn-down.md`: crutches for byte-identical output, derivatives not generated yet, pieces
waiting for a second user. Add to it instead of working around something silently, and remove an entry in the
change that settles it.

## Working in parallel

Several agents may work at once, each in its own git worktree and branch (ADR 0009). Before starting, state
three things: the paths you own, the port you build against, and where you join.

Ports are defined at the consumer, as narrow interfaces with data in and out. Fakes are used only in tests, and
only for ports. Joining two streams is its own change, with a test that runs the real pieces together.

Shared files (`pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig.json`, `knip.json`, `vitest.config.ts`)
change only additively; they are the expected merge points.

## Do not

Do not copy code from the predecessor project without reviewing it; migration happens area by area. Do not add a
dependency without giving the reason in the pull request; new versions are installed only after 24 hours. Do not
edit generated files by hand; regenerate them from their source.
