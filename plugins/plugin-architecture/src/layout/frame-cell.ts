import { textWidth } from '@diagrist/core';
import type { GraphContainer, GraphFrameCell, GridGroup, Pads } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchGroup, ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { headRect } from './head-rect.js';

const TAG_MIN_W = 120;

/** Where the kind draws the head of a frame, from its top left corner or the middle of its top edge. */
export type Head = NonNullable<GridGroup['head']>;

/** A frame of the model in the layout graph: its container, its cell and where its head stands. */
export interface Framed {
  readonly container: GraphContainer;
  readonly frame: GraphFrameCell;
  readonly head: GridGroup['head'];
}

/** Width of a tag such as `CLOSED` at the right of a frame. */
export const tagWidth = (tag: string, look: Look): number =>
  Math.max(TAG_MIN_W, textWidth(tag, look.fonts.name) + 2 * look.metrics.nodePad);

/** Pads of a frame: room for the head on top, a side title on the left, a tag on the right. */
function pads(g: ArchGroup, model: ArchitectureModel, look: Look): Pads {
  const m = look.metrics;
  const titled = g.title !== '' && g.heading !== 'side';
  const sides = model.groups.filter((s) => s.heading === 'side' && s.title !== '');
  const side = Math.max(0, ...sides.map((s) => textWidth(s.title, look.fonts.heading)));
  return {
    top: titled ? m.groupPadTop : m.groupPadBottom,
    bottom: m.groupPadBottom,
    left: m.groupPadX + (g.heading === 'side' ? side + m.groupPadX : 0),
    right: m.groupPadX + (g.tag ? tagWidth(g.tag, look) + m.groupPadX : 0),
  };
}

/** A frame of the model as a container of the layout graph, with its sides, column and head in the grid. */
export function frameOf(g: ArchGroup, model: ArchitectureModel, look: Look, texts: Texts): Framed {
  const head = headRect(g, look, g.team ?? (g.role ? texts.roles[g.role] : ''));
  const p = pads(g, model, look);
  const container: GraphContainer = {
    id: g.id,
    kind: 'frame',
    ...(g.parent ? { parent: g.parent } : {}),
    members: g.members,
    pad: p.bottom,
    top: p.top,
    head: { width: head?.w ?? 0, height: head?.h ?? 0 },
  };
  const at = head ? { x: head.x, y: head.y, ...(head.origin ? { origin: head.origin } : {}) } : undefined;
  const frame: GraphFrameCell = {
    frame: g.id,
    left: p.left,
    right: p.right,
    ...(g.cover ? { cover: g.cover } : {}),
    ...(at ? { head: at } : {}),
    ...(g.source ? { source: g.source } : {}),
  };
  return { container, frame, head };
}
