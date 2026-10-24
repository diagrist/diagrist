import { plural } from '../../shared/words.js';
import type { RelationKind } from '../diagram.js';
import type { ClassProse, RelationDetails } from './prose.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? 'no class') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const NOUN = { class: 'Class', interface: 'Interface', enum: 'Enumeration' } as const;

const COUNT = {
  class: ['class', 'classes'],
  interface: ['interface', 'interfaces'],
  enum: ['enumeration', 'enumerations'],
  nary: ['n-ary association', 'n-ary associations'],
  package: ['package', 'packages'],
} as const;

function head(kind: RelationKind, a: string, b: string, keyword: string | undefined): string {
  return {
    generalization: `${a} is a specialization of ${b} (generalization)`,
    realization: `${a} realizes the interface ${b}`,
    association: `${a} and ${b} are associated`,
    directed: `${a} knows ${b} (directed association)`,
    dependency: keyword
      ? `${a} imports ${b}${keyword === 'access' ? ' privately' : ''} («${keyword}»)`
      : `${a} depends on ${b}`,
    aggregation: `${a} aggregates ${b} (aggregation, ${a} is the whole)`,
    composition: `${a} consists of ${b} (composition, ${b} exists only with ${a})`,
    bidirectional: `${a} and ${b} know each other (navigable both ways)`,
  }[kind];
}

function details(a: string, b: string, d: RelationDetails): string {
  const blind =
    d.nonav === 'both'
      ? `neither ${a} nor ${b} is navigable from the other end`
      : d.nonav === 'to'
        ? `${b} is not navigable from ${a}`
        : d.nonav === 'from'
          ? `${a} is not navigable from ${b}`
          : '';
  const ends = [
    d.card ? `${d.card} ${b} per ${a}` : '',
    d.source ? `${d.source} ${a} per ${b}` : '',
    d.role ? `role ${d.role} at ${b}` : '',
    d.srole ? `role ${d.srole} at ${a}` : '',
  ].filter(Boolean);
  return [d.label ?? '', ends.join(', '), d.via ? `association class ${d.via}` : '', blind].filter(Boolean).join('; ');
}

/** English sentences of the class description. */
export const CLASS_EN: ClassProse = {
  summary: (title, kind, counts, n) =>
    `${title}. ${kind} with ${[...counts, plural(n, 'relation', 'relations')].join(', ').replace(/, (?=[^,]*$)/, ' and ')}.`,
  count: (kind, n) => (n ? plural(n, COUNT[kind][0], COUNT[kind][1]) : undefined),
  packageName: (label) => `package ${label}`,
  packageLine: (label, parent, parts) =>
    `Package ${label}${parent ? ` in ${parent}` : ''}: holds ${parts.join(', ') || 'nothing'}.`,
  classifier: (kind, abstract, label, extras, attributes, operations) => {
    const noun = abstract ? `Abstract ${NOUN[kind].toLowerCase()}` : NOUN[kind];
    const more = `${extras.stereotype ? ` «${extras.stereotype}»` : ''}${extras.template ? ` with template parameter ${extras.template}` : ''}`;
    if (kind === 'enum') return `${noun} ${label}${more}: values ${attributes.join(', ') || 'none'}.`;
    const parts = [
      attributes.length ? `attributes ${attributes.join(', ')}` : '',
      operations.length ? `operations ${operations.join(', ')}` : '',
    ].filter(Boolean);
    return `${noun} ${label}${more}${parts.length ? `: ${parts.join('; ')}` : ' without members'}.`;
  },
  member: (text, abstract, isStatic) => {
    const traits = [abstract ? 'abstract' : '', isStatic ? 'static' : ''].filter(Boolean);
    return `${text}${traits.length ? ` (${traits.join(', ')})` : ''}`;
  },
  relation: (kind, a, b, keyword, d) => {
    const more = details(a, b, d);
    return `${head(kind, a, b, keyword)}${more ? `: ${more}` : ''}.`;
  },
  nary: (label, ends, via) => {
    const text = ends.map((e) => {
      const extra = [e.count ?? '', e.role ? `role ${e.role}` : '', e.navigable ? 'navigable' : ''].filter(Boolean);
      return `${e.name}${extra.length ? ` (${extra.join(', ')})` : ''}`;
    });
    const name = label ? `N-ary association ${label}` : 'N-ary association without a name';
    return `${name} joins ${list(text)}${via ? `; association class ${via}` : ''}.`;
  },
  note: (on, text) => `Note on ${on}: ${text}.`,
};
