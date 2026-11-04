import type { Drawing, Placed } from '@diagrist/core';
import type { LineFrame, LineInput, LineLabel, LineNode, LineRoute, LineText } from './types.js';

/** A text keyed `<id><n>.label`, `<id><n>.label.<k>` or `label-<n>` stands on the line of index `n`. */
const LABEL = [/^\D*?(\d+)\.label(?:\.\d+)?$/, /^label-(\d+)$/];

/** A box or text keyed `<id><n>.<anything>` belongs to the line of index `n`, unless `<id><n>` is a box. */
const OF_LINE = /^\D*?(\d+)\./;

/**
 * What a kind handed to the kernel, read as input of the line check: the boxes and frames of the anchors with the
 * outlines and texts of `placed`, a line per edge anchor, its id the anchor's index. Texts are tied to their line by
 * key, as `placedOf` and the kinds name them; boxes that hold other boxes, and areas, are frames, and a text keyed
 * `<frame>.name` is the head of its frame. Lines leaving a box at one point, or entering one at one point, are
 * drawn as a bundle and are read as one.
 */
export function linesOfDrawing(drawing: Pick<Drawing, 'anchors' | 'placed'>): LineInput {
  const { anchors } = drawing;
  const placed = drawing.placed ?? [];
  const edges = new Set(anchors.edges.map((e) => String(e.index)));
  const holders = new Set(placed.filter((p) => p.kind !== 'text' && p.within !== undefined).map((p) => p.within));
  const isFrame = (p: Placed) => p.kind === 'frame' || p.kind === 'area' || (p.kind === 'box' && holders.has(p.key));
  const frameIds = new Set([...placed.filter(isFrame).map((p) => p.key), ...anchors.groups.map((g) => g.id)]);
  const nodeIds = new Set(anchors.nodes.map((n) => n.id).filter((id) => !frameIds.has(id)));
  const prefixOf = (key: string) => key.split('.')[0] ?? key;
  const ownerOf = (key: string): string | undefined => {
    const prefix = prefixOf(key);
    if (nodeIds.has(prefix) || frameIds.has(prefix)) return prefix;
    const line = OF_LINE.exec(key)?.[1];
    return line !== undefined && edges.has(line) ? line : undefined;
  };
  const lineOfLabel = (key: string): string | undefined => {
    if (nodeIds.has(prefixOf(key))) return undefined;
    const n = LABEL.map((pattern) => pattern.exec(key)?.[1]).find((m) => m !== undefined);
    return n !== undefined && edges.has(n) ? n : undefined;
  };
  const byKey = new Map(placed.map((p) => [p.key, p]));
  const outline = (id: string) => (byKey.get(id)?.outline === 'ellipse' ? { outline: 'ellipse' as const } : {});
  const owned = (key: string) => {
    const owner = ownerOf(key);
    return owner === undefined || owner === key ? {} : { owner };
  };
  const nodes: LineNode[] = [
    ...anchors.nodes.filter((n) => nodeIds.has(n.id)).map((n) => ({ id: n.id, rect: n.rect, ...outline(n.id) })),
    ...placed
      .filter((p) => p.kind === 'box' && !frameIds.has(p.key) && !nodeIds.has(p.key))
      .map((p) => ({ id: p.key, rect: p.rect, ...outline(p.key), ...owned(p.key) })),
  ];
  const heads = new Map(
    placed
      .filter((p) => p.kind === 'text' && p.key.endsWith('.name') && frameIds.has(p.key.slice(0, -'.name'.length)))
      .map((p) => [p.key, p]),
  );
  const frames: LineFrame[] = [
    ...placed.filter(isFrame).map((p) => ({ id: p.key, rect: p.rect })),
    ...anchors.groups.filter((g) => !byKey.has(g.id)).map((g) => ({ id: g.id, rect: g.rect })),
  ].map((f) => {
    const head = heads.get(`${f.id}.name`)?.rect;
    return head === undefined ? f : { ...f, head };
  });
  const labels: LineLabel[] = [];
  const texts: LineText[] = [];
  for (const p of placed.filter((x) => x.kind === 'text' && !heads.has(x.key))) {
    const edge = lineOfLabel(p.key);
    if (edge !== undefined) labels.push({ key: p.key, edge, box: p.rect });
    else texts.push({ key: p.key, rect: p.rect, ...owned(p.key) });
  }
  const routes: LineRoute[] = anchors.edges.map((e) => ({
    edge: String(e.index),
    from: e.from,
    to: e.to,
    points: e.points,
  }));
  return { nodes, routes: bundles(routes), labels, texts, frames, width: anchors.width, height: anchors.height };
}

/** Lines that leave one box at one point share a bundle, and so do lines that enter one box at one point. */
function bundles(routes: readonly LineRoute[]): LineRoute[] {
  const keys = routes.map((r) => {
    const [start, end] = [r.points[0], r.points.at(-1)];
    const at = (p: readonly number[] | undefined) => (p === undefined ? '' : p.map((v) => v.toFixed(1)).join(','));
    return [`out ${r.from} ${at(start)}`, `in ${r.to} ${at(end)}`];
  });
  const counts = new Map<string, number>();
  for (const k of keys.flat()) counts.set(k, (counts.get(k) ?? 0) + 1);
  return routes.map((r, i) => {
    const shared = (keys[i] ?? []).filter((k) => (counts.get(k) ?? 0) > 1);
    return shared.length === 0 ? r : { ...r, bundles: shared };
  });
}
