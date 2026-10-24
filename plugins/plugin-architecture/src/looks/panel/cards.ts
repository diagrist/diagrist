import { domId, type Shape } from '@diagrist/core';
import { iconStroke } from '../../icons/index.js';
import type { BoxArt, PersonArt } from '../../layout/art.js';
import type { ArchitectureLayout, PlacedElement } from '../../layout/index.js';
import { secondLineRole } from '../../layout/measure.js';
import type { ArchitectureModel, ArchNode } from '../../model/types.js';
import { bodyShapes, clockShapes, replicaShapes } from '../../scene/bodies.js';
import type { Texts } from '../../texts/index.js';
import { type Party, partyOf } from './party.js';

const CARD_RX = 8;
const DOT_R = 5;
/** Radius and centre of a person's disc below the top of its place, and the glyph inside it. */
const DISC = { r: 22, dy: 22, head: 4.5, headDy: 5, shoulder: 8, rise: 9 } as const;
/** How far texts in a cylinder move down, below the front of its lid. */
const DB_SHIFT = 6;

const given = (text: string | undefined, shape: (text: string) => Shape): Shape[] => (text ? [shape(text)] : []);

/** A person as a disc in the colour of people with a white bust in it, name and role below. */
function personShapes(n: ArchNode, art: PersonArt, top: number): Shape[] {
  const cx = art.head.cx;
  const cy = top + DISC.dy;
  const s = DISC.shoulder;
  const role = secondLineRole(n);
  return [
    { kind: 'circle', cx, cy, r: DISC.r, role: 'party-person' },
    { kind: 'circle', cx, cy: cy - DISC.headDy, r: DISC.head, role: 'personGlyph' },
    {
      kind: 'path',
      d: `M${cx - s} ${cy + DISC.rise} Q${cx} ${cy - 1} ${cx + s} ${cy + DISC.rise}`,
      role: 'personGlyph',
    },
    { kind: 'text', ...art.label, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...given(n.tech, (t) => ({ kind: 'text', ...art.tech, text: t, role, font: role, anchor: 'middle' })),
  ];
}

/** The body of a card: the focus card stands out, planned ones are dashed, replaced ones lie flat on the panel. */
const bodyRole = (n: ArchNode): string =>
  n.emph ? 'boxEmph' : n.status === 'planned' ? 'boxPlanned' : n.status === 'deprecated' ? 'boxDeprecated' : 'box';

/**
 * A white card: its icon in the colour of its party, or a colour dot where it has none, then name and second line;
 * status after the second line in its colour.
 */
function cardShapes(p: PlacedElement, art: BoxArt, party: Party, texts: Texts): Shape[] {
  const n = p.node;
  const shift = n.shape === 'db' ? DB_SHIFT : 0;
  const at = (spot: { x: number; y: number }) => ({ x: spot.x, y: spot.y + shift });
  const out: Shape[] = bodyShapes(n.shape, p.rect, bodyRole(n), 'detail', CARD_RX);
  if (n.shape === 'job') out.push(...clockShapes(art.clock, 'detail'));
  if (n.replicas !== undefined) out.push(...replicaShapes(`x${n.replicas}`, art.replicas));
  const middle = art.icon.y + art.icon.size / 2 + shift;
  out.push(
    n.icon
      ? { kind: 'icon', icon: n.icon, ...art.icon, y: art.icon.y + shift, role: `icon-${iconStroke(n.icon)}-${party}` }
      : { kind: 'circle', cx: art.icon.x + art.icon.size / 2, cy: middle, r: DOT_R, role: `party-${party}` },
  );
  const old = n.status === 'deprecated';
  out.push({ kind: 'text', ...at(art.label), text: n.label, role: old ? 'nameDeprecated' : 'name', font: 'name' });
  const second = secondLineRole(n);
  out.push(...given(n.tech, (t) => ({ kind: 'text', ...at(art.tech), text: t, role: second, font: second })));
  if (n.status) {
    const role = n.status === 'planned' ? 'statusPlanned' : 'statusDeprecated';
    out.push({ kind: 'text', ...at(art.status), text: texts.status[n.status], role, font: 'note' });
  }
  return out;
}

/** Every element in its group `node-<id>`: people as discs, everything else as cards. */
export function panelNodeShapes(model: ArchitectureModel, layout: ArchitectureLayout, texts: Texts): Shape[] {
  const groups = new Map(model.groups.map((g) => [g.id, g]));
  return layout.nodes.map((p): Shape => {
    const art = p.art;
    const children =
      art.kind === 'person' ? personShapes(p.node, art, p.rect.y) : cardShapes(p, art, partyOf(p.node, groups), texts);
    return { kind: 'group', id: domId.node(p.node.id), children };
  });
}
