import { say } from '../messages.js';
import { diagnosticJson, diagnosticText, hasError } from '../report/diagnostics.js';
import { type Command, command } from './command.js';
import { readSource, writeOutput } from './files.js';
import { pngBeside, pngScale, renderPng, SCALE, SCALED_EXAMPLE } from './png.js';

export const build: Command = command({
  name: 'build',
  doc: 'Renders a diagram as SVG, and with `--png` also as PNG. Nothing is written when the diagram has an error; warnings are printed and do not stop the build. With `--watch` it builds again after every change of the source.',
  arguments: [{ name: 'file', count: 'one', doc: 'The .dgr file to render.' }],
  options: {
    out: {
      type: 'string',
      short: 'o',
      value: 'file',
      doc: 'Where to write the SVG. Default: next to the source, with `.svg` instead of `.dgr`. The PNG goes beside the SVG.',
    },
    png: {
      type: 'boolean',
      doc: 'Also write a PNG with the name of the SVG and `.png`. Rendered without a browser and with the bundled fonts, so the same diagram gives the same bytes on every machine.',
    },
    scale: {
      type: 'string',
      value: 'factor',
      doc: `Pixels of the PNG per SVG unit, from ${SCALE.min} to ${SCALE.max}; 2 doubles width and height. Default: ${SCALE.standard}. Needs \`--png\`.`,
    },
    watch: {
      type: 'boolean',
      doc: 'Build, then build again each time the source changes, until Ctrl+C. Each build prints what it wrote and its findings, with `--json` one document per build. Errors in the diagram and a source that is gone for a moment do not end the watch; only a call refused at the first build does. Ends with the exit code of the last build.',
    },
  },
  examples: [
    { command: 'dgr build diagrams/order.dgr', doc: 'Write diagrams/order.svg.' },
    { command: 'dgr build diagrams/order.dgr -o site/order.svg', doc: 'Write the SVG somewhere else.' },
    { command: 'dgr build diagrams/order.dgr --png', doc: 'Also write diagrams/order.png, twice the size of the SVG.' },
    { command: SCALED_EXAMPLE, doc: 'Write the PNG at three times the size of the SVG, e.g. for print.' },
    { command: 'dgr build diagrams/order.dgr --png --watch', doc: 'Write SVG and PNG again on every save.' },
  ],
  json: {
    file: 'The rendered source.',
    output: 'Path of the written SVG, `null` when nothing was written.',
    png: 'Path of the written PNG, `null` without `--png` or when nothing was written.',
    diagnostics: 'All findings, see "Diagnostics".',
  },
  async run({ arguments: { file }, options, io, engine, raster, locale }) {
    const scale = pngScale(options.png, options.scale);
    if (typeof scale === 'object') return scale;
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    const compiled = engine.compile(source.text, { locale });
    const { svg } = compiled;
    const diagnostics = [...source.notices, ...compiled.diagnostics];
    const written: string[] = [];
    if (svg !== undefined && !hasError(diagnostics)) {
      const output = options.out ?? svgBeside(file);
      const picture = scale === undefined ? undefined : await renderPng(raster, svg, file, scale);
      if (picture !== undefined && !(picture instanceof Uint8Array)) return picture;
      const files: [string, string | Uint8Array][] = [[output, svg]];
      if (picture !== undefined) files.push([pngBeside(output), picture]);
      for (const [path, content] of files) {
        const failed = await writeOutput(io, path, content, locale);
        if (failed) return failed;
        written.push(path);
      }
    }
    const lines = diagnostics.map((d) => diagnosticText(file, source.text, d, locale));
    lines.push(...written.map((path) => say('wrote', locale, { file: path })));
    const [output = null, png = null] = written;
    return {
      exitCode: output === null ? 1 : 0,
      json: { file, output, png, diagnostics: diagnostics.map((d) => diagnosticJson(file, d)) },
      text: lines.join('\n'),
    };
  },
});

/** `diagrams/order.dgr` becomes `diagrams/order.svg`; the legacy `.dia` is replaced the same way. */
function svgBeside(file: string): string {
  return `${file.replace(/\.(dgr|dia)$/, '')}.svg`;
}
