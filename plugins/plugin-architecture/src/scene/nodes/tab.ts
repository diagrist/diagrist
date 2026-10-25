import { type Shape, textWidth } from '@diagrist/core';
import type { BoxArt } from '../../layout/art.js';
import type { PlacedElement } from '../../layout/index.js';
import { secondLineRole } from '../../layout/measure.js';
import { type TabArt, tabName } from '../../layout/tab.js';
import type { Look } from '../../looks/look.js';
import type { Role } from '../../model/types.js';
import { iconRole } from '../icons.js';
import { bodyOf, STATUS_DOT } from './box.js';

/** The status dot after the name in the tab: its radius, its distance from the name and how far it rises. */
const DOT = { r: 3.5, gap: 8, rise: 4 } as const;

/**
 * A box with `nodeName: tab`: a square body by change, status and emphasis, one outline behind it for replicas with
 * `replicas: stack`, whose number the name carries, the name in a gap of the top edge with its status dot, icon and
 * second line centred inside. A box without a gap writes its name, else its second line, in the middle.
 */
export function tabShapes(p: PlacedElement, art: BoxArt, tab: TabArt, role: Role | undefined, look: Look): Shape[] {
  const n = p.node;
  const body = bodyOf(p, role === 'shared', false);
  const k = look.metrics.stackOffset;
  const stacked: Shape[] =
    n.replicas !== undefined && look.options.replicas === 'stack'
      ? [{ kind: 'rect', ...p.rect, x: p.rect.x + k, y: p.rect.y + k, role: body }]
      : [];
  const out: Shape[] = [...stacked, { kind: 'rect', ...p.rect, role: body }];
  const second = secondLineRole(n);
  if (!tab.gap) {
    const text = n.label || n.tech;
    const [r, font] = n.label ? (['name', 'name'] as const) : ([second, second] as const);
    if (text) out.push({ kind: 'text', ...art.label, text, role: r, font, anchor: 'middle' });
    return out;
  }
  out.push({ kind: 'rect', ...tab.gap, role: 'tabGap' });
  const name = tabName(n);
  out.push({ kind: 'text', ...art.label, text: name, role: 'name', font: 'name' });
  if (n.status && look.options.status === 'dot') {
    const cx = art.label.x + textWidth(name, look.fonts.name) + DOT.gap;
    out.push({ kind: 'circle', cx, cy: art.label.y - DOT.rise, r: DOT.r, role: STATUS_DOT[n.status] });
  }
  if (tab.icon) out.push({ kind: 'icon', icon: tab.icon, ...art.icon, role: iconRole(tab.icon, 'ink') });
  if (n.tech) out.push({ kind: 'text', ...art.tech, text: n.tech, role: second, font: second, anchor: 'middle' });
  return out;
}
