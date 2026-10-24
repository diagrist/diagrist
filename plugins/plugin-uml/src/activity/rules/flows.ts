import type { Finding } from '@diagrist/core';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import type { NodeKind } from '../grammar/values.js';
import { at, defineRule, named, OBJECT_KINDS, written } from './shared.js';

/** Object flows may pass control nodes. */
const PASSES = new Set<NodeKind>([...OBJECT_KINDS, 'decision', 'merge', 'fork', 'join']);

export const objectFlow = implementing(
  { uml: [ACTIVITIES.controlFlow, ACTIVITIES.objectFlow] },
  defineRule(
    'U434',
    'error',
    'A control flow touches no object node, and an object flow has an object node, a pin or a control node it passes at one end at least.',
    (m) =>
      m.flows.flatMap((f): Finding[] => {
        const [from, to] = [m.byId.get(f.from), m.byId.get(f.to)];
        if (!from || !to) return [];
        const kinds = [from.kind, to.kind];
        const pinned = from.outputs.length > 0 || to.inputs.length > 0;
        const expansion = from.port !== undefined || to.port !== undefined;
        if (f.kind === 'control' && !expansion && kinds.some((k) => OBJECT_KINDS.has(k)))
          return [at(f.span, { case: 'control', flow: written(m, f) })];
        if (f.kind === 'object' && !pinned && !kinds.some((k) => PASSES.has(k)))
          return [at(f.span, { case: 'object', flow: written(m, f) })];
        return [];
      }),
  ),
);

export const interruptingEdge = implementing(
  { uml: [ACTIVITIES.interruptingEdge] },
  defineRule(
    'U437',
    'error',
    'An interrupting edge `~>` starts inside an interruptible region and ends outside it.',
    (m) =>
      m.flows.flatMap((f): Finding[] => {
        if (!f.interrupt) return [];
        const from = m.byId.get(f.from)?.interruptible;
        const to = m.byId.get(f.to)?.interruptible;
        if (from === undefined) return [at(f.span, { case: 'outside', flow: written(m, f), from: f.from })];
        return to === from ? [at(f.span, { case: 'inside', flow: written(m, f), region: from })] : [];
      }),
  ),
);

export const pinNames = implementing(
  { uml: [ACTIVITIES.pin] },
  defineRule(
    'U455',
    'error',
    'Pins are named object nodes of an action: a name stands once per side, and `pin=` on an object flow names an output pin of its source or an input pin of its target, or a named expansion node.',
    (m) => {
      const out: Finding[] = [];
      for (const n of m.diagram.nodes)
        for (const names of [n.inputs, n.outputs]) {
          const twice = names.find((x, i) => names.indexOf(x) !== i);
          if (twice) out.push(at(n.span, { case: 'twice', pin: twice, id: n.id }));
        }
      for (const x of m.diagram.expansions)
        for (const names of [x.inputs, x.outputs]) {
          const twice = names.find((y, i) => names.indexOf(y) !== i);
          if (twice) out.push(at(x.span, { case: 'twice', pin: twice, id: x.id }));
        }
      m.flows.forEach((f) => {
        if (f.pin === undefined) return;
        if (f.kind !== 'object') {
          out.push(at(f.span, { case: 'control', flow: written(m, f) }));
          return;
        }
        const [a, b] = [m.byId.get(f.from), m.byId.get(f.to)];
        const ports = [a, b].flatMap((n) => (n?.port?.name ? [n.port.name] : []));
        const known = [...new Set([...(a?.outputs ?? []), ...(b?.inputs ?? []), ...ports])];
        if (!known.includes(f.pin))
          out.push(at(f.span, { case: 'unknown', pin: f.pin, flow: written(m, f), known: known.join(', ') }));
      });
      return out;
    },
  ),
);

export const exceptionHandler = implementing(
  { uml: [ACTIVITIES.exceptionHandler] },
  defineRule(
    'U456',
    'error',
    'An exception handler joins two different actions. The handler action has no edges of its own, no input pin besides the exception pin, and as many output pins as the protected action: after it the flow goes on at the output of the protected action.',
    (m) =>
      m.handlers.flatMap((h): Finding[] => {
        const [p, b] = [m.byId.get(h.protected), m.byId.get(h.handler)];
        if (!p || !b) return [];
        if (p.id === b.id) return [at(h.span, { case: 'self', id: p.id })];
        const found: Finding[] = [];
        const add = (kind: string) => found.push(at(h.span, { case: kind, handler: b.id, protected: p.id }));
        if (m.ins(b.id).length + m.outs(b.id).length > 0) add('edges');
        if (b.inputs.length > 0) add('input');
        if (p.outputs.length !== b.outputs.length) add('outputs');
        return found;
      }),
  ),
);

export const expansionInput = implementing(
  { uml: [ACTIVITIES.expansionNode] },
  defineRule(
    'U457',
    'error',
    'An expansion region gets the collection it runs over as an object flow `=>` from outside into each of its inputs.',
    (m) =>
      m.nodes
        .filter((n) => n.port?.side === 'in')
        .filter((n) => !m.ins(n.id).some((f) => f.kind === 'object' && f.from !== n.id))
        .map((n) => at(n.span, { ...named(n, m), region: n.port?.region ?? '', pin: n.port?.name ?? '' })),
  ),
);

export const expansionControl = implementing(
  { uml: [ACTIVITIES.expansionNode] },
  defineRule(
    'U458',
    'error',
    'Expansion nodes are object nodes: only object flows `=>` start or end at an expansion region.',
    (m) =>
      m.flows.flatMap((f): Finding[] => {
        const port = [m.byId.get(f.from), m.byId.get(f.to)].find((n) => n?.port)?.port;
        return f.kind === 'control' && port ? [at(f.span, { flow: written(m, f), region: port.region })] : [];
      }),
  ),
);
