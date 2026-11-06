import type { Point, Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { PlacedGroup, Route } from '../layout.js';
import type { Loops } from './loops.js';
import type { Assembled } from './output.js';
import type { RailEnds } from './rail-docks.js';
import type { RailTextAt } from './rail-texts.js';
import type { Railed } from './rails.js';
import type { LayeredEdge, LayeredMetrics, LayeredSpec } from './spec.js';

const right = (r: Rect) => r.x + r.w;

/** The frames holding each node, directly or through frames inside them. */
export function holders(spec: LayeredSpec): Map<string, Set<string>> {
  const frames = spec.frames ?? [];
  const parent = new Map(frames.map((f) => [f.id, f.parent]));
  const out = new Map<string, Set<string>>();
  for (const f of frames)
    for (const n of f.members) {
      const set = out.get(n) ?? new Set<string>();
      for (let g: string | undefined = f.id; g !== undefined && !set.has(g); g = parent.get(g)) set.add(g);
      out.set(n, set);
    }
  return out;
}

/**
 * The text of a rail, one line per line of its label: in `on`, the place over or under an end piece the rails found
 * for it, flush towards the box, or else beside the track, outside it, centred between its ends.
 */
function railLabels(e: LayeredEdge, route: Route, at: number, m: LayeredMetrics, on?: Rect): EdgeLabel[] {
  const text = e.label;
  if (text === undefined) return [];
  const lines = text.lines ?? [{ text: text.text, width: text.width }];
  const [, [x, y1], [, y2]] = route.points as [Point, Point, Point];
  const line = text.size + 2;
  const top = on?.y ?? (y1 + y2) / 2 - (lines.length * line) / 2;
  const left = route.fromSide === 'left';
  const flush = on === undefined ? (left ? x - m.labelGap : x + m.labelGap) : left ? on.x + on.w : on.x;
  const end = left;
  return lines.map((l, i) => ({
    text: l.text,
    x: flush,
    y: top + i * line + text.size,
    anchor: end ? ('end' as const) : ('start' as const),
    box: { x: end ? flush - l.width : flush, y: top + i * line, w: l.width, h: line },
    route: at,
    part: 'name' as const,
  }));
}

/**
 * The frames grown for the rails inside them: each reaches its pad beyond the rails and texts it holds, and every
 * frame around it reaches its own pad beyond it.
 */
export function grownFrames(
  frames: readonly PlacedGroup[],
  railed: Pick<Railed, 'reach'>,
  spec: LayeredSpec,
): PlacedGroup[] {
  if (railed.reach.size === 0) return [...frames];
  const byId = new Map((spec.frames ?? []).map((f) => [f.id, f]));
  const rects = new Map(frames.map((f) => [f.id, f.rect]));
  const depth = (id: string): number => {
    const p = byId.get(id)?.parent;
    return p === undefined ? 0 : 1 + depth(p);
  };
  for (const f of [...frames].sort((a, b) => depth(b.id) - depth(a.id))) {
    const r = rects.get(f.id) as Rect;
    const pad = byId.get(f.id)?.pad ?? 0;
    const need = railed.reach.get(f.id);
    const kids = frames.filter((k) => byId.get(k.id)?.parent === f.id).map((k) => rects.get(k.id) as Rect);
    const lo = Math.min(r.x, (need?.left ?? Number.POSITIVE_INFINITY) - pad, ...kids.map((k) => k.x - pad));
    const hi = Math.max(right(r), (need?.right ?? Number.NEGATIVE_INFINITY) + pad, ...kids.map((k) => right(k) + pad));
    rects.set(f.id, { ...r, x: lo, w: hi - lo });
  }
  return frames.map((f) => ({ ...f, rect: rects.get(f.id) as Rect }));
}

/** The texts the pipeline sets without a seat: those of loops beside their outer piece, of rails beside their track. */
export function looseTexts(
  spec: LayeredSpec,
  routes: readonly Route[],
  railed: Railed,
  loops: Loops,
  m: LayeredMetrics,
): EdgeLabel[] {
  return routes.flatMap((r, i) => {
    const e = r.shape === 'loop' || railed.routes.has(r.edge) ? spec.edges.find((k) => k.id === r.edge) : undefined;
    return e === undefined
      ? []
      : r.shape === 'loop'
        ? loops.labels(e, r, i)
        : railLabels(e, r, i, m, railed.texts.get(e.id));
  });
}

/**
 * A laid out picture whose frames hold the texts of the lines inside them: where the spot search found a text of a
 * line with both ends in a frame no clear spot within it, the frame and those around it grow sideways until the text
 * stands its pad inside, as frames grow for the rails they hold.
 */
export function holdTexts(spec: LayeredSpec, laid: Assembled): Assembled {
  const frames = laid.frames ?? [];
  if (frames.length === 0 || laid.labels.length === 0) return laid;
  const held = holders(spec);
  const ends = new Map(spec.edges.map((e) => [e.id, e] as const));
  const reach = new Map<string, { left: number; right: number }>();
  for (const l of laid.labels) {
    const e = ends.get(laid.routes[l.route]?.edge ?? '');
    if (e === undefined) continue;
    for (const f of frames) {
      if (held.get(e.from)?.has(f.id) !== true || held.get(e.to)?.has(f.id) !== true) continue;
      const [lo, hi] = [l.box.x, l.box.x + l.box.w];
      if (lo >= f.rect.x && hi <= f.rect.x + f.rect.w) continue;
      const was = reach.get(f.id) ?? { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY };
      reach.set(f.id, { left: Math.min(was.left, lo), right: Math.max(was.right, hi) });
    }
  }
  if (reach.size === 0) return laid;
  const grown = grownFrames(frames, { reach }, spec);
  const width = Math.max(laid.width, ...grown.map((f) => f.rect.x + f.rect.w));
  return { ...laid, frames: grown, width };
}

/** How far each frame holding both ends of a rail must reach for it and, beside its track, its text. */
export function railReach(
  laid: readonly (RailEnds & { readonly edge: LayeredEdge })[],
  held: ReadonlyMap<string, ReadonlySet<string>>,
  where: ReadonlyMap<string, RailTextAt>,
  m: LayeredMetrics,
): Map<string, { left: number; right: number }> {
  const reach = new Map<string, { left: number; right: number }>();
  for (const l of laid) {
    const outer = where.get(l.edge.id) === 'beside' ? (l.edge.label?.width ?? 0) + 2 * m.labelGap : 0;
    for (const f of held.get(l.lower) ?? []) {
      if (held.get(l.upper)?.has(f) !== true) continue;
      const was = reach.get(f) ?? { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY };
      reach.set(
        f,
        l.side === 'left'
          ? { ...was, left: Math.min(was.left, l.at - outer) }
          : { ...was, right: Math.max(was.right, l.at + outer) },
      );
    }
  }
  return reach;
}
