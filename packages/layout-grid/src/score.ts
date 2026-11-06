import {
  bundleLines,
  type LineFinding,
  type LineFrame,
  type LineInput,
  type LineMetrics,
  type LineThresholds,
  lineFindings,
  lineMetrics,
} from '@diagrist/core';
import type { EdgeLabel } from './label/types.js';
import type { PlacedNode, Route } from './layout.js';

/**
 * What one of each costs. A line through a box or text outweighs ports out of order, which outweigh a crossing,
 * which outweighs a text near a foreign line and a picture too long for its height; a bend a straight line could
 * spare counts twice, length and width break ties. Lines on one another or too near and short pieces only break
 * ties between pictures alike in all that: the searches that use this measure choose whole arrangements, and the
 * jogs and overlaps they meet are left by the later stages of the pipeline, so weighing them as the layout plan
 * starts (150 to 600) leads the hub search another way, to a crossing or a jog more in two stress pictures.
 * Summed rather than compared in turn, so a search sees every step (layout plan 3.1).
 */
const WEIGHT = {
  through: 10_000,
  ports: 3_000,
  crossing: 1_000,
  label: 600,
  aspect: 100,
  avoidable: 20,
  bend: 20,
  overlap: 3,
  parallel: 3,
  shape: 3,
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
  const cost =
    WEIGHT.through * through +
    WEIGHT.ports * ruled(found, 'ports') +
    WEIGHT.crossing * metrics.crossings +
    WEIGHT.overlap * metrics.overlaps +
    WEIGHT.parallel * ruled(found, 'parallel') +
    WEIGHT.label * ruled(found, 'label') +
    WEIGHT.avoidable * metrics.avoidable +
    WEIGHT.shape * shape +
    WEIGHT.bend * metrics.bends +
    WEIGHT.perLength * metrics.length +
    WEIGHT.perWidth * metrics.width +
    WEIGHT.aspect * Math.max(0, metrics.aspect - ASPECT);
  return { cost, clean: through + metrics.crossings === 0, metrics };
}

/** A laid out picture as the parts the line check reads. */
export interface LaidPicture {
  readonly nodes: readonly PlacedNode[];
  readonly routes: readonly Route[];
  /** The two ends of each route, by route index. */
  readonly ends: readonly (readonly [string, string])[];
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
        return { edge: r.edge, from, to, points: r.points };
      }),
    ),
    labels: laid.labels.map((l, i) => ({ key: `label-${i}`, edge: laid.routes[l.route]?.edge ?? '', box: l.box })),
    frames: laid.frames ?? [],
    width: laid.width,
    height: laid.height,
  };
}
