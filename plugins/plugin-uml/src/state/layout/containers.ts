import { textWidth } from '@diagrist/core';
import type { GraphContainer } from '@diagrist/layout-grid';
import { frameOf, isBorderPoint, regionsOf, type StateModel } from '../model.js';
import { compositeHead } from './ids.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';
import { regionNameRoom } from './regions.js';

/**
 * The frame or region a vertex is drawn in: its parent state, or the region it stands in directly. Entry and exit
 * points stand in none, they sit on the outline of their state.
 */
export function homeOf(m: StateModel, id: string): string | undefined {
  const v = m.vertices.get(id);
  if (v === undefined || isBorderPoint(v.kind)) return undefined;
  const p = v.parent === undefined ? undefined : m.vertices.get(v.parent);
  return p?.kind === 'region' ? p.id : frameOf(m, v.parent);
}

/**
 * Composite states as frames with their name field and compartment as head, and their orthogonal regions as parts
 * of them (ADR 0039, 12): a state with regions holds no pad of its own, its regions stand side by side in it, each
 * with its name at the top left, and fill it when laid out, so a divider runs where two meet. A state with entry or
 * exit points keeps half a point more room inside, so a line through a point runs straight into its head.
 */
export function stateContainers(m: StateModel, members: readonly string[]): GraphContainer[] {
  const holds = (owner: string) => members.filter((n) => homeOf(m, n) === owner);
  return m.diagram.vertices.flatMap((v): GraphContainer[] => {
    if (v.kind === 'region') {
      const named = v.label !== undefined && v.label !== '';
      return v.parent === undefined
        ? []
        : [
            {
              id: v.id,
              kind: 'part',
              members: holds(v.id),
              parent: v.parent,
              pad: S.padSide,
              top: (named ? S.regionNameH : 0) + S.padBottom,
              head: { width: regionNameRoom(v.label), height: named ? S.regionNameH : 0 },
            },
          ];
    }
    if (!m.composites.has(v.id)) return [];
    const parent = homeOf(m, v.id);
    const head = compositeHead(m, v.id);
    const parted = regionsOf(m, v.id).length > 0;
    const pointed = m.diagram.vertices.some((p) => isBorderPoint(p.kind) && p.parent === v.id);
    const pad = S.padSide + (pointed ? S.point / 2 : 0);
    return [
      {
        id: v.id,
        kind: 'frame',
        members: holds(v.id),
        ...(parent === undefined ? {} : { parent }),
        pad: parted ? 0 : pad,
        top: parted ? head : head + pad,
        head: { width: textWidth(v.label ?? '', F.name) + 2 * S.padX, height: head },
      },
    ];
  });
}
