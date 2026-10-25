import { type Rect, STANDARD_FONTS } from '@diagrist/core';
import { wrap as greedy } from '@diagrist/parts';
import { ACT, SIZE, widthOf } from './metrics.js';
import type { Placement } from './place.js';
import type { ActivityText, RegionArt } from './regions.js';
import type { Routed } from './route.js';

/** Gap of the name to the frame and to lines crossing the band. */
const INSET = 8;
const CLEAR = 4;
/** At most so many lines for a wrapped name. */
const MAX_LINES = 3;

interface Stretch {
  readonly lo: number;
  readonly hi: number;
}

/** What lies in the band: nodes (with pins at the side) and pieces of edges, as horizontal stretches. */
function blockers(band: Rect, routes: readonly Routed[], pl: Placement, pin: number): Stretch[] {
  const [top, bottom] = [band.y, band.y + band.h];
  const out: Stretch[] = [];
  for (const p of pl.nodes.values()) {
    const r = p.rect;
    if (r.y < bottom && top < r.y + r.h) out.push({ lo: r.x - pin, hi: r.x + r.w + pin });
  }
  for (const r of routes)
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [a, b] = [r.points[k], r.points[k + 1]];
      if (!a || !b || Math.max(a[1], b[1]) < top || Math.min(a[1], b[1]) > bottom) continue;
      out.push({ lo: Math.min(a[0], b[0]) - INSET, hi: Math.max(a[0], b[0]) + INSET });
    }
  return out.sort((a, b) => a.lo - b.lo);
}

/** Left edge for a text of width `w` in the band, right past everything there; undefined if it does not fit. */
function fit(band: Rect, w: number, blocked: readonly Stretch[]): number | undefined {
  let x = band.x + INSET;
  for (const b of blocked) if (b.lo < x + w && x < b.hi) x = b.hi;
  return x + w > band.x + band.w - INSET ? undefined : x;
}

/** A text in a band; `corner` demands the left edge. A candidate sets several of them. */
type Piece = readonly [text: string, band: Rect, corner?: boolean];

const shift = (r: Rect, k: number): Rect => ({ ...r, y: r.y + k * r.h });

/** Widest free gap in the band, less the margin. */
function widest(band: Rect, blocked: readonly Stretch[]): number {
  let [x, best] = [band.x + INSET, 0];
  for (const b of blocked) {
    if (b.lo > x) best = Math.max(best, b.lo - x);
    x = Math.max(x, b.hi);
  }
  return Math.max(best, band.x + band.w - INSET - x);
}

/** The name wrapped into as few lines of about equal length as can be, each at most `max` wide. */
function wrap(text: string, max: number): string[] | undefined {
  const longest = Math.max(...text.split(' ').map(widthOf.label));
  for (let n = 2; n <= MAX_LINES; n++) {
    const target = Math.min(max, Math.max(longest, widthOf.label(text) / n));
    for (const slack of [1, 1.15, 1.3]) {
      const lines = greedy(text, Math.min(max, target * slack), STANDARD_FONTS.label);
      if (lines.length <= n && lines.every((l) => widthOf.label(l) <= max))
        return lines.length >= 2 ? lines : undefined;
    }
  }
  return undefined;
}

/**
 * Places for keyword and name, in this order: both together at the top left; the keyword at the top left and the
 * name apart beside it; both further right; one line lower or at the bottom of the frame; then the name wrapped on
 * several lines at the top or the bottom. Without a name only the keyword is left.
 */
function candidates(region: RegionArt, top: Rect, low: Rect, lines: (band: Rect) => string[] | undefined): Piece[][] {
  const kw = region.keyword;
  const label = region.label;
  const first: Piece[] = kw ? [[kw, top]] : [];
  if (!label) return kw ? [first] : [];
  const start = kw ? shift(top, 1) : top;
  const both = kw ? `${kw} ${label}` : label;
  const out: Piece[][] = [
    [[both, top, kw !== undefined]],
    ...(kw ? [[...first, [label, top] as Piece], [[both, top] as Piece]] : []),
    [...first, [label, start]],
    [...first, [label, low]],
  ];
  const down = lines(start);
  if (down) out.push([...first, ...down.map((l, k): Piece => [l, shift(start, k)])]);
  const up = lines(low);
  if (up) out.push([...first, ...up.map((l, k): Piece => [l, shift(low, k - up.length + 1)])]);
  return kw ? [...out, first] : out;
}

/**
 * The name of a region small at the top left of its frame, in the band above its members; where an edge crosses,
 * right beside it. Where it does not fit, one line lower, at the bottom of the frame or wrapped on up to three lines;
 * where it fits nowhere, only in the description. An expansion region carries its keyword at the top, below the
 * input on the frame, and the name after it or in one of the other places.
 */
export function nameRegions(regions: readonly RegionArt[], routes: readonly Routed[], pl: Placement): RegionArt[] {
  return regions.map((region) => {
    const r = region.rect;
    const edge = region.keyword ? ACT.expansionSlot / 2 : 0;
    const h = SIZE.label + 3;
    const top: Rect = { x: r.x, y: r.y + edge + CLEAR, w: r.w, h };
    const low: Rect = { x: r.x, y: r.y + r.h - edge - CLEAR - h, w: r.w, h };
    const pin = region.keyword ? 0 : ACT.pin;
    const known = new Map<number, Stretch[]>();
    const lane = (band: Rect) => {
      const found = known.get(band.y) ?? blockers(band, routes, pl, pin);
      known.set(band.y, found);
      return found;
    };
    const lines = (band: Rect) => (region.label ? wrap(region.label, widest(band, lane(band))) : undefined);
    for (const option of candidates(region, top, low, lines)) {
      const placed: ActivityText[] = [];
      const taken = new Map<number, Stretch[]>();
      for (const [text, band, corner] of option) {
        if (band.y < top.y || band.y + band.h > low.y + low.h) break;
        const own = taken.get(band.y) ?? [];
        const x = fit(
          band,
          widthOf.label(text),
          [...lane(band), ...own].sort((a, b) => a.lo - b.lo),
        );
        if (x === undefined || (corner && x > band.x + INSET)) break;
        placed.push({ text, x, y: band.y + SIZE.label, anchor: 'start' });
        taken.set(band.y, [...own, { lo: x - INSET, hi: x + widthOf.label(text) + INSET }]);
      }
      const [name, ...more] = placed;
      if (name && placed.length === option.length) return { ...region, name, ...(more.length ? { more } : {}) };
    }
    return region;
  });
}
