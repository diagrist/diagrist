import { plural } from '../../shared/words.js';
import type { UseCaseProse } from './prose.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** English sentences of the use case description. */
export const USECASE_EN: UseCaseProse = {
  summary: (title, kind, a, u) =>
    `${title}. ${kind} with ${plural(a, 'actor', 'actors')} and ${plural(u, 'use case', 'use cases')}.`,
  offers: (system, n, cases) => `The system ${system} offers ${plural(n, 'use case', 'use cases')}: ${cases}.`,
  outside: (cases) => `Without a subject: ${cases}.`,
  actor: (label, system) => `Actor ${label}${system ? ' (system)' : ''}.`,
  stereotype: (label, s) => `${label} carries the stereotype ${s}.`,
  points: (label, n, points) => `${label} has the extension point${n === 1 ? '' : 's'} ${points}.`,
  association: (a, b, label, ends) =>
    `${a} takes part in ${b}${label ? ` (${label})` : ''}${ends.length ? `, multiplicity ${ends.map((e) => `${e.count} at ${e.at}`).join(', ')}` : ''}.`,
  role: (special, general) => `${special} is a special role of ${general}.`,
  special: (special, general) => `${special} is a special case of ${general}.`,
  include: (base, included) => `${base} includes ${included} (include).`,
  extend: (extension, base, points, when) =>
    `${extension} extends ${base}${points ? ` at ${points}` : ''}${when ? `, when ${when}` : ''} (extend).`,
  note: (on, subject, text) => `Note on ${subject ? `the subject ${on}` : on}: ${text}.`,
  list,
};
