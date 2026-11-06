import {
  bundleLines,
  type LineFinding,
  type LineFrame,
  type LineInput,
  type LineMetrics,
  type LineRoute,
  type LineThresholds,
  lineCentring,
  lineFindings,
  lineMetrics,
  type Point,
} from '@diagrist/core';
import type { EdgeLabel } from './label/types.js';
import type { PlacedNode, Route } from './layout.js';

/**
 * What one of each costs, as the layout plan starts (3.1). A line through a box or text outweighs ports out of
 * order, which outweigh a crossing and lines on one another, which hide where each line goes as a crossing does;
 * then foreign lines too near and a text near a foreign line, then a jog or a short piece, then a picture too long
 * for its height. A bend counts by the weight of its line, so a line of a hierarchy runs straight before a secondary
 * one; a bend a straight line could spare counts twice. A box off the middle of its children, or a child off its one
 * parent, by the lines that are no soft ones, costs half a unit per pixel (Q11, Q12): a slip of a few pixels weighs
 * little, a box beside its parent's axis as much as two bends. Length and width break ties. Summed rather than
 * compared in turn, so a search sees every step.
 */
const WEIGHT = {
  through: 10_000,
  ports: 3_000,
  crossing: 1_000,
  overlap: 1_000,
  parallel: 600,
  label: 600,
  shape: 150,
  aspect: 100,
  avoidable: 20,
  bend: 20,
  perOffset: 0.5,
  perLength: 0.1,
  perWidth: 0.1,
} as const;

/** A picture longer than this many times its other side starts to cost (Q14). */
const ASPECT = 3;

/** What a picture costs by `scoreOf`, with the measures it was summed from. */
export interface Score {
  /** The sum of the weighted measures; lower is better. */
  readonly cost: number;
  /** No line runs through a box or text and none crosses another. */
  readonly clean: boolean;
  readonly metrics: LineMetrics;
}

const ruled = (found: readonly LineFinding[], rule: LineFinding['rule']) => found.filter((f) => f.rule === rule).length;

/**
 * The one measure of a laid out picture, for every search that compares layouts: the hard rules of the line check
 * (ADR 0035) and the soft measures of `lineMetrics`, weighted so a breach of a hard rule outweighs any soft measure.
 * What a search minimises is what the check reports and the stress budgets count.
 */
export function scoreOf(input: LineInput, thresholds: Partial<LineThresholds> = {}): Score {
  const metrics = lineMetrics(input);
  const found = lineFindings(input, { ...thresholds, crossingsUpTo: 0 });
  const through = ruled(found, 'through');
  const shape = ruled(found, 'jog') + ruled(found, 'lead') + ruled(found, 'tail');
  const strong = lineCentring({ ...input, routes: input.routes.filter((r) => (r.weight ?? 1) >= 1) });
  const cost =
    WEIGHT.through * through +
    WEIGHT.ports * ruled(found, 'ports') +
    WEIGHT.crossing * metrics.crossings +
    WEIGHT.overlap * metrics.overlaps +
    WEIGHT.parallel * ruled(found, 'parallel') +
    WEIGHT.label * ruled(found, 'label') +
    WEIGHT.avoidable * metrics.avoidable +
    WEIGHT.shape * shape +
    WEIGHT.bend * weightedBends(input.routes) +
    WEIGHT.perOffset * (strong.parentOffset + strong.childOffset) +
    WEIGHT.perLength * metrics.length +
    WEIGHT.perWidth * metrics.width +
    WEIGHT.aspect * Math.max(0, metrics.aspect - ASPECT);
  return { cost, clean: through + metrics.crossings === 0, metrics };
}

/** The bends of every line times its weight: where its direction turns between two points. */
function weightedBends(routes: readonly LineRoute[]): number {
  let total = 0;
  for (const r of routes) {
    let turns = 0;
    for (let i = 1; i + 1 < r.points.length; i++) {
      const [a, b, c] = [r.points[i - 1], r.points[i], r.points[i + 1]] as [Point, Point, Point];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) turns++;
    }
    total += (r.weight ?? 1) * turns;
  }
  return total;
}

/** A laid out picture as the parts the line check reads. */
export interface LaidPicture {
  readonly nodes: readonly PlacedNode[];
  readonly routes: readonly Route[];
  /** The two ends of each route, by route index. */
  readonly ends: readonly (readonly [string, string])[];
  /** The weight of each route, by route index: 1 by default, less for a secondary line, more for a main one. */
  readonly weights?: readonly number[];
  readonly labels: readonly EdgeLabel[];
  /** Frames, each with the head lines keep clear of, if it has one. */
  readonly frames?: readonly LineFrame[];
  readonly width: number;
  readonly height: number;
}

/** The lines, boxes, frames and texts of a laid out picture, for `scoreOf`. */
export function linesOfLaid(laid: LaidPicture): LineInput {
  return {
    nodes: laid.nodes.map((n) => ({ id: n.id, rect: n.rect })),
    routes: bundleLines(
      laid.routes.map((r, i) => {
        const [from, to] = laid.ends[i] ?? ['', ''];
        const weight = laid.weights?.[i];
        return { edge: r.edge, from, to, points: r.points, ...(weight === undefined ? {} : { weight }) };
      }),
    ),
    labels: laid.labels.map((l, i) => ({ key: `label-${i}`, edge: laid.routes[l.route]?.edge ?? '', box: l.box })),
    frames: laid.frames ?? [],
    width: laid.width,
    height: laid.height,
  };
}
