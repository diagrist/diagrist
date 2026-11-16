import { type Rect, type Shape, textWidth } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { CHIP_PAD, detailOf, viaFont, viaRole } from '../../layout/via.js';
import type { Look } from '../../looks/look.js';
import type { ArchEdge } from '../../model/types.js';

/** A line of an edge's texts cut in two: what stays the sentence, and the protocol drawn apart from it. */
export interface ViaCut {
  /** The sentence part of the line, at its own place; absent where the whole line is protocol. */
  readonly name?: EdgeLabel;
  readonly via: readonly Shape[];
}

/** How far a chip starts right of the sentence before it, where both share a line. */
const CHIP_GAP = 6;
/** Corner radius of a chip: rounded, yet not so round that its ends crowd the text. */
const CHIP_RX = 3.5;
/** Height of a chip above and below the baseline of its text. */
const CHIP_RISE = { up: 8.5, down: 2 } as const;

/** Words of a text that count: the joining dots a wrap may drop do not. */
const words = (s: string): number => s.split(' ').filter((w) => w !== '·' && w !== '').length;

/**
 * How many words at the start of each name line are sentence, the rest protocol: the protocol's words are the last
 * ones of the edge's name lines where no line of its own holds it, with a joining dot before them.
 */
function sentenceWords(lines: readonly EdgeLabel[], detail: string): Map<EdgeLabel, number> {
  const out = new Map<EdgeLabel, number>();
  let left = detail && !lines.some((l) => l.part === 'detail') ? words(detail) : 0;
  for (const l of [...lines].reverse().filter((x) => x.part === 'name')) {
    const all = l.text.split(' ');
    let k = all.length;
    while (k > 0 && left > 0) {
      k -= 1;
      if (all[k] !== '·' && all[k] !== '') left -= 1;
    }
    if (left === 0 && all[k - 1] === '·') k -= 1;
    out.set(l, k);
  }
  return out;
}

/** The thin frame of a chip around a text that starts at `x` and is `w` wide with its pad, on the baseline `y`. */
function chip(x: number, y: number, w: number): Shape {
  const h = CHIP_RISE.up + CHIP_RISE.down;
  const r: Rect = { x, y: y - CHIP_RISE.up, w, h };
  return { kind: 'rect', ...r, rx: CHIP_RX, role: 'viaChip' };
}

/** The role of a protocol text in the form of the look, in the accent of its flow where the form keeps colour. */
function textRole(look: Look, accent: boolean): string {
  const form = look.options.via;
  if (form === 'muted') return 'edgeViaMuted';
  if (form === 'inline') return 'edgeViaInline';
  if (form === 'chip') return accent ? 'edgeViaChipAccent' : 'edgeViaChip';
  return accent ? 'edgeViaAccent' : 'edgeVia';
}

/**
 * The protocol of a line drawn apart from its sentence: a line of its own at its place, a chip filling its box; the
 * tail of a line it shares with the sentence after the sentence, a chip a little right of it.
 */
function cut(l: EdgeLabel, keep: number, look: Look, accent: boolean): ViaCut {
  const all = l.text.split(' ');
  const font = viaFont(look);
  const text = (x: number, s: string, anchor: EdgeLabel['anchor']): Shape => ({
    kind: 'text',
    x,
    y: l.y,
    text: s,
    role: textRole(look, accent),
    font: viaRole(look),
    anchor,
  });
  const isChip = look.options.via === 'chip';
  if (keep === 0 && l.part === 'detail' && isChip)
    return { via: [chip(l.box.x, l.y, l.box.w), text(l.box.x + l.box.w / 2, l.text, 'middle')] };
  const sentence = all.slice(0, keep).join(' ').trimEnd();
  const tail = all.slice(keep).join(' ');
  if (keep === 0 && !isChip) return { via: [text(l.x, tail, l.anchor)] };
  const w = textWidth(tail, font) + 2 * CHIP_PAD;
  const end = l.box.x + l.box.w;
  if (keep === 0) {
    const x = l.anchor === 'start' ? l.box.x : l.anchor === 'end' ? end - w : l.box.x + (l.box.w - w) / 2;
    return { via: [chip(x, l.y, w), text(x + w / 2, tail, 'middle')] };
  }
  const name: EdgeLabel = { ...l, text: sentence, x: l.box.x, anchor: 'start' };
  const after = l.box.x + textWidth(sentence, look.fonts.label);
  if (!isChip) return { name, via: [text(after + textWidth(' ', look.fonts.label), tail, 'start')] };
  const x = Math.min(after + CHIP_GAP, end - w);
  return { name, via: [chip(x, l.y, w), text(x + w / 2, tail, 'middle')] };
}

/**
 * The texts of one route with its protocol set apart in the form of `protocols=`: each line with protocol words cut
 * into its sentence, drawn as the ground of the look draws names, and the protocol in its own role, in a chip where
 * the form asks for one. Lines without protocol stay as they are.
 */
export function viaCuts(own: readonly EdgeLabel[], edge: ArchEdge | undefined, look: Look, accent: boolean): ViaCut[] {
  if (!edge) return own.map((l) => ({ name: l, via: [] }));
  const keeps = sentenceWords(own, detailOf(edge, look.options.via));
  return own.map((l) => {
    const keep = l.part === 'detail' ? 0 : (keeps.get(l) ?? l.text.split(' ').length);
    return keep >= l.text.split(' ').length ? { name: l, via: [] } : cut(l, keep, look, accent);
  });
}
