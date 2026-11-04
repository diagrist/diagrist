import type { Rect } from '@diagrist/core';
import { labelFindings } from './labels.js';
import { obstaclesOf, throughFindings } from './obstacles.js';
import { crossingFindings, foreignPairs, parallelFindings } from './pairs.js';
import { portFindings } from './ports.js';
import { shapeFindings } from './shape.js';
import { DEFAULT_THRESHOLDS, LINE_RULES, type LineFinding, type LineInput, type LineThresholds } from './types.js';

/** The rectangle of a box or frame by its id, for the ends of lines. */
export function rectsOf(input: LineInput): (id: string) => Rect | undefined {
  const rects = new Map<string, Rect>([
    ...(input.frames ?? []).map((f): [string, Rect] => [f.id, f.rect]),
    ...input.nodes.map((n): [string, Rect] => [n.id, n.rect]),
  ]);
  return (id) => rects.get(id);
}

/**
 * The hard rules of a presentable picture checked on its lines (Q1 to Q9 of the layout plan), the same for every
 * picture: the lines, boxes and texts come in as data, every breach goes out as a finding. Thresholds not given
 * take their defaults, which suit the standard look. Crossings are reported only for pictures of at most
 * `crossingsUpTo` lines; `lineMetrics` counts them always. Findings are sorted by rule, edges and place, so the
 * same picture gives the same list.
 */
export function lineFindings(input: LineInput, thresholds: Partial<LineThresholds> = {}): LineFinding[] {
  const t: LineThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const rectOf = rectsOf(input);
  const pairs = foreignPairs(input.routes);
  const obstacles = obstaclesOf(input);
  const found = [
    ...(input.routes.length <= t.crossingsUpTo ? crossingFindings(pairs) : []),
    ...throughFindings(input, obstacles, t),
    ...input.routes.flatMap((r) => shapeFindings(r, rectOf, t)),
    ...parallelFindings(pairs, t.parallel),
    ...portFindings(input.routes, rectOf, t.ports),
    ...labelFindings(input, obstacles, t),
  ];
  return found.sort(byFinding);
}

const text = (f: LineFinding): string =>
  [f.edges.join(' '), f.label ?? '', f.other ?? '', f.detail ?? ''].join('\u0000');

function byFinding(a: LineFinding, b: LineFinding): number {
  const rule = LINE_RULES.indexOf(a.rule) - LINE_RULES.indexOf(b.rule);
  if (rule !== 0) return rule;
  const [ta, tb] = [text(a), text(b)];
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.at[0] - b.at[0] || a.at[1] - b.at[1] || (a.value ?? 0) - (b.value ?? 0);
}
