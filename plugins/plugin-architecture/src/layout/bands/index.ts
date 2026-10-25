import { type Rect, textWidth } from '@diagrist/core';
import type { EdgeLabel, GridLayout, Route } from '@diagrist/layout-grid';
import { fit } from '@diagrist/parts';
import type { Look } from '../../looks/look.js';
import type { ArchitectureModel, Layer } from '../../model/types.js';
import type { BandWords } from '../../texts/bands.js';
import type { Texts } from '../../texts/index.js';
import type { Segment } from '../art.js';
import { type Band, bandsOf, withoutBandFrames } from './detect.js';
import { dotted, headOf } from './heads.js';

/** The heads of column bands: their top, height, the gap below them, the room for texts and the gap between heads. */
const BAND = { top: 88, h: 56, gap: 32, pad: 16, inset: 4, title: 24, subtitle: 43 } as const;
/** Row bands at the left: their left edge, least width and gap to the grid; heads reach this far beyond the content. */
const ROW = { x: 32, min: 128, gap: 40 } as const;
const OUTSET = 16;

/** What the bands of a picture change before the grid places it: the model without band frames, where it starts. */
export interface BandFrame {
  readonly model: ArchitectureModel;
  readonly bands: readonly Band[];
  /** The layers set as row bands at the left (`layers: bands`). */
  readonly rows: readonly Layer[];
  readonly firstRowY: number;
  readonly indent: number;
}

/** A text of the band sheet, with its paint role and the font role it was measured in. */
export interface BandText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly role: 'bandTitle' | 'bandSubtitle';
  readonly font: 'heading' | 'large';
}

/** What the band sheet draws under the picture: grey heads of columns and rows, their texts, dotted separators. */
export interface BandSheet {
  readonly heads: readonly Rect[];
  readonly texts: readonly BandText[];
  readonly separators: readonly Segment[];
}

const rowWidth = (rows: readonly Layer[], look: Look): number =>
  Math.max(ROW.min, ...rows.map((l) => textWidth(l.label, look.fonts.heading) + 2 * BAND.pad));

/**
 * The bands of a model as its look draws them: column bands with `groups.form: band`, whose frames leave the grid
 * and whose heads move the first row down, and layers as row bands with `layers: bands`, which move the grid right.
 */
export function bandFrameOf(model: ArchitectureModel, look: Look): BandFrame {
  const m = look.metrics;
  const bands = look.options.groups.form === 'band' ? bandsOf(model) : [];
  const rows = look.options.layers === 'bands' ? model.layers : [];
  const grid = withoutBandFrames(model, bands);
  const framed = grid.groups.length > 0 ? m.groupPadTop : 0;
  return {
    model: grid,
    bands,
    rows,
    firstRowY: bands.length > 0 ? BAND.top + BAND.h + BAND.gap + framed : m.firstRowY,
    indent: rows.length > 0 ? ROW.x + rowWidth(rows, look) + ROW.gap - m.marginX : 0,
  };
}

/** What the grid placed, routed and labelled, which the heads span and the separators break for. */
export interface Placement {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  /** Flow numbers and marks as rectangles. */
  readonly signs: readonly Rect[];
}

const union = (boxes: readonly Rect[]): Rect => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

/** Heads over the column bands, from the content's left to its right, split in the middle of the gaps between. */
function columnHeads(frame: BandFrame, p: Placement, content: Rect, texts: Texts, words: BandWords, look: Look) {
  const col = (name: string | undefined) => p.grid.cols.find((c) => c.name === name);
  const left = Math.min(content.x, ...p.grid.cols.map((c) => c.x)) - OUTSET;
  const right = Math.max(content.x + content.w, ...p.grid.cols.map((c) => c.x + c.w)) + OUTSET;
  const gaps = frame.bands.slice(1).flatMap((b, i) => {
    const last = col(frame.bands[i]?.cols.at(-1));
    const first = col(b.cols[0]);
    return last && first ? [(last.x + last.w + first.x) / 2] : [];
  });
  const bounds = [left, ...gaps, right];
  const heads: Rect[] = [];
  const out: BandText[] = [];
  frame.bands.forEach((band, i) => {
    const x = (bounds[i] as number) + (i === 0 ? 0 : BAND.inset);
    const w = (bounds[i + 1] as number) - (i === frame.bands.length - 1 ? 0 : BAND.inset) - x;
    const [title, subtitle] = headOf(band, texts, words);
    const room = w - 2 * BAND.pad;
    heads.push({ x, y: BAND.top, w, h: BAND.h });
    const at = { x: x + BAND.pad };
    out.push({
      ...at,
      y: BAND.top + BAND.title,
      text: fit(title, room, look.fonts.heading),
      role: 'bandTitle',
      font: 'heading',
    });
    if (subtitle)
      out.push({
        ...at,
        y: BAND.top + BAND.subtitle,
        text: fit(subtitle, room, look.fonts.large),
        role: 'bandSubtitle',
        font: 'large',
      });
  });
  const obstacles = [
    ...p.grid.nodes.map((n) => n.rect),
    ...p.grid.groups.map((g) => g.rect),
    ...p.labels.map((l) => l.box),
    ...p.signs,
  ];
  const top = BAND.top + BAND.h + BAND.gap / 2;
  const separators = gaps.flatMap((x) => dotted(x, top, content.y + content.h + OUTSET, obstacles));
  return { heads, texts: out, separators };
}

/** Row bands at the left for the layers, each as high as its row and half the gaps around it. */
function rowHeads(frame: BandFrame, p: Placement, look: Look) {
  const w = rowWidth(frame.rows, look);
  const heads: Rect[] = [];
  const texts: BandText[] = [];
  for (const layer of frame.rows) {
    const i = p.grid.rows.findIndex((r) => r.name === layer.row);
    const row = p.grid.rows[i];
    if (!row) continue;
    const above = p.grid.rows[i - 1];
    const below = p.grid.rows[i + 1];
    const top = above ? (above.y + above.h + row.y) / 2 + BAND.inset : row.y - OUTSET;
    const bottom = below ? (row.y + row.h + below.y) / 2 - BAND.inset : row.y + row.h + OUTSET;
    heads.push({ x: ROW.x, y: top, w, h: bottom - top });
    const y = (top + bottom) / 2 + look.fonts.heading.size * 0.35;
    texts.push({ x: ROW.x + BAND.pad, y, text: layer.label, role: 'bandTitle', font: 'heading' });
  }
  return { heads, texts };
}

/** The band sheet of a placed picture: column heads with separators between them, and row heads at the left. */
export function bandSheetOf(frame: BandFrame, p: Placement, texts: Texts, words: BandWords, look: Look): BandSheet {
  const lines = p.routes.flatMap((r) => r.points.map(([x, y]) => ({ x, y, w: 0, h: 0 })));
  const solid = [...p.grid.nodes.map((n) => n.rect), ...p.grid.groups.map((g) => g.rect)];
  const content = union([...solid, ...lines, ...p.labels.map((l) => l.box), ...p.signs]);
  const cols = frame.bands.length > 0 ? columnHeads(frame, p, content, texts, words, look) : undefined;
  const rows = rowHeads(frame, p, look);
  return {
    heads: [...(cols?.heads ?? []), ...rows.heads],
    texts: [...(cols?.texts ?? []), ...rows.texts],
    separators: cols?.separators ?? [],
  };
}
