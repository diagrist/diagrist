import type { VocabularyWords } from './words.js';

/** The words of vocabulary pictures in German. */
export const DE: VocabularyWords = {
  kind: 'Vokabular',
  status: { planned: 'geplant', deprecated: 'abgelöst' },
  count: (count, type) =>
    `${count === 'each' ? 'mindestens eine' : count === 'single' ? 'höchstens eine' : 'genau eine'} je ${type}`,
  needs: (count) => (count === 'each' ? 'mindestens eine' : count === 'single' ? 'höchstens eine' : 'genau eine'),
  acyclic: 'ohne Kreise',
  explain: 'jedes Element braucht einen Eintrag',
  diagram: (title, types, links) =>
    `Vokabular „${title}“ mit ${types === 1 ? 'einem Typ' : `${types} Typen`} und ${links === 1 ? 'einer Verbindung' : `${links} Verbindungen`}.`,
  link: (from, says, to, rules) =>
    `${from.join(' oder ')} ${says}: ${to.join(' oder ')}${rules.length > 0 ? ` (${rules.join(', ')})` : ''}.`,
};
