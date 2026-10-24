<!-- Generated from the command tables in packages/cli/src/commands by `pnpm docs:cli`. Do not edit. -->

# Command line

The Diagrist command line: format, check and build .dgr files, and look up the grammar of a kind.

Installed as `dgr` and `diagrist`. Usage: `dgr <command> [arguments] [options]`; the command comes first.

| Command | What it does |
|---|---|
| [`fmt`](#dgr-fmt) | Formats .dgr files in place. |
| [`check`](#dgr-check) | Checks a diagram against the grammar and the rules of its kind and prints every finding. |
| [`build`](#dgr-build) | Renders a diagram as SVG, and with `--png` also as PNG. |
| [`grammar`](#dgr-grammar) | Shows what a diagram kind allows. |
| [`help`](#dgr-help) | Explains the commands. |

## Options for every command

| Option | Meaning |
|---|---|
| `--json` | Print one JSON document on stdout instead of text, for agents and tools. Its form is stable, see "JSON output". |
| `--locale <en\|de>` | Language of messages and diagnostics. Default: `en`. |
| `-h, --help` | Show the help of the command instead of running it. |

Without a command:

| Option | Meaning |
|---|---|
| `--version` | Print the version of the CLI. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Done: no finding with severity error. Warnings alone do not fail. |
| 1 | A finding with severity error, or `fmt --check` found a file that is not formatted. |
| 2 | The call cannot be carried out: unknown command or option, missing or extra argument, a value out of range, unreadable or unwritable file, a PNG that cannot be rendered. |

## dgr fmt

```sh
dgr fmt <files...> [options]
```

Formats .dgr files in place. Two spaces per indent level and at most one blank line; token order, aligned columns and comments stay as written. A file with read errors is left unchanged, because formatting it could drop lines.

| Argument | Meaning |
|---|---|
| `<files...>` | The .dgr files to format. |

| Option | Meaning |
|---|---|
| `--check` | Change nothing; exit with 1 if a file is not formatted. For CI and pre-commit hooks. |

Examples:

```sh
# Format one file in place.
dgr fmt diagrams/order.dgr
# Fail when a file is not formatted, without changing it.
dgr fmt --check diagrams/*.dgr
```

With `--json`, besides the fields of every document:

| Field | Meaning |
|---|---|
| `files` | One entry per file, `{ file, status }`. `status` is `formatted` (rewritten), `unchanged` (already formatted), `unformatted` (only with `--check`: formatting would change it) or `invalid` (has read errors, left unchanged). |
| `diagnostics` | Read errors and warnings of all files, see "Diagnostics". |

## dgr check

```sh
dgr check <file> [options]
```

Checks a diagram against the grammar and the rules of its kind and prints every finding. Writes nothing.

| Argument | Meaning |
|---|---|
| `<file>` | The .dgr file to check. |

Examples:

```sh
# Print the findings; exit with 1 on an error.
dgr check diagrams/order.dgr
# The same as one JSON document, for agents.
dgr check diagrams/order.dgr --json
```

With `--json`, besides the fields of every document:

| Field | Meaning |
|---|---|
| `file` | The checked file. |
| `diagnostics` | All findings, see "Diagnostics". |

## dgr build

```sh
dgr build <file> [options]
```

Renders a diagram as SVG, and with `--png` also as PNG. Nothing is written when the diagram has an error; warnings are printed and do not stop the build.

| Argument | Meaning |
|---|---|
| `<file>` | The .dgr file to render. |

| Option | Meaning |
|---|---|
| `-o, --out <file>` | Where to write the SVG. Default: next to the source, with `.svg` instead of `.dgr`. The PNG goes beside the SVG. |
| `--png` | Also write a PNG with the name of the SVG and `.png`. Rendered without a browser and with the bundled fonts, so the same diagram gives the same bytes on every machine. |
| `--scale <factor>` | Pixels of the PNG per SVG unit, from 0.25 to 8; 2 doubles width and height. Default: 2. Needs `--png`. |

Examples:

```sh
# Write diagrams/order.svg.
dgr build diagrams/order.dgr
# Write the SVG somewhere else.
dgr build diagrams/order.dgr -o site/order.svg
# Also write diagrams/order.png, twice the size of the SVG.
dgr build diagrams/order.dgr --png
# Write the PNG at three times the size of the SVG, e.g. for print.
dgr build diagrams/order.dgr --png --scale 3
```

With `--json`, besides the fields of every document:

| Field | Meaning |
|---|---|
| `file` | The rendered source. |
| `output` | Path of the written SVG, `null` when nothing was written. |
| `png` | Path of the written PNG, `null` without `--png` or when nothing was written. |
| `diagnostics` | All findings, see "Diagnostics". |

## dgr grammar

```sh
dgr grammar [kind] [options]
```

Shows what a diagram kind allows. It lists the header, statements, arguments, attributes, flags and line forms, each with its doc and examples. Without a kind it lists the kinds. Derived from the same tables that check the diagrams.

| Argument | Meaning |
|---|---|
| `[kind]` | A diagram kind such as `sequence`. |

Examples:

```sh
# List the diagram kinds.
dgr grammar
# The grammar of sequence diagrams as data, for agents.
dgr grammar sequence --json
```

With `--json`, besides the fields of every document:

| Field | Meaning |
|---|---|
| `kinds` | Without a kind: `[{ kind, doc }]` for every kind. |
| `grammar` | With a kind: its grammar as data, `{ kind, doc, header, statements }`; each statement lists `keyword`, `doc`, `examples`, `arguments`, `clauses`, `attributes`, `flags`, `children` and its line form `lines`. Each table is described once; elsewhere a child is `{ keyword, ref }`, where `ref` is a JSON Pointer into `grammar` such as `/statements/9`. |

## dgr help

```sh
dgr help [command] [options]
```

Explains the commands. Without a command it lists them all, with the options every command takes and the exit codes.

| Argument | Meaning |
|---|---|
| `[command]` | The command to explain, such as `fmt`. |

Examples:

```sh
# List the commands.
dgr help
# Arguments, options and examples of `fmt`; the same as `dgr fmt --help`.
dgr help fmt
# All command tables as data, for agents.
dgr help --json
```

With `--json`, besides the fields of every document:

| Field | Meaning |
|---|---|
| `commands` | The tables of the explained commands: `{ name, doc, usage, arguments, options, examples, json }`, all of them without a command. |
| `options` | Options every command takes, in the same form as the options of a command. |
| `rootOptions` | Options of `dgr` without a command. |
| `exitCodes` | `[{ code, doc }]`. |

## JSON output

With `--json` every call prints exactly one JSON document on stdout, also when it is refused. Fields in every document:

| Field | Meaning |
|---|---|
| `diagrist-cli` | Version of this JSON form, currently `1`. It is raised only when a field changes meaning or goes away. |
| `command` | The command that ran, `null` for `dgr --version` and when no command was recognized. |
| `ok` | `true` exactly when the exit code is 0. |
| `error` | Only when the call was refused (exit code 2): `{ code, message }`, with a code `C…` that is stable for tools. |
| `version` | Only for `dgr --version`: the version of the CLI. |

The fields of each command are listed in its section.

### Diagnostics

| Field | Meaning |
|---|---|
| `file` | Path of the source as given on the command line. |
| `code` | Stable code such as `L001`; the prefix names the package or plugin that reports it. |
| `severity` | `error` (exit code 1) or `warning`. |
| `span` | `{ line, column, length }`: 1-based line and column, length in characters. |
| `values` | The values the message is built from, by name. Use these instead of parsing the message. |
| `message` | The text in the requested locale. |
