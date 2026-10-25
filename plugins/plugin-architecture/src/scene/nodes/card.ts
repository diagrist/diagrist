import type { Shape } from '@diagrist/core';
import type { BoxArt, CardArt } from '../../layout/art.js';
import type { PlacedElement } from '../../layout/index.js';
import type { Texts } from '../../texts/index.js';
import { iconRole } from '../icons.js';

const CARD_RX = 6;
const SHADOW_DY = 2;
const CIRCLE_ICON = 0.9;

/**
 * A node of the `card` family: cards with a soft shadow, stacked for replicas, a toned circle with a white icon,
 * centred texts.
 */
export function cardShapes(p: PlacedElement, art: BoxArt, card: CardArt, texts: Texts): Shape[] {
  const n = p.node;
  const body = n.status === 'planned' ? 'boxPlanned' : n.status === 'deprecated' ? 'boxDeprecated' : 'card';
  const out: Shape[] =
    card.form === 'card'
      ? [...card.stack, p.rect].flatMap((r): Shape[] => [
          { kind: 'rect', ...r, y: r.y + SHADOW_DY, rx: CARD_RX, role: 'cardShadow' },
          { kind: 'rect', ...r, rx: CARD_RX, role: body },
        ])
      : [];
  if (card.circle) {
    const { cx, cy, r } = card.circle;
    out.push({ kind: 'circle', cx, cy, r, role: `fill-${n.tone ?? 'blue'}` });
    if (card.icon) {
      const size = Math.round(r * (card.form === 'circle' ? CIRCLE_ICON : 1));
      out.push({
        kind: 'icon',
        icon: card.icon,
        x: cx - size / 2,
        y: cy - size / 2,
        size,
        role: iconRole(card.icon, 'white'),
      });
    }
  }
  const name = n.status === 'deprecated' ? 'nameDeprecated' : 'name';
  out.push({ kind: 'text', ...art.label, text: n.label, role: name, font: 'name', anchor: 'middle' });
  if (n.tech) out.push({ kind: 'text', ...art.tech, text: n.tech, role: 'tech', font: 'note', anchor: 'middle' });
  if (n.status)
    out.push({ kind: 'text', ...art.status, text: texts.statusInBox[n.status], role: 'status', font: 'note' });
  return out;
}
