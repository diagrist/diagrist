# 13. Text metrics are a table derived from the bundled fonts

Date: 2026-10-24. Status: accepted.

## Context

Layout measures every text before it places anything, and the result must be the same bytes in Node, browsers and
edge runtimes (ADR 0008). Loading and parsing a font at run time means a dependency, asynchronous loading and file
access, none of which the kernel may have. The predecessor measured with opentype.js.

## Decision

The advance widths of JetBrains Mono (Regular, Bold; SIL Open Font License) are **generated** from the TTF files
in `packages/core/fonts` into `packages/core/src/font-metrics.ts`: the default advance and the code points that
differ. A test regenerates the table and fails on any difference; `UPDATE_GOLDEN=1` writes it (ADR 0004). The sum
follows the floating point steps of opentype.js 2.0, so widths match the predecessor. The font files ship with the
kernel as assets, for exporters that rasterize, such as PNG. So do the italic faces (Italic, Bold Italic, same
release and license), which set `font-style: italic` in the PNG; their advances equal those of the upright faces,
which the same test checks, so they need no table of their own.

## Consequences

Measuring is a pure, synchronous lookup without a runtime dependency. A font update is a regenerated table plus new
golden files. A proportional font, such as a sketch look, fits the same format with more entries.
