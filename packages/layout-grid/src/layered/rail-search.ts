import type { Arrangement } from './arrange.js';
import { arrangeRails, clashes, type RailSide } from './rail-order.js';
import { rank } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The most rails standing inside the first order whose sides are searched; beyond, the first pins stay. */
const SEARCHED = 4;

/** What tells two arrangements apart for the picture: their layers in order and the sides of their rails. */
const keyOf = (a: Arrangement) => JSON.stringify([a.layers, [...(a.rails ?? [])]]);

/**
 * The other arrangements of a picture whose first order left rails inside (`Arrangement.failed`): each such rail
 * pinned to the left, to the right or to neither, every choice that clashes with the pins before (`clashes`) left
 * out, each settled by `arrangeRails` from those pins, and those giving the same layers and sides as one before or as
 * `first` once. The pins `arrangeRails` takes first follow which end stands nearer which side, which can leave a line
 * crossing where another side would not; only the drawing tells.
 */
export function railChoices(spec: LayeredSpec, first: Arrangement): Arrangement[] {
  const failed = first.failed ?? [];
  if (failed.length === 0 || failed.length > SEARCHED) return [];
  const fixed = spec.layers && new Map(spec.layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  const ranked = rank(spec, fixed);
  const seen = new Set([keyOf(first)]);
  const out: Arrangement[] = [];
  const pinned = (i: number, pins: ReadonlyMap<string, RailSide>) => {
    const e = failed[i];
    if (e !== undefined) {
      for (const side of ['left', 'right'] as const)
        if (!clashes(e, side, pins, ranked)) pinned(i + 1, new Map([...pins, [e.from, side], [e.to, side]]));
      pinned(i + 1, pins);
      return;
    }
    const arranged = arrangeRails(spec, fixed, { pins, chained: new Set() });
    const key = keyOf(arranged);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(arranged);
  };
  pinned(0, new Map());
  return out;
}
