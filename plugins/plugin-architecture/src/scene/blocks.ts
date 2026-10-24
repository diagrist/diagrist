import type { Rect, Shape, Tone } from '@diagrist/core';
import type { BlockArt, BoxArt } from '../layout/art.js';
import type { PlacedElement } from '../layout/index.js';

/** Corner radius of blocks and frames in `look=blocks`. */
export const BLOCK_RX = 10;
const SHADOW = 5;
const DB_RY = 12;
const HEAD = 10;

/** A filled area with a strong border and a shadow behind it. */
export const filledShapes = (r: Rect, tone: Tone, rx: number): Shape[] => [
  { kind: 'rect', ...r, x: r.x + SHADOW, y: r.y + SHADOW, rx, role: 'blockShadow' },
  { kind: 'rect', ...r, rx, role: `block-${tone}` },
];

function pipe(block: BlockArt): Shape[] {
  const p = block.pipe;
  const f = block.flow;
  if (!p || !f) return [];
  const r = p.h / 2;
  const capX = p.x + p.w - r / 2;
  const bottom = p.y + p.h;
  return [
    { kind: 'path', d: `M${f.x1} ${f.y1} L${f.x2 - HEAD} ${f.y2}`, role: 'blockFlow' },
    {
      kind: 'path',
      d: `M${f.x2 - HEAD} ${f.y2 - HEAD / 1.4} L${f.x2} ${f.y2} L${f.x2 - HEAD} ${f.y2 + HEAD / 1.4} Z`,
      role: 'blockFlowHead',
    },
    ...filledShapes(p, block.tone, r),
    {
      kind: 'path',
      d: `M${capX} ${p.y} A${r / 2} ${r} 0 0 1 ${capX} ${bottom} A${r / 2} ${r} 0 0 1 ${capX} ${p.y} Z`,
      role: 'blockCap',
    },
  ];
}

function cylinder(r: Rect, tone: Tone): Shape[] {
  const top = r.y + DB_RY;
  const base = r.y + r.h - DB_RY;
  const right = r.x + r.w;
  const arc = `${r.w / 2} ${DB_RY} 0 0 1`;
  const body = `M${r.x} ${top} A${arc} ${right} ${top} L${right} ${base} A${arc} ${r.x} ${base} Z`;
  return [
    { kind: 'path', d: body, role: 'blockShadow', offset: [SHADOW, SHADOW] },
    { kind: 'path', d: body, role: `block-${tone}` },
    { kind: 'path', d: `M${r.x} ${top} A${arc} ${right} ${top} A${arc} ${r.x} ${top} Z`, role: 'blockCap' },
  ];
}

/** A node in `look=blocks`: a filled box, tube or cylinder with a shadow, or only its name; texts in the middle. */
export function blockShapes(p: PlacedElement, art: BoxArt, block: BlockArt): Shape[] {
  const n = p.node;
  const body =
    block.form === 'pipe'
      ? pipe(block)
      : block.form === 'db'
        ? cylinder(p.rect, block.tone)
        : block.form === 'box'
          ? filledShapes(p.rect, block.tone, BLOCK_RX)
          : [];
  const out: Shape[] = [...body];
  const text = block.dark ? 'blockLight' : 'blockDark';
  if (n.label) out.push({ kind: 'text', ...art.label, text: n.label, role: text, font: 'block', anchor: 'middle' });
  if (n.tech) out.push({ kind: 'text', ...art.tech, text: n.tech, role: 'tech', font: 'note', anchor: 'middle' });
  return out;
}
