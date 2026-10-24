import type { Locale } from '@diagrist/lang';

const TEXTS: Readonly<Record<Locale, (error: string) => string>> = {
  en: (error) =>
    `dgr stopped on an unexpected error: ${error}. This is a bug, not a mistake in the call or the diagram; please report it with both at https://github.com/diagrist/diagrist/issues.`,
  de: (error) =>
    `dgr ist an einem unerwarteten Fehler gescheitert: ${error}. Das ist ein Programmfehler, kein Fehler im Aufruf oder im Diagramm; bitte mit beidem melden unter https://github.com/diagrist/diagrist/issues.`,
};

/**
 * The line printed for an exception nothing else caught: what was thrown, in one line and without the stack, and
 * where to report it. Findings and refusals never come here; they are answers, this is a bug.
 */
export function crashText(error: unknown, locale: Locale = 'en'): string {
  const thrown =
    error instanceof Error ? `${error.name}: ${error.message}` : typeof error === 'string' ? error : typeof error;
  const [line = ''] = thrown.split('\n');
  return TEXTS[locale](line);
}
