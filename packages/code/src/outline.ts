import type { TextRun } from '@diagrist/core';
import { braces, type CodeLine, dedent, isBlank, isComment, withRuns } from './lines.js';

const FOLD: TextRun = { text: ' … }', role: 'codeFold' };

/**
 * A type zoomed out: its declaration, fields and the signatures of its members, each member's body folded into
 * `{ … }` on the signature's line, which carries the number of hidden lines in `folded`. Package and import lines,
 * comments and blank lines go; annotations stay, since `@Transactional` often says more about a design than the body
 * does. Bodies are found with the brace counter of `symbol`: a member is a body opened at the depth of the type's own
 * braces. Lines keep their numbers in the file, and the shared indentation goes as in `excerpt`.
 */
export function outline(lines: readonly CodeLine[]): CodeLine[] {
  const out: CodeLine[] = [];
  let depth = 0;
  let fold: { line: CodeLine; depth: number; hidden: number } | undefined;
  for (const line of lines) {
    const { opened, closed } = braces(line);
    const before = depth;
    depth += opened - closed;
    if (fold !== undefined) {
      fold.hidden++;
      if (depth <= fold.depth) {
        out.push({ ...withRuns(fold.line, [...upToBrace(fold.line.runs), FOLD]), folded: fold.hidden });
        fold = undefined;
      }
    } else if (before === 1 && depth > 1) fold = { line, depth: before, hidden: 0 };
    else if (!dropped(line)) out.push(line);
  }
  return dedent(out);
}

/** Lines an outline leaves out: blank lines, comments, and the package and imports above the type. */
function dropped(line: CodeLine): boolean {
  return isBlank(line) || isComment(line) || /^\s*(package|import)\s/.test(line.text);
}

/** The runs of a line up to and including its first `{` outside strings and comments, cutting the run that holds it. */
function upToBrace(runs: readonly TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    const at = run.role === undefined ? run.text.indexOf('{') : -1;
    if (at < 0) out.push(run);
    else return [...out, { ...run, text: run.text.slice(0, at + 1) }];
  }
  return out;
}
