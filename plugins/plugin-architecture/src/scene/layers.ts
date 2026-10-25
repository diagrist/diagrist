import type { Shape } from '@diagrist/core';
import type { LayerArt } from '../layout/layers.js';
import { cased, type Look, type LookOptions } from '../looks/look.js';

const BOX_RX = 2;
const LAYER_DY = 3.5;

/** The bracket of the first layer: its spine and the line that joins it to the picture. */
const bracket = (l: LayerArt): Shape[] => [
  ...(l.spine ? [{ kind: 'line', ...l.spine, role: 'layerLine' } as const] : []),
  ...(l.attachment ? [{ kind: 'line', ...l.attachment, role: 'layerLine' } as const] : []),
];

/** A layer as a box with a leader and an arrow, its name in the box. */
const boxShapes = (l: LayerArt): Shape[] => [
  ...bracket(l),
  { kind: 'rect', ...l.rect, rx: BOX_RX, role: 'layerBox' },
  { kind: 'line', ...l.leader, role: 'layerLine' },
  { kind: 'path', d: l.arrow, role: 'layerArrow' },
  { kind: 'text', ...l.text, text: l.label, role: 'layerText', font: 'note', anchor: 'middle' },
];

/** A layer as a fine leader, its name in the group font where the leader ends; no box, no arrow. */
const bracketShapes = (l: LayerArt, look: Look): Shape[] => [
  ...bracket(l),
  { kind: 'line', ...l.leader, role: 'layerLine' },
  {
    kind: 'text',
    x: l.rect.x,
    y: l.leader.y1 + LAYER_DY,
    text: cased(l.label, look.fonts.group),
    role: 'kicker',
    font: 'group',
  },
];

/** How each value of `layers` draws a layer right of the picture; `bands` are drawn by the band sheet at the left. */
const LAYERS: Readonly<Record<LookOptions['layers'], (l: LayerArt, look: Look) => Shape[]>> = {
  boxes: boxShapes,
  bracket: bracketShapes,
  bands: () => [],
};

/** Each layer in its group `layer-<row>`, the first with the bracket, drawn as `layers` of the look says. */
export const layerShapes = (layers: readonly LayerArt[], look: Look): Shape[] =>
  layers.map((l): Shape => ({ kind: 'group', id: `layer-${l.row}`, children: LAYERS[look.options.layers](l, look) }));
