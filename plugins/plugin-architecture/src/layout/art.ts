import { type Rect, type Tone, textWidth } from '@diagrist/core';
import type { Look } from '../looks/look.js';
import type { ArchNode } from '../model/types.js';
import type { BoxArt, NodeArt, PersonArt, Spot } from './art-types.js';
import { textArea } from './cylinder.js';
import { blockForm, isCircle, isFigure, STATUS_GAP, secondLine, TUBE_MEASURES as TUBE } from './measure.js';
import { tabParts } from './tab.js';

const HEAD_R = 9;
/** The step between the lines below a stick figure. */
const PERSON_LINE = 14;
const CORNER = 15;
const REPLICA_SHIFT = 26;
const LIGHT_TONES: ReadonlySet<Tone> = new Set(['peach', 'sky']);
/** Icons a circle of the `card` family without own icon takes from its shape. */
const SHAPE_ICON = { db: 'database', queue: 'layers', store: 'archive', job: 'cpu', app: 'monitor' } as const;

/** `count` spots one line apart, the first a line below `from`. */
export const linesBelow = (from: Spot, count: number, step: number): Spot[] =>
  Array.from({ length: count }, (_, i) => ({ x: from.x, y: from.y + (i + 1) * step }));

function personArt(n: ArchNode, rect: Rect): PersonArt {
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
    lines: linesBelow({ x, y: y + 74 }, n.lines.length, PERSON_LINE),
    tech: { x, y: y + 88 + n.lines.length * PERSON_LINE },
  };
}

function cardParts(n: ArchNode, rect: Rect, look: Look): Pick<BoxArt, 'card' | 'label' | 'lines' | 'tech'> {
  const m = look.metrics;
  const cx = rect.x + rect.w / 2;
  if (isCircle(n, look)) {
    const label = { x: cx, y: rect.y + rect.h + look.fonts.name.size + 6 };
    const icon = n.icon ?? (n.shape ? SHAPE_ICON[n.shape] : undefined);
    const circle = { cx, cy: rect.y + rect.h / 2, r: rect.w / 2 };
    const k = n.lines.length;
    return {
      card: { form: 'circle', circle, stack: [], ...(icon ? { icon } : {}) },
      label,
      lines: linesBelow(label, k, m.nodeLineH),
      tech: { x: cx, y: label.y + (k + 1) * m.nodeLineH },
    };
  }
  const top = n.icon !== undefined ? m.cardIconR : 0;
  const lines = n.tech !== undefined || n.status !== undefined ? m.nodeLineH : 0;
  const extra = n.lines.length * m.nodeLineH;
  const labelY = rect.y + top + (rect.h - top - lines - extra) / 2 + m.labelDy;
  const layers = n.replicas !== undefined && look.options.replicas === 'stack' ? Math.min(n.replicas - 1, 2) : 0;
  const stack = Array.from({ length: layers }, (_, i) => {
    const k = (layers - i) * m.stackOffset;
    return { ...rect, x: rect.x + k, y: rect.y + k };
  });
  const circle = n.icon !== undefined ? { circle: { cx, cy: rect.y, r: m.cardIconR }, icon: n.icon } : {};
  const label = { x: cx, y: labelY };
  const entries = linesBelow(label, n.lines.length, m.nodeLineH);
  return {
    card: { form: 'card', stack, ...circle },
    label,
    lines: entries,
    tech: { x: cx, y: labelY + extra + lines },
  };
}

function blockParts(n: ArchNode, rect: Rect, look: Look): Pick<BoxArt, 'block' | 'label' | 'lines' | 'tech'> {
  const m = look.metrics;
  const form = blockForm(n);
  const tone = n.tone ?? (form === 'box' ? 'sky' : 'blue');
  const cx = rect.x + rect.w / 2;
  const k = n.lines.length;
  if (form === 'pipe') {
    const flowY = rect.y + TUBE.top + TUBE.arrow / 2;
    const pipe = { x: rect.x, y: rect.y + TUBE.top + TUBE.arrow + TUBE.gap, w: rect.w, h: TUBE.body };
    const label = { x: cx, y: pipe.y + pipe.h + TUBE.gap + look.fonts.name.size };
    const flow = { x1: rect.x, y1: flowY, x2: rect.x + rect.w, y2: flowY };
    const tech = { x: cx, y: label.y + (k + 1) * m.nodeLineH };
    return { block: { form, tone, dark: false, flow, pipe }, label, lines: linesBelow(label, k, m.nodeLineH), tech };
  }
  const lines = n.tech !== undefined ? m.nodeLineH : 0;
  const extra = k * m.nodeLineH;
  const area = textArea(rect, form, 'block');
  const labelY = area.y + area.h / 2 - (lines + extra) / 2 + m.labelDy;
  const block = { form, tone, dark: form !== 'text' && !LIGHT_TONES.has(tone) };
  const label = { x: cx, y: labelY };
  return { block, label, lines: linesBelow(label, k, m.nodeLineH), tech: { x: cx, y: labelY + extra + lines } };
}

/**
 * The art of a node in its rectangle, by the node family of the look. Icon and texts of a box or block stand in the
 * middle of its `textArea`, which for a cylinder is the body below the front of its lid.
 */
export function nodeArt(n: ArchNode, rect: Rect, look: Look): NodeArt {
  if (isFigure(n, look)) return personArt(n, rect);
  const m = look.metrics;
  const family = look.options.nodes;
  const techWidth = n.tech !== undefined ? textWidth(n.tech, secondLine(n, look.fonts)) : 0;
  const clock = { x: rect.x + rect.w - CORNER, y: rect.y + CORNER };
  const noIcon = { x: 0, y: 0, size: m.iconSize };
  if (family === 'card' || family === 'block') {
    const parts = family === 'card' ? cardParts(n, rect, look) : blockParts(n, rect, look);
    const status = {
      x: n.tech === undefined ? parts.tech.x : parts.tech.x + techWidth / 2 + STATUS_GAP,
      y: parts.tech.y,
    };
    return { kind: 'box', icon: noIcon, status, clock, replicas: clock, ...parts };
  }
  if (look.options.nodeName === 'tab') {
    const { tab, label, lines, tech, icon } = tabParts(n, rect, look, secondLine(n, look.fonts));
    const status = { x: label.x, y: label.y };
    const replicas = clock;
    return { kind: 'box', tab, label, lines, tech, icon: { ...icon, size: m.iconSize }, status, clock, replicas };
  }
  const area = textArea(rect, n.shape, 'box');
  const middle = area.y + area.h / 2;
  const ix = rect.x + m.nodePad;
  const start = n.icon !== undefined ? ix + m.iconSize + m.iconGap : ix;
  const centred = look.options.nodeAlign === 'middle';
  const tx = centred ? (start + rect.x + rect.w - m.nodePad) / 2 : start;
  const below = n.lines.length + (n.tech !== undefined ? 1 : 0);
  const ty = middle + (below > 0 ? m.labelDyTech : m.labelDy) - (Math.max(below, 1) - 1) * (m.nodeLineH / 2);
  const techY = ty + (n.lines.length + 1) * m.nodeLineH;
  const statusX = centred ? tx + techWidth / 2 + STATUS_GAP : tx + techWidth + STATUS_GAP;
  return {
    kind: 'box',
    icon: { x: ix, y: middle - m.iconSize / 2, size: m.iconSize },
    label: { x: tx, y: ty },
    lines: linesBelow({ x: tx, y: ty }, n.lines.length, m.nodeLineH),
    tech: { x: tx, y: techY },
    status: { x: statusX, y: techY },
    clock,
    replicas: n.shape === 'job' ? { x: clock.x - REPLICA_SHIFT, y: clock.y } : clock,
    ...(centred ? { middle: true } : {}),
  };
}
