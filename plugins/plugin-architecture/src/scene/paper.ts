import { type Shape, textWidth } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { BoxArt, PersonArt } from '../layout/art.js';
import type { PlacedElement, PlacedFrame } from '../layout/index.js';
import type { LayerArt } from '../layout/layers.js';
import { secondLineRole } from '../layout/measure.js';
import type { Metrics } from '../layout/metrics.js';
import type { PaperSheet } from '../layout/paper.js';
import type { ArchNode } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { bodyShapes, clockShapes, replicaShapes } from './bodies.js';
import { iconRole } from './icons.js';
import { type Surface, surfacesAt } from './surfaces.js';

/** Baselines of kicker, title and subtitle at the top of the sheet. */
const HEAD = { kicker: 30, title: 50, subtitle: 67 } as const;
const BADGE_R = 7.5;
const BADGE_DY = 3.3;
const DOT = { r: 3.5, gap: 9, rise: 4.5 } as const;
/** Head radius, and from the top of the bust the head's centre, the shoulders' width, their crown and their base. */
const BUST = { head: 10, headY: 13, shoulder: 21, top: 32, base: 53 } as const;
const NODE_RX = 2;
const LAYER_DY = 3.5;
/** How far texts in a cylinder move down, below the front of its lid. */
const DB_SHIFT = 6;
const GAP = { x: 4, y: 2 } as const;

/** A shape for a text that may be missing or empty. */
const given = (text: string | undefined, shape: (text: string) => Shape): Shape[] => (text ? [shape(text)] : []);

/** The kind in small capitals above the title, then title and subtitle; `label=""` leaves the kicker out. */
export const paperHeader = (kicker: string, title: string, subtitle: string | undefined): Shape[] => [
  ...given(kicker, (t) => ({
    kind: 'text',
    x: MARGIN,
    y: HEAD.kicker,
    text: t.toUpperCase(),
    role: 'kicker',
    font: 'group',
  })),
  { kind: 'text', x: MARGIN, y: HEAD.title, text: title, role: 'title', font: 'title' },
  ...given(subtitle, (t) => ({ kind: 'text', x: MARGIN, y: HEAD.subtitle, text: t, role: 'subtitle', font: 'note' })),
];

/** A person as a bust: head and shoulders, name and role below. */
export function bustShapes(n: ArchNode, art: PersonArt): Shape[] {
  const { cx } = art.head;
  const top = art.head.cy - BUST.headY;
  const { shoulder: s, base } = BUST;
  const d = `M${cx - s} ${top + base} C${cx - s} ${top + BUST.top} ${cx + s} ${top + BUST.top} ${cx + s} ${top + base} Z`;
  const role = secondLineRole(n);
  return [
    { kind: 'path', d, role: 'limb' },
    { kind: 'circle', cx, cy: top + BUST.headY, r: BUST.head, role: 'head' },
    { kind: 'text', ...art.label, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...given(n.tech, (t) => ({ kind: 'text', ...art.tech, text: t, role, font: role, anchor: 'middle' })),
  ];
}

/**
 * A box on paper: white with a fine outline, the core in yellow, status as a dot after the name; in a diff picture an
 * added box with a heavy outline and a removed one dotted. The core keeps its yellow when it is new; its tag says so.
 */
export function paperBoxShapes(p: PlacedElement, art: BoxArt, m: Metrics): Shape[] {
  const n = p.node;
  const shift = n.shape === 'db' ? DB_SHIFT : 0;
  const at = (spot: { x: number; y: number }) => ({ x: spot.x, y: spot.y + shift });
  const change = n.origin === 'added' ? 'boxAdded' : n.origin === 'removed' ? 'boxRemoved' : 'box';
  const body = n.emph && n.origin !== 'removed' ? 'boxEmph' : change;
  const out: Shape[] = bodyShapes(n.shape, p.rect, body, 'detail', NODE_RX);
  if (n.shape === 'job') out.push(...clockShapes(art.clock, 'detail'));
  if (n.replicas !== undefined) out.push(...replicaShapes(`x${n.replicas}`, art.replicas));
  if (n.icon)
    out.push({ kind: 'icon', icon: n.icon, ...art.icon, y: art.icon.y + shift, role: iconRole(n.icon, 'ink') });
  out.push({ kind: 'text', ...at(art.label), text: n.label, role: 'name', font: 'name' });
  if (n.tech)
    out.push({ kind: 'text', ...at(art.tech), text: n.tech, role: secondLineRole(n), font: secondLineRole(n) });
  if (n.status) {
    const cx = art.label.x + textWidth(n.label, m.fonts.name) + DOT.gap;
    const role = n.status === 'planned' ? 'statusPlanned' : 'statusDeprecated';
    out.push({ kind: 'circle', cx, cy: art.label.y + shift - DOT.rise, r: DOT.r, role });
  }
  return out;
}

/** A zone: an area without border for the own system, a fine frame else; title in small capitals, team below. */
export function paperFrame(f: PlacedFrame, texts: Texts): Shape[] {
  const { group: g, head } = f;
  const area = g.tone ? `tint-${g.tone}` : g.role === 'own' ? 'frameOwn' : 'frame';
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  return [
    { kind: 'rect', ...f.rect, role: area },
    ...given(g.title, (t) => ({
      kind: 'text',
      ...head.title,
      text: t.toUpperCase(),
      role: 'frameTitle',
      font: 'group',
    })),
    ...given(team, (t) => ({ kind: 'text', ...head.subtitle, text: t, role: 'frameTeam', font: 'note' })),
  ];
}

/** A flow number in a small circle on paper, centred on (x, y). */
export const paperBadge = (n: number, x: number, y: number): Shape[] => [
  { kind: 'circle', cx: x, cy: y, r: BADGE_R, role: 'badge' },
  { kind: 'text', x, y: y + BADGE_DY, text: String(n), role: 'badgeText', font: 'badge', anchor: 'middle' },
];

/** Hairlines and texts of the margin notes and the legend sentence. */
export const sheetShapes = (sheet: PaperSheet): Shape[] => [
  ...sheet.rules.map((r): Shape => ({ kind: 'line', ...r, role: 'marginRule' })),
  ...sheet.texts.map((t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: t.role, font: 'label' })),
];

/**
 * The texts of one route standing on its line: first a gap in the colour of the ground, which cuts the line behind
 * them, then name in ink and detail in the second ink.
 */
export function paperLabelShapes(labels: readonly EdgeLabel[], under: readonly Surface[]): Shape[] {
  if (labels.length === 0) return [];
  const left = Math.min(...labels.map((l) => l.box.x)) - GAP.x;
  const top = Math.min(...labels.map((l) => l.box.y)) - GAP.y;
  const w = Math.max(...labels.map((l) => l.box.x + l.box.w)) + GAP.x - left;
  const h = Math.max(...labels.map((l) => l.box.y + l.box.h)) + GAP.y - top;
  const zone = surfacesAt(under, left + w / 2, top + h / 2).some((s) => s.tone === 'zone');
  return [
    { kind: 'rect', x: left, y: top, w, h, role: zone ? 'labelGapZone' : 'labelGap' },
    ...labels.map(
      (l): Shape => ({
        kind: 'text',
        x: l.x,
        y: l.y,
        text: l.text,
        role: l.part === 'detail' ? 'edgeDetail' : 'edgeLabel',
        font: 'label',
        anchor: l.anchor,
      }),
    ),
  ];
}

/** Each layer as a fine bracket and leader, its name in small capitals where the leader ends; no box, no arrow. */
export const paperLayerShapes = (layers: readonly LayerArt[]): Shape[] =>
  layers.map(
    (l): Shape => ({
      kind: 'group',
      id: `layer-${l.row}`,
      children: [
        ...(l.spine ? [{ kind: 'line', ...l.spine, role: 'layerLine' } as const] : []),
        ...(l.attachment ? [{ kind: 'line', ...l.attachment, role: 'layerLine' } as const] : []),
        { kind: 'line', ...l.leader, role: 'layerLine' },
        {
          kind: 'text',
          x: l.rect.x,
          y: l.leader.y1 + LAYER_DY,
          text: l.label.toUpperCase(),
          role: 'kicker',
          font: 'group',
        },
      ],
    }),
  );
