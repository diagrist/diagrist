import type { GridSpec, Pads } from './spec.js';

/**
 * The spec for a second run, with frames grown by `pads` on top of their own. A kind that finds after routing that
 * a frame needs more room (a head crossed by lines, points on a border) grows it and places again, as often as it
 * allows itself; the grid never runs itself twice.
 */
export function grow(spec: GridSpec, pads: ReadonlyMap<string, Pads>): GridSpec {
  return {
    ...spec,
    groups: spec.groups.map((g) => {
      const more = pads.get(g.id);
      if (!more) return g;
      const p = g.pads;
      const sum = {
        top: p.top + more.top,
        bottom: p.bottom + more.bottom,
        left: p.left + more.left,
        right: p.right + more.right,
      };
      return { ...g, pads: sum };
    }),
  };
}
