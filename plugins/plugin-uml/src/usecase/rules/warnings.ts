import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { USE_CASES } from '../../spec/use-cases.js';
import { defineRule, relationText } from './shared.js';

export const outsideSubject = implementing(
  { uml: [USE_CASES.subject] },
  defineRule(
    'U920',
    'warning',
    'UML allows use cases without a subject, but in a diagram with one, exam practice expects every use case inside it.',
    (m) => {
      const first = m.diagram.subjects[0];
      if (!first) return [];
      return m.diagram.cases.flatMap((u): Finding[] =>
        u.subject === undefined ? [{ span: u.span, values: { label: u.label, id: u.id, subject: first.id } }] : [],
      );
    },
  ),
);

export const withoutActor = implementing(
  { uml: [USE_CASES.association] },
  defineRule(
    'U921',
    'warning',
    'A use case yields a result for an actor. It is reached when an actor takes part in it, or through `include`, `extend` or a generalization from a reached use case; otherwise an association is probably missing.',
    (m) => {
      if (m.actors.size === 0) return [];
      const reached = new Set<string>();
      const rels = m.diagram.relations;
      for (const r of rels)
        if (r.kind === 'association') for (const id of [r.from, r.to]) if (m.cases.has(id)) reached.add(id);
      for (let grown = true; grown; ) {
        grown = false;
        for (const r of rels.filter((x) => x.kind !== undefined && x.kind !== 'association'))
          for (const [a, b] of [
            [r.from, r.to],
            [r.to, r.from],
          ] as const)
            if (reached.has(a) && m.cases.has(b) && !reached.has(b)) {
              reached.add(b);
              grown = true;
            }
      }
      return m.diagram.cases.flatMap((u): Finding[] =>
        reached.has(u.id) ? [] : [{ span: u.span, values: { label: u.label, id: u.id } }],
      );
    },
  ),
);

export const extendDetails = implementing(
  { uml: [USE_CASES.extendCondition, USE_CASES.extensionPoint] },
  defineRule(
    'U922',
    'warning',
    'In UML the condition of an `extend` is optional; without it the extension always applies. Exam practice asks for it, and for the extension point when the extended use case has some.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        if (r.kind !== 'extend') return [];
        const relation = relationText(r);
        const found: Finding[] = r.when ? [] : [{ span: r.span, values: { case: 'condition', relation } }];
        const point = m.cases.get(r.to)?.points[0];
        if (point !== undefined && !r.at?.length)
          found.push({ span: r.span, values: { case: 'point', relation, point } });
        return found;
      }),
  ),
);

export const idleActor = implementing(
  { uml: [USE_CASES.actor] },
  defineRule(
    'U923',
    'warning',
    'An actor without an association or generalization takes part in nothing, and a diagram without actors describes no use of the system. Both are valid UML.',
    (m) => {
      if (m.actors.size === 0) return [{ span: m.diagram.span, values: { case: 'none' } }];
      return m.diagram.actors.flatMap((a): Finding[] =>
        m.diagram.relations.some((r) => r.from === a.id || r.to === a.id)
          ? []
          : [{ span: a.span, values: { case: 'idle', label: a.label, id: a.id } }],
      );
    },
  ),
);

export const includeAndExtend = implementing(
  { uml: [USE_CASES.include, USE_CASES.extend] },
  defineRule(
    'U924',
    'warning',
    'Between two use cases behaviour is either always part (`include`) or optional (`extend`), not both; usually one direction is swapped.',
    (m) => {
      const pair = (a: string, b: string) => [a, b].sort().join('|');
      const rels = m.diagram.relations;
      const includes = new Set(rels.filter((r) => r.kind === 'include').map((r) => pair(r.from, r.to)));
      return rels.flatMap((r): Finding[] =>
        r.kind === 'extend' && includes.has(pair(r.from, r.to))
          ? [{ span: r.span, values: { a: r.from, b: r.to } }]
          : [],
      );
    },
  ),
);

export const emptySubject = implementing(
  { uml: [USE_CASES.subject] },
  defineRule(
    'U926',
    'warning',
    'A subject encloses the use cases of its system. Without one it has no content and is not drawn; a note on it finds no frame.',
    (m) =>
      m.diagram.subjects.flatMap((s): Finding[] =>
        m.diagram.cases.some((u) => u.subject === s.id) ? [] : [{ span: s.span, values: { label: s.label, id: s.id } }],
      ),
  ),
);

export const directionWithoutEffect = defineRule(
  'U927',
  'warning',
  '`direction=` places several subjects side by side or below each other; with fewer than two it changes nothing.',
  (m) =>
    m.diagram.direction !== undefined && m.diagram.subjects.length < 2
      ? [{ span: m.diagram.span, values: { direction: m.diagram.direction } }]
      : [],
);
