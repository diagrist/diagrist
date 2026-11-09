import { type NodeForm, type Rect, rectForm, type Shape } from '@diagrist/core';
import type { ShapeName } from '../../declarations.js';
import { ITEM } from '../layout/metrics.js';

/** Role of an item's outline by its status. */
export const outlineRole = (status: 'planned' | 'deprecated' | undefined): string =>
  status === 'planned' ? 'itemPlanned' : status === 'deprecated' ? 'itemDeprecated' : 'item';

const n = (v: number) => Math.round(v * 100) / 100;

/** Corner radius of a `round` item, half its height up to 16, and of every boxed one. */
const roundRx = (h: number, scale: number) => Math.min(h / 2, 16 * scale);
const BOX_RX = 3;

/**
 * The form of an item's body as `outline` draws it: a store is a cylinder, a document a sheet with a folded corner,
 * the others boxes by their corner radius, a person's with the figure as a detail inside.
 */
export function outlineForm(shape: ShapeName, r: Rect): NodeForm {
  if (shape === 'store') return 'cylinder';
  if (shape === 'doc') return 'file';
  return rectForm(shape === 'round' ? roundRx(r.h, 1) : BOX_RX);
}

/**
 * The outline of an item of `shape` in `r`, and the details that make the shape: the lid of a store, the fold of a
 * document, the figure of a person at the left. `scale` shrinks the details for the samples of the legend.
 */
export function outline(shape: ShapeName, r: Rect, role: string, scale = 1): Shape[] {
  const { x, y, w, h } = r;
  const right = x + w;
  const bottom = y + h;
  if (shape === 'round') return [{ kind: 'rect', x, y, w, h, rx: roundRx(h, scale), role }];
  if (shape === 'store') {
    const ry = (ITEM.lid * scale) / 2;
    const arc = `A ${n(w / 2)} ${n(ry)} 0 0`;
    return [
      {
        kind: 'path',
        d: `M ${n(x)} ${n(y + ry)} ${arc} 1 ${n(right)} ${n(y + ry)} V ${n(bottom - ry)} ${arc} 1 ${n(x)} ${n(bottom - ry)} Z`,
        role,
      },
      { kind: 'path', d: `M ${n(x)} ${n(y + ry)} ${arc} 0 ${n(right)} ${n(y + ry)}`, role: 'itemDetail' },
    ];
  }
  if (shape === 'doc') {
    const f = ITEM.fold * scale;
    return [
      {
        kind: 'path',
        d: `M ${n(x)} ${n(y)} H ${n(right - f)} L ${n(right)} ${n(y + f)} V ${n(bottom)} H ${n(x)} Z`,
        role,
      },
      { kind: 'path', d: `M ${n(right - f)} ${n(y)} V ${n(y + f)} H ${n(right)}`, role: 'itemDetail' },
    ];
  }
  const box: Shape = { kind: 'rect', x, y, w, h, rx: BOX_RX * scale, role };
  if (shape !== 'person') return [box];
  const cx = x + (ITEM.padX + 4) * scale;
  const cy = y + h / 2;
  const s = scale;
  return [
    box,
    { kind: 'circle', cx: n(cx), cy: n(cy - 5 * s), r: n(3.5 * s), role: 'itemDetail' },
    {
      kind: 'path',
      d: `M ${n(cx - 6 * s)} ${n(cy + 7 * s)} Q ${n(cx - 6 * s)} ${n(cy)} ${n(cx)} ${n(cy)} Q ${n(cx + 6 * s)} ${n(cy)} ${n(cx + 6 * s)} ${n(cy + 7 * s)}`,
      role: 'itemDetail',
    },
  ];
}
