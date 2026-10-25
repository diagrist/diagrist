import { type Shape, textWidth } from '@diagrist/core';
import type { BoxArt } from '../../layout/art.js';
import { changeOf } from '../../layout/diff.js';
import type { PlacedElement } from '../../layout/index.js';
import { secondLineRole } from '../../layout/measure.js';
import type { Look } from '../../looks/look.js';
import type { NodeStatus, Role } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { bodyShapes, clockShapes, replicaShapes } from '../bodies.js';
import { iconRole } from '../icons.js';

const STATUS_BODY: Readonly<Record<NodeStatus, string>> = { planned: 'boxPlanned', deprecated: 'boxDeprecated' };
/** The roles of the status dot (`status: dot`). */
export const STATUS_DOT: Readonly<Record<NodeStatus, string>> = {
  planned: 'statusPlanned',
  deprecated: 'statusDeprecated',
};
const DOT = { r: 3.5, gap: 9, rise: 4.5 } as const;

/**
 * The body of a box: a removed one first, then an added one (`boxEmphAdded` when it is also the core, which a look
 * may keep as the core), the status where the look draws it as a word, emphasis and a muted role.
 */
export function bodyOf(p: PlacedElement, muted: boolean, statusBody: boolean): string {
  const n = p.node;
  const change = changeOf(n.origin);
  if (change === 'removed') return 'boxRemoved';
  if (change === 'added') return n.emph ? 'boxEmphAdded' : 'boxAdded';
  if (n.status && statusBody) return STATUS_BODY[n.status];
  return n.emph ? 'boxEmph' : muted ? 'boxMuted' : 'box';
}

/**
 * A node of the `box` family: body by change, status, emphasis and role in its shape, with the corner radius of the
 * look; clock, replica tag, icon, name and second line; the status as a word after the second line or as a dot
 * after the name, as `status` says. Shared and deprecated boxes ask for muted roles, which a look may paint as ink.
 */
export function boxShapes(p: PlacedElement, art: BoxArt, role: Role | undefined, look: Look, texts: Texts): Shape[] {
  const n = p.node;
  const muted = role === 'shared';
  const old = n.status === 'deprecated' || n.origin === 'removed';
  const word = look.options.status === 'word';
  const detail = old ? 'detailDeprecated' : 'detail';
  const out: Shape[] = bodyShapes(n.shape, p.rect, bodyOf(p, muted, word), detail, look.metrics.nodeRx);
  if (n.shape === 'job') out.push(...clockShapes(art.clock, detail));
  if (n.replicas !== undefined && look.options.replicas === 'tag')
    out.push(...replicaShapes(`x${n.replicas}`, art.replicas));
  if (n.icon)
    out.push({ kind: 'icon', icon: n.icon, ...art.icon, role: iconRole(n.icon, muted || old ? 'muted' : 'ink') });
  out.push({ kind: 'text', ...art.label, text: n.label, role: old ? 'nameDeprecated' : 'name', font: 'name' });
  const second = secondLineRole(n);
  if (n.tech) out.push({ kind: 'text', ...art.tech, text: n.tech, role: second, font: second });
  if (!n.status) return out;
  if (word) {
    out.push({ kind: 'text', ...art.status, text: texts.statusInBox[n.status], role: 'status', font: 'note' });
    return out;
  }
  const cx = art.label.x + textWidth(n.label, look.fonts.name) + DOT.gap;
  out.push({ kind: 'circle', cx, cy: art.label.y - DOT.rise, r: DOT.r, role: STATUS_DOT[n.status] });
  return out;
}
