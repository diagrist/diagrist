import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import type { Statement } from '../tree.js';
import { headOf, startsWith } from './lines.js';
import type { Slot } from './merge.js';
import { DROP } from './tables.js';

/**
 * Applies `drop <keyword> <arguments>`: exactly one line of the picture must start with what it names (L112 for
 * none, L113 for several). A base line stays as a removed slot; a line the variant added itself is taken out.
 */
export function dropLine(
  line: Statement,
  variant: string,
  slots: Slot[],
  added: { statement: Statement }[],
  diagnostics: Diagnostic[],
): void {
  const [keyword, ...args] = line.arguments;
  const report = (code: string, values: Record<string, string>) =>
    diagnostics.push(diagnostic(code, 'error', line.keywordSpan, values));
  if (keyword?.kind !== 'word') {
    report(LANG_CODES.missingArgument, {
      statement: 'drop',
      name: 'keyword',
      expected: 'the keyword of the line to remove',
      example: DROP.examples[0] ?? 'drop',
    });
    return;
  }
  const kept = slots.filter((s) => s.dropped === undefined);
  const lines = [...kept.map((s) => s.statement), ...added.map((a) => a.statement)];
  const matches = lines.filter((s) => startsWith(s, keyword.value, args));
  const found = [keyword.value, ...args.map((a) => (a.kind === 'text' ? `"${a.value}"` : a.value))].join(' ');
  const match = matches[0];
  if (match === undefined) {
    const same = lines.filter((s) => s.keyword === keyword.value).map(headOf);
    const example = same[0] !== undefined ? `drop ${same[0]}` : (DROP.examples[0] ?? 'drop');
    report(LANG_CODES.dropNoMatch, { found, variant, keyword: keyword.value, known: list(same), example });
    return;
  }
  if (matches.length > 1) {
    const example = `drop ${unique(match, matches)}`;
    report(LANG_CODES.dropAmbiguous, { found, lines: matches.map((m) => String(m.line)).join(', '), example });
    return;
  }
  const own = added.findIndex((a) => a.statement === match);
  if (own >= 0) {
    added.splice(own, 1);
    return;
  }
  const index = slots.findIndex((s) => s.statement === match && s.dropped === undefined);
  const slot = slots[index];
  if (slot !== undefined) slots[index] = { ...slot, dropped: line };
}

/** The shortest start of `match` that no other line of `matches` has, as `drop` would write it. */
function unique(match: Statement, matches: readonly Statement[]): string {
  const shown = (n: number) =>
    [match.keyword, ...match.arguments.slice(0, n).map((a) => (a.kind === 'text' ? `"${a.value}"` : a.value))].join(
      ' ',
    );
  for (let n = 1; n <= match.arguments.length; n++) {
    const start = match.arguments.slice(0, n);
    if (matches.filter((m) => startsWith(m, match.keyword, start)).length === 1) return shown(n);
  }
  return shown(match.arguments.length);
}
