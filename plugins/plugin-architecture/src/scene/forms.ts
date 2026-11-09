import { type NodeForm, rectForm } from '@diagrist/core';
import type { PlacedElement } from '../layout/index.js';
import type { Look } from '../looks/look.js';
import { BLOCK_RX } from './nodes/block.js';
import { CARD_RX } from './nodes/card.js';

/**
 * The form of a box family body by its shape: a cylinder, a sheet with a folded corner, else a box in the corner
 * radius of the look, which a queue marks with an inner line and an app with a window bar, both details on the box.
 */
function boxForm(p: PlacedElement, look: Look): NodeForm {
  if (p.node.shape === 'db') return 'cylinder';
  if (p.node.shape === 'store') return 'file';
  return rectForm(look.metrics.nodeRx);
}

/**
 * The form of an element's body as `nodeShapes` draws it: a person figure or bust is a `symbol`, a card a box or a
 * circle, a block a box, lying tube or cylinder, a tab a square box. A block of only its name has no body and no form.
 */
export function elementForm(p: PlacedElement, look: Look): NodeForm | undefined {
  const art = p.art;
  if (art.kind === 'person') return 'symbol';
  if (art.card) return art.card.form === 'circle' ? 'circle' : rectForm(CARD_RX);
  if (art.block) {
    const form = art.block.form;
    return form === 'pipe' ? 'queue' : form === 'db' ? 'cylinder' : form === 'box' ? rectForm(BLOCK_RX) : undefined;
  }
  if (art.tab) return 'box';
  return boxForm(p, look);
}
