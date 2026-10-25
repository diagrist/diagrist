import type { Route } from '@diagrist/layout-grid';
import { joinedSights } from '@diagrist/parts';
import type { EdgeKind } from '../grammar/edges.js';
import { SHAPES, STATUSES } from '../grammar/elements.js';
import type { Look } from '../looks/look.js';
import type { ArchGroup, ArchitectureModel, Role } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import type { SentenceWords } from '../texts/sentence.js';
import { CHANGES } from './diff.js';

const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];
const ROLES: readonly Role[] = ['own', 'shared', 'external'];

/** What a picture shows that its sentences explain, besides the model. */
export interface Shown {
  readonly routes: readonly Route[];
  /** The groups drawn as frames; groups heading a band are named by their head. */
  readonly frames: readonly ArchGroup[];
  readonly marked: boolean;
  /** Decisions stand below the picture, not beside it. */
  readonly below: boolean;
  /** Something is drawn as the context of `focus: dim`. */
  readonly context: boolean;
}

/**
 * The sentences of the legend (`legend: sentence`), which `sheetOf` of `parts` sets: what the picture shows, in the
 * order of the standard legend, each as the sight and its meaning, such as `Gestrichelt: asynchrones Domain-Event.`
 * With `nodeName: tab` shapes are drawn as icons, which the sentence on icons explains.
 */
export function legendSentences(
  model: ArchitectureModel,
  shown: Shown,
  look: Look,
  texts: Texts,
  words: SentenceWords,
): string[] {
  const nodes = model.nodes;
  const kinds = new Set(shown.routes.map((r) => model.edges[Number(r.edge)]?.kind));
  const roles = new Set(shown.frames.map((g) => g.role));
  const tab = look.options.nodeName === 'tab';
  const pairs: [string, string][] = [
    ...EDGE_ORDER.filter((k) => kinds.has(k)).map((k): [string, string] => [words.edges[k], texts.edges[k]]),
    ...ROLES.filter((r) => roles.has(r)).map((r): [string, string] => [words.roles[r], texts.roles[r]]),
  ];
  const shapes = tab ? [] : SHAPES.filter((s) => nodes.some((n) => n.shape === s));
  const sentences = [
    ...joinedSights(pairs),
    ...model.flows.map((f) => words.flow(f.id, f.from, f.to, f.accent)),
    ...(shown.context ? [words.context] : []),
    ...(nodes.some((n) => n.emph) ? [`${words.emph}: ${texts.emph}`] : []),
    ...STATUSES.filter((s) => nodes.some((n) => n.status === s)).map((s) => `${words.status[s]}: ${texts.status[s]}`),
    ...CHANGES.filter((c) => [...nodes, ...model.edges].some((x) => x.origin === c)).map(
      (c) => `${words.changes[c]}: ${texts.changes[c]}`,
    ),
    ...(nodes.some((n) => n.replicas !== undefined) ? [`${words.replicas}: ${texts.replicas}`] : []),
    ...shapes.map((s) => `${words.shapes[s]}: ${texts.shapes[s]}`),
    ...(shown.marked ? [shown.below ? words.markBelow : words.mark] : []),
    ...(nodes.some((n) => n.icon || (tab && n.shape)) ? [words.icon] : []),
  ];
  return sentences.map((s) => `${s}.`);
}
