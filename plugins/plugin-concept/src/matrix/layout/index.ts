import { type Rect, textWidth } from '@diagrist/core';
import { placeTable, type SideEntry, type TableLayout } from '@diagrist/layout-matrix';
import { LEGEND, type Legend, legendLayout, MARGIN, wrap } from '@diagrist/parts';
import type { MatrixModel, Note } from '../model.js';
import type { ScaleValue } from '../scales.js';
import { MATRIX_FONTS as F } from '../styles.js';
import type { MatrixWords } from '../texts/words.js';

/** Widths heads are wrapped to, the table's measures, and the room a note's number takes beside a head. */
export const MEASURES = {
  wrap: { top: 104, side: 240 },
  table: { lineHeight: 14, cell: { w: 44, h: 28 }, pad: { x: 8, y: 7 } },
  badge: { r: 7, room: 18 },
  note: { line: 15, gap: 6, indent: 22, width: 360 },
} as const;

/** Where the table starts below the title line, with and without a subtitle. */
const TOP = { subtitle: 76, title: 60 } as const;

/** A note below the table: its number's centre and its wrapped lines with their baselines. */
export interface PlacedNote {
  readonly note: Note;
  readonly badge: { readonly x: number; readonly y: number };
  readonly x: number;
  readonly lines: readonly string[];
  readonly baselines: readonly number[];
  readonly rect: Rect;
}

/** A laid out matrix: the table, the texts of its heads, the notes, the legend and the size of the picture. */
export interface MatrixLayout {
  readonly table: TableLayout;
  readonly texts: ReadonlyMap<string, readonly string[]>;
  readonly notes: readonly PlacedNote[];
  readonly legend: Legend<ScaleValue>;
  readonly width: number;
  readonly height: number;
}

const widest = (lines: readonly string[], font: (typeof F)[keyof typeof F]): number =>
  Math.max(0, ...lines.map((l) => textWidth(l, font)));

/** The values the legend explains: those the cells use, and those with a rule, which hold even when unused. */
function legendValues(model: MatrixModel): ScaleValue[] {
  const used = new Set(model.rows.flatMap((r) => r.cells.flatMap((c) => c.values)));
  return (model.scale?.values ?? []).filter((v) => used.has(v.id) || v.row !== undefined || v.col !== undefined);
}

/** The legend's text for a value: what it means, and its rules. */
function legendText(model: MatrixModel, value: ScaleValue, w: MatrixWords): string {
  const meaning = model.scale ? (w.values[model.scale.name][value.id] ?? value.id) : value.id;
  const rules = [...(value.row ? [w.rule(value.row, 'row')] : []), ...(value.col ? [w.rule(value.col, 'col')] : [])];
  return [meaning, ...rules].join(', ');
}

/**
 * Lays out a matrix: heads wrapped, a band above the first row of each group, the table placed by `layout-matrix`,
 * the numbered notes below it and the legend of the scale below them. A head a note is about leaves room for its
 * number. The picture is as wide as the table, the title or the notes ask, whichever is widest.
 */
export function layoutMatrix(model: MatrixModel, w: MatrixWords, title: string): MatrixLayout {
  const noted = new Set(model.notes.flatMap((n) => (n.on === undefined ? [] : [n.on])));
  const room = (key: string) => (noted.has(key) ? MEASURES.badge.room : 0);
  const texts = new Map<string, readonly string[]>();
  const block = (key: string, label: string, width: number, font: (typeof F)[keyof typeof F]) => {
    const lines = wrap(label, width, font);
    texts.set(key, lines);
    return { width: widest(lines, font) + room(key), lines: lines.length };
  };
  const top = model.cols.map((c) => ({ key: c.id, head: block(c.id, c.label, MEASURES.wrap.top, F.top) }));
  const side: SideEntry[] = model.rows.flatMap((row, i) => {
    const group = model.groups.find((g) => g.id === row.group);
    const band = group !== undefined && model.rows[i - 1]?.group !== row.group;
    const line: SideEntry = { kind: 'line', key: row.id, head: block(row.id, row.label, MEASURES.wrap.side, F.side) };
    if (!band) return [line];
    return [{ kind: 'band', key: group.id, head: block(group.id, group.label, MEASURES.wrap.side, F.group) }, line];
  });
  const table = placeTable({
    x: MARGIN,
    y: model.subtitle ? TOP.subtitle : TOP.title,
    top,
    side,
    metrics: MEASURES.table,
  });
  const right = Math.max(
    table.frame.x + table.frame.w,
    MARGIN + textWidth(title, F.title),
    MARGIN + MEASURES.note.width,
  );
  const notes = placeNotes(model.notes, table.frame.y + table.frame.h + 28, right - MARGIN - MEASURES.note.indent);
  const below = notes.at(-1)?.rect ?? { y: table.frame.y + table.frame.h, h: 0 };
  const items = legendValues(model).map((value) => ({
    sample: value,
    sampleWidth: 2 * MEASURES.badge.r,
    labelDx: LEGEND.markDx,
    text: legendText(model, value, w),
  }));
  const width = Math.ceil(right + MARGIN);
  const legend = legendLayout(items, below.y + below.h + 36, width);
  return {
    table,
    texts,
    notes,
    legend,
    width,
    height: Math.ceil(items.length > 0 ? legend.bottom : below.y + below.h + MARGIN),
  };
}

function placeNotes(notes: readonly Note[], top: number, width: number): PlacedNote[] {
  const { line, gap, indent } = MEASURES.note;
  let y = top;
  return notes.map((note) => {
    const lines = wrap(note.text, width, F.note);
    const baselines = lines.map((_, i) => y + i * line + 10);
    const rect = { x: MARGIN, y, w: indent + widest(lines, F.note), h: lines.length * line };
    const placed = {
      note,
      badge: { x: MARGIN + MEASURES.badge.r, y: y + 6.5 },
      x: MARGIN + indent,
      lines,
      baselines,
      rect,
    };
    y += rect.h + gap;
    return placed;
  });
}
