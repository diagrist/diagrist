import { type Anchors, domId, type Placed, type Rect, type Scene, type Shape } from '@diagrist/core';
import { HEADER, headerShapes, legendShapes } from '@diagrist/parts';
import { type MatrixLayout, MEASURES } from '../layout/index.js';
import type { MatrixModel } from '../model.js';
import { badgeShapes, valueShapes } from './marks.js';
import { tableRules } from './rules.js';

const LH = MEASURES.table.lineHeight;
const { pad } = MEASURES.table;

/** Baselines of `count` lines in `rect`: centred in it, or at its bottom for the heads across the top. */
function baselines(rect: Rect, count: number, at: 'middle' | 'bottom'): number[] {
  const first = at === 'bottom' ? rect.y + rect.h - pad.y - count * LH : rect.y + (rect.h - count * LH) / 2;
  return Array.from({ length: count }, (_, i) => first + i * LH + 10.5);
}

const textLines = (
  lines: readonly string[],
  x: number,
  ys: readonly number[],
  role: string,
  font: string,
  middle = false,
) =>
  lines.map(
    (text, i): Shape => ({
      kind: 'text',
      x,
      y: ys[i] ?? 0,
      text,
      role,
      font,
      ...(middle ? { anchor: 'middle' as const } : {}),
    }),
  );

/** The title, the table with bands, heads and cells, the numbers of the notes on their heads, the notes, the legend. */
export function matrixScene(layout: MatrixLayout, model: MatrixModel, title: string): Scene {
  const { table, texts } = layout;
  const values = model.scale?.values ?? [];
  const badges = new Map(model.notes.flatMap((n) => (n.on === undefined ? [] : [[n.on, n.n] as const])));
  const badge = (key: string, x: number, y: number) => {
    const n = badges.get(key);
    return n === undefined ? [] : badgeShapes(x, y, n);
  };
  const heads = table.top.map((t): Shape => {
    const lines = texts.get(t.key) ?? [];
    const cx = t.rect.x + (t.rect.w - (badges.has(t.key) ? MEASURES.badge.room : 0)) / 2;
    const ys = baselines(t.rect, lines.length, 'bottom');
    const children = [
      ...textLines(lines, cx, ys, 'top', 'top', true),
      ...badge(t.key, t.rect.x + t.rect.w - 9, t.rect.y + 9),
    ];
    return { kind: 'group', id: domId.node(t.key), children };
  });
  const entries = table.side.map((s): Shape => {
    const lines = texts.get(s.key) ?? [];
    const ys = baselines(s.rect, lines.length, 'middle');
    if (s.kind === 'band') {
      const children = [
        { kind: 'rect', ...s.rect, role: 'band' } as const,
        ...textLines(lines, s.rect.x + pad.x, ys, 'bandText', 'group'),
      ];
      return { kind: 'group', id: domId.group(s.key), children };
    }
    const row = model.rows.find((r) => r.id === s.key);
    const cells = table.cells
      .filter((c) => c.line === s.key)
      .flatMap((c) => {
        const held = row?.cells.find((cell) => cell.col === c.top)?.values ?? [];
        const known = values.filter((v) => held.includes(v.id));
        return valueShapes(known, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2);
      });
    const head = [
      ...textLines(lines, s.rect.x + pad.x, ys, 'side', 'side'),
      ...badge(s.key, s.rect.x + s.rect.w - 10, s.rect.y + s.rect.h / 2),
    ];
    return { kind: 'group', id: domId.node(s.key), children: [...head, ...cells] };
  });
  const sheet: Shape = {
    kind: 'rect',
    x: table.frame.x,
    y: table.body.y,
    w: table.frame.w,
    h: table.body.h,
    role: 'sheet',
  };
  const notes = layout.notes.flatMap((n) => [
    ...badgeShapes(n.badge.x, n.badge.y, n.note.n),
    ...textLines(n.lines, n.x, n.baselines, 'noteText', 'note'),
  ]);
  const legend =
    layout.legend.entries.length > 0
      ? legendShapes(layout.legend, (e) => valueShapes([e.sample], e.at.x + 7, e.at.y))
      : [];
  return {
    width: layout.width,
    height: layout.height,
    title,
    children: [
      ...headerShapes(HEADER, title, model.subtitle),
      sheet,
      ...entries,
      ...tableRules(layout.table),
      ...heads,
      ...notes,
      ...legend,
    ],
  };
}

/** Columns and rows as nodes, bands as groups, by the DOM ids of their groups. */
export function matrixAnchors(layout: MatrixLayout): Anchors {
  const { table } = layout;
  const node = (id: string, rect: Rect) => ({ id, domId: domId.node(id), rect });
  return {
    width: layout.width,
    height: layout.height,
    nodes: [
      ...table.top.map((t) => node(t.key, { ...t.rect, h: t.rect.h + table.body.h })),
      ...table.side.filter((s) => s.kind === 'line').map((s) => node(s.key, { ...s.rect, w: table.frame.w })),
    ],
    groups: table.side
      .filter((s) => s.kind === 'band')
      .map((s) => ({ id: s.key, domId: domId.group(s.key), rect: s.rect })),
    edges: [],
  };
}

/** What the placement check sees: the heads and bands as boxes that tile the table, the notes as texts. */
export function matrixPlaced(layout: MatrixLayout, model: MatrixModel): Placed[] {
  const span = (key: string) => [...model.cols, ...model.rows, ...model.groups].find((h) => h.id === key)?.span;
  const box = (key: string, rect: Rect): Placed => {
    const at = span(key);
    return { key, kind: 'box', rect, ...(at ? { span: at } : {}) };
  };
  return [
    ...layout.table.top.map((t) => box(t.key, t.rect)),
    ...layout.table.side.map((s) => box(s.key, s.rect)),
    ...layout.notes.map((n): Placed => ({ key: `note-${n.note.n}`, kind: 'text', rect: n.rect, span: n.note.span })),
  ];
}
