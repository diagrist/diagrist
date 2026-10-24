import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';
import { packagesAround } from '../model.js';
import { ASSOCIATIONS, defineRule, relationText } from './shared.js';

export const associationClass = implementing(
  { uml: [CLASSES.associationClass] },
  defineRule(
    'U417',
    'error',
    'An association class is an association and a class at once: `class=` stands on an association between classifiers or on an `assoc`, names a `class` (the table allows no other) that is none of its own ends, and each association class belongs to exactly one association.',
    (m) => {
      const seen = new Set<string>();
      const check = (via: string, ends: readonly string[], association: boolean, packaged: boolean) => {
        const problem = !association
          ? 'notAssociation'
          : packaged
            ? 'package'
            : ends.includes(via)
              ? 'ownEnd'
              : seen.has(via)
                ? 'twice'
                : undefined;
        seen.add(via);
        return problem;
      };
      const binary = m.diagram.relations.flatMap((r): Finding[] => {
        if (r.via === undefined) return [];
        const packaged = m.packages.has(r.from) || m.packages.has(r.to);
        const problem = check(r.via, [r.from, r.to], ASSOCIATIONS.has(r.kind), packaged);
        return problem ? [{ span: r.span, values: { case: problem, via: r.via, at: relationText(r) } }] : [];
      });
      const nary = m.diagram.associations.flatMap((a): Finding[] => {
        if (a.via === undefined) return [];
        const ends = m.diagram.relations.flatMap((r) => (r.from === a.id ? [r.to] : r.to === a.id ? [r.from] : []));
        const problem = check(a.via, ends, true, false);
        return problem ? [{ span: a.span, values: { case: problem, via: a.via, at: a.id } }] : [];
      });
      return [...binary, ...nary];
    },
  ),
);

export const packageRelation = implementing(
  { uml: [CLASSES.package, CLASSES.packageImport] },
  defineRule(
    'U418',
    'error',
    'A package is no classifier: it is an end of dependencies `-->` only. `import` and `access` mark package imports, so they belong to dependencies `-->`.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        const relation = relationText(r);
        if (r.kind === 'dependency') return [];
        const end = [r.from, r.to].find((id) => m.packages.has(id));
        if (end !== undefined) return [{ span: r.span, values: { case: 'end', relation, package: end } }];
        return r.keyword ? [{ span: r.span, values: { case: 'keyword', relation, keyword: r.keyword } }] : [];
      }),
  ),
);

export const packageOwnContent = implementing(
  { uml: [CLASSES.package, CLASSES.dependency] },
  defineRule(
    'U419',
    'error',
    'A package already holds its members; a dependency between a package and its own content says nothing.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        const inside = (id: string, pkg: string) => packagesAround(m, id).includes(pkg);
        const own =
          (m.packages.has(r.from) && (r.from === r.to || inside(r.to, r.from))) ||
          (m.packages.has(r.to) && inside(r.from, r.to));
        return own ? [{ span: r.span, values: { relation: relationText(r) } }] : [];
      }),
  ),
);

export const noteWithoutClassifier = implementing(
  { uml: [CLASSES.comment] },
  defineRule('U471', 'error', 'A note in a class diagram is a comment on one classifier: it names it with `on`.', (m) =>
    m.diagram.notes.flatMap((n): Finding[] => (n.on === undefined ? [{ span: n.span }] : [])),
  ),
);
