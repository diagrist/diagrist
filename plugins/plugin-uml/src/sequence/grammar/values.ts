import { ref, type Value } from '@diagrist/lang';
import { PARTICIPANT_KINDS } from '../diagram.js';

const NAME = '[\\p{L}_][\\p{L}\\p{N}_-]*';
const END = new RegExp(`^${NAME}(\\.${NAME})?$`, 'u');
const ID = new RegExp(`^${NAME}$`, 'u');

/** A lifeline declared by any of the head statements. */
export const lifeline = (): Value<string> => ref(...PARTICIPANT_KINDS);

/** A message declared with `id=`, for time constraints. */
export const message = (): Value<string> => ref('msg', 'create');

/**
 * One end of a message. Besides a lifeline it may be an open end (`found`, `lost`), the frame of the
 * interaction (`gate`, `gate.name`) or the frame of a `ref` or fragment with `id=` (`r`, `r.name`). Which one
 * it is depends on the other declarations, so rule U400 checks it after reading, not `lang`.
 */
export const messageEnd = (): Value<string> => ({
  type: 'end',
  expected:
    'a lifeline id like `api`, `found`, `lost`, `gate`, `gate.name`, or the `id=` of a `ref` or fragment, optionally with `.name`',
  tokens: ['word'],
  read: (raw) => (END.test(raw) ? { ok: true, value: raw } : { ok: false }),
});

/** Lifelines a note or reference spans, comma separated without spaces; checked by rule U400. */
export const lifelines = (): Value<readonly string[]> => ({
  type: 'lifelines',
  expected: 'lifeline ids separated by commas without spaces, like `auftrag,lager`',
  tokens: ['word'],
  read: (raw) => {
    const ids = raw.split(',');
    return ids.every((id) => ID.test(id)) ? { ok: true, value: ids } : { ok: false };
  },
});
