# @diagrist/core

The kernel of [Diagrist](https://github.com/diagrist/diagrist), which turns `.dgr` text into checked,
deterministic diagrams. It knows no diagram kind of its own. Plugins register kinds, and the kernel reads a source
against the tables of its kind, runs the kind's rules, lets the kind lay out a scene, checks that nothing in the
scene overlaps by mistake and writes the SVG. Everything is pure: no clock, no network, no file system, so the
same source and plugins give the same bytes in Node, in browsers and on edge runtimes.

Most people want the command line instead, which is the package [`diagrist`](https://www.npmjs.com/package/diagrist).
This package is for hosts that compile diagrams themselves, such as an editor, a documentation build or a server,
and for authors of plugins.

## Compiling a diagram

```sh
npm install @diagrist/core @diagrist/plugin-uml
```

```ts
import { compile, formatMessage } from '@diagrist/core';
import { umlPlugin } from '@diagrist/plugin-uml';

const plugins = [umlPlugin];
const result = compile(source, { plugins });
for (const found of result.diagnostics) {
  console.log(`${found.span.line}:${found.span.column} ${found.code} ${formatMessage(found, plugins)}`);
}
if (result.svg !== undefined) await writeFile('order.svg', result.svg);
```

`compile` returns the picture only when no diagnostic is an error. Diagnostics are data with a code, a severity, a
position and the values their message is built from; `formatMessage` phrases them in English or, with `'de'`, in
German. Besides the SVG the result holds a plain-text description of the diagram and the anchors of its elements.
`inline: true` leaves stylesheet and background out of the SVG for hosts that style the classes themselves, and
`theme` repaints roles, CSS rules, markers, icons and the canvas over the kind's style table, such as for a
corporate design.

## Writing a plugin

A plugin is a value made with `definePlugin`, holding kinds made with `defineKind`. A kind is a set of statement
tables, a model built from what was read, rules that report diagnostics with the plugin's own codes, and a layout
that returns a scene of shapes with roles; the kernel turns roles into styles and the scene into SVG.
`checkPlugin` returns one message per problem, such as a statement without an example or a rule without a message
in every locale. The UML and C4 plugins in the repository are built this way and are the best place to start.

## Fonts

The kernel measures text with the advance widths of JetBrains Mono 2.305 and, for looks that name it, Inter 4.1,
so a layout does not depend on the fonts of the machine. The font files ship in `fonts/` for exporters that need
them, such as `@diagrist/export-png`, with their source and checksums in `fonts/FONTS.md`. Both families are under
the SIL Open Font License 1.1, whose texts are `fonts/OFL.txt` and `fonts/OFL-Inter.txt`. Diagrist itself is
licensed under Apache-2.0, and `NOTICE` lists all third-party material.
