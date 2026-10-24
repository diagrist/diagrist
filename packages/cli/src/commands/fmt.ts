import { type Locale, print, read } from '@diagrist/lang';
import type { Finding } from '../engine.js';
import { say } from '../messages.js';
import { diagnosticJson, diagnosticText, hasError, languageFindings } from '../report/diagnostics.js';
import { type Command, command } from './command.js';
import { readSources, type Source, writeOutput } from './files.js';

type Status = 'formatted' | 'unchanged' | 'unformatted' | 'invalid';

interface Formatting {
  readonly source: Source;
  readonly status: Status;
  readonly printed: string;
  readonly diagnostics: readonly Finding[];
}

export const fmt: Command = command({
  name: 'fmt',
  doc: 'Formats .dgr files in place. Two spaces per indent level and at most one blank line; token order, aligned columns and comments stay as written. A file with read errors is left unchanged, because formatting it could drop lines.',
  arguments: [{ name: 'files', count: 'many', doc: 'The .dgr files to format.' }],
  options: {
    check: {
      type: 'boolean',
      doc: 'Change nothing; exit with 1 if a file is not formatted. For CI and pre-commit hooks.',
    },
  },
  examples: [
    { command: 'dgr fmt diagrams/order.dgr', doc: 'Format one file in place.' },
    { command: 'dgr fmt --check diagrams/*.dgr', doc: 'Fail when a file is not formatted, without changing it.' },
  ],
  json: {
    files:
      'One entry per file, `{ file, status }`. `status` is `formatted` (rewritten), `unchanged` (already formatted), `unformatted` (only with `--check`: formatting would change it) or `invalid` (has read errors, left unchanged).',
    diagnostics: 'Read errors and warnings of all files, see "Diagnostics".',
  },
  async run({ arguments: { files }, options, io, locale }) {
    const sources = await readSources(io, files, locale);
    if ('problem' in sources) return sources;
    const results = sources.map((source) => format(source, options.check === true, locale));
    for (const { source, status, printed } of results) {
      if (status !== 'formatted') continue;
      const failed = await writeOutput(io, source.file, printed, locale);
      if (failed) return failed;
    }
    const failed = results.some((result) => result.status === 'invalid' || result.status === 'unformatted');
    return {
      exitCode: failed ? 1 : 0,
      json: {
        files: results.map(({ source, status }) => ({ file: source.file, status })),
        diagnostics: results.flatMap(({ source, diagnostics }) =>
          diagnostics.map((d) => diagnosticJson(source.file, d)),
        ),
      },
      text: describe(results, locale),
    };
  },
});

function format(source: Source, checkOnly: boolean, locale: Locale): Formatting {
  const reading = read(source.text);
  const diagnostics = [...source.notices, ...languageFindings(reading.diagnostics, locale)];
  if (hasError(diagnostics)) return { source, status: 'invalid', printed: source.text, diagnostics };
  const printed = print(reading.document);
  const status = printed === source.text ? 'unchanged' : checkOnly ? 'unformatted' : 'formatted';
  return { source, status, printed, diagnostics };
}

function describe(results: readonly Formatting[], locale: Locale): string {
  const lines = results.flatMap(({ source, status, diagnostics }) => [
    ...diagnostics.map((d) => diagnosticText(source.file, source.text, d, locale)),
    ...(status === 'unchanged' ? [] : [say(status, locale, { file: source.file })]),
  ]);
  if (results.every((result) => result.status === 'unchanged')) {
    lines.push(say('allFormatted', locale, { count: String(results.length) }));
  }
  return lines.join('\n');
}
