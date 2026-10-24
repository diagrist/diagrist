import type { GridRow, GridSpec, Pads } from './spec.js';

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

/** Room for something beside a node, such as a note: `rows` empty rows directly below or above the node's rows. */
export interface Slot {
  readonly near: string;
  readonly below: boolean;
  readonly rows?: number;
}

/**
 * The spec with empty rows kept free next to nodes. Rows are inserted below the last or above the first row of the
 * node's area; slots for unknown nodes are ignored. The new rows are named after the node, so they never clash with
 * the kind's own names.
 */
export function insertRows(spec: GridSpec, slots: readonly Slot[]): GridSpec {
  let rows: GridRow[] = [...spec.rows];
  for (const slot of slots) {
    const node = spec.nodes.find((n) => n.id === slot.near);
    const anchor = node && (slot.below ? (node.to?.row ?? node.row) : node.row);
    const at = anchor === undefined ? -1 : rows.findIndex((r) => r.name === anchor);
    if (at < 0) continue;
    const free = Array.from({ length: slot.rows ?? 1 }, (_, k) => ({
      name: unique(rows, `~${slot.near}${slot.below ? '+' : '-'}${k + 1}`),
    }));
    rows = [...rows.slice(0, slot.below ? at + 1 : at), ...free, ...rows.slice(slot.below ? at + 1 : at)];
  }
  return { ...spec, rows };
}

function unique(rows: readonly GridRow[], name: string): string {
  let candidate = name;
  for (let n = 2; rows.some((r) => r.name === candidate); n++) candidate = `${name}~${n}`;
  return candidate;
}
