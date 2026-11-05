import { type Font, type Placed, type Rect, textWidth } from '@diagrist/core';
import type { GridGroup } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { Texts } from '../texts/index.js';
import type { Spot } from './art.js';
import type { PlacedElement, PlacedFrame } from './index.js';
import { isCircle, secondLine } from './measure.js';

/** A text line as the scene sets it: from `x` on, or centred on it, from its cap height to below its baseline. */
function line(spot: Spot, width: number, font: Font, middle: boolean): Rect {
  return { x: middle ? spot.x - width / 2 : spot.x, y: spot.y - font.size, w: width, h: font.size + 2 };
}

/**
 * The texts inside the boxes and cards of a picture, for the kernel's placement check: the name, and the second line
 * with the status word after it, each keyed `<node>.name` and `<node>.tech` and belonging into its node, so a text
 * that runs past the edge of its box is reported (G402). Figures, circles and names in the top edge stand outside
 * their rectangle by design and are left out, as are the blocks, whose texts stand on tubes and cylinders.
 */
export function insideTexts(nodes: readonly PlacedElement[], look: Look, texts: Texts): Placed[] {
  const { fonts, options: o } = look;
  if (o.nodes === 'block' || o.nodeName === 'tab') return [];
  return nodes.flatMap(({ node: n, art }): Placed[] => {
    if (art.kind !== 'box' || isCircle(n, look)) return [];
    const middle = o.nodes === 'card';
    const own = { kind: 'text', within: n.id, ...(n.source ? { span: n.source } : {}) } as const;
    const name = line(art.label, textWidth(n.label, fonts.name), fonts.name, middle);
    const tech =
      n.tech === undefined ? undefined : line(art.tech, textWidth(n.tech, secondLine(n, fonts)), fonts.note, middle);
    const word = n.status && o.status === 'word' ? texts.statusInBox[n.status] : undefined;
    const status =
      word === undefined
        ? undefined
        : line(art.status, textWidth(word, fonts.note), fonts.note, middle && n.tech === undefined);
    const second = tech && status ? { ...tech, w: status.x + status.w - tech.x } : (tech ?? status);
    return [
      ...(n.label ? [{ key: `${n.id}.name`, rect: name, ...own }] : []),
      ...(second ? [{ key: `${n.id}.tech`, rect: second, ...own }] : []),
    ];
  });
}

/**
 * The heads of frames as texts keyed `<frame>.name`, which the kernel's line check reads as the head lines keep clear
 * of: where the kind told the grid it draws them, inside their frame, or the ground cut out of the line for a title
 * on it, on the frame's border.
 */
export function headTexts(frames: readonly PlacedFrame[], groups: readonly GridGroup[]): Placed[] {
  return frames.flatMap(({ group, rect, head }): Placed[] => {
    const h = groups.find((g) => g.id === group.id)?.head;
    if (!h) return [];
    const x = (h.origin === 'middle' ? rect.x + rect.w / 2 : rect.x) + h.x;
    const box = head.titleBox ?? { x, y: rect.y + h.y, w: h.w, h: h.h };
    const home = head.titleBox ? { on: group.id } : { within: group.id };
    return [{ key: `${group.id}.name`, kind: 'text', rect: box, ...home }];
  });
}
