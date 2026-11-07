import type { Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { GraphEdge, LayoutGraph } from './spec.js';
import { framing } from './straight-clear.js';
import { costOf } from './straight-cost.js';

/** Boxes by id, as laid out or moved. */
type Rects = Map<string, Rect>;

/** The members of a frame that stand in one column, their x ranges overlapping in a chain, each top first. */
function columnsOf(members: readonly string[], rects: Rects): string[][] {
  const out: string[][] = [];
  for (const id of members) {
    const r = rects.get(id);
    if (r === undefined) continue;
    const meets = (o: string) => {
      const q = rects.get(o) as Rect;
      return r.x < q.x + q.w && q.x < r.x + r.w;
    };
    const into = out.find((col) => col.some(meets));
    if (into) into.push(id);
    else out.push([id]);
  }
  return out.map((col) => col.sort((a, b) => (rects.get(a) as Rect).y - (rects.get(b) as Rect).y));
}

/** The length of the straight lines of `edges` that join a box of `moved` to one outside it, middle to middle. */
function reach(edges: readonly GraphEdge[], rects: Rects, moved: ReadonlySet<string>): number {
  const mid = (id: string) => {
    const r = rects.get(id) as Rect;
    return [r.x + r.w / 2, r.y + r.h / 2] as const;
  };
  return edges.reduce((sum, e) => {
    if (moved.has(e.from) === moved.has(e.to) || !rects.has(e.from) || !rects.has(e.to)) return sum;
    const [a, b] = [mid(e.from), mid(e.to)];
    return sum + Math.hypot(a[0] - b[0], a[1] - b[1]);
  }, 0);
}

/** `rects` with the boxes `ids` moved down by `by`. */
function shifted(rects: Rects, ids: readonly string[], by: number): Rects {
  const out = new Map(rects);
  for (const id of ids) {
    const r = out.get(id) as Rect;
    out.set(id, { ...r, y: r.y + by });
  }
  return out;
}

/**
 * The boxes outside every frame (`framed` holds those inside one) whose straight lines all end in a box of `moved`:
 * such a box hangs on the moved ones only and moves with them by `by`, so its lines keep their slope. Not where it
 * would then meet a box that stays.
 */
function hangers(
  graph: LayoutGraph,
  straight: readonly GraphEdge[],
  rects: Rects,
  framed: ReadonlySet<string>,
  moved: readonly string[],
  by: number,
): string[] {
  const set = new Set(moved);
  const meets = (r: Rect, q: Rect) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h;
  return graph.nodes
    .filter((n) => !framed.has(n.id) && !set.has(n.id) && rects.has(n.id))
    .filter((n) => {
      const mine = straight.filter((e) => e.from === n.id || e.to === n.id);
      if (mine.length === 0 || !mine.every((e) => set.has(e.from === n.id ? e.to : e.from))) return false;
      const r = rects.get(n.id) as Rect;
      const to = { ...r, y: r.y + by };
      return ![...rects].some(([id, q]) => id !== n.id && !set.has(id) && meets(to, q));
    })
    .map((n) => n.id);
}

/**
 * The members of every frame packed in their columns, for a graph whose layers run right and that asks for it
 * (`given.pack`): where two members of one frame stand further apart in their column than `gap` and no member of
 * another column fills the band between them, the boxes above the gap move down or those below move up until they
 * stand `gap` apart, whichever leaves the lines out of the moved boxes shorter, and only where no line then runs
 * through a box, a head or a foreign frame more often than before (`costOf`, as `clearStraight` counts it). The boxes
 * outside every frame that hang on the moved ones only move with them (`hangers`). So a frame is as tall as what it
 * holds, no empty band reads as missing content and a line from outside stays as level as it was. The kind lays a picture out packed and
 * keeps it where its price finds it cheaper, since a packed frame may take the room a note wanted.
 */
export function packFrames(
  graph: LayoutGraph,
  straight: readonly GraphEdge[],
  rects: ReadonlyMap<string, Rect>,
  frames: (rects: Rects) => readonly PlacedGroup[],
  gap: number,
): Rects {
  const out: Rects = new Map(rects);
  if (graph.given?.direction !== 'right' || graph.given.pack !== true) return out;
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const containers = graph.containers ?? [];
  const framed = new Set(containers.filter((k) => k.kind === 'frame').flatMap((k) => k.members));
  const hard = (tried: Rects) => {
    const framed = frames(tried);
    const frameOf = framing(graph, framed);
    const heads = framed.flatMap((f) => {
      const head = containers.find((c) => c.id === f.id)?.head;
      return head ? [{ x: f.rect.x, y: f.rect.y, w: head.width, h: head.height }] : [];
    });
    const passed = (e: GraphEdge) => {
      const held = new Set([...frameOf(e.from).own, ...frameOf(e.to).own].map((f) => f.id));
      return framed.filter((f) => !held.has(f.id)).map((f) => f.rect);
    };
    return costOf(straight, nodes, tried, heads, passed);
  };
  for (const c of containers) {
    if (c.kind !== 'frame') continue;
    for (const col of columnsOf(c.members, out)) {
      for (let i = 1; i < col.length; i++) {
        const [a, b] = [out.get(col[i - 1] as string) as Rect, out.get(col[i] as string) as Rect];
        const slack = b.y - (a.y + a.h) - gap;
        const band = (r: Rect) => r.y < b.y - gap && r.y + r.h > a.y + a.h + gap;
        if (slack <= 0.5 || c.members.some((m) => !col.includes(m) && band(out.get(m) as Rect))) continue;
        const was = hard(out);
        const [up, down] = [col.slice(0, i), col.slice(i)];
        const upper = [...up, ...hangers(graph, straight, out, framed, up, slack)];
        const lower = [...down, ...hangers(graph, straight, out, framed, down, -slack)];
        const chosen = [
          { tried: shifted(out, upper, slack), moved: upper },
          { tried: shifted(out, lower, -slack), moved: lower },
        ]
          .filter((t) => hard(t.tried) <= was)
          .map((t) => ({ ...t, cost: reach(straight, t.tried, new Set(t.moved)) }))
          .sort((p, q) => p.cost - q.cost)[0];
        if (chosen !== undefined) for (const [id, r] of chosen.tried) out.set(id, r);
      }
    }
  }
  return out;
}
