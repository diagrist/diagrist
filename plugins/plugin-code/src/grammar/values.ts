import type { Value } from '@diagrist/lang';

const RANGE = /^([1-9]\d*)(?:-([1-9]\d*))?$/;

/** A line `31` or a range `27-30` of a file, counted from 1, both ends included; the first end comes first. */
export const lineRange = (): Value<readonly [number, number]> => ({
  type: 'lineRange',
  expected: 'a line like `31` or a range like `27-30`, counted from 1, the smaller number first',
  tokens: ['word'],
  read: (raw) => {
    const [, from, to] = RANGE.exec(raw) ?? [];
    if (from === undefined) return { ok: false };
    const range = [Number(from), Number(to ?? from)] as const;
    return range[0] <= range[1] ? { ok: true, value: range } : { ok: false };
  },
});
