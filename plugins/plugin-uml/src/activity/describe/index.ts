import type { Locale } from '@diagrist/lang';
import { WORDS } from '@diagrist/parts';
import { TEXTS } from '../../texts/index.js';
import type { ActivityNode, Flow } from '../diagram.js';
import type { ActivityModel } from '../model/index.js';
import type { ActivityProse } from './prose.js';

/** A readable name: actions by their text, control nodes by kind and, where ambiguous, id. */
function namer(m: ActivityModel, p: ActivityProse): (n: ActivityNode) => string {
  const d = m.diagram;
  const kinds = new Map<string, number>();
  for (const n of d.nodes) kinds.set(n.kind, (kinds.get(n.kind) ?? 0) + 1);
  return (n) => {
    if (n.port) {
      const x = d.expansions.find((e) => e.id === n.port?.region);
      return p.port(n.port.side, n.port.name, x?.label ? p.quote(x.label) : n.port.region);
    }
    switch (n.kind) {
      case 'action':
        return n.label;
      case 'object':
        return p.object(n.label, n.state);
      case 'send':
      case 'accept':
      case 'wait':
      case 'datastore':
      case 'buffer':
        return p.named(n.kind, n.label);
      default: {
        const noun = p.noun[n.kind];
        if (n.label) return `${noun} ${p.quote(n.label)}`;
        return (kinds.get(n.kind) ?? 0) > 1 ? `${noun} ${n.id}` : noun;
      }
    }
  };
}

/** The lines on the edges leaving a node, by its kind. */
function flowLines(n: ActivityNode, m: ActivityModel, p: ActivityProse, name: (n: ActivityNode) => string): string[] {
  const ref = (id: string) => {
    const node = m.byId.get(id);
    return node ? name(node) : id;
  };
  const outs = m.outs(n.id);
  if (outs.length === 0) return [];
  const regionName = (id: string | undefined) => {
    const r = m.diagram.regions.find((x) => x.id === id);
    return r?.label ? p.quote(r.label) : (id ?? '');
  };
  const to = outs.map((f) => ref(f.to));
  const from = m.ins(n.id).map((f) => ref(f.from));
  if (n.port === undefined && n.kind === 'decision') {
    const ordered = [...outs.filter((f) => !f.else), ...outs.filter((f) => f.else)];
    return [
      p.decision(
        name(n),
        ordered.map((f) => ({ ...(f.guard ? { guard: f.guard } : {}), else: f.else, to: ref(f.to) })),
      ),
    ];
  }
  if (n.kind === 'fork') return [p.fork(name(n), to)];
  if (n.kind === 'join') return [p.join(name(n), from, to)];
  if (n.kind === 'merge') return [p.merge(name(n), from, to)];
  const pinsOf = (f: Flow) => m.pins[m.flows.indexOf(f)] ?? {};
  return outs.map((f) =>
    f.interrupt
      ? p.interrupt(name(n), regionName(n.interruptible), ref(f.to))
      : p.flow(name(n), f.kind === 'object', ref(f.to), pinsOf(f), f.weight, f.else ? 'else' : f.guard),
  );
}

/**
 * Alt text of an activity diagram: the lanes with their nodes, the regions, pins and calls, the handlers, then the
 * edges node by node in source order, then the decisions.
 */
export function describeActivity(m: ActivityModel, locale: Locale): string {
  const p = TEXTS[locale].activity;
  const d = m.diagram;
  const name = namer(m, p);
  const lines = [
    p.summary(d.title, TEXTS[locale].picture.activity, d.nodes.length, d.flows.length, d.partitions.length),
  ];
  for (const lane of d.partitions) lines.push(p.lane(lane.label, d.nodes.filter((n) => n.lane === lane.id).map(name)));
  for (const r of d.regions)
    lines.push(p.region(r.label ? p.quote(r.label) : r.id, d.nodes.filter((n) => n.interruptible === r.id).map(name)));
  for (const x of d.expansions) {
    const members = d.nodes.filter((n) => n.expansion === x.id).map(name);
    lines.push(p.expansion(x.label ? p.quote(x.label) : x.id, x.mode, x.inputs, members));
  }
  for (const n of d.nodes) {
    if (n.call) lines.push(p.call(name(n)));
    if (n.inputs.length || n.outputs.length) lines.push(p.pins(name(n), n.inputs, n.outputs));
  }
  for (const h of m.handlers) {
    const [a, b] = [m.byId.get(h.protected), m.byId.get(h.handler)];
    lines.push(p.handler(a ? name(a) : h.protected, h.exception, b ? name(b) : h.handler));
  }
  for (const n of m.nodes) lines.push(...flowLines(n, m, p, name));
  for (const x of d.decisions) lines.push(WORDS[locale].decision(x));
  return lines.join('\n');
}
