import type { VocabularyWords } from './words.js';

const plural = (n: number, one: string, many: string): string => (n === 1 ? `one ${one}` : `${n} ${many}`);

/** The words of vocabulary pictures in English. */
export const EN: VocabularyWords = {
  kind: 'Vocabulary',
  status: { planned: 'planned', deprecated: 'deprecated' },
  count: (count, type) =>
    `${count === 'each' ? 'at least one' : count === 'single' ? 'at most one' : 'exactly one'} per ${type}`,
  needs: (count) => (count === 'each' ? 'at least one' : count === 'single' ? 'at most one' : 'exactly one'),
  acyclic: 'no cycles',
  explain: 'every item needs an entry',
  diagram: (title, types, links) =>
    `Vocabulary "${title}" with ${plural(types, 'type', 'types')} and ${plural(links, 'link', 'links')}.`,
  link: (from, says, to, rules) =>
    `${from.join(' or ')} ${says} ${to.join(' or ')}${rules.length > 0 ? `: ${rules.join(', ')}` : ''}.`,
};
