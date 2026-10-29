import type { Rect, Shape } from '@diagrist/core';
import type { ShapeName } from '../../declarations.js';
import { ITEM } from '../layout/metrics.js';

/** Role of an item's outline by its status. */
export const outlineRole = (status: 'planned' | 'deprecated' | undefined): string =>
  status === 'planned' ? 'itemPlanned' : status === 'deprecated' ? 'itemDeprecated' : 'item';

/** Role of an item's shape: by its status, else the card in the tone of its type, else the neutral card. */
export const cardRole = (status: 'planned' | 'deprecated' | undefined, tone: string | undefined): string =>
  status !== undefined ? outlineRole(status) : tone !== undefined ? `card-${tone}` : 'item';

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * The outline of an item of `shape` in `r`, and the details that make the shape: the lid of a store, the fold of a
 * document, the figure of a person at the left. `scale` shrinks the details for the samples of the legend.
 */
export function outline(shape: ShapeName, r: Rect, role: string, scale = 1): Shape[] {
  const { x, y, w, h } = r;
  const right = x + w;
  const bottom = y + h;
  if (shape === 'round') return [{ kind: 'rect', x, y, w, h, rx: Math.min(h / 2, 16 * scale), role }];
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
  const box: Shape = { kind: 'rect', x, y, w, h, rx: 8 * scale, role };
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
