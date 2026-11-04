import type { Locale } from '@diagrist/lang';
import { counts, type LinkDecl } from '../shared/declarations.js';
import type { Graph, Item, Relation } from '../shared/graph/model.js';
import type { VocabularyModel } from './model.js';
import type { VocabularyWords } from './texts/words.js';

/** The rules of a link in words: how many relations the items of each side need, and whether chains may loop. */
export function rulesOf(link: LinkDecl, m: VocabularyModel, locale: Locale, w: VocabularyWords): string[] {
  const label = (id: string) => m.types.get(id)?.label[locale] ?? id;
  const side = (end: 'from' | 'to') => {
    const count = countAt(link, end);
    return count === undefined ? [] : link[end].map((t) => w.count(count, label(t)));
  };
  return [...side('from'), ...side('to'), ...(link.acyclic ? [w.acyclic] : [])];
}

/** How many relations of `link` the items of a type at `end` need, or none when the link counts nothing there. */
function countAt(link: LinkDecl, end: 'from' | 'to'): 'each' | 'single' | 'one' | undefined {
  const each = counts(link.each, end);
  const single = counts(link.single, end);
  return each && single ? 'one' : each ? 'each' : single ? 'single' : undefined;
}

/**
 * The vocabulary as a graph to draw: every type an item in its own shape, every link a line from each of its first
 * types to each of its second, labelled with what it says. What a link asks of the items of a type, such as at
 * least one relation, is an entry of that type, since the rule is about its items; a link from a type to itself is
 * an entry too, since a loop says less than a line of text.
 */
export function graphOf(m: VocabularyModel, locale: Locale, w: VocabularyWords): Graph {
  const label = (id: string) => m.types.get(id)?.label[locale] ?? id;
  const links = [...m.links.values()];
  const says = (link: LinkDecl) => [link.label[locale], ...(link.acyclic ? [w.acyclic] : [])].join(' · ');
  const span = (link: LinkDecl) => ('file' in link.origin ? link.origin.file : { line: 1, column: 1, length: 1 });
  const needs = (type: string) =>
    links.flatMap((l) =>
      (['from', 'to'] as const).flatMap((end) => {
        const count = countAt(l, end);
        return count && l[end].includes(type) ? [`${l.label[locale]}: ${w.needs(count)}`] : [];
      }),
    );
  const items = [...m.types.values()].map(
    (t): Item => ({
      id: t.id,
      label: t.label[locale],
      type: t.id,
      entries: [
        ...(t.explain ? [w.explain] : []),
        ...needs(t.id),
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
