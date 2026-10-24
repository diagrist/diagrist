import { say } from '../messages.js';
import { diagnosticJson, diagnosticText, hasError } from '../report/diagnostics.js';
import { type Command, command } from './command.js';
import { readSource } from './files.js';

export const check: Command = command({
  name: 'check',
  doc: 'Checks a diagram against the grammar and the rules of its kind and prints every finding. Writes nothing.',
  arguments: [{ name: 'file', count: 'one', doc: 'The .dgr file to check.' }],
  options: {},
  examples: [
    { command: 'dgr check diagrams/order.dgr', doc: 'Print the findings; exit with 1 on an error.' },
    { command: 'dgr check diagrams/order.dgr --json', doc: 'The same as one JSON document, for agents.' },
  ],
  json: {
    file: 'The checked file.',
    diagnostics: 'All findings, see "Diagnostics".',
  },
  async run({ arguments: { file }, io, engine, locale }) {
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    const diagnostics = [...source.notices, ...engine.compile(source.text, { locale }).diagnostics];
    const lines = diagnostics.map((d) => diagnosticText(file, source.text, d, locale));
    return {
      exitCode: hasError(diagnostics) ? 1 : 0,
      json: { file, diagnostics: diagnostics.map((d) => diagnosticJson(file, d)) },
      text: lines.length > 0 ? lines.join('\n') : say('noFindings', locale, { file }),
    };
  },
});
