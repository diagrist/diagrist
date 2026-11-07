import { casesOf, families, isLinked, type Parts, type Side } from './parts.js';

/** Does a member of the family have its side given with `side=`? Such a family keeps its lane. */
export const sideGiven = (members: readonly string[], p: Parts): boolean =>
  members.some((id) => p.actors.find((a) => a.id === id)?.side !== undefined);

interface Scored {
  readonly members: readonly string[];
  readonly score: number;
  readonly fixed: boolean;
  /** Would lines run across other columns from the side `to`? */
  readonly far: (to: Side) => boolean;
  side: Side;
}

/**
 * Side per actor: given with `side=`; else for the whole family (a role and its specializations) by the mean
 * column of its use cases, system actors rather right. So the generalization stays short. Where subjects stand side
 * by side (`shared`), the lane on either side may be shared with the actors of a neighbour, and a family whose lines
 * would run across other columns from its side and not from the other takes the other: a system that takes part in a
 * base use case stands left of it rather than reach it past the cases it includes.
 */
export function sides(p: Parts, depth: ReadonlyMap<string, number>, shared = false): Map<string, Side> {
  const last = Math.max(0, ...depth.values());
  const byId = new Map(p.actors.map((a) => [a.id, a]));
  const scored = families(p).map((members): Scored => {
    const cols = members.flatMap((id) => casesOf(id, p).flatMap((c) => depth.get(c) ?? []));
    const systems = members.filter((id) => byId.get(id)?.system).length / members.length;
    const mean = cols.length ? cols.reduce((s, c) => s + c, 0) / cols.length : 0;
    const score = (last ? mean / last : 0) + systems * 0.5;
    const fixed = sideGiven(members, p);
    const linked = members.flatMap((id) => casesOf(id, p).filter((c) => isLinked(c, p)));
    const far = (to: Side) =>
      last > 0 && linked.some((c) => (to === 'right' ? (depth.get(c) ?? 0) < last : (depth.get(c) ?? 0) > 0));
    const by: Side = score >= 0.5 ? 'right' : 'left';
    const other: Side = by === 'right' ? 'left' : 'right';
    return { members, score, fixed, far, side: shared && far(by) && !far(other) ? other : by };
  });
  balance(scored);
  const side = new Map<string, Side>();
  for (const f of scored) for (const id of f.members) side.set(id, byId.get(id)?.side ?? f.side);
  return side;
}

/**
 * Many actors on one side make the picture long: while one side has at least two more, the family with the highest
 * score (the last declared on a tie) changes sides, if that shrinks the difference. Given sides stay, and so do
 * families whose lines would cross the picture from the other side.
 */
function balance(scored: Scored[]): void {
  const count = (s: Side) => scored.filter((f) => f.side === s).reduce((n, f) => n + f.members.length, 0);
  for (let moved = true; moved; ) {
    moved = false;
    const diff = count('left') - count('right');
    if (Math.abs(diff) < 2) return;
    const from: Side = diff > 0 ? 'left' : 'right';
    const to: Side = from === 'left' ? 'right' : 'left';
    const movable = scored.filter(
      (f) => f.side === from && !f.fixed && !f.far(to) && 2 * f.members.length < 2 * Math.abs(diff),
    );
    const pick = movable.reduce<Scored | undefined>(
      (best, f) => (best === undefined || (from === 'left' ? f.score >= best.score : f.score <= best.score) ? f : best),
      undefined,
    );
    if (pick) {
      pick.side = to;
      moved = true;
    }
  }
}
