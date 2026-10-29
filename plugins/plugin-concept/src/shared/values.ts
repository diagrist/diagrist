import type { Value } from '@diagrist/lang';

const IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_-]*$/u;
const IDENTIFIERS = /^[\p{L}_][\p{L}\p{N}_-]*(,[\p{L}_][\p{L}\p{N}_-]*)*$/u;

/**
 * The id of a declaration of the file or of its vocabulary. It is not a `ref`, because a vocabulary's declarations
 * stand in no line the language could find; the kind's rules check it against both.
 */
export const declared = (what: 'type' | 'link'): Value<string> => ({
  type: `${what}-name`,
  expected: `the id of a \`${what}\` declared in this diagram or in its vocabulary`,
  tokens: ['word'],
  read: (raw) => (IDENTIFIER.test(raw) ? { ok: true, value: raw } : { ok: false }),
});

/** Ids of types separated by commas without spaces, such as `rolle,team`; the rules compare them with the types. */
export const typeList = (): Value<readonly string[]> => ({
  type: 'type-names',
  expected: 'the ids of one or more `type`s, separated by commas without spaces, like `rolle` or `rolle,team`',
  tokens: ['word'],
  read: (raw) => (IDENTIFIERS.test(raw) ? { ok: true, value: raw.split(',') } : { ok: false }),
});
