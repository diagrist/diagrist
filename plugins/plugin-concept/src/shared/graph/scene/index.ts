import { type Anchors, domId, type Point, type Scene, type Shape } from '@diagrist/core';
import { HEADER, headerShapes, legendShapes } from '@diagrist/parts';
import type { GraphLayout, PlacedItem, Sample } from '../layout/index.js';
import { ITEM } from '../layout/metrics.js';
import type { Graph } from '../model.js';
import { lineRole } from '../styles.js';
import { outline, outlineRole } from './shapes.js';

/** The bar of an item's tone: its width, and how far it stays inside a square or a rounded end. */
const BAR = { w: 3, edge: { x: 4, y: 8 }, round: { x: 10, y: 12 } } as const;

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

/** The bar in the tone of an item's type, inside its left edge and clear of a rounded end. */
function barOf(p: PlacedItem): Shape[] {
  if (p.tone === undefined) return [];
  const inset = p.type?.shape === 'round' ? BAR.round : BAR.edge;
  const { x, y, h } = p.rect;
  return [
    {
      kind: 'rect',
      x: x + inset.x,
      y: y + inset.y,
      w: BAR.w,
      h: h - 2 * inset.y,
      rx: BAR.w / 2,
      role: `bar-${p.tone}`,
    },
  ];
}

/** An item: its outline, its name centred, and below a hairline its entries from the left. */
function itemShapes(p: PlacedItem): Shape {
  const { rect, box } = p;
  const entries = box.entries.length > 0;
  const body = box.name.length * ITEM.nameLine + (entries ? ITEM.entryGap + box.entries.length * ITEM.entryLine : 0);
  const top = rect.y + (rect.h - body) / 2;
  const left = rect.x + ITEM.padX + box.indent;
  const middle = entries ? left : rect.x + box.indent + (rect.w - box.indent) / 2;
  const names = box.name.map(
    (text, i): Shape => ({
      kind: 'text',
      x: middle,
      y: top + i * ITEM.nameLine + 11,
      text,
      role: 'name',
      font: 'name',
      ...(entries ? {} : { anchor: 'middle' as const }),
    }),
  );
  const ruleY = top + box.name.length * ITEM.nameLine + ITEM.entryGap / 2;
  const below = entries
    ? [
        { kind: 'line', x1: left, y1: ruleY, x2: rect.x + rect.w - ITEM.padX, y2: ruleY, role: 'itemRule' } as const,
        ...box.entries.map(
          (text, i): Shape => ({
            kind: 'text',
            x: left,
            y: ruleY + ITEM.entryGap / 2 + i * ITEM.entryLine + 9,
            text,
            role: 'entry',
            font: 'entry',
          }),
        ),
      ]
    : [];
  return {
    kind: 'group',
    id: domId.node(p.item.id),
    children: [...outline(p.type?.shape ?? 'box', rect, outlineRole(p.item.status)), ...barOf(p), ...names, ...below],
  };
}

/** The sample of a legend entry: a small shape of a type or status, or a line with the head of a link. */
function sampleShapes(sample: Sample, x: number, y: number): Shape[] {
  const small = { x, y: y - 9, w: 32, h: 18 };
  if (sample.kind === 'type') return outline(sample.type.shape, small, 'item', 0.5);
  if (sample.kind === 'status') return outline('box', small, outlineRole(sample.status), 0.5);
  return [{ kind: 'path', d: `M ${x} ${y} L ${x + 40} ${y}`, role: lineRole(sample.link.line, sample.link.head) }];
}

/** The title, the lines below the items, the items, the labels of the lines, the legend. */
export function graphScene(layout: GraphLayout, model: Graph, title: string): Scene {
  const lines = layout.lines.map(
    (l): Shape => ({
      kind: 'group',
      id: domId.edge(l.index),
      children: [{ kind: 'path', d: pathOf(l.route.points), role: lineRole(l.link.line, l.link.head) }],
    }),
  );
  const labels = layout.labels.map(
    (l): Shape => ({ kind: 'text', x: l.x, y: l.y, text: l.text, role: 'edgeLabel', font: 'label', anchor: l.anchor }),
  );
  const heads = layout.heads.flatMap((h): Shape[] => [
    {
      kind: 'text',
      x: h.x,
      y: h.y,
      text: h.text,
      role: h.tone ? `head-${h.tone}` : 'head',
      font: 'head',
      anchor: 'middle',
    },
    {
      kind: 'line',
      x1: h.rule.x1,
      y1: h.rule.y,
      x2: h.rule.x2,
      y2: h.rule.y,
      role: h.tone ? `headRule-${h.tone}` : 'headRule',
    },
  ]);
  const verbs = layout.verbs.flatMap((v): Shape[] => [
    { kind: 'text', x: v.x, y: v.y, text: v.text, role: 'verb', font: 'label', anchor: 'middle' },
    {
      kind: 'path',
      d: `M ${v.rule.x1} ${v.rule.y} L ${v.rule.x2} ${v.rule.y}`,
      role: lineRole(v.link.line, v.link.head),
    },
  ]);
  const legend =
    layout.legend.entries.length > 0 ? legendShapes(layout.legend, (e) => sampleShapes(e.sample, e.at.x, e.at.y)) : [];
  return {
    width: layout.width,
    height: layout.height,
    title,
    children: [
      ...headerShapes(HEADER, title, model.subtitle),
      ...heads,
      ...verbs,
      ...lines,
      ...layout.items.map(itemShapes),
      ...labels,
      ...legend,
    ],
  };
}

/** Items as nodes and relations as edges, by the DOM ids of their groups. */
export function graphAnchors(layout: GraphLayout): Anchors {
  return {
    width: layout.width,
    height: layout.height,
    nodes: layout.items.map((p) => ({ id: p.item.id, domId: domId.node(p.item.id), rect: p.rect })),
    groups: [],
    edges: layout.lines.map((l) => ({
      index: l.index,
      from: l.relation.from,
      to: l.relation.to,
      domId: domId.edge(l.index),
      points: l.route.points,
    })),
  };
}
