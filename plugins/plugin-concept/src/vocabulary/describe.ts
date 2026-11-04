import type { Locale } from '@diagrist/lang';
import { rulesOf } from './graph.js';
import type { VocabularyModel } from './model.js';
import { VOCABULARY_WORDS } from './texts/index.js';

/** The vocabulary in sentences: what it is, then one sentence per link with its types and its rules. */
export function describeVocabulary(m: VocabularyModel, locale: Locale): string {
  const w = VOCABULARY_WORDS[locale];
  const label = (id: string) => m.types.get(id)?.label[locale] ?? id;
  const links = [...m.links.values()];
  return [
    w.diagram(m.title, m.types.size, links.length),
    ...links.map((l) => w.link(l.from.map(label), l.label[locale], l.to.map(label), rulesOf(l, m, locale, w))),
  ].join(' ');
}
