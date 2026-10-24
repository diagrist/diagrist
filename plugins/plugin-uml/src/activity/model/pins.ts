import type { ActivityNode, Flow } from '../diagram.js';

/** The pins an object flow starts at (output of its source) and ends at (input of its target). */
export interface FlowPins {
  readonly from?: string;
  readonly to?: string;
}

/**
 * The pin of every object flow (UML 2.5.1, 16.2.4), in the order of `flows`. The choice: the one `pin=` names, else
 * the pin of the same name at the other end, else the next free one, else the first. So `go a => b` with
 * `output="Order, Customer"` and `input="Order"` starts at the right pin without more words.
 */
export function flowPins(nodes: readonly ActivityNode[], flows: readonly Flow[]): FlowPins[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outs = (id: string) => byId.get(id)?.outputs ?? [];
  const ins = (id: string) => byId.get(id)?.inputs ?? [];
  const from = new Map<number, string>();
  const to = new Map<number, string>();
  const object = flows.map((f, i) => ({ f, i })).filter(({ f }) => f.kind === 'object');

  const choose = (
    end: 'from' | 'to',
    names: (id: string) => readonly string[],
    prefer: (f: Flow, i: number) => string | undefined,
    into: Map<number, string>,
  ) => {
    for (const id of byId.keys()) {
      const pins = names(id);
      const first = pins[0];
      if (first === undefined) continue;
      const mine = object.filter(({ f }) => f[end] === id);
      const used = new Set<string>();
      const take = (i: number, pin: string) => {
        into.set(i, pin);
        used.add(pin);
      };
      for (const { f, i } of mine) if (f.pin && pins.includes(f.pin)) take(i, f.pin);
      for (const { f, i } of mine) {
        const p = prefer(f, i);
        if (!into.has(i) && p && pins.includes(p) && !used.has(p)) take(i, p);
      }
      for (const { i } of mine) if (!into.has(i)) take(i, pins.find((p) => !used.has(p)) ?? first);
    }
  };
  choose('from', outs, (f) => ins(f.to).find((p) => outs(f.from).includes(p)), from);
  choose('to', ins, (_f, i) => from.get(i), to);
  return flows.map((_, i) => {
    const [a, b] = [from.get(i), to.get(i)];
    return { ...(a === undefined ? {} : { from: a }), ...(b === undefined ? {} : { to: b }) };
  });
}
