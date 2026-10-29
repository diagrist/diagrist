import type { Placed, Rect } from '@diagrist/core';
import { textWidth } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';
import type { LinkDecl } from '../../declarations.js';
import type { ColumnHead, ColumnVerb } from './edges.js';
import { GRAPH_FONTS as F } from './metrics.js';

/** A head above a column: its text centred at `x` on the baseline `y`, and the rule below it from `x1` to `x2`. */
export interface PlacedHead {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly rule: { readonly x1: number; readonly x2: number; readonly y: number };
  readonly rect: Rect;
}

/** A verb of the head row: its text centred between two heads, and an arrow in the look of its link below it. */
export interface PlacedVerb extends PlacedHead {
  readonly link: LinkDecl;
}

/** Baselines and rule of the head row above the first row of items. */
const ROW = { text: 18, rule: 10, top: 29, h: 14, inset: 10 } as const;

/**
 * The head row of a picture in columns: each head centred on its column with a rule as wide as the column, and
 * between two heads the verb all their lines share, on an arrow that joins the two rules.
 */
export function placeHeads(
  fitted: GridLayout,
  heads: readonly ColumnHead[],
  verbs: readonly ColumnVerb[],
  links: ReadonlyMap<string, LinkDecl>,
): { readonly heads: PlacedHead[]; readonly verbs: PlacedVerb[]; readonly placed: Placed[] } {
  const top = fitted.rows[0]?.y ?? 0;
  const at = (text: string, x: number, x1: number, x2: number, font: typeof F.group | typeof F.label) => {
    const w = textWidth(text, font);
    return {
      text,
      x,
      y: top - ROW.text,
      rule: { x1, x2, y: top - ROW.rule },
      rect: { x: x - w / 2, y: top - ROW.top, w, h: ROW.h },
    };
  };
  const col = (name: string) => fitted.cols.find((c) => c.name === name);
  const placedHeads = heads.flatMap((h): PlacedHead[] => {
    const c = col(h.col);
    return c ? [at(h.text, c.x + c.w / 2, c.x, c.x + c.w, F.group)] : [];
  });
  const placedVerbs = verbs.flatMap((v): PlacedVerb[] => {
    const [a, b, link] = [col(v.left), col(v.right), links.get(v.link)];
    if (!a || !b || !link) return [];
    const x1 = a.x + a.w + ROW.inset;
    const x2 = b.x - ROW.inset;
    return [{ ...at(v.text, (x1 + x2) / 2, x1, x2, F.label), link }];
  });
  return {
    heads: placedHeads,
    verbs: placedVerbs,
    placed: [...placedHeads, ...placedVerbs].map((h, i): Placed => ({ key: `head-${i}`, kind: 'text', rect: h.rect })),
  };
}
