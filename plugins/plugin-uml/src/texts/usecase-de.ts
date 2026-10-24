import { plural } from '../sequence/describe/prose.js';
import type { UseCaseProse } from '../usecase/describe/prose.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;

/** German sentences of the use case description, as the predecessor wrote them. */
export const USECASE_DE: UseCaseProse = {
  summary: (title, kind, a, u) =>
    `${title}. ${kind} mit ${plural(a, 'Akteur', 'Akteuren')} und ${plural(u, 'Anwendungsfall', 'Anwendungsfällen')}.`,
  offers: (system, n, cases) =>
    `Das System ${system} bietet ${plural(n, 'Anwendungsfall', 'Anwendungsfälle')}: ${cases}.`,
  outside: (cases) => `Ohne Systemgrenze: ${cases}.`,
  actor: (label, system) => `Akteur ${label}${system ? ' (System)' : ''}.`,
  stereotype: (label, s) => `${label} trägt den Stereotyp ${s}.`,
  points: (label, n, points) =>
    `${label} hat ${n === 1 ? 'die Erweiterungsstelle' : 'die Erweiterungsstellen'} ${points}.`,
  association: (a, b, label, ends) =>
    `${a} ist beteiligt an ${b}${label ? ` (${label})` : ''}${ends.length ? `, Multiplizität ${ends.map((e) => `${e.count} bei ${e.at}`).join(', ')}` : ''}.`,
  role: (special, general) => `${special} ist eine spezielle Rolle von ${general}.`,
  special: (special, general) => `${special} ist ein spezieller Fall von ${general}.`,
  include: (base, included) => `${base} schließt ${included} ein (include).`,
  extend: (extension, base, points, when) =>
    `${extension} erweitert ${base}${points ? ` an der Stelle ${points}` : ''}${when ? `, wenn ${when}` : ''} (extend).`,
  note: (on, subject, text) => `Notiz an ${subject ? `der Systemgrenze ${on}` : on}: ${text}.`,
  list,
};
