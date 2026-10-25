import type { TextRun } from '@diagrist/core';
import { sceneRole } from './styles.js';

/**
 * One line of highlighted code: its number in the file, its text, and the text again in runs whose roles (such as
 * `codeKeyword`, see `CODE_ROLES`) a style table paints. Runs without role are operators, punctuation and plain names.
 */
export interface CodeLine {
  /** Counted from 1 in the file, so an excerpt keeps the numbers an editor shows. */
  readonly number: number;
  /** The runs joined, as a scene text needs it beside its runs. */
  readonly text: string;
  readonly runs: readonly TextRun[];
  /** Names of methods and types this line declares, which `symbol` finds; calls and uses are not listed. */
  readonly declares?: readonly string[];
  /** How many lines of the file a fold on this line hides, such as a method body in an outline. */
  readonly folded?: number;
}

/** The scene role of a run of comment, which tells comment lines and region markers from code. */
export const COMMENT: string = sceneRole('comment');

/**
 * How many braces a line opens and closes, counting only braces in runs without role, so a brace in a string or a
 * comment counts for nothing.
 */
export function braces(line: CodeLine): { readonly opened: number; readonly closed: number } {
  let opened = 0;
  let closed = 0;
  for (const run of line.runs) {
    if (run.role !== undefined) continue;
    for (const char of run.text) {
      if (char === '{') opened++;
      if (char === '}') closed++;
    }
  }
  return { opened, closed };
}

/** Whether a line holds nothing but whitespace. */
export const isBlank = (line: CodeLine): boolean => line.text.trim() === '';

/** Whether a line holds a comment and nothing else, such as a line of Javadoc or a region marker. */
export const isComment = (line: CodeLine): boolean =>
  !isBlank(line) && line.runs.every((run) => run.role === COMMENT || run.text.trim() === '');

/** The same line with other runs, its text joined from them. */
export const withRuns = (line: CodeLine, runs: readonly TextRun[]): CodeLine => ({
  ...line,
  runs,
  text: runs.map((run) => run.text).join(''),
});

/**
 * Removes the indentation all non-blank lines share, so a method cut out of a class starts at the left edge of its
 * card. Blank lines lose their spaces too.
 */
export function dedent(lines: readonly CodeLine[]): CodeLine[] {
  const indents = lines.filter((l) => !isBlank(l)).map((l) => l.text.length - l.text.trimStart().length);
  const cut = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) => (isBlank(line) ? withRuns(line, []) : cut === 0 ? line : withRuns(line, trim(line, cut))));
}

/** The runs of a line without its first `cut` characters, which are spaces. */
function trim(line: CodeLine, cut: number): TextRun[] {
  let left = cut;
  return line.runs.flatMap((run) => {
    const taken = Math.min(left, run.text.length);
    left -= taken;
    return taken === run.text.length ? [] : [{ ...run, text: run.text.slice(taken) }];
  });
}
