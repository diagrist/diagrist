import type { Value } from '@diagrist/lang';

const BOUND = /^(\d+|\*)$/;

/** A lower and upper bound, `*` for many; the lower one must not lie above the upper one. */
function isMultiplicity(raw: string): boolean {
  const [low = '', high, ...rest] = raw.split('..');
  if (rest.length > 0 || !BOUND.test(low)) return false;
  if (high === undefined) return true;
  if (!BOUND.test(high) || low === '*') return false;
  return high === '*' || Number(low) <= Number(high);
}

/** A UML multiplicity at one end of an association, such as `1`, `0..1`, `1..*` or `*` (UML 2.5.1, 7.5.4). */
export const multiplicity = (): Value<string> => ({
  type: 'multiplicity',
  expected: 'a UML multiplicity like `1`, `0..1`, `1..*` or `*`, the lower bound not above the upper one',
  tokens: ['word'],
  read: (raw) => (isMultiplicity(raw) ? { ok: true, value: raw } : { ok: false }),
});

/** `"before checkout, after payment"`: names in their order, separated by commas, without empty ones. */
export const splitNames = (text: string | undefined): string[] =>
  (text ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
