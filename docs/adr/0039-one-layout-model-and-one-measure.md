# 39. One layout model and one measure for all kinds

Date: 2026-11-05. Status: proposed, following the layout plan the owner accepted on 05.11.2026 (decisions D1 to
D10). Builds on ADR 0015, 0034 and 0035.

## Context

The line check of ADR 0035 says what a presentable picture is, the same for every kind. The searches that choose
between layouts did not use it: the side search of a hub priced an arrangement by its own sum of crossings, bends,
length and width (`layered/score.ts`), the block search of packaged class pictures by another one with other
weights and its own test for lines through classes (`class/layout/routed.ts`), and neither saw what the check
reports besides crossings. What a search minimised and what `dgr check` reported could disagree, and a measure the
stress budgets count, such as bends a straight line could spare, reached no search at all.

## Decision

1. **One measure.** `scoreOf` in `layout-grid` prices a laid out picture by the findings of `lineFindings` and the
   measures of `lineMetrics`: a line through a box or text, ports too close or out of order, crossings, texts near
   foreign lines, a picture longer than three times its height, bends a straight line could spare, bends, lines on
   one another, foreign lines too near, short pieces, length and width. It returns the cost, whether the picture is
   clean (no line through anything, no crossing) and the measures. The hub search and the block search of class
   diagrams use it; their own objectives are gone. `linesOfLaid` reads a layout as the check reads the drawing,
   lines meeting at one of their ends as a bundle (`bundleLines`, the reading of ADR 0035).
2. **The measure is the check's.** `lineMetrics` counts `overlaps` (stretches where two foreign lines lie less than
   a pixel apart), `avoidable` (bends a straight line could have spared, which until now only the stress harness
   counted) and `aspect` (the longer side over the shorter). `dgr check --metrics` prints them, and the stress
   budgets of every kind count `overlaps` and `avoidable`, so neither can come back once it fell (D1: measures, no
   warning code; an author cannot act on them, only the engine).
3. **Weights keep the choices of today until the stages stop leaving what they would price.** The orders of
   magnitude follow the plan (through 10 000, ports 3 000, crossing 1 000, texts 600). Lines on one another, lines
   too near and short pieces weigh 3 for now, bends a straight line could spare 20, as much as a bend: with the
   plan's start weights (150 to 600) the side search of `hub-fuenf` and `hub-quer` stops one step earlier and keeps
   a crossing or a jog more, because it changes one side at a time and the jog it now refuses was the way to the
   better picture. Measured over every trial of the four hub pictures, any weight up to 3 for these, and up to 20
   for avoidable bends, chooses as before; no picture of an example or a stress fixture changes a byte.

## Consequences

The block search (`spread.ts`) still estimates lines in half columns before anything is laid out; it has no lines
to measure and goes with the blocks (plan P5). Raising the tie-breaking weights belongs to the changes that make
coordinates and ports leave no jogs and overlaps behind (plan P2, P3), each with the stress budgets to show what it
buys. A layout stage that wants to compare two of its own variants can now ask the same question the check answers.
