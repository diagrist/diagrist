import { COMMENT, type CodeLine, isBlank, isComment } from './lines.js';
import { isMarker } from './region.js';
import { sceneRole } from './styles.js';

const ANNOTATION = sceneRole('annotation');

/** The names of methods and types a file declares, in file order, each once. */
export function declaredNames(file: readonly CodeLine[]): string[] {
  return [...new Set(file.flatMap((line) => line.declares ?? []))];
}

/**
 * The declaration of a method or type by name, read from the tokens with a brace counter and no parser: the first line
 * that declares the name (a call or a use does not), the annotations and comments right above it, and every line to
 * the brace that closes its body. A declaration without body ends at its `;`, and one that has neither, such as a
 * Kotlin class header or a function with an expression body, at the line where its parentheses close and nothing
 * continues it.
 */
export function symbol(file: readonly CodeLine[], name: string): CodeLine[] | undefined {
  const start = file.findIndex((line) => line.declares?.includes(name));
  if (start < 0) return undefined;
  let top = start;
  while (top > 0 && isPreamble(file[top - 1] as CodeLine)) top--;
  return file.slice(top, end(file, start) + 1);
}

/** Annotations and comments that belong to the declaration below them; a blank line or a region marker ends them. */
function isPreamble(line: CodeLine): boolean {
  if (isBlank(line) || isMarker(line)) return false;
  return isComment(line) || line.runs.find((run) => run.text.trim() !== '')?.role === ANNOTATION;
}

/** The index of the last line of the declaration starting at `start`. */
function end(file: readonly CodeLine[], start: number): number {
  let braces = 0;
  let parens = 0;
  let opened = false;
  for (let i = start; i < file.length; i++) {
    const line = file[i] as CodeLine;
    for (const char of plain(line)) {
      if (char === '{') [braces, opened] = [braces + 1, true];
      if (char === '}') braces--;
      if (char === '(') parens++;
      if (char === ')') parens--;
      if (char === ';' && !opened && parens === 0) return i;
    }
    if (opened && braces <= 0) return i;
    if (!opened && parens <= 0 && !continues(line) && !continuesAt(file[i + 1])) return i;
  }
  return file.length - 1;
}

/** The characters of a line outside strings and comments: its runs without role. */
const plain = (line: CodeLine): string =>
  line.runs
    .filter((run) => run.role === undefined)
    .map((run) => run.text)
    .join('');

/** Whether a line ends in the middle of a signature, such as after a comma or before an expression body. */
const continues = (line: CodeLine): boolean =>
  isComment(line) ||
  isBlank(line) ||
  /[,(=:]\s*$|->\s*$/.test(
    line.runs
      .filter((run) => run.role !== COMMENT)
      .map((run) => run.text)
      .join(''),
  );

/** Whether the next line carries the declaration on, such as a brace on a line of its own or a return type. */
const continuesAt = (line: CodeLine | undefined): boolean => line !== undefined && /^\s*[{.:=]/.test(line.text);
