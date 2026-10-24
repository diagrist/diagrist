type Values = Readonly<Record<string, string>>;

const EN: Readonly<Record<string, string>> = {
  state: 'the state',
  initial: 'the initial pseudostate',
  final: 'the final state',
  choice: 'the choice',
  junction: 'the junction',
  history: 'the history',
  fork: 'the fork',
  join: 'the join',
  terminate: 'the terminate pseudostate',
  entrypoint: 'the entry point',
  exitpoint: 'the exit point',
  region: 'the region',
};

const DE: Readonly<Record<string, string>> = {
  state: 'der Zustand',
  initial: 'der Startzustand',
  final: 'der Endzustand',
  choice: 'die Entscheidung',
  junction: 'der Verbindungspunkt',
  history: 'die Historie',
  fork: 'die Gabelung',
  join: 'die Vereinigung',
  terminate: 'der Abbruch',
  entrypoint: 'der Eintrittspunkt',
  exitpoint: 'der Austrittspunkt',
  region: 'die Region',
};

/** A vertex named in a finding, such as `the state "Open"`; `prefix` picks the values of a second vertex. */
export const enName = (v: Values, prefix = ''): string =>
  `${EN[v[`${prefix}kind`] ?? ''] ?? ''} "${v[`${prefix}name`]}"`;

/** A vertex named in a finding in German, in the nominative, such as `der Zustand „Offen“`. */
export const deName = (v: Values, prefix = ''): string =>
  `${DE[v[`${prefix}kind`] ?? ''] ?? ''} „${v[`${prefix}name`]}“`;

/** The first letter in upper case, for a name at the start of a sentence. */
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
