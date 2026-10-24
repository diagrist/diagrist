/** A multiplicity at one end of an association, with the name of the element it stands at. */
export interface EndCount {
  readonly count: string;
  readonly at: string;
}

/** The sentences of a use case description in one locale; names are labels, lists are already joined. */
export interface UseCaseProse {
  readonly summary: (title: string, kind: string, actors: number, cases: number) => string;
  readonly offers: (system: string, count: number, cases: string) => string;
  readonly outside: (cases: string) => string;
  readonly actor: (label: string, system: boolean) => string;
  readonly stereotype: (label: string, stereotype: string) => string;
  readonly points: (label: string, count: number, points: string) => string;
  readonly association: (actor: string, other: string, label: string | undefined, ends: readonly EndCount[]) => string;
  readonly role: (special: string, general: string) => string;
  readonly special: (special: string, general: string) => string;
  readonly include: (base: string, included: string) => string;
  readonly extend: (extension: string, base: string, points: string | undefined, when: string | undefined) => string;
  readonly note: (on: string, subject: boolean, text: string) => string;
  /** `a, b and c` in the words of the locale. */
  readonly list: (items: readonly string[]) => string;
}
