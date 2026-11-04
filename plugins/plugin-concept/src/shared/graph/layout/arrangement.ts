import type { Area } from '@diagrist/core';
import type { Graph } from '../model.js';
import { edgesOf } from './edges.js';

/** How the items of a graph picture stand: a column per type, layers along the relations, or a hub. */
export type Arrangement = 'columns' | 'layers' | 'hub';

/** The area the others extend: the one marked `core`, else the only area without a tone beside toned ones. */
export function coreArea(m: Graph): Area | undefined {
  const list = m.areas?.list ?? [];
  const marked = list.find((a) => a.core === true);
  if (marked) return marked;
  const plain = list.filter((a) => a.tone === undefined);
  return plain.length === 1 && list.length > 1 ? plain[0] : undefined;
}

/** Share of the relations between items of different types at and above which a picture tells a story in columns. */
const STORY = 0.8;

/**
 * The arrangement of a picture (plan 5.1): as `arrange=` says, a hub only when there is a core; else columns for a
 * story across types, where at least 80 % of the relations join items of different types; else a hub when a core
 * is extended by at least two other areas; else layers.
 */
export function arrangementOf(m: Graph): Arrangement {
  const core = coreArea(m);
  if (m.arrange !== undefined) return m.arrange === 'hub' && core === undefined ? 'layers' : m.arrange;
  const typeOf = new Map(m.items.map((i) => [i.id, i.type]));
  const relations = edgesOf(m).map(([r]) => r);
  const types = new Set(m.items.map((i) => i.type));
  const across = relations.filter((r) => typeOf.get(r.from) !== typeOf.get(r.to)).length;
  const story = relations.length === 0 || across / relations.length >= STORY;
  if (types.size > 1 && story) return 'columns';
  if (core === undefined) return 'layers';
  const areaOf = new Map(m.items.map((i) => [i.id, i.area]));
  const extending = new Set(
    relations.flatMap((r) => {
      const [a, b] = [areaOf.get(r.from), areaOf.get(r.to)];
      return a === core.id && b !== core.id ? [b] : b === core.id && a !== core.id ? [a] : [];
    }),
  );
  return extending.size >= 2 ? 'hub' : 'layers';
}
