import type { Locale } from '@diagrist/lang';
import { JSON_FORM, type Outcome } from '../commands/command.js';
import type { Io } from '../io.js';
import { codeOf, formatProblem, type Problem } from '../messages.js';

/** How the caller wants the answer: as JSON or text, in which language, and for which command. */
export interface Audience {
  readonly command: string | null;
  readonly json: boolean;
  readonly locale: Locale;
}

/**
 * Prints the answer of a call and returns its exit code. With `--json` everything, a refusal included, is one
 * JSON document on stdout; otherwise results go to stdout and refusals to stderr.
 */
export function deliver(answer: Outcome | Problem, audience: Audience, io: Io): number {
  const envelope = { 'diagrist-cli': JSON_FORM, command: audience.command };
  if ('problem' in answer) {
    const message = formatProblem(answer, audience.locale);
    if (audience.json) io.stdout(json({ ...envelope, ok: false, error: { code: codeOf(answer), message } }));
    else io.stderr(`${message}\n`);
    return 2;
  }
  if (audience.json) io.stdout(json({ ...envelope, ok: answer.exitCode === 0, ...answer.json }));
  else if (answer.text !== '') io.stdout(`${answer.text}\n`);
  return answer.exitCode;
}

function json(document: Readonly<Record<string, unknown>>): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}
