import type { Plugin } from '@diagrist/core';

/** Predecessor codes whose check the language, the tables or the kernel do now, with the code reporting it. */
const MOVED: readonly (readonly [string, string, string])[] = [
  ['E101', 'L107', 'edge ends, `in`, `on`, `mark=` and `style=` name declared statements of the right kind'],
  ['E102', 'L108', 'ids are unique'],
  ['E104', 'L103', '`icon=` is one of the icon names'],
  ['E108, W110', 'L101', 'each level lists the elements it allows; other keywords are unknown there'],
  ['W302', 'L107', '`mark=` refers to an `adr`'],
  ['E202, E205, E303, W205', 'G400, G402', 'the placement check reports overlapping nodes, frames and labels'],
];

const START = '<!-- Generated from the rules in src/rules by `pnpm docs:generate`. Do not edit. -->';
const END = '<!-- End of the generated codes. -->';

/** The predecessor's code: errors kept their number, warnings theirs plus 500 (ADR 0011). */
function predecessor(code: string, severity: string): string {
  const number = Number(code.slice(1));
  return severity === 'error' ? `E${String(number).padStart(3, '0')}` : `W${number - 500}`;
}

const cell = (text: string): string => text.replace(/\|/g, '\\|');

/** The code tables of the README, derived from the rules (ADR 0004); all three levels share them. */
function codeTables(plugin: Plugin): string[] {
  const rules = plugin.kinds[0]?.rules ?? [];
  return [
    START,
    '',
    '| Code | Severity | Before | What it checks |',
    '|---|---|---|---|',
    ...rules.map((r) => `| ${r.code} | ${r.severity} | ${predecessor(r.code, r.severity)} | ${cell(r.doc)} |`),
    '',
    'Checks of the predecessor that the language, the tables or the kernel do now:',
    '',
    '| Before | Now | |',
    '|---|---|---|',
    ...MOVED.map(([before, now, what]) => `| ${before} | ${now} | ${what} |`),
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
