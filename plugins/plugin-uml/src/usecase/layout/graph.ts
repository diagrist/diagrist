import { textWidth } from '@diagrist/core';
import type { GraphContainer, GraphEdge, GraphLabel, GraphNode, LayoutGraph } from '@diagrist/layout-grid';
import { isKnown, type KnownRelation } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { actorSize } from './actor.js';
import type { Plan } from './auto/plan.js';
import { useCaseSize } from './ellipse.js';
import { UC, UC_FONTS } from './metrics.js';
import { type NoteBox, noteHome } from './note.js';
import { edgeId, SUBJECT_TITLE } from './spec.js';

/** Room between a subject's frame and its use cases, at the top for its name. */
const PAD = 40;
const TOP = 44;
const FONT = UC_FONTS.label;

/** The layer of every actor and use case: the column of the plan, actors in their lanes, one more than its x. */
export function layersOf(m: UseCaseModel, plan: Plan): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of m.diagram.actors) out.set(a.id, (plan.actorX.get(a.id) ?? -1) + 1);
  for (const u of m.diagram.cases) out.set(u.id, (plan.depth.get(u.id) ?? 0) + 1);
  return out;
}

const measured = (text: string): GraphLabel => ({ text, width: textWidth(text, FONT), size: FONT.size });

/** «include», «extend» and the name of a relation, as one text beside the middle of its line. */
export function middleText(r: KnownRelation): string {
  const keyword = r.kind === 'include' || r.kind === 'extend' ? `«${r.kind}»` : '';
  return [keyword, r.label ?? ''].filter(Boolean).join(' ');
}

/**
 * The ids in reading order: as declared, a special actor or use case right after its general one. The layers are
 * laid out down and turned to run right, which puts the start of a layer at the bottom, so the graph hands its nodes
 * reversed, which the order stage starts from.
 */
function readingOrder(m: UseCaseModel, ids: readonly string[]): string[] {
  const general = new Map(
    m.diagram.relations.flatMap((r) => (r.kind === 'generalization' && ids.includes(r.to) ? [[r.from, r.to]] : [])),
  );
  const out: string[] = [];
  const put = (id: string, guard: number) => {
    if (out.includes(id) || guard < 0) return;
    out.push(id);
    for (const special of ids) if (general.get(special) === id) put(special, guard - 1);
  };
  for (const id of ids) if (!ids.includes(general.get(id) ?? '')) put(id, ids.length);
  for (const id of ids) put(id, ids.length);
  return out;
}

/** An actor as a node: a system's box, or the figure with its role below, as wide as the wider of both. */
function actorNode(m: UseCaseModel, id: string): GraphNode | undefined {
  const a = m.actors.get(id);
  if (!a) return undefined;
  const size = actorSize(a);
  const below = size.caption?.below ?? 0;
  return {
    id,
    width: size.column,
    height: size.h + below,
    ...(size.caption ? { body: { width: size.w, height: size.h } } : {}),
    source: a.span,
  };
}

/**
 * A use case diagram as a layout graph (layout plan P11): the layers are the columns of the plan, turned to run left
 * to right, actors in the outer and middle lanes, use cases by their depth; the order stage orders every column.
 * Subjects are frames around their use cases, relations straight lines with their keyword and name beside the middle
 * and multiplicities at the ends, a general actor or use case above its special one in their column. For a note it is handed it keeps room the note may take: below the use case it
 * hangs on, or for an extend below the extending one, its box grown and its ellipse the body lines end on; else an
 * empty box as large as the note in the layer of its anchor, held beside it by a hidden edge (`noteHome`).
 */
export function useCaseGraph(m: UseCaseModel, plan: Plan, notes: readonly NoteBox[]): LayoutGraph {
  const layer = layersOf(m, plan);
  const relations = m.diagram.relations.flatMap((r, i) => (isKnown(r) ? [{ r, i }] : []));
  const below = new Map<string, NoteBox[]>();
  const spacers = notes.filter((n) => {
    const at = noteHome(m, n, layer).anchor;
    if (!m.cases.has(at) || n.on.kind === 'subject') return true;
    below.set(at, [...(below.get(at) ?? []), n]);
    return false;
  });
  const all: GraphNode[] = [
    ...m.diagram.actors.flatMap((a) => actorNode(m, a.id) ?? []),
    ...m.diagram.cases.map((u): GraphNode => {
      const { w, h } = useCaseSize(u);
      const room = below.get(u.id) ?? [];
      const width = Math.max(w, ...room.map((n) => n.width));
      const height = h + room.reduce((sum, n) => sum + n.height + UC.noteGap, 0);
      const body = room.length > 0 ? { body: { width: w, height: h } } : {};
      return { id: u.id, width, height, ...body, ...(u.classifier ? {} : { shape: 'ellipse' }), source: u.span };
    }),
    ...spacers.map((n): GraphNode => ({ id: n.id, width: n.width, height: n.height })),
  ];
  const homes = spacers.map((n) => ({ n, home: noteHome(m, n, layer) }));
  for (const { n, home } of homes) layer.set(n.id, layer.get(home.anchor) ?? 0);
  const byId = new Map(all.map((n) => [n.id, n]));
  const nodes = readingOrder(
    m,
    all.map((n) => n.id),
  )
    .reverse()
    .flatMap((id) => byId.get(id) ?? []);
  const rankOf = (from: string, to: string): GraphEdge['rank'] => {
    const [a, b] = [layer.get(from) ?? 0, layer.get(to) ?? 0];
    return a < b ? 'down' : a > b ? 'up' : 'beside';
  };
  const edges: GraphEdge[] = [
    ...relations.map(({ r, i }): GraphEdge => {
      const text = middleText(r);
      const from = r.source && measured(r.source);
      const to = r.card && measured(r.card);
      return {
        id: edgeId(i),
        from: r.from,
        to: r.to,
        rank: rankOf(r.from, r.to),
        ...(r.kind === 'generalization' && rankOf(r.from, r.to) === 'beside' ? { first: 'to' as const } : {}),
        profile: 'straight',
        ...(text ? { label: measured(text) } : {}),
        ...(from || to ? { ends: { ...(from ? { from } : {}), ...(to ? { to } : {}) } } : {}),
        source: r.span,
      };
    }),
    ...homes.map(
      ({ n, home }): GraphEdge => ({ id: `${n.id}.link`, from: home.anchor, to: n.id, rank: 'beside', hidden: true }),
    ),
  ];
  const containers = m.diagram.subjects.flatMap((s): GraphContainer[] => {
    const cases = m.diagram.cases.filter((u) => u.subject === s.id).map((u) => u.id);
    if (cases.length === 0) return [];
    const held = homes.filter((h) => h.home.subject === s.id).map((h) => h.n.id);
    const head = { width: textWidth(s.label, UC_FONTS.name) + 2 * SUBJECT_TITLE.x, height: SUBJECT_TITLE.y + 4 };
    return [{ id: s.id, kind: 'frame', members: [...cases, ...held], pad: PAD, top: TOP, head }];
  });
  const deepest = Math.max(0, ...layer.values());
  const ranks = Array.from({ length: deepest + 1 }, (_, l) =>
    nodes.filter((n) => layer.get(n.id) === l).map((n) => n.id),
  );
  return {
    nodes,
    edges,
    containers,
    given: { ranks: ranks.filter((r) => r.length > 0), order: 'free', direction: 'right' },
    metrics: {
      colGap: 40,
      rowGapMin: UC.colGap,
      track: 16,
      portGap: 16,
      lead: 16,
      tail: 16,
      labelGap: 10,
      left: 48,
      top: 72,
    },
  };
}
