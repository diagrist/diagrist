import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import { type GraphEdge, type GraphNode, type LayoutGraph, WRAP_EM, wrapWithin } from '@diagrist/layout-grid';
import { firstOfSide, isBorderPoint, type StateModel } from '../model.js';
import { stateHeight, stateWidth } from './box.js';
import { stateContainers } from './containers.js';
import { edgeId } from './ids.js';
import { labelLines } from './labels.js';
import { STATE as S } from './metrics.js';
import { borderOf, hostOf } from './points/geometry.js';

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

/** The shape a vertex is laid out as: circles round, choices diamonds, fork and join bars, the rest rounded boxes. */
function shapeOf(kind: string): Pick<GraphNode, 'shape' | 'corner'> {
  if (ROUND.has(kind) || isBorderPoint(kind as never)) return { shape: 'ellipse' };
  if (kind === 'choice') return { shape: 'diamond' };
  return kind === 'fork' || kind === 'join' ? { shape: 'bar' } : { corner: S.radius };
}

/**
 * A state machine as a layout graph: simple vertices as nodes, entry and exit points docked on the outline of their
 * state, fork and join as bars, composite states as frames with their name field and compartment as the head and
 * their regions as parts (`stateContainers`), transitions as edges down the flow, sorted by the distance of their
 * target from the start so that breaking cycles follows the main way, the layers turned with `direction=right`, where
 * a state is as high as the lines on its busiest side need. A trigger belongs at the start of its line, where it
 * leaves its state; a guard out of a choice or another small vertex, whose lines share a trunk, at its own branch.
 */
export function stateGraph(m: StateModel): LayoutGraph {
  const simple = m.diagram.vertices.filter((v) => !m.composites.has(v.id) && v.kind !== 'region');
  const placed = [...simple.filter((v) => v.kind === 'initial'), ...simple.filter((v) => v.kind !== 'initial')];
  const across = m.diagram.direction === 'right';
  const room = (id: string) => (Math.max(m.out(id).length, m.into(id).length) + 1) * S.laneGap;
  const nodes = placed.map((v): GraphNode => {
    const dock = borderOf(m, v.id) ?? hostOf(m, v.id);
    return {
      id: v.id,
      width: stateWidth(m, v),
      height: v.kind === 'state' && across ? Math.max(stateHeight(m, v), room(v.id)) : stateHeight(m, v),
      ...shapeOf(v.kind),
      ...(dock === undefined ? {} : { dock }),
      source: v.span,
    };
  });
  const containers = stateContainers(
    m,
    placed.map((v) => v.id),
  );
  const bar = (id: string) => m.kind(id) === 'fork' || m.kind(id) === 'join';
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
      const first = firstOfSide(t, m.diagram.direction);
      return {
        id: edgeId(i),
        from: t.from,
        to: t.to,
        rank: first === undefined ? 'down' : 'beside',
        ...(first === undefined ? {} : { first, ...(lines.length ? { room: width + 2 * S.labelGap + S.lead } : {}) }),
        profile: bar(t.from) || bar(t.to) ? 'orthogonal' : 'rail',
        ...trunk(t.from, t.to),
        ...(lines.length
          ? {
              label: {
                text: lines.map((l) => l.text).join(' '),
                width,
                size: font.size,
                at: small(t.from) ? ('middle' as const) : ('start' as const),
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
      direction: m.diagram.direction,
      last: placed.filter((v) => v.kind === 'final' || v.kind === 'terminate').map((v) => v.id),
    },
    metrics: {
      colGap: 64,
      rowGapMin: 72,
      track: S.laneGap,
      portGap: m.diagram.vertices.some((v) => hostOf(m, v.id) !== undefined) ? 2 * S.point : S.laneGap,
      lead: S.lead,
      tail: S.laneGap,
      labelGap: S.labelGap,
      left: S.marginX + (m.diagram.vertices.some((v) => borderOf(m, v.id) !== undefined) ? S.point / 2 : 0),
      top: 128,
    },
  };
}
