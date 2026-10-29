import { type ConceptWords, stop } from './words.js';

const plural = (n: number, one: string, many: string): string => (n === 1 ? `einem ${one}` : `${n} ${many}`);

/** The words of concept pictures in German. */
export const DE: ConceptWords = {
  kind: 'Konzept',
  status: { planned: 'geplant', deprecated: 'abgelöst' },
  diagram: (title, items, types) =>
    `Konzept „${title}“ mit ${plural(items, 'Element', 'Elementen')} von ${types === 1 ? 'einem Typ' : `${types} Typen`}.`,
  type: (label, items) => stop(`${label}: ${items.join(', ')}`),
  relation: (from, says, to, label) => stop(`${from} ${says}: ${to}${label ? ` (${label})` : ''}`),
  entries: (item, entries) => stop(`${item}: ${entries.map((e) => e.replace(/[.!?]$/, '')).join('; ')}`),
};
