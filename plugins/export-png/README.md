# @diagrist/export-png

Turns the SVG of the kernel into a PNG, without a browser. Rendering runs in
[resvg](https://github.com/linebender/resvg) compiled to WebAssembly (`@resvg/resvg-wasm`), with the fonts the
kernel measures text with: JetBrains Mono 2.305 in Regular, Bold, Italic and Bold Italic, Inter 4.1 in Regular
and SemiBold, and Geist 1.8.2 in Regular and SemiBold with Geist Mono Regular for looks that name them (ADR 0022), all
SIL Open Font License 1.1, in `packages/core/fonts`. Italic text,
such as abstract names in class diagrams, is set in the italic faces. No system fonts, no network: the same SVG gives
the same bytes on every machine.

```ts
import { loadBundledFonts, loadPngRenderer } from '@diagrist/export-png/node';

const toPng = await loadPngRenderer();
const fonts = await loadBundledFonts();
const result = toPng(svg, { scale: 2, fonts });
if ('png' in result) await writeFile('order.png', result.png);
else console.error(result.problem, result.detail);
```

| Entry | What | Runs on |
|---|---|---|
| `@diagrist/export-png` | `pngRenderer(wasmBytes)` returns `toPng(svg, { scale, fonts })`. Fonts and the module come in as data. | Node, browsers, edge runtimes |
| `@diagrist/export-png/node` | `loadPngRenderer()` and `loadBundledFonts()` read the module and the kernel's fonts from disk. | Node |

`scale` multiplies width and height, default `1`; `2` gives sharp pictures on high-density screens. The background
is whatever the SVG draws: the canvas colour of the style table, or transparent with `inline`. Errors are data,
`{ problem: 'invalid-svg' | 'invalid-scale', detail }`, not exceptions.

## Compared with the predecessor

The 15 sequence examples in `plugins/plugin-uml/examples/sequence`, compiled with `@diagrist/core` and
`@diagrist/plugin-uml` and rendered with `scale: 2`, give PNGs **byte-identical** to the predecessor's
(`@resvg/resvg-js` 2.6.2, native), measured on 2026-10-24: same size, 0 differing pixels, same bytes. The WebAssembly
and the native build of resvg 2.6.2 produce the same bytes for all 15.
