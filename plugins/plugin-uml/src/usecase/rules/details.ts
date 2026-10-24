import type { Finding } from '@diagrist/core';
import { defineRule, relationText } from './shared.js';

export const extensionPoints = defineRule(
  'U424',
  'error',
  'The extension points named by `at=` of an `extend` belong to the extended use case `to` (UML 2.5.1, 18.1.3), and the points of one use case have distinct names.',
  (m) => {
    const twice = m.diagram.cases.flatMap((u) =>
      u.points
        .filter((p, i) => u.points.indexOf(p) !== i)
        .map((point) => ({ span: u.span, values: { case: 'twice', label: u.label, point } })),
    );
    const unknown = m.diagram.relations.flatMap((r): Finding[] => {
      const target = r.kind === 'extend' ? m.cases.get(r.to) : undefined;
      if (!target) return [];
      return (r.at ?? [])
        .filter((p) => !target.points.includes(p))
        .map((point) => ({
          span: r.span,
          values: {
            case: target.points.length ? 'unknown' : 'none',
            relation: relationText(r),
            label: target.label,
            id: target.id,
            point,
            known: target.points.join(', '),
          },
        }));
    });
    return [...twice, ...unknown];
  },
);

export const relationAttributes = defineRule(
  'U426',
  'error',
  '`-->` names exactly one of the flags `include` and `extend`; `--` and `-|>` name neither. Multiplicities `source=` and `card=` belong to associations, `when=` and `at=` to `extend`.',
  (m) =>
    m.diagram.relations.flatMap((r): Finding[] => {
      const at = (kind: string) => ({ span: r.span, values: { relation: relationText(r), case: kind } });
      if (r.arrow === '-->' && r.flagged.length !== 1) return [at(r.flagged.length ? 'bothKinds' : 'noKind')];
      if (r.kind === undefined) return [at('flagOnArrow')];
      const found: Finding[] = [];
      if (r.kind !== 'association' && (r.source !== undefined || r.card !== undefined)) found.push(at('multiplicity'));
      if (r.kind !== 'extend' && (r.when !== undefined || r.at !== undefined)) found.push(at('extendOnly'));
      return found;
    }),
);

/** Keywords UML gives relations, actors and subjects (18.1.4, 18.2.1); no stereotype of a use case. */
const RESERVED = ['include', 'extend', 'actor', 'subsystem'];

export const reservedStereotype = defineRule(
  'U427',
  'error',
  '`«include»` and `«extend»` mark relations, `«actor»` an actor and `«subsystem»` a subject. As the stereotype of a use case the picture claims something the model is not.',
  (m) =>
    m.diagram.cases.flatMap((u): Finding[] =>
      u.stereotype !== undefined && RESERVED.includes(u.stereotype)
        ? [{ span: u.span, values: { label: u.label, name: u.stereotype, id: u.id } }]
        : [],
    ),
);

export const noteWithoutElement = defineRule(
  'U428',
  'error',
  'A note in a use case diagram is a comment on one element: it names its actor, use case or subject with `on`.',
  (m) => m.diagram.notes.flatMap((n): Finding[] => (n.on === undefined ? [{ span: n.span }] : [])),
);
