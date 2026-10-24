import type { Locale } from '@diagrist/lang';
import { WORDS } from '@diagrist/parts';
import { TEXTS } from '../../texts/index.js';
import type { ClassRelation, NaryAssociation } from '../diagram.js';
import { parseMember } from '../members.js';
import type { ClassModel } from '../model.js';
import type { ClassProse, NaryEnd } from './prose.js';

/** A leg of an n-ary association: exactly one end is a diamond. */
const isLeg = (m: ClassModel, r: ClassRelation): boolean => m.associations.has(r.from) !== m.associations.has(r.to);

function naryLine(m: ClassModel, a: NaryAssociation, p: ClassProse, name: (id: string) => string): string {
  const ends = m.diagram.relations
    .filter((r) => isLeg(m, r) && (r.from === a.id || r.to === a.id))
    .map((r): NaryEnd => {
      const atFrom = r.from === a.id;
      const count = atFrom ? r.card : r.source;
      const role = atFrom ? r.role : r.srole;
      return {
        name: name(atFrom ? r.to : r.from),
        ...(count ? { count } : {}),
        ...(role ? { role } : {}),
        navigable: r.kind === 'directed' && atFrom,
      };
    });
  return p.nary(a.label, ends, a.via === undefined ? undefined : name(a.via));
}

/**
 * Alt text of a class diagram: the counts, packages with their content, every classifier with its members, n-ary
 * associations, then the relations with direction and multiplicities, notes and decisions.
 */
export function describeClass(m: ClassModel, locale: Locale): string {
  const p = TEXTS[locale].class;
  const d = m.diagram;
  const name = (id: string) => {
    const pkg = m.packages.get(id);
    return pkg ? p.packageName(pkg.label) : (m.classifiers.get(id)?.label ?? id);
  };
  const binary = d.relations.filter((r) => !isLeg(m, r));
  const counts = [
    p.count('package', d.packages.length),
    ...(['class', 'interface', 'enum'] as const).map((k) =>
      p.count(k, d.classifiers.filter((c) => c.kind === k).length),
    ),
    p.count('nary', d.associations.length),
  ].filter((x): x is string => x !== undefined);
  const lines = [p.summary(d.title, TEXTS[locale].picture.class, counts, binary.length)];
  for (const pkg of d.packages) {
    const parts = [
      ...d.classifiers.filter((c) => c.package === pkg.id).map((c) => c.label),
      ...d.packages.filter((s) => s.parent === pkg.id).map((s) => name(s.id)),
    ];
    lines.push(p.packageLine(pkg.label, pkg.parent === undefined ? undefined : name(pkg.parent), parts));
  }
  for (const c of d.classifiers) {
    const member = (x: (typeof c.members)[number]) => p.member(x.text, x.abstract, x.static);
    const ops = c.members.filter((x) => c.kind !== 'enum' && parseMember(x.text).operation);
    const rest = c.members.filter((x) => !ops.includes(x));
    const extras = {
      ...(c.stereotype ? { stereotype: c.stereotype } : {}),
      ...(c.template ? { template: c.template } : {}),
    };
    const attributes = c.kind === 'enum' ? rest.map((x) => x.text) : rest.map(member);
    lines.push(p.classifier(c.kind, c.abstract, c.label, extras, attributes, ops.map(member)));
  }
  lines.push(...d.associations.map((a) => naryLine(m, a, p, name)));
  for (const r of binary) {
    const via = r.via === undefined ? undefined : name(r.via);
    const details = {
      ...(r.label ? { label: r.label } : {}),
      ...(r.card ? { card: r.card } : {}),
      ...(r.source ? { source: r.source } : {}),
      ...(r.role ? { role: r.role } : {}),
      ...(r.srole ? { srole: r.srole } : {}),
      ...(via ? { via } : {}),
      ...(r.nonav ? { nonav: r.nonav } : {}),
    };
    lines.push(p.relation(r.kind, name(r.from), name(r.to), r.keyword, details));
  }
  for (const n of d.notes) if (n.on !== undefined) lines.push(p.note(name(n.on), n.text));
  for (const x of d.decisions) lines.push(WORDS[locale].decision(x));
  return lines.join('\n');
}
