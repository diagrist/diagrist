import type { Locale } from '@diagrist/lang';
import { WORDS } from '@diagrist/parts';
import type { KnownRelation } from '../diagram.js';
import { isKnown } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import type { UseCaseProse } from './prose.js';
import { USECASE_NAME, USECASE_PROSE } from './texts.js';

function relationLine(r: KnownRelation, p: UseCaseProse, m: UseCaseModel): string {
  const name = (id: string) => (m.actors.get(id) ?? m.cases.get(id))?.label ?? id;
  const [a, b] = [name(r.from), name(r.to)];
  switch (r.kind) {
    case 'association': {
      const ends = [...(r.source ? [{ count: r.source, at: a }] : []), ...(r.card ? [{ count: r.card, at: b }] : [])];
      const actorFirst = m.actors.has(r.from) || !m.actors.has(r.to);
      return actorFirst ? p.association(a, b, r.label, ends) : p.association(b, a, r.label, ends);
    }
    case 'generalization':
      return m.actors.has(r.from) ? p.role(a, b) : p.special(a, b);
    case 'include':
      return p.include(a, b);
    case 'extend':
      return p.extend(a, b, r.at?.length ? p.list(r.at) : undefined, r.when);
  }
}

/**
 * Alt text of a use case diagram: the systems with their use cases, the actors, stereotypes and extension points,
 * then the relations and notes in source order, then the decisions.
 */
export function describeUseCase(m: UseCaseModel, locale: Locale): string {
  const p = USECASE_PROSE[locale];
  const d = m.diagram;
  const lines = [p.summary(d.title, USECASE_NAME[locale], d.actors.length, d.cases.length)];
  for (const s of d.subjects) {
    const inside = d.cases.filter((u) => u.subject === s.id).map((u) => u.label);
    lines.push(p.offers(s.label, inside.length, inside.join(', ')));
  }
  const free = d.cases.filter((u) => u.subject === undefined);
  if (d.subjects.length && free.length) lines.push(p.outside(free.map((u) => u.label).join(', ')));
  for (const a of d.actors) lines.push(p.actor(a.label, a.system));
  for (const u of d.cases) if (u.stereotype) lines.push(p.stereotype(u.label, `«${u.stereotype}»`));
  for (const u of d.cases) if (u.points.length) lines.push(p.points(u.label, u.points.length, p.list(u.points)));
  lines.push(...d.relations.filter(isKnown).map((r) => relationLine(r, p, m)));
  for (const n of d.notes) {
    if (n.on === undefined) continue;
    const subject = m.subjects.get(n.on);
    const on = subject?.label ?? (m.actors.get(n.on) ?? m.cases.get(n.on))?.label ?? n.on;
    lines.push(p.note(on, subject !== undefined, n.text.replace(/[.!?]$/, '')));
  }
  for (const x of d.decisions) lines.push(WORDS[locale].decision(x));
  return lines.join('\n');
}
