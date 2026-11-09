# @diagrist/export-figjam

Brings Diagrist pictures into FigJam. The first piece is `flattenSvg`, which rewrites the kernel's SVG so that
Figma's SVG import shows it as drawn. The command line uses it in `dgr export figjam`, which also writes the
script that lays the uploaded pictures into sections (see `docs/cli.md`).

```ts
import { flattenSvg } from '@diagrist/export-figjam';

const { svg, report } = flattenSvg(picture.svg, { scale: 1.5 });
```

Figma's import ignores `<style>`, inherits no font from the root, drops `marker-end` and `marker-start` and knows no
`paint-order`. Every Diagrist SVG uses all four. Live probes in FigJam on 2026-11-09 added three more losses: runs of
spaces collapse even under `xml:space="preserve"`, and text after them goes missing; `letter-spacing` and `filter`
are dropped. `flattenSvg` rewrites what it can, and its `report` counts what it did and what is still lost.

| Kernel's SVG | Flattened | Count in `report` |
|---|---|---|
| `class` with rules in `<style>`, including the rules of areas (ADR 0033) | the declarations of every matching rule as attributes, in cascade order | `classes` |
| font family and size on the root | the first family and the size on every `<text>`, `font-kerning` as `style` | |
| text with a halo (`paint-order: stroke`) | a copy in the halo's stroke behind the text, the text without stroke | `halos` |
| `marker-end`, `marker-start` | the marker as a turned group at the path's end; paths with curves keep the reference | `markersExpanded`, `markersKept` |
| icon as nested `<svg viewBox>` | a group that moves and scales it | `icons` |
| text with `xml:space="preserve"`, such as a line of code | every space a no-break space, the attribute gone | `preservedTexts` |
| `filter`, the stripe of `areas=stripe` | removed; the stripe is lost | `filters` |
| `letter-spacing` | kept; Figma drops it | `letterSpacing` |

What the import still changes, measured: `font-weight` 600 becomes Bold, also in Inter, which has a SemiBold;
`font-kerning: none` has no effect, so Inter runs slightly tighter than in the PNG. A nested `<svg viewBox>`,
`fill-opacity`, `stroke-dasharray`, coloured `<tspan>`, `text-anchor` and `<g transform>` arrive as drawn, and `id`
attributes become layer names.

`scale` multiplies `width` and `height` and keeps the view box: FigJam sizes an upload by them and scales the
content to the view box. The flattened SVG renders like the original: `packages/cli/test/figjam-flatten.test.ts`
renders both with `@diagrist/export-png` and allows at most 0.01 % differing pixels per picture.
