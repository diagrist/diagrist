import { slideExpansions } from './expansion-slide.js';
import type { Graph } from './graph.js';
import { placeQuestions } from './guards.js';
import { type Laid, laidActivity } from './laid.js';
import { widthOf } from './metrics.js';
import { placePins } from './pins.js';
import type { PlacedNode, Placement, Routed } from './placement.js';
import { sideReach } from './side-room.js';

/** An activity laid out, its questions, pins and expansion nodes placed. */
export interface Finished {
  readonly laid: Laid;
  readonly placement: Placement;
  readonly routes: readonly Routed[];
}

/** Lays out, places questions and pins, and slides expansion nodes over their pins. */
function finished(g: Graph): Finished {
  const laid = laidActivity(g);
  const questioned = placeQuestions({ nodes: laid.nodes }, laid.routes);
  const pinned = placePins(questioned, laid.routes, g);
  return { laid, ...slideExpansions(pinned.placement, pinned.routes, laid.regions) };
}

/** How far the names of the pins of a node reach right of its box. */
function overhang(p: PlacedNode): number {
  const right = p.rect.x + p.rect.w;
  const ends = (p.art.pins ?? []).map((pin) => {
    const w = widthOf.label(pin.text.text);
    return pin.text.anchor === 'start' ? pin.text.x + w : pin.text.anchor === 'end' ? pin.text.x : pin.text.x + w / 2;
  });
  return Math.max(0, ...ends.map((x) => x - right));
}

/**
 * An activity laid out with the room its pin names take right of their boxes as they stand. Before the layout, the
 * name of a pin alone on its side is given room as if its square stood at the right end of the box (`sideReach`),
 * which widens a lane where it stands in the middle. Where a name reaches less far than its room, the picture is laid
 * out once more with each node's room as its names took it (`Graph.pinReach`); that layout stays only where no name
 * then reaches further than its room.
 */
export function laidWithPins(g: Graph): Finished {
  const first = finished(g);
  const nodes = [...first.placement.nodes.values()];
  const right = (p: PlacedNode, pins?: number) =>
    sideReach(pins === undefined ? g : { ...g, pinReach: new Map([[p.id, pins]]) }, p.node)?.right ?? 0;
  if (nodes.every((p) => right(p) <= right(p, overhang(p)) + 0.5)) return first;
  const pinReach = new Map(nodes.map((p) => [p.id, Math.ceil(overhang(p))]));
  const second = finished({ ...g, pinReach });
  const fits = [...second.placement.nodes.values()].every((p) => overhang(p) <= (pinReach.get(p.id) ?? 0) + 0.5);
  return fits ? second : first;
}
