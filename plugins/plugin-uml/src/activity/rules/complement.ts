/**
 * Recognises two guards that obviously complement each other: yes and no, a word with and without negation
 * (`available`/`not available`, `damaged`/`undamaged`), known opposites, and comparisons (`amount > 100`/
 * `amount <= 100`). The check does no more than that; it only warns.
 */
const ANTONYMS: readonly (readonly [string, string])[] = [
  ['ja', 'nein'],
  ['yes', 'no'],
  ['true', 'false'],
  ['wahr', 'falsch'],
  ['ok', 'fehler'],
  ['ok', 'error'],
  ['erfolgreich', 'fehlgeschlagen'],
  ['successful', 'failed'],
  ['angenommen', 'abgelehnt'],
  ['accepted', 'rejected'],
  ['genehmigt', 'abgelehnt'],
  ['approved', 'rejected'],
  ['vorhanden', 'fehlt'],
  ['present', 'missing'],
  ['bestanden', 'durchgefallen'],
  ['passed', 'failed'],
];

const NEGATIONS = ['nicht', 'kein', 'keine', 'keinen', 'not', 'no'];

const COMPLEMENT_OPS: readonly (readonly [string, string])[] = [
  ['<', '>='],
  ['>', '<='],
  ['=', '!='],
  ['==', '!='],
  ['<', '≥'],
  ['>', '≤'],
  ['=', '≠'],
];

const words = (text: string) => text.trim().toLowerCase().split(/\s+/);

const antonym = (a: string, b: string) =>
  ANTONYMS.some(([x, y]) => (a === x && b === y) || (a === y && b === x)) || a === `un${b}` || b === `un${a}`;

/** The same words except for one pair of opposites in one place. */
function oneWordApart(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const diff = a.flatMap((w, i) => (w === b[i] ? [] : [i]));
  const [k] = diff;
  return diff.length === 1 && k !== undefined && antonym(a[k] ?? '', b[k] ?? '');
}

/** One text is the other with a negating word inserted. */
function negated(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length + 1) return false;
  return a.some((w, i) => NEGATIONS.includes(w) && [...a.slice(0, i), ...a.slice(i + 1)].join(' ') === b.join(' '));
}

function comparison(text: string): { lhs: string; op: string; rhs: string } | undefined {
  const m = /^(.+?)\s*(<=|>=|==|!=|≤|≥|≠|<|>|=)\s*(.+)$/.exec(text.trim().toLowerCase());
  return m ? { lhs: m[1] ?? '', op: m[2] ?? '', rhs: m[3] ?? '' } : undefined;
}

function compared(a: string, b: string): boolean {
  const x = comparison(a);
  const y = comparison(b);
  if (!x || !y || x.lhs !== y.lhs || x.rhs !== y.rhs) return false;
  return COMPLEMENT_OPS.some(([p, q]) => (x.op === p && y.op === q) || (x.op === q && y.op === p));
}

/** Do the two guards obviously cover every case together? */
export function complementary(a: string, b: string): boolean {
  const [wa, wb] = [words(a), words(b)];
  return oneWordApart(wa, wb) || negated(wa, wb) || negated(wb, wa) || compared(a, b);
}
