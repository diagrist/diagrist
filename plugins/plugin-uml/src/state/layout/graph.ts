import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import {
  type GraphContainer,
  type GraphEdge,
  type GraphNode,
  type LayoutGraph,
  WRAP_EM,
  wrapWithin,
} from '@diagrist/layout-grid';
import { frameOf, isBorderPoint, type StateModel } from '../model.js';
import { stateHeight, stateWidth } from './box.js';
import { labelLines } from './labels.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';
import { compositeHead, edgeId } from './spec.js';

/** Vertices drawn as circles. */
const ROUND: ReadonlySet<string> = new Set(['initial', 'final', 'junction', 'history', 'terminate']);

/** Pseudostates and final states too small for lines side by side: their lines share one trunk. */
const SMALL: ReadonlySet<string> = new Set([...ROUND, 'choice']);

/** Shortest distance of every vertex from the initial pseudostates along the transitions. */
function distances(m: StateModel): Map<string, number> {
  const starts = m.diagram.vertices.filter((v) => v.kind === 'initial' && v.parent === undefined).map((v) => v.id);
  const dist = new Map(starts.map((s) => [s, 0]));
  const queue = [...starts];
  for (let n = queue.shift(); n !== undefined; n = queue.shift())
    for (const t of m.out(n))
      if (!dist.has(t.to)) {
        dist.set(t.to, (dist.get(n) ?? 0) + 1);
        queue.push(t.to);
      }
  return dist;
}

/**
 * A state machine as a layout graph: simple vertices as nodes, composite states as frames with their name field and
 * compartment as the head, transitions as edges down the flow, sorted by the distance of their target from the start
 * so that breaking cycles follows the main way.
 */
export function stateGraph(m: StateModel): LayoutGraph {
  const simple = m.diagram.vertices.filter(
    (v) => !m.composites.has(v.id) && v.kind !== 'region' && !isBorderPoint(v.kind),
  );
  const placed = [...simple.filter((v) => v.kind === 'initial'), ...simple.filter((v) => v.kind !== 'initial')];
  const nodes = placed.map(
    (v): GraphNode => ({
      id: v.id,
      width: stateWidth(m, v),
      height: stateHeight(m, v),
      ...(ROUND.has(v.kind) ? { shape: 'ellipse' as const } : {}),
      source: v.span,
    }),
  );
  const containers = m.diagram.vertices.flatMap((v): GraphContainer[] => {
    if (!m.composites.has(v.id)) return [];
    const parent = frameOf(m, v.parent);
    const head = compositeHead(m, v.id);
    return [
      {
        id: v.id,
        kind: 'frame',
        members: placed.filter((n) => frameOf(m, n.parent) === v.id).map((n) => n.id),
        ...(parent === undefined ? {} : { parent }),
        pad: S.padSide,
        top: head + S.padBottom,
        head: { width: textWidth(v.label ?? '', F.name) + 2 * S.padX, height: head },
      },
    ];
  });
  const small = (id: string) => SMALL.has(m.kind(id) ?? '');
  const trunk = (from: string, to: string) =>
    small(to) ? { bundle: `into:${to}` } : small(from) ? { bundle: `out:${from}` } : {};
  const dist = distances(m);
  const far = (id: string) => dist.get(id) ?? Number.MAX_SAFE_INTEGER;
  const font = STANDARD_FONTS.label;
  const edges = m.diagram.transitions
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => m.vertices.has(t.from) && m.vertices.has(t.to))
    .sort((a, b) => far(a.t.to) - far(b.t.to) || a.i - b.i)
    .map(({ t, i }): GraphEdge => {
      const measure = (text: string) => textWidth(text, font);
      const lines = labelLines(t, m.diagram.protocol)
        .flatMap((l) => (measure(l) <= WRAP_EM * font.size ? [l] : wrapWithin(l, WRAP_EM * font.size, measure)))
        .map((text) => ({ text, width: measure(text) }));
      const width = Math.max(0, ...lines.map((l) => l.width));
      return {
        id: edgeId(i),
        from: t.from,
        to: t.to,
        rank: 'down',
        profile: 'rail',
        ...trunk(t.from, t.to),
        ...(lines.length
          ? {
              label: {
                text: lines.map((l) => l.text).join(' '),
                width,
                size: font.size,
                ...(lines.length > 1 ? { lines } : {}),
              },
            }
          : {}),
        source: t.span,
      };
    });
  return {
    nodes,
    edges,
    containers,
    given: {
      perLayer: Number.POSITIVE_INFINITY,
      last: placed.filter((v) => v.kind === 'final' || v.kind === 'terminate').map((v) => v.id),
    },
    metrics: {
      colGap: 64,
      rowGapMin: 72,
      track: S.laneGap,
      portGap: S.laneGap,
      lead: S.lead,
      tail: S.laneGap,
      labelGap: S.labelGap,
      left: S.marginX,
      top: 128,
    },
  };
}
