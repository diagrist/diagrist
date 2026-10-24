import { say } from '../messages.js';
import { diagnosticJson, diagnosticText, hasError } from '../report/diagnostics.js';
import { type Command, command } from './command.js';
import { needEngine } from './engine-required.js';
import { readSource, writeOutput } from './files.js';

export const build: Command = command({
  name: 'build',
  doc: 'Renders a diagram as SVG. Nothing is written when the diagram has an error; warnings are printed and do not stop the build.',
  arguments: [{ name: 'file', count: 'one', doc: 'The .dgr file to render.' }],
  options: {
    out: {
      type: 'string',
      short: 'o',
      value: 'file',
      doc: 'Where to write the SVG. Default: next to the source, with `.svg` instead of `.dgr`.',
    },
  },
  examples: [
    { command: 'dgr build diagrams/order.dgr', doc: 'Write diagrams/order.svg.' },
    { command: 'dgr build diagrams/order.dgr -o site/order.svg', doc: 'Write the SVG somewhere else.' },
  ],
  json: {
    file: 'The rendered source.',
    output: 'Path of the written SVG, `null` when nothing was written.',
    diagnostics: 'All findings, see "Diagnostics".',
  },
  async run({ arguments: { file }, options, io, engine, locale }) {
    if (engine === undefined) return needEngine('build');
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    const { svg, diagnostics } = engine.compile(source.text, { locale });
    let output: string | undefined;
    if (svg !== undefined && !hasError(diagnostics)) {
      output = options.out ?? svgBeside(file);
      const failed = await writeOutput(io, output, svg, locale);
      if (failed) return failed;
    }
    const lines = diagnostics.map((d) => diagnosticText(file, source.text, d, locale));
    if (output !== undefined) lines.push(say('wrote', locale, { file: output }));
    return {
      exitCode: output === undefined ? 1 : 0,
      json: { file, output: output ?? null, diagnostics: diagnostics.map((d) => diagnosticJson(file, d)) },
      text: lines.join('\n'),
    };
  },
});

/** `diagrams/order.dgr` becomes `diagrams/order.svg`; the legacy `.dia` is replaced the same way. */
function svgBeside(file: string): string {
  return `${file.replace(/\.(dgr|dia)$/, '')}.svg`;
}
