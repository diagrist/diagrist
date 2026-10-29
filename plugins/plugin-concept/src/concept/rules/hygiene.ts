import { type ConceptRule, known } from './shared.js';

/** More types than this in one picture are more than a reader keeps apart by shape (scope, lesson 4). */
const MOST_TYPES = 6;

export const unused: ConceptRule = {
  code: 'M610',
  severity: 'warning',
  doc: 'A type or link the file declares is used by an item or relation; an unused one is a slip or left over.',
  check: (m) => {
    const types = new Set(m.items.map((i) => i.type));
    const links = new Set(m.relations.map((r) => r.link));
    return [
      ...[...m.types.values()].flatMap((t) =>
        'file' in t.origin && !types.has(t.id) ? [{ span: t.origin.file, values: { case: 'type', id: t.id } }] : [],
      ),
      ...[...m.links.values()].flatMap((l) =>
        'file' in l.origin && !links.has(l.id) ? [{ span: l.origin.file, values: { case: 'link', id: l.id } }] : [],
      ),
    ];
  },
};

export const manyTypes: ConceptRule = {
  code: 'M611',
  severity: 'warning',
  doc: `A picture shows at most ${MOST_TYPES} types; with more, shapes no longer tell them apart at a glance. Split it.`,
  check: (m) => {
    const used = [...new Set(m.items.map((i) => i.type).filter((t) => m.types.has(t)))];
    const first = m.items[0];
    return used.length > MOST_TYPES && first
      ? [{ span: first.span, values: { count: String(used.length), most: String(MOST_TYPES) } }]
      : [];
  },
};

export const lonely: ConceptRule = {
  code: 'M612',
  severity: 'warning',
  doc: 'Where links are declared, every item takes part in a relation; an item without one stands in the picture unexplained.',
  check: (m) => {
    if (m.links.size === 0) return [];
    const joined = new Set(m.relations.flatMap((r) => [r.from, r.to]));
    return m.items.filter((i) => !joined.has(i.id)).map((i) => ({ span: i.span, values: { item: i.id } }));
  },
};

export const synonyms: ConceptRule = {
  code: 'M613',
  severity: 'warning',
  doc: 'Of two terms that mean the same, one is the term in use and the other is marked `status=deprecated`.',
  check: (m) => {
    const link = m.links.get('same-as');
    if (link === undefined || !('vocabulary' in link.origin)) return [];
    const status = new Map(m.items.map((i) => [i.id, i.status]));
    return known(m)
      .filter((r) => r.link === 'same-as' && status.get(r.from) !== 'deprecated' && status.get(r.to) !== 'deprecated')
      .map((r) => ({ span: r.span, values: { from: r.from, to: r.to } }));
  },
};
