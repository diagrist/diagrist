import { type Rect, type Tone, textWidth } from '@diagrist/core';
import type { ArchNode } from '../model/types.js';
import { type BlockForm, blockForm, isCircle, type Sizing, secondLine, TUBE_MEASURES as TUBE } from './measure.js';

/** A point where a text or a mark is anchored. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** A segment from (x1, y1) to (x2, y2). */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** A stick figure: head, body, arms, legs and the anchors of name and role below. */
export interface PersonArt {
  readonly kind: 'person';
  readonly head: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly body: Segment;
  readonly arms: Segment;
  readonly legs: readonly [Segment, Segment];
  readonly label: Spot;
  readonly tech: Spot;
}

/** The parts of a card in `look=cards`: the toned circle, its icon, and cards stacked behind for replicas. */
export interface CardArt {
  readonly form: 'card' | 'circle';
  readonly circle?: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly icon?: string;
  readonly stack: readonly Rect[];
}

/** A block in `look=blocks`: its form and tone, white text on dark tones, and for a tube its arrow and body. */
export interface BlockArt {
  readonly form: BlockForm;
  readonly tone: Tone;
  readonly dark: boolean;
  readonly flow?: Segment;
  readonly pipe?: Rect;
}

/** A box: where icon, name, second line, status, clock and replica tag stand, and what the look adds. */
export interface BoxArt {
  readonly kind: 'box';
  readonly icon: Spot & { readonly size: number };
  readonly label: Spot;
  readonly tech: Spot;
  readonly status: Spot;
  readonly clock: Spot;
  readonly replicas: Spot;
  readonly card?: CardArt;
  readonly block?: BlockArt;
}

/** Where everything inside a node stands; the scene only draws it. */
export type NodeArt = PersonArt | BoxArt;

const HEAD_R = 9;
const CORNER = 15;
const STATUS_GAP = 8;
const REPLICA_SHIFT = 26;
const LIGHT_TONES: ReadonlySet<Tone> = new Set(['peach', 'sky']);
/** Icons a circle without own icon takes from its shape in `look=cards`. */
const SHAPE_ICON = { db: 'database', queue: 'layers', store: 'archive', job: 'cpu', app: 'monitor' } as const;

function personArt(rect: Rect): PersonArt {
  const x = rect.x + rect.w / 2;
  const y = rect.y - 4;
  return {
    kind: 'person',
    head: { cx: x, cy: y + 9, r: HEAD_R },
    body: { x1: x, y1: y + 18, x2: x, y2: y + 42 },
    arms: { x1: x - 15, y1: y + 26, x2: x + 15, y2: y + 26 },
    legs: [
      { x1: x, y1: y + 42, x2: x - 12, y2: y + 58 },
      { x1: x, y1: y + 42, x2: x + 12, y2: y + 58 },
    ],
    label: { x, y: y + 74 },
    tech: { x, y: y + 88 },
  };
}

function cardParts(n: ArchNode, rect: Rect, { m }: Sizing): Pick<BoxArt, 'card' | 'label' | 'tech'> {
  const cx = rect.x + rect.w / 2;
  if (isCircle(n, 'cards')) {
    const label = { x: cx, y: rect.y + rect.h + m.fontSize.node + 6 };
    const icon = n.icon ?? (n.shape ? SHAPE_ICON[n.shape] : undefined);
    const circle = { cx, cy: rect.y + rect.h / 2, r: rect.w / 2 };
    return {
      card: { form: 'circle', circle, stack: [], ...(icon ? { icon } : {}) },
      label,
      tech: { x: cx, y: label.y + m.nodeLineH },
    };
  }
  const top = n.icon !== undefined ? m.cardIconR : 0;
  const lines = n.tech !== undefined ? m.nodeLineH : 0;
  const labelY = rect.y + top + (rect.h - top - lines) / 2 + m.labelDy;
  const layers = n.replicas !== undefined ? Math.min(n.replicas - 1, 2) : 0;
  const stack = Array.from({ length: layers }, (_, i) => {
    const k = (layers - i) * m.stackOffset;
    return { ...rect, x: rect.x + k, y: rect.y + k };
  });
  const circle = n.icon !== undefined ? { circle: { cx, cy: rect.y, r: m.cardIconR }, icon: n.icon } : {};
  return { card: { form: 'card', stack, ...circle }, label: { x: cx, y: labelY }, tech: { x: cx, y: labelY + lines } };
}

function blockParts(n: ArchNode, rect: Rect, { m }: Sizing): Pick<BoxArt, 'block' | 'label' | 'tech'> {
  const form = blockForm(n);
  const tone = n.tone ?? (form === 'box' ? 'sky' : 'blue');
  const cx = rect.x + rect.w / 2;
  if (form === 'pipe') {
    const flowY = rect.y + TUBE.top + TUBE.arrow / 2;
    const pipe = { x: rect.x, y: rect.y + TUBE.top + TUBE.arrow + TUBE.gap, w: rect.w, h: TUBE.body };
    const label = { x: cx, y: pipe.y + pipe.h + TUBE.gap + m.fontSize.node };
    const flow = { x1: rect.x, y1: flowY, x2: rect.x + rect.w, y2: flowY };
    return { block: { form, tone, dark: false, flow, pipe }, label, tech: { x: cx, y: label.y + m.nodeLineH } };
  }
  const lines = n.tech !== undefined ? m.nodeLineH : 0;
  const labelY = rect.y + rect.h / 2 - lines / 2 + m.labelDy;
  const block = { form, tone, dark: form !== 'text' && !LIGHT_TONES.has(tone) };
  return { block, label: { x: cx, y: labelY }, tech: { x: cx, y: labelY + lines } };
}

/** The art of a node in its rectangle and look. */
export function nodeArt(n: ArchNode, rect: Rect, sizing: Sizing): NodeArt {
  if (n.keyword === 'person') return personArt(rect);
  const m = sizing.m;
  const techWidth = n.tech !== undefined ? textWidth(n.tech, secondLine(n, m)) : 0;
  const clock = { x: rect.x + rect.w - CORNER, y: rect.y + CORNER };
  const noIcon = { x: 0, y: 0, size: m.iconSize };
  if (sizing.look === 'cards' || sizing.look === 'blocks') {
    const parts = sizing.look === 'cards' ? cardParts(n, rect, sizing) : blockParts(n, rect, sizing);
    const status = { x: parts.tech.x + techWidth / 2 + STATUS_GAP, y: parts.tech.y };
    return { kind: 'box', icon: noIcon, status, clock, replicas: clock, ...parts };
  }
  const ix = rect.x + m.nodePad;
  const tx = n.icon !== undefined ? ix + m.iconSize + m.iconGap : ix;
  const ty = rect.y + rect.h / 2 + (n.tech !== undefined ? m.labelDyTech : m.labelDy);
  return {
    kind: 'box',
    icon: { x: ix, y: rect.y + rect.h / 2 - m.iconSize / 2, size: m.iconSize },
    label: { x: tx, y: ty },
    tech: { x: tx, y: ty + m.nodeLineH },
    status: { x: tx + techWidth + STATUS_GAP, y: ty + m.nodeLineH },
    clock,
    replicas: n.shape === 'job' ? { x: clock.x - REPLICA_SHIFT, y: clock.y } : clock,
  };
}
