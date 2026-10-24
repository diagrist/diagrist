import type { Value } from '@diagrist/lang';

const NAME = '[\\p{L}_][\\p{L}\\p{N}_.-]*';
const ONE = new RegExp(`^${NAME}$`, 'u');
const PAIR = new RegExp(`^(${NAME})/(${NAME})$`, 'u');
const SLOT = /^([1-9]\d*)\/([1-9]\d*)$/;

const ok = <T>(value: T) => ({ ok: true as const, value });
const fail = { ok: false as const };

/** A place in the grid: column and row. */
export interface Place {
  readonly col: string;
  readonly row: string;
}

/** Where an area ends: its last column, and its last row when it reaches over rows. */
export interface SpanEnd {
  readonly col: string;
  readonly row?: string;
}

/** A column or row of the grid. Names may hold a dot: `api.1` and `api.2` share the prefix and stand close. */
export const gridName = (): Value<string> => ({
  type: 'grid-name',
  expected: 'a column or row name like `api` or `backend.1`',
  tokens: ['word'],
  read: (raw) => (ONE.test(raw) ? ok(raw) : fail),
});

/** The columns or rows of the grid in order, separated by commas without spaces. */
export const gridNames = (): Value<readonly string[]> => ({
  type: 'grid-names',
  expected: 'names separated by commas without spaces, like `user,api.1,api.2`',
  tokens: ['word'],
  read: (raw) => {
    const names = raw.split(',');
    return names.every((name) => ONE.test(name)) ? ok(names) : fail;
  },
});

/** Column and row of a place, as `column/row`. */
export const place = (): Value<Place> => ({
  type: 'place',
  expected: 'a place `column/row` like `backend.1/main`',
  tokens: ['word'],
  read: (raw) => {
    const match = PAIR.exec(raw);
    return match?.[1] && match[2] ? ok({ col: match[1], row: match[2] }) : fail;
  },
});

/** The end of an area: its last column, or `column/row` to reach over rows too. */
export const spanEnd = (): Value<SpanEnd> => ({
  type: 'span',
  expected: 'the last column like `mobile`, or `column/row` like `edge/data`',
  tokens: ['word'],
  read: (raw) => {
    const match = PAIR.exec(raw);
    if (match?.[1] && match[2]) return ok({ col: match[1], row: match[2] });
    return ONE.test(raw) ? ok({ col: raw }) : fail;
  },
});

/** Place `index` of `count` equal places, written `i/n`. */
export const slot = (): Value<{ readonly index: number; readonly count: number }> => ({
  type: 'slot',
  expected: '`i/n` with 1 ≤ i ≤ n ≤ 64, like `2/3`',
  tokens: ['word'],
  read: (raw) => {
    const [, index, count] = (SLOT.exec(raw) ?? []).map(Number);
    return index !== undefined && count !== undefined && index <= count && count <= 64 ? ok({ index, count }) : fail;
  },
});

/** A whole number within bounds, such as a width in pixels or a number of instances. */
export const whole = (min: number, max: number): Value<number> => ({
  type: 'integer',
  expected: `a whole number from ${min} to ${max}`,
  tokens: ['word'],
  read: (raw) => {
    const value = Number(raw);
    return /^\d+$/.test(raw) && value >= min && value <= max ? ok(value) : fail;
  },
});
