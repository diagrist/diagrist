import type { GraphContainer, GraphEdge, GraphNode, LayoutGraph } from '@diagrist/layout-grid';
import type { NodeKind } from '../grammar/values.js';
import { type Graph, type GraphFlow, isHandlerFlow } from './graph.js';
import { guardLabel } from './guards.js';
import { handoffCandidates } from './handoff.js';
import { expansionLinks, nodeLanes, triggerLinks } from './hidden.js';
import { laneFrame, laneMinWidth } from './lanes.js';
import { ACT, SIZE, widthOf } from './metrics.js';
import { heldHeight } from './side-bolts.js';
import { boltRoom, sideReach } from './side-room.js';
import { activitySize } from './size.js';

/** The id of the edge of a flow in the layout graph, by its place in `Graph.flows`. */
export const flowId = (index: number): string => `f${index}`;

const ROUND: ReadonlySet<NodeKind> = new Set(['initial', 'final', 'flowfinal']);
const BARS: ReadonlySet<NodeKind> = new Set(['fork', 'join']);
const DIAMONDS: ReadonlySet<NodeKind> = new Set(['decision', 'merge']);

/** The node of the layout graph: its symbol, a bar as a bar, a diamond with its ends at its corners. */
function nodeOf(g: Graph, id: string): GraphNode | undefined {
  const n = g.byId.get(id);
  if (!n) return undefined;
  const s = activitySize(n);
  const reach = sideReach(g, n);
  return {
    id,
    width: s.w,
    height: heldHeight(g, id, s.h),
    ...(ROUND.has(n.kind) ? { shape: 'ellipse' as const } : BARS.has(n.kind) ? { shape: 'bar' as const } : {}),
    ...(DIAMONDS.has(n.kind) && !n.port ? { sides: ['top', 'bottom', 'left', 'right'] as const } : {}),
    ...(reach ? { reach } : {}),
    source: n.span,
  };
}

/** The ends of a flow that sit on pins: the straight run they need out of or into their node. */
function pinRuns(g: Graph, f: GraphFlow): GraphEdge['run'] {
  if (f.kind !== 'object') return undefined;
  const [a, b] = [g.byId.get(f.from), g.byId.get(f.to)];
  const from = a?.outputs.length ? ACT.pin + ACT.layerGap / 3 : undefined;
  const to = b?.inputs.length ? ACT.pin + ACT.layerGap / 2 : undefined;
  return from === undefined && to === undefined
    ? undefined
    : { ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) };
}

/**
 * Lines into and out of small symbols share one trunk, as the ends of a diamond or circle do, and so do object
 * flows into one input pin or out of one output pin.
 */
function trunk(g: Graph, f: GraphFlow): { bundle?: string } {
  const pin = g.pins[f.index] ?? {};
  const shared = (end: 'from' | 'to') =>
    g.flows.some((o) => o !== f && o[end] === f[end] && pin[end] !== undefined && g.pins[o.index]?.[end] === pin[end]);
  if (f.kind === 'object' && shared('to')) return { bundle: `into:${f.to}:${pin.to}` };
  if (f.kind === 'object' && shared('from')) return { bundle: `out:${f.from}:${pin.from}` };
  const kind = (id: string) => g.byId.get(id)?.kind;
  const small = (id: string) => {
    const k = kind(id);
    return k !== undefined && (ROUND.has(k) || (DIAMONDS.has(k) && !g.byId.get(id)?.port));
  };
  if (small(f.to)) return { bundle: `into:${f.to}` };
  if (small(f.from)) return { bundle: `out:${f.from}` };
  return {};
}

/**
 * An activity diagram as a layout graph (ADR 0039, plan P9): nodes with their symbols, fork and join as bars,
 * decisions and merges with their ends at the corners, the texts beside a node as its reach, lanes as hard columns,
 * regions as frames; flows down, a hand-over between lanes and the first bolt into a handler beside, the loops back
 * and the bolts of further protected actions on rails, or hidden where the kind draws them (`sideBolts`); hidden edges hold triggers beside their region and the nodes
 * of an expansion region between its inputs and outputs.
 */
export function activityGraph(g: Graph): LayoutGraph {
  const laneOf = nodeLanes(g);
  const known = new Set(g.nodes.map((n) => n.id));
  const valid = g.flows.filter((f) => known.has(f.from) && known.has(f.to));
  const flowing = valid.filter((f) => !isHandlerFlow(f) && f.from !== f.to);
  const handover = new Set(handoffCandidates(g, flowing, laneOf));
  const nodes = g.nodes.flatMap((n) => nodeOf(g, n.id) ?? []);
  const bolted = new Set<string>();
  const edges = valid.map((f): GraphEdge => {
    const guard = guardLabel(f);
    const first = isHandlerFlow(f) && !bolted.has(f.to);
    if (isHandlerFlow(f)) bolted.add(f.to);
    const runs = pinRuns(g, f);
    return {
      id: flowId(f.index),
      from: f.from,
      to: f.to,
      rank: handover.has(f) || first ? 'beside' : isHandlerFlow(f) ? 'up' : 'down',
      ...(isHandlerFlow(f) ? { room: boltRoom(f.exception) } : trunk(g, f)),
      ...(f.held ? { hidden: true } : first ? {} : { profile: 'back' as const }),
      ...(guard ? { label: { text: guard, width: widthOf.label(guard), size: SIZE.label } } : {}),
      ...(runs ? { run: runs } : {}),
      source: f.span,
    };
  });
  const hidden = [...triggerLinks(g, flowing), ...expansionLinks(g)].map(
    (e, i): GraphEdge => ({ id: `h${i}`, ...e, hidden: true }),
  );
  const frame = laneFrame(g);
  const lanes = g.partitions.map(
    (p, i): GraphContainer => ({
      id: p.id,
      kind: 'lane',
      members: g.nodes.filter((n) => laneOf.get(n.id) === i).map((n) => n.id),
      pad: ACT.lanePadX,
      top: frame.firstRow - frame.top,
      head: { width: laneMinWidth(g, i, 0), height: ACT.laneHeadH },
    }),
  );
  const frames = [
    ...g.expansions.map(
      (x): GraphContainer => ({
        id: x.id,
        kind: 'frame',
        members: g.nodes.filter((n) => n.expansion === x.id && n.port === undefined).map((n) => n.id),
        pad: ACT.regionPad,
        top: ACT.regionPad + ACT.regionLabelH,
        head: { width: 0, height: 0 },
      }),
    ),
    ...g.regions.map(
      (r): GraphContainer => ({
        id: r.id,
        kind: 'frame',
        members: g.nodes.filter((n) => n.interruptible === r.id).map((n) => n.id),
        pad: ACT.regionPad,
        top: ACT.regionPad + (r.label ? ACT.regionLabelH : 0),
        head: { width: 0, height: 0 },
      }),
    ),
  ].filter((c) => c.members.length > 0);
  return {
    nodes,
    edges: [...edges, ...hidden],
    containers: [...lanes, ...frames],
    metrics: {
      colGap: ACT.branchGap,
      rowGapMin: ACT.layerGap,
      track: ACT.track,
      portGap: 16,
      lead: 24,
      tail: 16,
      labelGap: ACT.guardGap,
      left: ACT.marginX,
      top: frame.firstRow,
    },
  };
}
