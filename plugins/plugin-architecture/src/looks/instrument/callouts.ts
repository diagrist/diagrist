import type { Font, Point, Rect } from '@diagrist/core';
import { segmentHitsRect } from '../../layout/geometry.js';
import { type Tag, type TagLine, type TagTone, tagAt } from './tags.js';

/** A tag outside a box, joined to it by a leader that ends on the box's border. */
export interface Callout {
  readonly node: string;
  readonly tag: Tag;
  readonly leader: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
}

/** What a callout must keep clear of: the lines of edges and frames, and every rectangle drawn so far. */
export interface Obstacles {
  readonly lines: readonly (readonly Point[])[];
  readonly rects: readonly Rect[];
}

/** Lengths of the leader tried in turn, the inset of the leader from a corner, and the room kept from obstacles. */
const LEADS = [16, 32] as const;
const INSET = 18;
const ROOM = 4;

const meets = (a: Rect, b: Rect, pad: number): boolean =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

/** A callout above or below `r`, its leader `lead` long at `inset` from the right or left corner. */
function candidate(
  node: string,
  r: Rect,
  text: string,
  font: { readonly font: Font; readonly role: TagLine['font'] },
  tone: TagTone,
  spot: { readonly above: boolean; readonly right: boolean; readonly lead: number },
): Callout {
  const probe = tagAt(text, { x: 0, y: 0 }, font.font, font.role, tone);
  const { w, h } = probe.rect;
  const x = spot.right ? r.x + r.w - INSET : r.x + INSET;
  const border = spot.above ? r.y : r.y + r.h;
  const end = spot.above ? border - spot.lead : border + spot.lead;
  const left = spot.right ? x + INSET / 2 - w : x - INSET / 2;
  const top = spot.above ? end - h : end;
  const tag = tagAt(text, { x: left, y: top - probe.rect.y }, font.font, font.role, tone);
  return { node, tag, leader: { x1: x, y1: end, x2: x, y2: border } };
}

/** Does the callout keep clear of every obstacle, the leader's own end on its box aside? */
function clear(c: Callout, own: Rect, o: Obstacles): boolean {
  const { x1, y1, y2 } = c.leader;
  const stem = { x: x1 - 1, y: Math.min(y1, y2), w: 2, h: Math.abs(y2 - y1) - 1 };
  const body = (r: Rect) => r !== own && (meets(c.tag.rect, r, ROOM) || meets(stem, r, 1));
  const lines = o.lines.some((p) =>
    p
      .slice(1)
      .some((q, i) => segmentHitsRect(p[i] as Point, q, c.tag.rect, ROOM) || segmentHitsRect(p[i] as Point, q, stem)),
  );
  return !lines && !o.rects.some(body) && !meets(c.tag.rect, own, ROOM);
}

/**
 * Seats a callout at its box: above at the right corner first, then above left, below right, below left, with a
 * short leader before a longer one; where every spot meets something it stays above at the right.
 */
export function seatCallout(
  node: string,
  r: Rect,
  text: string,
  font: { readonly font: Font; readonly role: TagLine['font'] },
  tone: TagTone,
  obstacles: Obstacles,
): Callout {
  const spots = LEADS.flatMap((lead) =>
    [
      { above: true, right: true },
      { above: true, right: false },
      { above: false, right: true },
      { above: false, right: false },
    ].map((s) => ({ ...s, lead })),
  );
  const all = spots.map((s) => candidate(node, r, text, font, tone, s));
  return all.find((c) => clear(c, r, obstacles)) ?? (all[0] as Callout);
}
