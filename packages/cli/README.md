# diagrist

> Diagrams as code, checked like code.

Diagrist turns small text files (`.dgr`) into diagrams. The language is strict on purpose: every statement,
argument and attribute is listed in a table, a check names what it found and what is allowed, and the same file
always gives the same SVG, byte for byte. This package is the command line, installed as `dgr` and as `diagrist`.
It draws UML sequence, use case, activity, class and state machine diagrams and C4 context, container and
component diagrams, as SVG and, without a browser, as PNG.

## Install

You need Node 22.11 or later.

```sh
npm install --save-dev diagrist
npx dgr --version
```

## Three commands

A diagram starts with a header that names its kind, followed by one statement per line:

```dgr
diagram sequence "Sign in"
participant user "User"
participant app ":App"
msg user -> app "credentials"
msg app --> user "session"
```

`dgr check` reports every finding with its position, a stable code and what would be correct; it exits with 1
when one of them is an error, so it fits into CI and pre-commit hooks. `dgr build` writes the SVG next to the file,
and `--png` adds a PNG. `dgr fmt` formats files in place, and with `--check` only reports the ones that are not.

```sh
dgr check diagrams/sign-in.dgr
dgr build diagrams/sign-in.dgr --png
dgr fmt --check diagrams/*.dgr
```

`dgr grammar <kind>` shows everything a kind allows, and `dgr help` explains the rest. Every command takes `--json`
for one JSON document on stdout, which is how coding agents use Diagrist, and `--locale de` for German messages.

## Read on

The [command reference](https://github.com/diagrist/diagrist/blob/main/docs/cli.md) lists every option, exit code
and JSON field. The [language pages](https://github.com/diagrist/diagrist/blob/main/docs/language/README.md)
describe each kind with its statements, examples and diagnostic codes. An
[agent skill](https://github.com/diagrist/diagrist/blob/main/skills/diagrist/SKILL.md) teaches coding agents the
workflow. The source and the issue tracker are at [diagrist/diagrist](https://github.com/diagrist/diagrist).

Diagrist is licensed under Apache-2.0. The bundled fonts and icons come with their own licences, listed in `NOTICE`.
