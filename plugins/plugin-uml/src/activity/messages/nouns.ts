import type { Locale } from '@diagrist/lang';
import type { NodeKind } from '../grammar/values.js';

type Values = Readonly<Record<string, string>>;

const NOUNS: Readonly<Record<Locale, Readonly<Record<NodeKind | 'expansion', string>>>> = {
  en: {
    initial: 'initial node',
    final: 'activity final',
    flowfinal: 'flow final',
    action: 'action',
    decision: 'decision',
    merge: 'merge',
    fork: 'fork',
    join: 'join',
    object: 'object node',
    datastore: 'data store',
    buffer: 'buffer',
    send: 'send signal',
    accept: 'accept event',
    wait: 'time event',
    expansion: 'expansion region',
  },
  de: {
    initial: 'Startknoten',
    final: 'Aktivitätsende',
    flowfinal: 'Flussende',
    action: 'Aktion',
    decision: 'Entscheidung',
    merge: 'Zusammenführung',
    fork: 'Gabelung',
    join: 'Vereinigung',
    object: 'Objektknoten',
    datastore: 'Datenspeicher',
    buffer: 'Puffer',
    send: 'Signal senden',
    accept: 'Signal empfangen',
    wait: 'Zeitereignis',
    expansion: 'Expansionsbereich',
  },
};

/** A node named in a message, such as `decision "Paid?"`, from the values `kind` and `node` (or with a prefix). */
export function noun(v: Values, locale: Locale, prefix = ''): string {
  const kind = v[`${prefix}kind`] ?? '';
  const name = v[`${prefix}node`] ?? '';
  const word = (NOUNS[locale] as Readonly<Record<string, string>>)[kind] ?? kind;
  return locale === 'de' ? `${word} „${name}“` : `${word} "${name}"`;
}

/** Picks the text for `v.case` from a table, so a finding names its case as data, not as prose. */
export const pick = (v: Values, cases: Readonly<Record<string, string>>): string => cases[v.case ?? ''] ?? v.case ?? '';
