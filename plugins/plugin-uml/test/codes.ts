import type { Plugin } from '@diagrist/core';

type Moved = readonly (readonly [string, string, string])[];

/** Predecessor codes per kind whose check the language, the tables or the kernel do now, with the code reporting it. */
const MOVED: Readonly<Record<string, Moved>> = {
  sequence: [
    ['E400, in part', 'L107', '`activate`, `destroy`, `coregion` and `on=` name declared lifelines'],
    ['E402', 'L101', '`else` only in `alt`, `and` only in `par`, `seq`, `strict`'],
    ['E406', 'L108', 'ids are unique'],
    ['E407', 'L107, L108', '`id=` is an id like any other'],
    ['E409', 'L101', '`divider` only at the top level'],
    ['E453, in part', 'L101', 'statements a coregion cannot hold'],
    ['W302', 'L107', '`mark=` refers to an `adr`'],
  ],
  usecase: [
    ['E101', 'L107', '`rel`, `in`, `on` and `mark=` name declared elements of the right kind'],
    ['E102', 'L108', 'ids are unique'],
    ['E420', 'L104', '`actor` has no `in`: actors stand outside every subject'],
    ['E426, in part', 'L103', '`source=` and `card=` are valid multiplicities'],
    ['E004, in part', 'U426', '`-->` without `include` or `extend`'],
    ['W425', 'G400', 'a note without free room overlaps a node, a text or a frame line'],
  ],
  activity: [
    [
      'E101',
      'L107',
      '`in`, `interruptible=`, `expansion=`, `mark=`, the ends of `go` and `handler` name declared elements of the right kind',
    ],
    ['E102', 'L108', 'ids are unique'],
    [
      'E436',
      'L102, L104, L105',
      'actions, objects, signals and time events need their text, start, ends and bars take none, `state=` only on `object`: each node has its own table',
    ],
    ['E438', 'L104, L105', 'pins only on `action`, `send` (input) and `accept` (output), `call` only on `action`'],
    ['E439, now a warning', 'G400', 'the frame of a region overlaps a node that is not its member'],
    ['W458', 'L105', '`tone=` only on nodes drawn as cards'],
    ['E456, in part', 'L107', 'both ends of `handler` are actions'],
  ],
  class: [
    ['E101', 'L107', '`rel`, `in`, `on`, `class=` and `mark=` name declared elements of the right kind'],
    ['E102', 'L108', 'ids are unique'],
    ['E414, in part', 'L103', '`source=` and `card=` are valid multiplicities'],
    ['E417, in part', 'L107', '`class=` names a `class`'],
  ],
  state: [
    ['E101', 'L107', '`go`, `in`, `on`, `internal` and `mark=` name declared vertices of the right kind'],
    ['E102', 'L108', 'ids are unique'],
    ['E444, in part', 'L104', '`deep` only on `history`'],
    ['E445, in part', 'L107', '`in` names a state or region, `internal` a state'],
    ['E448, in part', 'L107', 'a region lies in a state; transitions end at vertices, not at regions'],
    ['E449, in part', 'L107', 'entry and exit points sit on states'],
  ],
};

/** Checks without a predecessor code. */
const NEW: readonly string[] = ['U428', 'U471', 'U465'];

const START = '<!-- Generated from the rules in src/*/rules by `pnpm docs:uml`. Do not edit. -->';
const END = '<!-- End of the generated codes. -->';

/**
 * The predecessor's code of a rule: errors kept their number, warnings kept theirs plus 500 (ADR 0011), so the old
 * code follows from code and severity and is written nowhere by hand.
 */
function predecessor(code: string, severity: string): string {
  if (NEW.includes(code)) return '–';
  const number = Number(code.slice(1));
  return severity === 'error' ? `E${number}` : `W${number - 500}`;
}

const cell = (text: string): string => text.replace(/\|/g, '\\|');

/** The code tables of the README per kind, derived from the plugin's rules (ADR 0004). */
function codeTables(plugin: Plugin): string[] {
  const kinds = plugin.kinds.flatMap((kind) => [
    `### \`${kind.spec.name}\``,
    '',
    '| Code | Severity | Before | What it checks |',
    '|---|---|---|---|',
    ...kind.rules.map((r) => `| ${r.code} | ${r.severity} | ${predecessor(r.code, r.severity)} | ${cell(r.doc)} |`),
    '',
    'Checks of the predecessor that the language, the tables or the kernel do now:',
    '',
    '| Before | Now | |',
    '|---|---|---|',
    ...(MOVED[kind.spec.name] ?? []).map(([before, now, what]) => `| ${before} | ${now} | ${what} |`),
    '',
  ]);
  return [START, '', ...kinds, END];
}

/** The README with its code section replaced by what the rules generate, `undefined` without the markers. */
export function withCodeTables(readme: string, plugin: Plugin): string | undefined {
  const from = readme.indexOf(START);
  const to = readme.indexOf(END);
  if (from === -1 || to === -1) return undefined;
  return `${readme.slice(0, from)}${codeTables(plugin).join('\n')}${readme.slice(to + END.length)}`;
}
