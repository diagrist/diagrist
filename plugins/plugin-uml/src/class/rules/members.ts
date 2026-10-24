import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';
import { parameterTypes, parseMember, properties } from '../members.js';
import { defineRule } from './shared.js';

export const abstractOperation = implementing(
  { uml: [CLASSES.abstractOperation] },
  defineRule(
    'U412',
    'error',
    'Only operations are abstract, and only in abstract classes and interfaces: an abstract operation of a concrete class has no implementation anywhere.',
    (m) =>
      m.diagram.classifiers.flatMap((c) =>
        c.kind === 'enum'
          ? []
          : c.members.flatMap((x): Finding[] => {
              if (!x.abstract) return [];
              if (!parseMember(x.text).operation)
                return [{ span: x.span, values: { case: 'attribute', member: x.text } }];
              return c.kind === 'class' && !c.abstract
                ? [{ span: x.span, values: { case: 'concrete', member: x.text, label: c.label } }]
                : [];
            }),
      ),
  ),
);

const LITERAL = /^[\p{L}_][\p{L}\p{N}_]*$/u;

export const memberSyntax = implementing(
  { uml: [CLASSES.attribute, CLASSES.operation, CLASSES.enumeration] },
  defineRule(
    'U413',
    'error',
    'A member is a UML text: `[visibility] name : Type` for an attribute, `[visibility] name(p : Type) : Type` for an operation; a value of an enumeration is a plain name without `static` or `abstract`.',
    (m) =>
      m.diagram.classifiers.flatMap((c) =>
        c.members.flatMap((x): Finding[] => {
          if (c.kind === 'enum') {
            const problem = !LITERAL.test(x.text) ? 'literal' : x.static || x.abstract ? 'literalFlag' : undefined;
            return problem ? [{ span: x.span, values: { case: problem, member: x.text } }] : [];
          }
          const problem = parseMember(x.text).problem;
          return problem ? [{ span: x.span, values: { case: problem, member: x.text } }] : [];
        }),
      ),
  ),
);

/** Key of a member: its name, for an operation with the types of its parameters, so overloads stay allowed. */
function key(text: string): string {
  const p = parseMember(text);
  return p.operation ? `${p.name}(${parameterTypes(p.params ?? '').join(',')})` : p.name;
}

export const duplicateMember = implementing(
  { uml: [CLASSES.attribute, CLASSES.operation] },
  defineRule(
    'U416',
    'error',
    'A classifier names each attribute once and each operation once per list of parameter types; overloads with other parameter types are allowed.',
    (m) =>
      m.diagram.classifiers.flatMap((c) => {
        const seen = new Set<string>();
        return c.members.flatMap((x): Finding[] => {
          const k = key(x.text);
          const twice = seen.has(k);
          seen.add(k);
          return twice ? [{ span: x.span, values: { member: x.text, label: c.label } }] : [];
        });
      }),
  ),
);

/** A property that belongs to the other kind of member. */
const ONLY: Readonly<Record<string, 'attribute' | 'operation'>> = { readOnly: 'attribute', query: 'operation' };

export const memberProperty = implementing(
  { uml: [CLASSES.attribute, CLASSES.operation] },
  defineRule(
    'U916',
    'warning',
    '`{readOnly}` makes an attribute unchangeable, `{query}` an operation free of side effects. Swapped, neither says anything; the text is drawn as written.',
    (m) =>
      m.diagram.classifiers.flatMap((c) =>
        c.kind === 'enum'
          ? []
          : c.members.flatMap((x): Finding[] => {
              const kind = parseMember(x.text).operation ? 'operation' : 'attribute';
              return properties(x.text).flatMap((p): Finding[] => {
                const only = ONLY[p];
                return only && only !== kind
                  ? [{ span: x.span, values: { property: p, case: only, member: x.text } }]
                  : [];
              });
            }),
      ),
  ),
);
