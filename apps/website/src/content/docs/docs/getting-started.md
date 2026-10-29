---
title: Getting started
description: Build Diagrist from source, write a first .dgr file, check it, build the picture and keep it checked in CI.
---

Diagrist is not on npm yet, so for now it is built from source. You need Node 22.11 or later and pnpm 11; Corepack
picks the pnpm version from `package.json`.

```sh
git clone https://github.com/diagrist/diagrist.git
cd diagrist
pnpm install
pnpm build
alias dgr="node $PWD/packages/cli/dist/main.js"
```

To try the language without installing anything, use the [live editor](https://live.diagrist.com/): it compiles
in the browser and shows the picture as you type.

## A first diagram

A `.dgr` file starts with `diagram`, the kind and a title. Each following line is one statement that starts with
its keyword; statements inside a block, like the operands of `alt`, are indented below it. Save this as
`order.dgr`:

```dgr picture
diagram sequence "Place an order"
actor customer "Customer"
participant shop ":Shop"
participant pay ":Payments"
msg customer -> shop "order(items)"
msg shop -> pay "authorize(amount)"
alt "approved"
  msg pay --> shop "ok"
  else "declined"
    msg pay --> shop "declined"
msg shop --> customer "confirmation"
```

Which statements a kind has, and what each takes, is on the page of the kind, such as
[sequence](/docs/language/sequence/), and in the terminal:

```sh
dgr grammar sequence
```

## Check it

`dgr check` reads the file against the grammar of its kind and runs the rules of the kind. Every finding names
its position, a stable code and what would be correct:

```text
order.dgr:4:29  L105  error: `participant` has no attribute `stereotyp`. Allowed: `stereotype=`, `tone=`.
  participant pay ":Payments" stereotyp="external"
                              ^^^^^^^^^^^^^^^^^^^^
```

Errors stop the build. Warnings point at something that is drawn but probably not meant, such as a call that
never gets a reply, and the picture is still drawn.

## Build the picture

```sh
dgr build order.dgr            # writes order.svg
dgr build order.dgr --png      # also order.png
dgr build order.dgr --watch    # builds again on every save
```

The PNG is drawn by resvg compiled to WebAssembly with the bundled fonts, so it needs no browser and gives the
same bytes on every machine.

## Format it

`dgr fmt` formats files in place: two spaces per indent level, at most one blank line, everything else as you
wrote it. `--check` changes nothing and fails when a file is not formatted.

```sh
dgr fmt diagrams/*.dgr
```

## In CI

`dgr check` exits with 1 when the file has an error, and `dgr fmt --check` when a file is not formatted. Run both in
the pipeline that also runs your tests, and a broken diagram cannot be merged. `check` takes one file at a time:

```sh
dgr fmt --check diagrams/*.dgr
for file in diagrams/*.dgr; do dgr check "$file" || exit 1; done
```

The [command line reference](/docs/cli/) lists every command, option and exit code, and the form of the JSON
output.
