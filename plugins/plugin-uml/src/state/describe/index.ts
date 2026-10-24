import type { Locale } from '@diagrist/lang';
import { WORDS } from '@diagrist/parts';
import type { Transition, Vertex } from '../diagram.js';
import { isBorderPoint, type StateModel } from '../model.js';
import type { Opening, StateProse } from './prose.js';
import { STATE_NAME, STATE_PROSE } from './texts.js';

/**
 * Name of a vertex in a sentence: states by their name, pseudostates by their kind; where the kind occurs more than
 * once, with their parent or id.
 */
function namer(m: StateModel, p: StateProse): (id: string) => string {
  const kinds = new Map<string, number>();
  for (const v of m.diagram.vertices) kinds.set(v.kind, (kinds.get(v.kind) ?? 0) + 1);
  const name = (id: string): string => {
    const v = m.vertices.get(id);
    if (!v) return id;
    if (v.kind === 'state') return v.label ?? id;
    const base = { kind: v.kind, ...(v.label ? { label: v.label } : {}), deep: v.deep };
    if (v.label || (kinds.get(v.kind) ?? 0) < 2) return p.name(base);
    const parent = v.parent === undefined ? undefined : m.vertices.get(v.parent);
    if (parent) return p.name({ ...base, parent: name(parent.id) });
    const top = m.diagram.vertices.filter((o) => o.kind === v.kind && !(o.parent && m.vertices.has(o.parent)));
    return p.name(top.length > 1 ? { ...base, id } : base);
  };
  return name;
}

function vertexLine(m: StateModel, v: Vertex, p: StateProse, name: (id: string) => string): string {
  const inside = v.parent === undefined ? undefined : name(v.parent);
  const doings = p.doings({
    ...(v.entry ? { entry: v.entry } : {}),
    ...(v.do ? { do: v.do } : {}),
    ...(v.exit ? { exit: v.exit } : {}),
    defer: v.defer,
    internals: m.diagram.internals.filter((i) => i.state === v.id),
  });
  const points = m.diagram.vertices.filter((c) => c.parent === v.id && isBorderPoint(c.kind));
  const rim = points.length ? points.map((c) => name(c.id)).join(', ') : undefined;
  if (v.submachine) return p.submachine(name(v.id), inside, doings, v.submachine, v.file, rim);
  if (!m.composites.has(v.id)) return p.simple(name(v.id), inside, doings, true);
  const kidsOf = (id: string) =>
    m.diagram.vertices
      .filter((c) => c.parent === id && (c.kind === 'state' || c.kind === 'history'))
      .map((c) => name(c.id));
  const regions = m.diagram.vertices.filter((c) => c.parent === v.id && c.kind === 'region');
  const kids = regions.length
    ? p.regions(regions.map((r) => ({ name: r.label ?? r.id, kids: kidsOf(r.id).join(', ') })))
    : kidsOf(v.id).join(', ');
  return p.composite(name(v.id), inside, doings, kids, rim);
}

function opening(m: StateModel, t: Transition, name: (id: string) => string): Opening {
  const source = m.vertices.get(t.from);
  const from = name(t.from);
  if (source?.kind === 'initial') return { from: 'initial', source: from };
  if (source && isBorderPoint(source.kind) && source.parent)
    return { from: 'point', source: from, exit: source.kind === 'exitpoint', owner: name(source.parent) };
  if (source && source.kind !== 'state') return { from: 'pseudo', source: from };
  const time = /^after\s*\((.+)\)$/i.exec(t.on?.trim() ?? '');
  if (time) return { from: 'time', source: from, event: (time[1] ?? '').trim() };
  const change = /^when\s*\((.+)\)$/i.exec(t.on?.trim() ?? '');
  if (change) return { from: 'change', source: from, event: (change[1] ?? '').trim() };
  if (t.on) return { from: 'event', source: from, event: t.on, call: m.diagram.protocol };
  return { from: 'completion', source: from };
}

/** Alt text of a state machine: overview, states with their behaviour, then one sentence per transition, notes, decisions. */
export function describeState(m: StateModel, locale: Locale): string {
  const p = STATE_PROSE[locale];
  const d = m.diagram;
  const name = namer(m, p);
  const states = d.vertices.filter((v) => v.kind === 'state');
  const regions = d.vertices.filter((v) => v.kind === 'region').length;
  const title = d.title.replace(/\s*\{protocol\}\s*/, ' ').trim();
  const lines = [
    p.summary(
      title,
      STATE_NAME[locale],
      d.protocol,
      states.length,
      d.vertices.length - states.length - regions,
      regions,
      d.transitions.length,
    ),
    ...states.map((v) => vertexLine(m, v, p, name)),
    ...d.transitions.map((t) => {
      const point = m.vertices.get(t.to);
      const into = point?.kind === 'entrypoint' && point.parent ? name(point.parent) : undefined;
      return p.transition(opening(m, t, name), name(t.to), into, t.from === t.to, t.when, t.do, t.post);
    }),
    ...d.notes.flatMap((n) => (n.on === undefined ? [] : [p.note(name(n.on), n.text)])),
    ...d.decisions.map((x) => WORDS[locale].decision(x)),
  ];
  return lines.join('\n');
}
