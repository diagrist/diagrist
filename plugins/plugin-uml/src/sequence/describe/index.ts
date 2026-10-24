import type { Locale } from '@diagrist/lang';
import { WORDS } from '../../words.js';
import { FOUND, LOST, type MessageEvent } from '../diagram.js';
import type { SeqFragment, SeqItem, SequenceModel, TimelineEvent } from '../model/types.js';
import { DE } from './de.js';
import { EN } from './en.js';
import type { GatePlace, Prose } from './prose.js';

const PROSE: Readonly<Record<Locale, Prose>> = { en: EN, de: DE };

/** `ignore` and `consider` name messages as their guard; they stand in `{...}`. */
const LISTS: readonly string[] = ['ignore', 'consider'];

interface Writer {
  readonly p: Prose;
  readonly m: SequenceModel;
  readonly lines: string[];
  readonly name: (id: string) => string;
  /** Number of every named message, for the time constraints. */
  readonly numbers: Map<string, number>;
  n: number;
}

const labelText = (label: string | undefined) => (label ? `: ${label}` : '');

function gatePlace(i: number, w: Writer): { readonly place: GatePlace; readonly outside: boolean } | undefined {
  const g = w.m.gates.get(i);
  if (!g) return undefined;
  const named = g.name === undefined ? {} : { name: g.name };
  const owner = g.frame === undefined ? undefined : w.m.diagram.events[w.m.frameIds.get(g.frame) ?? -1];
  if (owner?.type === 'ref') return { place: { at: 'ref', label: owner.label, ...named }, outside: false };
  if (owner?.type === 'fragment')
    return { place: { at: 'fragment', operator: owner.operator, ...named }, outside: false };
  return { place: { at: 'frame', ...named }, outside: true };
}

/** Lost and found messages and gates: the unknown end is not named. */
function openEnded(e: MessageEvent, i: number, w: Writer): string | undefined {
  const text = labelText(e.label);
  if (e.to === LOST) return w.p.lost(w.n, w.name(e.from), e.kind === 'sync', text);
  if (e.from === FOUND) return w.p.found(w.n, w.name(e.to), e.kind === 'sync', text);
  const at = gatePlace(i, w);
  if (!at) return undefined;
  const gate = w.p.gate(at.place);
  return w.m.gates.get(i)?.end === 'from'
    ? w.p.gateIn(e.kind, w.n, w.name(e.to), gate, at.outside, text)
    : w.p.gateOut(e.kind, w.n, w.name(e.from), gate, at.outside, text);
}

function messageLine(e: MessageEvent, i: number, w: Writer): string {
  w.n++;
  if (e.id) w.numbers.set(e.id, w.n);
  const [a, b, text] = [w.name(e.from), w.name(e.to), labelText(e.label)];
  const extra = w.p.extras(e.duration, e.mark).filter(Boolean);
  const self = e.from === e.to;
  const base =
    openEnded(e, i, w) ??
    (self && e.kind === 'reply'
      ? w.p.selfReply(w.n, a, text)
      : w.p.plain(self && e.kind !== 'create' ? 'self' : e.kind, w.n, a, b, text));
  return extra.length > 0 ? `${base.slice(0, -1)} (${extra.join(', ')}).` : base;
}

function eventLine(e: TimelineEvent, i: number, w: Writer): string {
  const over = (ids: readonly string[]) => ids.map(w.name).join(', ');
  switch (e.type) {
    case 'message':
      return messageLine(e, i, w);
    case 'coregion':
      return w.p.coregion(w.name(e.on));
    case 'divider':
      return w.p.divider(e.label);
    case 'destroy':
      return w.p.destroy(w.name(e.target));
    case 'ref':
      return w.p.ref(e.label, e.file, over(e.over));
    case 'note':
      return w.p.note(over(e.over), e.text);
    case 'activate':
      return w.p.activate(w.name(e.target));
    case 'deactivate':
      return w.p.deactivate(w.name(e.target));
    case 'invariant':
      return w.p.invariant(w.name(e.on ?? ''), e.text, e.state === true);
  }
}

function fragmentLines(f: SeqFragment, depth: number, w: Writer): void {
  const [first, next] = w.p.opening[f.event.operator];
  f.operands.forEach((o, k) => {
    const word = k === 0 ? first : next || first;
    const list = k === 0 && LISTS.includes(f.event.operator);
    const guard = o.guard ? (list ? ` {${o.guard}}` : ` [${o.guard}]`) : o.marker === 'else' ? ' [else]' : '';
    w.lines.push(`${'  '.repeat(depth)}${word}${guard}:`);
    itemLines(o.items, depth + 1, w);
  });
}

/** The content of a coregion stands one level deeper, up to its end. */
function itemLines(items: readonly SeqItem[], depth: number, w: Writer): void {
  let region: number | undefined;
  for (const item of items) {
    if (region !== undefined && item.index > region) region = undefined;
    const d = depth + (region === undefined ? 0 : 1);
    if (item.kind === 'fragment') fragmentLines(item, d, w);
    else w.lines.push(`${'  '.repeat(d)}${eventLine(item.event, item.index, w)}`);
    if (item.kind === 'event' && item.event.type === 'coregion')
      region = w.m.coregions.find((c) => c.index === item.index)?.end ?? Number.POSITIVE_INFINITY;
  }
}

/** Alt text of a sequence diagram: lifelines, then the messages numbered, fragments indented, then decisions. */
export function describeSequence(m: SequenceModel, locale: Locale): string {
  const p = PROSE[locale];
  const d = m.diagram;
  const name = (id: string) => m.participants.get(id)?.label ?? id;
  const traits = (id: string) => {
    const q = m.participants.get(id);
    return [q ? p.noun[q.kind] : '', q?.stereotype ? `«${q.stereotype}»` : '', q?.external ? p.external : '']
      .filter(Boolean)
      .join(', ');
  };
  const w: Writer = { p, m, lines: [], name, numbers: new Map(), n: 0 };
  const messages = d.events.filter((e) => e.type === 'message').length;
  w.lines.push(
    p.summary(d.title, WORDS[locale].sequence, m.order.length, messages),
    p.lineup(m.order.map((id) => (traits(id) ? `${name(id)} (${traits(id)})` : name(id))).join(', ')),
  );
  if (d.autonumber) w.lines.push(p.numbered);
  if (m.framed) w.lines.push(p.framed(m.framed));
  itemLines(m.root, 0, w);
  const nr = (id: string) => {
    const n = w.numbers.get(id);
    return n === undefined ? id : p.message(n);
  };
  for (const c of d.constraints)
    w.lines.push(c.type === 'duration' ? p.duration(nr(c.from), nr(c.to), c.text) : p.time(nr(c.at), c.text));
  for (const x of d.decisions) w.lines.push(p.decision(x.id, x.question, x.choice, x.consequence, x.open));
  return w.lines.join('\n');
}
