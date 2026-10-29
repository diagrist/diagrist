import { type ConceptWords, stop } from './words.js';

const plural = (n: number, one: string, many: string): string => (n === 1 ? `one ${one}` : `${n} ${many}`);

/** The words of concept pictures in English. */
export const EN: ConceptWords = {
  kind: 'Concept',
  status: { planned: 'planned', deprecated: 'deprecated' },
  diagram: (title, items, types) =>
    `Concept "${title}" with ${plural(items, 'item', 'items')} of ${plural(types, 'type', 'types')}.`,
  type: (label, items) => stop(`${label}: ${items.join(', ')}`),
  relation: (from, says, to, label) => stop(`${from} ${says} ${to}${label ? ` (${label})` : ''}`),
  entries: (item, entries) => stop(`${item}: ${entries.map((e) => e.replace(/[.!?]$/, '')).join('; ')}`),
};
