import { diagnosticJson, diagnosticLines, hasError } from '../report/diagnostics.js';
import { measuredPictures, metricsLine } from '../report/metrics.js';
import { say } from '../say.js';
import { type Command, command } from './command.js';
import { compileSource, readSource } from './files.js';

export const check: Command = command({
  name: 'check',
  doc: 'Checks a diagram against the grammar, the rules of its kind, the placement and the lines of its pictures and prints every finding, those about one picture of a file with variants marked with the variant. Writes nothing.',
  arguments: [{ name: 'file', count: 'one', doc: 'The .dgr file to check.' }],
  options: {
    metrics: {
      type: 'boolean',
      doc: 'Also print the measures of the lines of every drawn picture: lines, crossings, bends, length and size, so two versions of a diagram can be compared.',
    },
  },
  examples: [
    { command: 'dgr check diagrams/order.dgr', doc: 'Print the findings; exit with 1 on an error.' },
    { command: 'dgr check diagrams/order.dgr --json', doc: 'The same as one JSON document, for agents.' },
    {
      command: 'dgr check diagrams/order.dgr --metrics',
      doc: 'The findings and how many crossings and bends each picture has.',
    },
  ],
  json: {
    file: 'The checked file.',
    diagnostics: 'All findings, see "Diagnostics".',
    pictures:
      'With `--metrics`: every drawn picture with its `variant`, if any, and `metrics`: `lines`, `crossings`, `bends`, `maxBends`, `length`, `parentsOff`, `parentOffset`, `childrenOff`, `childOffset`, `width`, `height`.',
  },
  async run({ arguments: { file }, options, io, engine, locale }) {
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    const compiled = await compileSource(io, engine, source, locale);
    if ('problem' in compiled) return compiled;
    const diagnostics = [...source.notices, ...compiled.compilation.diagnostics];
    const lines = diagnosticLines(file, source.text, compiled.files, diagnostics, locale);
    const measured = options.metrics === true ? measuredPictures(compiled.compilation.pictures) : undefined;
    const text = lines.length > 0 ? lines.join('\n') : say('noFindings', locale, { file });
    return {
      exitCode: hasError(diagnostics) ? 1 : 0,
      json: {
        file,
        diagnostics: diagnostics.map((d) => diagnosticJson(file, d)),
        ...(measured === undefined ? {} : { pictures: measured }),
      },
      text: [text, ...(measured ?? []).map((p) => metricsLine(file, p, locale))].join('\n'),
    };
  },
});
