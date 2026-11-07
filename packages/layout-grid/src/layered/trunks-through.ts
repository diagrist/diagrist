import type { Ranked } from './rank.js';
import type { LayeredEdge, LayeredSpec } from './spec.js';

/**
 * The members of a fan share their placeholders through the layers: edges of one bundle whose chains start at one
 * node share one placeholder in every layer they all still cross, from the node on, so their trunk runs on one
 * vertical and each member parts from it in the gap above its own end, as a fan parts at its node (ADR 0039, shared
 * trunks). Only members whose ends stand in the frame of their node, and both in the core of a hub or both outside,
 * share, since a trunk that has to enter a frame jogs and every branch of it would bend twice more. Whole trunks
 * (`trunk: 'whole'`) keep their own placeholders, which `hangingOrder` spreads, and joins share none, since gathered
 * through the layers they read worse (layout plan N1, measured). A trunk keeps the placeholder of its first member; those it replaces leave `layerOf` and `dummies`.
 * Returns every shared placeholder with the edges through it, in the order of the edges.
 */
export function shareTrunks(
  spec: LayeredSpec,
  edges: readonly LayeredEdge[],
  layerOf: Map<string, number>,
  dummies: Set<string>,
  chains: Map<string, string[]>,
): Map<string, readonly string[]> {
  const frame = new Map((spec.frames ?? []).flatMap((f) => f.members.map((n) => [n, f.id] as const)));
  const core = new Set(spec.hub?.core);
  const home = (n: string) => `${core.has(n)}|${frame.get(n) ?? ''}`;
  const fans = new Map<string, string[]>();
  for (const e of edges) {
    const chain = chains.get(e.id);
    if (e.trunk === 'whole' || e.bundle === undefined || chain === undefined || chain.length < 3) continue;
    if (home(chain[0] as string) !== home(chain.at(-1) as string)) continue;
    const k = `${e.bundle}|${chain[0]}`;
    fans.set(k, [...(fans.get(k) ?? []), e.id]);
  }
  const shared = new Map<string, readonly string[]>();
  for (const members of fans.values()) {
    for (let i = 1; ; i++) {
      const at = (id: string) => chains.get(id)?.[i];
      const through = members.filter((id) => dummies.has(at(id) ?? ''));
      if (through.length < 2) break;
      const trunk = at(through[0] as string) as string;
      for (const id of through.slice(1)) {
        const own = at(id) as string;
        dummies.delete(own);
        layerOf.delete(own);
        (chains.get(id) as string[])[i] = trunk;
      }
      shared.set(trunk, through);
    }
  }
  return shared;
}

/**
 * What moves with a placeholder so the lines through it stay straight: a placeholder of a trunk moves with every
 * placeholder of the edges whose trunks it joins, their branches included, any other with the placeholders of its
 * chain that no other edge shares, the whole chain where it shares none.
 */
export function movingWith(ranked: Ranked): (d: string) => readonly string[] {
  const shared = ranked.shared ?? new Map<string, readonly string[]>();
  const own = new Map<string, readonly string[]>();
  for (const chain of ranked.chains.values()) {
    const mine = chain.slice(1, -1).filter((d) => !shared.has(d));
    for (const d of mine) own.set(d, mine);
  }
  const together = new Map<string, ReadonlySet<string>>();
  for (const through of shared.values()) {
    const merged = new Set(through.flatMap((e) => [...(together.get(e) ?? [e])]));
    for (const e of merged) together.set(e, merged);
  }
  const tree = new Map<string, readonly string[]>();
  for (const [d, through] of shared) {
    const edges = [...(together.get(through[0] as string) ?? [])];
    tree.set(d, [...new Set(edges.flatMap((e) => (ranked.chains.get(e) ?? []).slice(1, -1)))]);
  }
  return (d) => tree.get(d) ?? own.get(d) ?? [];
}
