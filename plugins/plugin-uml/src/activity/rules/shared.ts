import type { Finding, Rule } from '@diagrist/core';
import type { Severity, Span } from '@diagrist/lang';
import type { ActivityNode, Flow } from '../diagram.js';
import type { NodeKind } from '../grammar/values.js';
import type { ActivityModel } from '../model/index.js';

/** A rule of the activity kind. */
export type ActivityRule = Rule<ActivityModel>;

/** Declares a rule; `check` returns findings, the code and severity are written once here. */
export const defineRule = (
  code: string,
  severity: Severity,
  doc: string,
  check: (model: ActivityModel) => readonly Finding[],
): ActivityRule => ({ code, severity, doc, check });

/** Object nodes in the wider sense: object, data store, buffer (UML 2.5.1, 15.4). */
export const OBJECT_KINDS: ReadonlySet<NodeKind> = new Set(['object', 'datastore', 'buffer']);

/** Nodes of the given kinds in source order, without expansion nodes. */
export const nodesOf = (m: ActivityModel, ...kinds: readonly NodeKind[]): ActivityNode[] =>
  m.nodes.filter((n) => n.port === undefined && kinds.includes(n.kind));

/** Incoming edges without loops. */
export const inputs = (m: ActivityModel, id: string): readonly Flow[] => m.ins(id).filter((f) => f.from !== id);

/** The guard as drawn, `else` for the flag. */
export const guardText = (f: Flow): string | undefined => (f.else ? 'else' : f.guard);

/**
 * Values that name a node in a message: its kind (`expansion` for an expansion node, whose region is the label)
 * and its text or id. The catalogue turns the kind into a noun of its locale.
 */
export function named(n: ActivityNode, m: ActivityModel, prefix = ''): Record<string, string> {
  const region = n.port ? m.diagram.expansions.find((x) => x.id === n.port?.region) : undefined;
  const label = region ? (region.label ?? region.id) : n.label || n.id;
  return { [`${prefix}kind`]: n.port ? 'expansion' : n.kind, [`${prefix}node`]: label };
}

/** A finding at `span` with the values of a node and more. */
export const at = (span: Span, values: Record<string, string>): Finding => ({ span, values });

/** Every node reached from `starts` along edges; a node for which `stop` holds is entered but not left. */
export function reach(m: ActivityModel, starts: readonly string[], stop: (id: string) => boolean = () => false) {
  const seen = new Set<string>(starts);
  const queue = [...starts];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (stop(id) && !starts.includes(id)) continue;
    for (const f of m.outs(id))
      if (!seen.has(f.to)) {
        seen.add(f.to);
        queue.push(f.to);
      }
  }
  return seen;
}

const BRANCHES = new Set<NodeKind>(['decision', 'fork']);

/** Where a branch comes from: back from the source of an edge while the way is unique, up to a decision or fork. */
function branchOrigin(m: ActivityModel, flow: Flow): ActivityNode | undefined {
  const seen = new Set<string>();
  let id = flow.from;
  while (!seen.has(id)) {
    seen.add(id);
    const node = m.byId.get(id);
    if (!node) return undefined;
    if (BRANCHES.has(node.kind) && node.port === undefined) return node;
    const ins = inputs(m, id);
    const only = ins[0];
    if (ins.length !== 1 || !only) return undefined;
    id = only.from;
  }
  return undefined;
}

/** The decision or fork of kind `kind` from which at least two inputs of `target` come, one per branch. */
export function joinedFrom(m: ActivityModel, target: ActivityNode, kind: NodeKind): ActivityNode | undefined {
  const counts = new Map<ActivityNode, number>();
  for (const f of inputs(m, target.id)) {
    const o = branchOrigin(m, f);
    if (o?.kind === kind) counts.set(o, (counts.get(o) ?? 0) + 1);
  }
  return [...counts].find(([, n]) => n >= 2)?.[0];
}

/** The edge as written, such as `a -> b`, for the texts of findings. */
export const flowText = (f: Flow): string =>
  `${f.from} ${f.interrupt ? '~>' : f.kind === 'object' ? '=>' : '->'} ${f.to}`;

/** The edge as the source writes it: an end at an expansion node shows the region's id. */
export const written = (m: ActivityModel, f: Flow): string => flowText(m.diagram.flows[m.flows.indexOf(f)] ?? f);
