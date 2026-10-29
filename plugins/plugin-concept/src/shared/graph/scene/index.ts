import { type Anchors, domId, type Point, type Scene, type Shape } from '@diagrist/core';
import { HEADER, headerShapes, legendShapes } from '@diagrist/parts';
import type { GraphLayout, PlacedItem, Sample } from '../layout/index.js';
import { ITEM } from '../layout/metrics.js';
import type { Graph } from '../model.js';
import { lineRole } from '../styles.js';
import { cardRole, outline, outlineRole } from './shapes.js';

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

/** Lines of text from `x` downwards from `top`, `step` apart, the first baseline `lift` below `top`. */
const textLines = (lines: readonly string[], x: number, top: number, step: number, lift: number, role: string) =>
  lines.map((text, i): Shape => ({ kind: 'text', x, y: top + i * step + lift, text, role, font: role }));

/**
 * An item: its shape in the tone of its type, its name and below it its entries, all from the left. An item that
 * leads a row of the story is its text alone, stronger, at the edge of its column.
 */
function itemShapes(p: PlacedItem): Shape {
  const { rect, box } = p;
  const line = box.lead ? ITEM.leadLine : ITEM.nameLine;
  const entries = box.entries.length > 0;
  const body = box.name.length * line + (entries ? ITEM.entryGap + box.entries.length * ITEM.entryLine : 0);
  const top = rect.y + (rect.h - body) / 2;
  const round = p.type?.shape === 'round' ? ITEM.padX / 2 : 0;
  const left = rect.x + (box.lead ? 0 : ITEM.padX + round) + box.indent;
  const role = box.lead ? 'lead' : entries ? 'heading' : 'name';
  const below = top + box.name.length * line + ITEM.entryGap;
  const shape = box.lead ? [] : outline(p.type?.shape ?? 'box', rect, cardRole(p.item.status, p.tone));
  return {
    kind: 'group',
    id: domId.node(p.item.id),
    children: [
      ...shape,
      ...textLines(box.name, left, top, line, line - 4, role),
      ...textLines(box.entries, left, below, ITEM.entryLine, ITEM.entryLine - 3, 'entry'),
    ],
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
  const heads = [...layout.heads, ...layout.verbs].map(
    (h, i): Shape => ({
      kind: 'text',
      x: h.x,
      y: h.y,
      text: h.text,
      role: i < layout.heads.length ? 'head' : 'verb',
      font: i < layout.heads.length ? 'head' : 'label',
      anchor: h.anchor,
    }),
  );
  const legend =
    layout.legend.entries.length > 0 ? legendShapes(layout.legend, (e) => sampleShapes(e.sample, e.at.x, e.at.y)) : [];
  return {
    width: layout.width,
    height: layout.height,
    title,
    children: [
      ...headerShapes(HEADER, title, model.subtitle),
      ...heads,
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
