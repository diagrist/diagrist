import type { Locale } from '@diagrist/lang';
import { counts, type LinkDecl } from '../shared/declarations.js';
import type { Graph, Item, Relation } from '../shared/graph/model.js';
import type { VocabularyModel } from './model.js';
import type { VocabularyWords } from './texts/words.js';

/** The rules of a link in words: how many relations the items of each side need, and whether chains may loop. */
export function rulesOf(link: LinkDecl, m: VocabularyModel, locale: Locale, w: VocabularyWords): string[] {
  const label = (id: string) => m.types.get(id)?.label[locale] ?? id;
  const side = (end: 'from' | 'to') => {
    const each = counts(link.each, end);
    const single = counts(link.single, end);
    if (!each && !single) return [];
    const count = each && single ? 'one' : each ? 'each' : 'single';
    return link[end].map((t) => w.count(count, label(t)));
  };
  return [...side('from'), ...side('to'), ...(link.acyclic ? [w.acyclic] : [])];
}

/**
 * The vocabulary as a graph to draw: every type an item in its own shape, every link a line from each of its first
 * types to each of its second, labelled with what it says and its rules. A link from a type to itself is an entry
 * of that type instead, since a loop says less than a line of text.
 */
export function graphOf(m: VocabularyModel, locale: Locale, w: VocabularyWords): Graph {
  const label = (id: string) => m.types.get(id)?.label[locale] ?? id;
  const links = [...m.links.values()];
  const says = (link: LinkDecl) => [link.label[locale], ...rulesOf(link, m, locale, w)].join(' · ');
  const span = (link: LinkDecl) => ('file' in link.origin ? link.origin.file : { line: 1, column: 1, length: 1 });
  const items = [...m.types.values()].map(
    (t): Item => ({
      id: t.id,
      label: t.label[locale],
      type: t.id,
      entries: [
        ...(t.explain ? [w.explain] : []),
        ...links.filter((l) => l.from.includes(t.id) && l.to.includes(t.id)).map((l) => `${says(l)}: ${label(t.id)}`),
      ],
      span: 'file' in t.origin ? t.origin.file : { line: 1, column: 1, length: 1 },
    }),
  );
  const relations = links.flatMap((link) =>
    link.from.flatMap((from) =>
      link.to
        .filter((to) => to !== from && m.types.has(from) && m.types.has(to))
        .map((to): Relation => ({ from, link: link.id, to, label: says(link), span: span(link) })),
    ),
  );
  return {
    title: m.title,
    ...(m.subtitle === undefined ? {} : { subtitle: m.subtitle }),
    types: m.types,
    links: m.links,
    items,
    relations,
  };
}
