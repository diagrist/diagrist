import { diagnosticJson, diagnosticLines, hasError } from '../report/diagnostics.js';
import { say } from '../say.js';
import { type Command, command } from './command.js';
import { compileSource, readSource, writeOutput } from './files.js';
import { planPictures } from './pictures.js';
import { pngBeside, pngScale, renderPng, SCALE, SCALED_EXAMPLE } from './png.js';

export const build: Command = command({
  name: 'build',
  doc: 'Renders a diagram as SVG, and with `--png` also as PNG: the base picture as `<file>.svg` and each variant as `<file>.<variant>.svg`. Nothing is written when the diagram has an error; warnings are printed and do not stop the build. With `--watch` it builds again after every change of the source or of a file it uses.',
  arguments: [{ name: 'file', count: 'one', doc: 'The .dgr file to render.' }],
  options: {
    out: {
      type: 'string',
      short: 'o',
      value: 'file',
      doc: 'Where to write the SVG of a diagram with one picture, or of the one `--variant` picks. Default: next to the source, with `.svg` instead of `.dgr`. The PNG goes beside the SVG.',
    },
    variant: {
      type: 'string',
      value: 'id',
      doc: 'Build only the picture of this variant, as `<file>.<id>.svg` or where `-o` says.',
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
      doc: 'Build, then build again each time the source or a file it uses changes, until Ctrl+C. Each build prints what it wrote and its findings, with `--json` one document per build. Errors in the diagram and a source that is gone for a moment do not end the watch; only a call refused at the first build does. Ends with the exit code of the last build.',
    },
  },
  examples: [
    { command: 'dgr build diagrams/order.dgr', doc: 'Write diagrams/order.svg, and one SVG per variant beside it.' },
    { command: 'dgr build diagrams/order.dgr -o site/order.svg', doc: 'Write the SVG somewhere else.' },
    { command: 'dgr build diagrams/order.dgr --png', doc: 'Also write diagrams/order.png, twice the size of the SVG.' },
    { command: SCALED_EXAMPLE, doc: 'Write the PNG at three times the size of the SVG, e.g. for print.' },
    { command: 'dgr build diagrams/order.dgr --variant next', doc: 'Write only diagrams/order.next.svg.' },
    { command: 'dgr build diagrams/order.dgr --png --watch', doc: 'Write SVG and PNG again on every save.' },
  ],
  json: {
    file: 'The rendered source.',
    output:
      'Path of the first written SVG, the base unless `--variant` picks another; `null` when nothing was written.',
    png: 'Path of the PNG beside `output`, `null` without `--png` or when nothing was written.',
    pictures:
      'Every picture asked for: `{ variant, output, png }`, `variant` `null` for the base, the paths `null` when nothing was written.',
    diagnostics: 'All findings, see "Diagnostics".',
  },
  async run({ arguments: { file }, options, io, engine, raster, locale }) {
    const scale = pngScale(options.png, options.scale);
    if (typeof scale === 'object') return scale;
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    const compiled = await compileSource(io, engine, source, locale);
    if ('problem' in compiled) return compiled;
    const planned = planPictures(file, compiled.compilation.pictures, options.variant, options.out);
    if ('problem' in planned) return planned;
    const diagnostics = [...source.notices, ...compiled.compilation.diagnostics];
    const contents: [string, string | Uint8Array][] = [];
    if (!hasError(diagnostics)) {
      for (const { picture, output } of planned) {
        if (picture.svg === undefined) continue;
        const png = scale === undefined ? undefined : await renderPng(raster, picture.svg, file, scale);
        if (png !== undefined && !(png instanceof Uint8Array)) return png;
        contents.push([output, picture.svg]);
        if (png !== undefined) contents.push([pngBeside(output), png]);
      }
    }
    for (const [path, content] of contents) {
      const failed = await writeOutput(io, path, content, locale);
      if (failed) return failed;
    }
    const written = new Set(contents.map(([path]) => path));
    const pictures = planned.map(({ picture, output }) => ({
      variant: picture.variant ?? null,
      output: written.has(output) ? output : null,
      png: written.has(pngBeside(output)) ? pngBeside(output) : null,
    }));
    const lines = diagnosticLines(file, source.text, compiled.files, diagnostics, locale);
    lines.push(...contents.map(([path]) => say('wrote', locale, { file: path })));
    const first = pictures[0];
    return {
      exitCode: written.size === 0 ? 1 : 0,
      json: {
        file,
        output: first?.output ?? null,
        png: first?.png ?? null,
        pictures,
        diagnostics: diagnostics.map((d) => diagnosticJson(file, d)),
      },
      text: lines.join('\n'),
      watch: Object.keys(compiled.files),
    };
  },
});
