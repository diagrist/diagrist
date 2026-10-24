import type { Placed, Rect } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { ActivityDiagram } from '../diagram.js';
import type { GuardText } from './guards.js';
import type { SideText } from './index.js';
import type { LaneArt } from './lanes.js';
import { SIZE, widthOf } from './metrics.js';
import type { PlacedNode } from './place.js';
import type { ActivityText, RegionArt } from './regions.js';

/** What the layout of an activity diagram hands to `placedOf`. */
export interface Placing {
  readonly lanes: readonly LaneArt[];
  readonly regions: readonly RegionArt[];
  readonly nodes: readonly PlacedNode[];
  readonly guards: readonly GuardText[];
  readonly side: readonly SideText[];
}

/** The rectangle a text covers: from its ascent down to below its baseline. */
function textRect(t: ActivityText, w: number, size: number): Rect {
  const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
  return { x, y: t.y - size, w, h: size + 3 };
}

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const area = (r: Rect) => r.w * r.h;
const innermost = <T extends { readonly rect: Rect }>(list: readonly T[]): T | undefined =>
  [...list].sort((a, b) => area(a.rect) - area(b.rect))[0];

const CIRCLES: ReadonlySet<string> = new Set(['initial', 'final', 'flowfinal']);

/** Bars of fork and join stretch over their branches, across lanes. */
const BARS: ReadonlySet<string> = new Set(['fork', 'join']);

/**
 * What the layout placed, for the kernel's check (ADR 0010, 0020). Lanes are areas, which things lie in and cross,
 * with their names as texts. Frames of regions claim what lies in them, so a node in a frame that is not its member is
 * an error (G403, the predecessor's E439). Nodes and their pins belong into their innermost region, else their lane,
 * except bars; expansion nodes sit on the frame of their region. Texts belong into the innermost frame around them. Lines are left
 * out: they cross lanes and frames by design.
 */
export function placedOf(p: Placing, diagram: ActivityDiagram): Placed[] {
  const spans = new Map<string, Span>(
    [...diagram.partitions, ...diagram.regions, ...diagram.expansions].map((d) => [d.id, d.span]),
  );
  const span = (id: string) => {
    const s = spans.get(id);
    return s ? { span: s } : {};
  };
  const within = (key: string | undefined) => (key === undefined ? {} : { within: key });
  const regionOf = (rect: Rect, self?: string) =>
    innermost(p.regions.filter((r) => r.id !== self && inside(rect, r.rect)))?.id;
  const homeOf = (n: PlacedNode) =>
    innermost(p.regions.filter((r) => r.members.includes(n.id)))?.id ??
    (BARS.has(n.node.kind) ? undefined : p.lanes.find((l) => l.id === n.node.lane)?.id);
  const lanes = p.lanes.flatMap((l): Placed[] => [
    { key: l.id, kind: 'area', rect: l.rect, ...span(l.id) },
    {
      key: `${l.id}.name`,
      kind: 'text',
      rect: textRect({ ...l.text, text: l.label, anchor: 'middle' }, widthOf.node(l.label, true), SIZE.node),
      within: l.id,
      ...span(l.id),
    },
  ]);
  const frames = p.regions.map(
    (r): Placed => ({
      key: r.id,
      kind: 'frame',
      rect: r.rect,
      ...within(regionOf(r.rect, r.id) ?? p.lanes.find((l) => inside(r.rect, l.rect))?.id),
      ...span(r.id),
    }),
  );
  const nodes = p.nodes.flatMap((n): Placed[] => {
    const port = n.node.port;
    if (port) {
      const key = `${port.region}.${port.side === 'in' ? 'input' : 'output'}.${port.index + 1}`;
      return [{ key, kind: 'box', rect: n.rect, on: port.region, span: n.node.span }];
    }
    const home = within(homeOf(n));
    const outline = CIRCLES.has(n.node.kind) ? { outline: 'ellipse' as const } : {};
    const pins = (n.art.pins ?? []).map(
      (pin, i): Placed => ({ key: `${n.id}.pin.${i + 1}`, kind: 'box', rect: pin.rect, ...home, span: n.node.span }),
    );
    return [{ key: n.id, kind: 'box', rect: n.rect, ...outline, ...home, span: n.node.span }, ...pins];
  });
  const text = (key: string, t: ActivityText): Placed => {
    const rect = textRect(t, widthOf.label(t.text), SIZE.label);
    return { key, kind: 'text', rect, ...within(regionOf(rect)) };
  };
  return [
    ...lanes,
    ...frames,
    ...nodes,
    ...p.guards.map((g) => text(`label-${g.route}`, g)),
    ...p.side.map((t) => text(t.key, t.text)),
  ];
}
