import type { Rect } from '@diagrist/core';
import type { Side } from '@diagrist/layout-grid';
import { type Graph, isHandlerFlow } from './graph.js';
import { ACT, SIZE, type XY } from './metrics.js';
import { docks, far, moveEnd, moveStart, type Pin } from './pin-docks.js';
import type { PlacedNode, Placement } from './place.js';
import type { ActivityText } from './regions.js';
import { dedupe, type Routed } from './route.js';
import type { PinArt } from './size.js';

const NORMAL: Readonly<Record<Side, XY>> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * A pin as a square outside the edge, centred on its attachment point. The object type stands right of the square
 * on top and bottom, above it on the sides, facing outwards.
 */
function pinArt(text: string, side: Side, at: XY): PinArt {
  const s = ACT.pin;
  const [nx, ny] = NORMAL[side];
  const rect: Rect = { x: at[0] + (nx * s) / 2 - s / 2, y: at[1] + (ny * s) / 2 - s / 2, w: s, h: s };
  const label = (x: number, y: number, anchor: ActivityText['anchor']): PinArt => ({
    rect,
    text: { text, x, y, anchor },
  });
  switch (side) {
    case 'bottom':
      return label(rect.x + s + ACT.pinGap, rect.y + s, 'start');
    case 'top':
      return label(rect.x + s + ACT.pinGap, rect.y + s - Math.round(SIZE.label / 5), 'start');
    case 'right':
      return label(rect.x, rect.y - ACT.pinGap, 'start');
    case 'left':
      return label(rect.x, rect.y - ACT.pinGap, 'end');
  }
}

const shift = (p: XY, side: Side, by: number): XY => [p[0] + NORMAL[side][0] * by, p[1] + NORMAL[side][1] * by];

/** Pins of an action: outputs, inputs and the exception pin of a handler, each with its edges. */
function pinsOf(id: string, p: PlacedNode, routes: readonly Routed[], g: Graph): Pin[] {
  const pin = (name: string, out: boolean, own: readonly Routed[]): Pin => {
    const [first] = own;
    return { name, out, routes: own, side: first ? (out ? first.fromSide : first.toSide) : out ? 'bottom' : 'top' };
  };
  const object = routes.filter((r) => r.flow.kind === 'object');
  const chosen = (r: Routed) => g.pins[r.flow.index] ?? {};
  return [
    ...p.node.outputs.map((n) =>
      pin(
        n,
        true,
        object.filter((r) => r.flow.from === id && chosen(r).from === n),
      ),
    ),
    ...p.node.inputs.map((n) =>
      pin(
        n,
        false,
        object.filter((r) => r.flow.to === id && chosen(r).to === n),
      ),
    ),
    ...routes.flatMap((r) => (isHandlerFlow(r.flow) && r.flow.to === id ? [pin(r.flow.exception, false, [r])] : [])),
  ];
}

/**
 * Pins after routing (UML 2.5.1, 16.2.4): an output pin sits where its object flow leaves the action, an input pin
 * where it arrives; without an object flow at the bottom and the top. Several pins of one side stand side by side,
 * their edges attach to them. Object flows then start and end at the pin instead of the box (pin to pin); the bolt of
 * a handler ends at its exception pin.
 */
export function placePins(
  pl: Placement,
  routes: readonly Routed[],
  g: Graph,
): { placement: Placement; routes: Routed[] } {
  const points = new Map(routes.map((r) => [r, [...r.points]]));
  const nodes = new Map<string, PlacedNode>();
  for (const [id, p] of pl.nodes) {
    const pins = pinsOf(id, p, routes, g);
    if (pins.length === 0) {
      nodes.set(id, p);
      continue;
    }
    const arts: PinArt[] = [];
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const group = pins.filter((x) => x.side === side);
      if (group.length === 0) continue;
      const axis = side === 'top' || side === 'bottom' ? 0 : 1;
      const sorted =
        group.length < 2 ? group : [...group].sort((a, b) => (far(a)?.[axis] ?? 0) - (far(b)?.[axis] ?? 0));
      docks(sorted, p.rect).forEach((at, i) => {
        const pin = sorted[i];
        if (!pin) return;
        for (const r of pin.routes) {
          const pts = points.get(r);
          if (!pts) continue;
          if (pin.out) {
            moveStart(pts, side, at);
            pts[0] = shift(pts[0] ?? at, side, ACT.pin);
          } else {
            moveEnd(pts, side, at);
            pts[pts.length - 1] = shift(pts.at(-1) ?? at, side, ACT.pin);
          }
        }
        arts.push(pinArt(pin.name, side, at));
      });
    }
    nodes.set(id, { ...p, art: { ...p.art, pins: arts } });
  }
  const moved = routes.map((r) => ({ ...r, points: dedupe(points.get(r) ?? []) }));
  return { placement: { ...pl, nodes }, routes: moved };
}
