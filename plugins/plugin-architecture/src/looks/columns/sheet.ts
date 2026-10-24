import type { Rect } from '@diagrist/core';
import type { Column, Row } from '@diagrist/layout-grid';
import type { Segment } from '../../layout/art.js';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchitectureModel, Layer } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import type { Band } from './bands.js';
import type { Focus } from './focus.js';
import { footerOf } from './footer.js';
import { BAND, rowBandWidth } from './metrics.js';
import { PANEL_WIDTH, type PanelSign, panelOf } from './panel.js';
import { fit, type SheetText } from './text.js';
import type { ColumnsWords } from './words.js';

/** What `look=columns` draws around the picture: head bands, dotted separators, the side column and the footer. */
export interface ColumnsSheet {
  readonly bands: readonly Rect[];
  readonly separators: readonly Segment[];
  readonly texts: readonly SheetText[];
  readonly signs: readonly PanelSign[];
  readonly width: number;
  readonly height: number;
}

/** Where the picture's content lies and what the sheet names. */
export interface ColumnsSheetInput {
  readonly model: ArchitectureModel;
  readonly bands: readonly Band[];
  readonly layers: readonly Layer[];
  readonly cols: readonly Column[];
  readonly rows: readonly Row[];
  readonly content: Rect;
  /** What the separators break for: labels, flow numbers, boxes and frames. */
  readonly obstacles: readonly Rect[];
  readonly focus: Focus;
  readonly texts: Texts;
  readonly words: ColumnsWords;
  readonly open: (who: string) => string;
}

const OUTSET = 16;
const BREAK = 6;
const SIDE_GAP = 40;
const MARGIN = 24;

function headOf(band: Band, input: ColumnsSheetInput): [string, string] {
  const { words, texts } = input;
  const kinds = new Set(band.nodes.map((n) => n.keyword));
  const [keyword] = kinds;
  switch (band.kind) {
    case 'group':
      return [band.group?.title ?? '', band.group?.team ?? (band.group?.role ? texts.roles[band.group.role] : '')];
    case 'people':
      return [words.people.title, words.people.subtitle];
    case 'focus':
      return [band.nodes.find((n) => n.emph)?.label ?? '', words.focus];
    case 'neighbours':
      return [words.neighbours, words.count(band.nodes.length, kinds.size === 1 ? keyword : undefined)];
  }
}

/** The pieces of a vertical line at `x` from `top` to `bottom` that no obstacle crosses. */
function dotted(x: number, top: number, bottom: number, obstacles: readonly Rect[]): Segment[] {
  const cuts = obstacles
    .filter((o) => o.x - BREAK <= x && o.x + o.w + BREAK >= x && o.y + o.h >= top && o.y <= bottom)
    .map((o) => [o.y - BREAK, o.y + o.h + BREAK] as const)
    .sort((a, b) => a[0] - b[0]);
  const out: Segment[] = [];
  let y = top;
  for (const [from, to] of cuts) {
    if (from > y) out.push({ x1: x, y1: y, x2: x, y2: from });
    y = Math.max(y, to);
  }
  if (y < bottom) out.push({ x1: x, y1: y, x2: x, y2: bottom });
  return out;
}

/** Column heads over the bands, separators in the gaps between them. */
function columnHeads(input: ColumnsSheetInput, m: Metrics) {
  const { content, cols } = input;
  const col = (name: string | undefined) => cols.find((c) => c.name === name);
  const left = Math.min(content.x, ...cols.map((c) => c.x)) - OUTSET;
  const right = Math.max(content.x + content.w, ...cols.map((c) => c.x + c.w)) + OUTSET;
  const gaps = input.bands.slice(1).map((b, i) => {
    const last = col(input.bands[i]?.cols.at(-1));
    const first = col(b.cols[0]);
    return last && first ? (last.x + last.w + first.x) / 2 : left;
  });
  const bands: Rect[] = [];
  const texts: SheetText[] = [];
  input.bands.forEach((band, i) => {
    const x = i === 0 ? left : (gaps[i - 1] ?? left) + BAND.inset;
    const w = (i === gaps.length ? right : (gaps[i] ?? right) - BAND.inset) - x;
    const [title, subtitle] = headOf(band, input);
    const room = w - 2 * BAND.pad;
    bands.push({ x, y: BAND.top, w, h: BAND.h });
    texts.push({
      x: x + BAND.pad,
      y: BAND.top + 26,
      text: fit(title, room, m.fonts.title),
      role: 'bandTitle',
      font: 'title',
    });
    texts.push({
      x: x + BAND.pad,
      y: BAND.top + 46,
      text: fit(subtitle, room, m.fonts.title),
      role: 'bandSubtitle',
      font: 'title',
    });
  });
  const top = BAND.top + BAND.h + BAND.gap / 2;
  const bottom = content.y + content.h + OUTSET;
  const separators = gaps.flatMap((x) => dotted(x, top, bottom, input.obstacles));
  return { bands, texts, separators, right };
}

/** Row bands at the left for the layers, each as high as its row and the half gaps around it. */
function rowHeads(input: ColumnsSheetInput, m: Metrics) {
  const w = rowBandWidth(input.layers.map((l) => l.label));
  const bands: Rect[] = [];
  const texts: SheetText[] = [];
  for (const layer of input.layers) {
    const i = input.rows.findIndex((r) => r.name === layer.row);
    const row = input.rows[i];
    if (!row) continue;
    const above = input.rows[i - 1];
    const below = input.rows[i + 1];
    const top = above ? (above.y + above.h + row.y) / 2 + BAND.inset : row.y - OUTSET;
    const bottom = below ? (row.y + row.h + below.y) / 2 - BAND.inset : row.y + row.h + OUTSET;
    bands.push({ x: BAND.top, y: top, w, h: bottom - top });
    const y = (top + bottom) / 2 + m.fontSize.title * 0.35;
    texts.push({ x: BAND.top + BAND.pad, y, text: layer.label, role: 'bandTitle', font: 'title' });
  }
  return { bands, texts };
}

/**
 * The sheet of `look=columns`: heads over the column bands with dotted separators between them, or bands at the
 * left for the layers; a side column with the steps and decisions; the footer with title and legend in small
 * capitals.
 */
export function columnsSheet(input: ColumnsSheetInput, m: Metrics): ColumnsSheet {
  const heads = input.bands.length > 0 ? columnHeads(input, m) : undefined;
  const rows = input.layers.length > 0 ? rowHeads(input, m) : { bands: [], texts: [] };
  const contentRight = heads?.right ?? input.content.x + input.content.w + OUTSET;
  const panel = panelOf(
    {
      model: input.model,
      focus: input.focus,
      words: input.words,
      open: input.open,
      x: contentRight + (heads ? BAND.inset * 2 : SIDE_GAP),
      y: heads ? BAND.top : input.content.y,
    },
    m,
  );
  const right =
    panel.bands.length > 0 ? contentRight + (heads ? BAND.inset * 2 : SIDE_GAP) + PANEL_WIDTH : contentRight;
  const width = right + MARGIN;
  const below = Math.max(input.content.y + input.content.h + OUTSET, panel.bottom);
  const left = Math.min(MARGIN * 2, ...(heads?.bands ?? []).map((b) => b.x), ...rows.bands.map((b) => b.x));
  const footer = footerOf(input, { x: left, top: below, width: width - left - MARGIN }, m);
  return {
    bands: [...(heads?.bands ?? []), ...rows.bands, ...panel.bands],
    separators: heads?.separators ?? [],
    texts: [...(heads?.texts ?? []), ...rows.texts, ...panel.texts, ...footer.texts],
    signs: panel.signs,
    width,
    height: footer.bottom,
  };
}
