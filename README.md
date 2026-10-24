# Diagrist

> Diagrams as code, checked like code.

Diagrist turns small text files (`.dgr`) into diagrams. The language is strict on purpose: every statement,
argument and attribute is listed in a table, a check names what it found and what is allowed, and the same file
always gives the same SVG, byte for byte. Tools like Mermaid, PlantUML and D2 also draw diagrams from text;
Diagrist puts its weight on the checking, so a diagram can be reviewed, diffed and fixed like code.

It is written for two kinds of authors. People who keep diagrams next to their code in git get a formatter, a
check with stable codes and a picture that only changes when the source does. Coding agents get the grammar of
every kind as data (`dgr grammar <kind> --json`), findings as JSON, and an agent skill in
[`skills/diagrist`](skills/diagrist/SKILL.md).

**Status:** early. The first kind, UML sequence diagrams, works end to end; use case and C4 diagrams are being
built. Nothing is published to npm yet, so Diagrist is built from source.

- Website: https://diagrist.com
- License: [Apache-2.0](LICENSE)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

## An example

```dgr
diagram sequence "Login"
actor user "User"
participant api "API" stereotype="service"
msg user -> api "POST /login"
alt "credentials valid"
  msg api --> user "200 OK"
  else
    msg api --> user "401"
```

`dgr build login.dgr --png` writes `login.svg` and `login.png`. A mistake is reported with its position, a stable
code and what would be correct:

```text
login.dgr:3:23  L105  error: `participant` has no attribute `stereotyp`. Allowed: `stereotype=`, `tone=`.
  participant api "API" stereotyp="service"
                        ^^^^^^^^^^^^^^^^^^^
```

## Building and using it

You need Node 22.11 or later and pnpm 11 (Corepack picks the version from `package.json`).

```sh
pnpm install
pnpm build
node packages/cli/dist/main.js build login.dgr --png
```

The command line is called `dgr` (also `diagrist`). It has five commands: `fmt` formats files in place, `check`
reports every finding, `build` renders SVG and PNG, `grammar` shows what a kind allows, and `help` explains the
rest. Every command takes `--json` for tools and `--locale de` for German messages.

## Where to read on

| Topic | Where |
|---|---|
| The language: how a file is written, every kind, every diagnostic code | [`docs/language`](docs/language/README.md) |
| The command line: commands, options, exit codes, JSON output | [`docs/cli.md`](docs/cli.md) |
| How the code is organised and the rules it follows | [`AGENTS.md`](AGENTS.md), [`docs/engineering.md`](docs/engineering.md) |
| Why it is built this way | [`docs/adr`](docs/adr) |
| Debt we accept on purpose | [`docs/burn-down.md`](docs/burn-down.md) |

The language pages, the CLI reference, the JSON Schema in `schemas/` and the agent skill are generated from the
same tables that check the diagrams, so they cannot drift from what Diagrist accepts.
