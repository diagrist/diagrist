import { domId, type Shape } from '@diagrist/core';
import type { BoxArt, PersonArt } from '../layout/art.js';
import type { PlacedElement } from '../layout/index.js';
import type { ArchitectureModel, ArchNode, NodeStatus, Role } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { blockShapes } from './blocks.js';
import { bodyShapes, clockShapes, replicaShapes } from './bodies.js';
import { cardShapes } from './cards.js';
import { iconRole } from './icons.js';

const STATUS_BODY: Readonly<Record<NodeStatus, string>> = { planned: 'boxPlanned', deprecated: 'boxDeprecated' };

function personShapes(n: ArchNode, art: PersonArt): Shape[] {
  return [
    { kind: 'circle', ...art.head, role: 'head' },
    { kind: 'line', ...art.body, role: 'limb' },
    { kind: 'line', ...art.arms, role: 'limb' },
    ...art.legs.map((leg): Shape => ({ kind: 'line', ...leg, role: 'limb' })),
    { kind: 'text', ...art.label, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...(n.tech
      ? [{ kind: 'text', ...art.tech, text: n.tech, role: 'tech', font: 'note', anchor: 'middle' } as const]
      : []),
  ];
}

/** A plain box: body by status, emphasis and role, its shape, clock, replicas, icon and texts. */
function boxShapes(p: PlacedElement, art: BoxArt, role: Role | undefined, texts: Texts): Shape[] {
  const n = p.node;
  const muted = role === 'shared';
  const old = n.status === 'deprecated';
  const body = n.status ? STATUS_BODY[n.status] : n.emph ? 'boxEmph' : muted ? 'boxMuted' : 'box';
  const detail = old ? 'detailDeprecated' : 'detail';
  const out: Shape[] = bodyShapes(n.shape, p.rect, body, detail);
  if (n.shape === 'job') out.push(...clockShapes(art.clock, detail));
  if (n.replicas !== undefined) out.push(...replicaShapes(`x${n.replicas}`, art.replicas));
  if (n.icon)
    out.push({ kind: 'icon', icon: n.icon, ...art.icon, role: iconRole(n.icon, muted || old ? 'muted' : 'ink') });
  out.push({ kind: 'text', ...art.label, text: n.label, role: old ? 'nameDeprecated' : 'name', font: 'name' });
  if (n.tech) out.push({ kind: 'text', ...art.tech, text: n.tech, role: 'tech', font: 'note' });
  if (n.status)
    out.push({ kind: 'text', ...art.status, text: texts.statusInBox[n.status], role: 'status', font: 'note' });
  return out;
}

/** Every element in its group `node-<id>`, drawn in its look. */
export function nodeShapes(model: ArchitectureModel, nodes: readonly PlacedElement[], texts: Texts): Shape[] {
  const roles = new Map(model.groups.map((g) => [g.id, g.role]));
  return nodes.map((p): Shape => {
    const art = p.art;
    const children =
      art.kind === 'person'
        ? personShapes(p.node, art)
        : art.card
          ? cardShapes(p, art, art.card, texts)
          : art.block
            ? blockShapes(p, art, art.block)
            : boxShapes(p, art, roles.get(p.node.group ?? ''), texts);
    return { kind: 'group', id: domId.node(p.node.id), children };
  });
}
