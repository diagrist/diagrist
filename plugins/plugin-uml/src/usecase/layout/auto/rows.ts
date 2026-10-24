import type { Actor } from '../../diagram.js';
import { casesOf, type Parts } from './parts.js';

/** Actors stand one and a half rows apart, so figure and name have room. */
export const ACTOR = { gap: 1.5, step: 0.5 } as const;
/** Empty rows between two subjects, for the foot and head of their frames. */
const BAND_GAP = 2;

/** Abstract row per element; actors may stand between two rows. */
export type Positions = Map<string, number>;

const at = (pos: ReadonlyMap<string, number>, id: string): number => pos.get(id) ?? 0;

export const mean = (ids: readonly string[], pos: ReadonlyMap<string, number>): number | undefined => {
  const known = ids.flatMap((id) => pos.get(id) ?? []);
  return known.length ? known.reduce((s, v) => s + v, 0) / known.length : undefined;
};

/** Wished row of an actor: the middle of its use cases; a special role without own cases below the general one. */
export function actorWish(a: Actor, p: Parts, pos: ReadonlyMap<string, number>): number | undefined {
  const own = mean(casesOf(a.id, p), pos);
  if (own !== undefined) return own;
  const general = p.relations.find((r) => r.kind === 'generalization' && r.from === a.id)?.to;
  const above = general === undefined ? undefined : pos.get(general);
  return above === undefined ? undefined : above + ACTOR.gap;
}

export function wishes(ids: readonly string[], wish: (id: string) => number | undefined): Map<string, number> {
  return new Map(
    ids.flatMap((id) => [[id, wish(id)] as const]).filter((e): e is [string, number] => e[1] !== undefined),
  );
}

/** Subjects above each other: each starts two rows below the end of the one before. */
export function stackBands(p: Parts, bandOf: (id: string) => number, pos: Positions): void {
  let end: number | undefined;
  for (let b = 0; b <= Math.max(0, ...p.cases.map((c) => bandOf(c.id))); b++) {
    const ids = p.cases.filter((c) => bandOf(c.id) === b).map((c) => c.id);
    if (!ids.length) continue;
    const lo = Math.min(...ids.map((id) => at(pos, id)));
    const shift = end === undefined ? 0 : end + BAND_GAP - lo;
    for (const id of ids) pos.set(id, at(pos, id) + shift);
    end = Math.max(...ids.map((id) => at(pos, id)));
  }
}

/**
 * Several subjects: an actor between two pulls its use cases to their edge, which leaves empty rows in a subject.
 * They go; the order in every column stays.
 */
export function compact(p: Parts, bandOf: (id: string) => number, pos: Positions): void {
  for (const b of new Set(p.cases.map((c) => bandOf(c.id)))) {
    const ids = p.cases.filter((c) => bandOf(c.id) === b).map((c) => c.id);
    const rows = [...new Set(ids.map((id) => at(pos, id)))].sort((x, y) => x - y);
    for (const id of ids) pos.set(id, (rows[0] ?? 0) + rows.indexOf(at(pos, id)));
  }
}

/** Room for a note beside a node: `rows` empty rows directly below or above the node's row. */
export interface Slot {
  readonly near: string;
  readonly below: boolean;
  readonly rows?: number;
}

/**
 * Inserts empty rows below (or above) `near`: everything below moves down; with `scope` only those elements, such as
 * the use cases of one subject when subjects stand side by side. Returns the first row kept free.
 */
export function insertRow(pos: Positions, s: Slot, scope?: (id: string) => boolean): number {
  const near = pos.get(s.near);
  if (near === undefined) return Number.POSITIVE_INFINITY;
  for (const [id, v] of pos)
    if ((scope?.(id) ?? true) && (s.below ? v > near : v >= near)) pos.set(id, v + (s.rows ?? 1));
  return s.below ? near + 1 : near;
}
