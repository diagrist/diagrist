import type { Plugin } from '@diagrist/core';

/** Predecessor codes whose check the language or the tables do now, with the `lang` code that reports it. */
const NOW_IN_LANG: readonly (readonly [string, string, string])[] = [
  ['E400, in part', 'L107', '`activate`, `destroy`, `coregion` and `on=` name declared lifelines'],
  ['E402', 'L101', '`else` only in `alt`, `and` only in `par`, `seq`, `strict`'],
  ['E406', 'L108', 'ids are unique'],
  ['E407', 'L107, L108', '`id=` is an id like any other'],
  ['E409', 'L101', '`divider` only at the top level'],
  ['E453, in part', 'L101', 'statements a coregion cannot hold'],
  ['W302', 'L107', '`mark=` refers to an `adr`'],
];

const START = '<!-- Generated from the rules in src/sequence/rules by `pnpm docs:uml`. Do not edit. -->';
const END = '<!-- End of the generated codes. -->';

/**
 * The predecessor's code of a rule: errors kept their number, warnings kept theirs plus 500 (ADR 0011), so the old
 * code follows from code and severity and is written nowhere by hand.
 */
function predecessor(code: string, severity: string): string {
  const number = Number(code.slice(1));
  return severity === 'error' ? `E${number}` : `W${number - 500}`;
}

const cell = (text: string): string => text.replace(/\|/g, '\\|');

/** The code tables of the README, derived from the plugin's rules (ADR 0004). */
function codeTables(plugin: Plugin): string[] {
  const rules = plugin.kinds.flatMap((kind) => kind.rules);
  return [
    START,
    '',
    '| Code | Severity | Before | What it checks |',
    '|---|---|---|---|',
    ...rules.map((r) => `| ${r.code} | ${r.severity} | ${predecessor(r.code, r.severity)} | ${cell(r.doc)} |`),
    '',
    'Checks of the predecessor that the language or the tables do now:',
    '',
    '| Before | Now | |',
    '|---|---|---|',
    ...NOW_IN_LANG.map(([before, now, what]) => `| ${before} | ${now} | ${what} |`),
    '',
    END,
  ];
}

/** The README with its code section replaced by what the rules generate, `undefined` without the markers. */
export function withCodeTables(readme: string, plugin: Plugin): string | undefined {
  const from = readme.indexOf(START);
  const to = readme.indexOf(END);
  if (from === -1 || to === -1) return undefined;
  return `${readme.slice(0, from)}${codeTables(plugin).join('\n')}${readme.slice(to + END.length)}`;
}
