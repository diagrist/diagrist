import type { Locale } from '@diagrist/lang';
import type { EdgeText, GridEdge, Side } from '@diagrist/layout-grid';
import type { Graph } from '../model.js';
import { type ColumnVerb, edgeId, edgesOf } from './edges.js';

/** The lines of a picture in columns, their texts, the verbs of the head row, and whether a labelled line forks. */
export interface ColumnEdges {
  readonly edges: readonly GridEdge[];
  readonly texts: readonly EdgeText[];
  readonly verbs: readonly ColumnVerb[];
  readonly forks: boolean;
}

interface Line {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly link: string;
  readonly text?: string;
  /** What its link says in the direction it is drawn; `text` too unless the relation has a text of its own. */
  readonly says?: string;
  readonly own: boolean;
  readonly source: GridEdge['source'];
}

/**
 * The lines between the columns. Told as a story, a line whose link points against the reading and says what it
 * means backwards (`back=`) runs from left to right with that text. Lines from one item to several of another column,
 * or from several to one, share a trunk that carries their text once. Where every line between two neighbouring
 * columns are of one link, the head row says it once between the heads, and only a line with a text of its own says
 * something.
 */
export function columnEdges(m: Graph, locale: Locale, column: (id: string) => number, story: boolean): ColumnEdges {
  const lines = edgesOf(m).flatMap(([r, i]): Line[] => {
    const link = m.links.get(r.link);
    if (link === undefined) return [];
    const flip = story && link.back !== undefined && column(r.to) < column(r.from);
    const says = flip ? link.back?.[locale] : link.bare ? undefined : link.label[locale];
    const text = r.label ?? says;
    const [from, to] = flip ? [r.to, r.from] : [r.from, r.to];
    const words = { ...(text === undefined ? {} : { text }), ...(says === undefined ? {} : { says }) };
    return [{ id: edgeId(i), from, to, link: r.link, ...words, own: r.label !== undefined, source: r.span }];
  });
  const count = (pick: (l: Line) => string) => (l: Line) => lines.filter((o) => pick(o) === pick(l)).length;
  const out = count((l) => `${l.from}>${column(l.to)}`);
  const into = count((l) => `${l.to}<${column(l.from)}`);
  const bundleOf = (l: Line) =>
    out(l) > 1 ? `${l.from}>${column(l.to)}` : into(l) > 1 ? `${l.to}<${column(l.from)}` : undefined;
  const gaps = new Map<number, Line[]>();
  for (const l of lines) {
    const a = column(l.from);
    if (column(l.to) === a + 1) gaps.set(a, [...(gaps.get(a) ?? []), l]);
  }
  const against = new Set(lines.filter((l) => column(l.to) === column(l.from) - 1).map((l) => column(l.to)));
  const verbs = story
    ? [...gaps]
        .filter(([a, all]) => !against.has(a) && all.every((l) => l.says !== undefined && l.link === all[0]?.link))
        .sort(([a], [b]) => a - b)
        .map(([a, all]) => ({
          left: `k${a + 1}`,
          right: `k${a + 2}`,
          text: all[0]?.says ?? '',
          link: all[0]?.link ?? '',
        }))
    : [];
  const spoken = new Set(
    verbs.flatMap((v) => gaps.get(Number(v.left.slice(1)) - 1) ?? []).flatMap((l) => (l.own ? [] : [l.id])),
  );
  const edges = lines.map((l): GridEdge => {
    const ahead = column(l.to) >= column(l.from);
    const pair: readonly [Side, Side] = ahead ? ['right', 'left'] : ['left', 'right'];
    const bundle = bundleOf(l);
    return {
      id: l.id,
      from: l.from,
      to: l.to,
      sides: Array.from({ length: 6 }, () => pair),
      ...(bundle === undefined ? {} : { bundle }),
      ...(l.source === undefined ? {} : { source: l.source }),
    };
  });
  const trunks = new Set<string>();
  const texts = lines.flatMap((l): EdgeText[] => {
    if (l.text === undefined || spoken.has(l.id)) return [];
    const bundle = bundleOf(l);
    const key = `${bundle ?? l.id}:${l.text}`;
    if (trunks.has(key)) return [];
    trunks.add(key);
    return [{ edge: l.id, name: l.text }];
  });
  return {
    edges,
    texts,
    verbs,
    forks: texts.some((t) => lines.some((l) => l.id === t.edge && bundleOf(l) !== undefined)),
  };
}
