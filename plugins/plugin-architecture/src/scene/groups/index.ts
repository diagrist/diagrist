import { domId, type Shape } from '@diagrist/core';
import type { PlacedFrame } from '../../layout/index.js';
import type { Look, LookOptions } from '../../looks/look.js';
import type { Texts } from '../../texts/index.js';
import { filledShapes } from '../nodes/block.js';
import { areaShapes } from './area.js';
import { frameFormShapes } from './frame.js';
import { panelShapes } from './panel.js';

const TAG_RX = 2;

/**
 * How each value of `groups.form` draws a frame without its tag; with `band` the frames that head a band are drawn by
 * the band sheet and leave the grid, the others are frames.
 */
const FORMS: Readonly<Record<LookOptions['groups']['form'], (f: PlacedFrame, look: Look, texts: Texts) => Shape[]>> = {
  frame: frameFormShapes,
  area: areaShapes,
  panel: panelShapes,
  band: frameFormShapes,
};

/** The tag of a frame at its right: a filled red block on a panel, a red box with a border else. */
function tagShapes(f: PlacedFrame, filled: boolean): Shape[] {
  const tag = f.head.tag;
  if (!tag || !f.group.tag) return [];
  const text: Shape = {
    kind: 'text',
    ...tag.text,
    text: f.group.tag,
    role: 'tagText',
    font: 'block',
    anchor: 'middle',
  };
  return filled
    ? [...filledShapes(tag.rect, 'red', TAG_RX), text]
    : [{ kind: 'rect', ...tag.rect, rx: TAG_RX, role: 'tag' }, text];
}

/** Every frame in its group `group-<id>`, parents first, drawn in the form of the look with its tag. */
export function frameShapes(frames: readonly PlacedFrame[], look: Look, texts: Texts): Shape[] {
  const form = look.options.groups.form;
  return frames.map(
    (f): Shape => ({
      kind: 'group',
      id: domId.group(f.group.id),
      children: [...FORMS[form](f, look, texts), ...tagShapes(f, form === 'panel')],
    }),
  );
}
