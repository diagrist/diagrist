import type { Route } from '@diagrist/layout-grid';
import type { EdgeKind } from '../grammar/edges.js';
import { SHAPES, STATUSES } from '../grammar/elements.js';
import type { ArchitectureModel, Role } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import type { PaperWords } from '../texts/paper.js';

const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];
const ROLES: readonly Role[] = ['own', 'shared', 'external'];

/** Pairs of what is seen and what it means; meanings of the same sight join with `/`, in their order. */
function joined(pairs: readonly (readonly [string, string])[]): string[] {
  const bySight = new Map<string, string[]>();
  for (const [sight, meaning] of pairs) {
    const meanings = bySight.get(sight) ?? [];
    if (!meanings.includes(meaning)) meanings.push(meaning);
    bySight.set(sight, meanings);
  }
  return [...bySight].map(([sight, meanings]) => `${sight}: ${meanings.join(' / ')}`);
}

/**
 * The legend of `look=paper` as sentences: what the picture shows, in the order of the standard legend, each as
 * the sight and its meaning, such as `Gestrichelt: asynchrones Domain-Event.`
 */
export function paperLegend(
  model: ArchitectureModel,
  routes: readonly Route[],
  marked: boolean,
  texts: Texts,
  words: PaperWords,
): string[] {
  const nodes = model.nodes;
  const kinds = new Set(routes.map((r) => model.edges[Number(r.edge)]?.kind));
  const roles = new Set(model.groups.map((g) => g.role));
  const pairs: [string, string][] = [
    ...EDGE_ORDER.filter((k) => kinds.has(k)).map((k): [string, string] => [words.edges[k], texts.edges[k]]),
    ...ROLES.filter((r) => roles.has(r)).map((r): [string, string] => [words.roles[r], texts.roles[r]]),
  ];
  const sentences = [
    ...joined(pairs),
    ...model.flows.map((f) => words.flow(f.id, f.from, f.to, f.accent)),
    ...(nodes.some((n) => n.emph) ? [`${words.emph}: ${texts.emph}`] : []),
    ...STATUSES.filter((s) => nodes.some((n) => n.status === s)).map((s) => `${words.status[s]}: ${texts.status[s]}`),
    ...(nodes.some((n) => n.replicas !== undefined) ? [`${words.replicas}: ${texts.replicas}`] : []),
    ...SHAPES.filter((s) => nodes.some((n) => n.shape === s)).map((s) => `${words.shapes[s]}: ${texts.shapes[s]}`),
    ...(marked ? [words.mark] : []),
    ...(nodes.some((n) => n.icon) ? [words.icon] : []),
  ];
  return sentences.map((s) => `${s}.`);
}
