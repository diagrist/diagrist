import { type Locale, list } from '@diagrist/lang';
import { type Problem, problem } from '../messages.js';
import { diagnosticJson, diagnosticLines, hasError } from '../report/diagnostics.js';
import { say } from '../say.js';
import { type Command, command } from './command.js';
import { type Exported, exportedPictures, FIGJAM_SCALE, figjamScale } from './figjam.js';
import { baseName, boardScript, inFolder } from './figjam-board.js';
import { compileSource, readSources, writeOutput } from './files.js';
import { planPictures } from './pictures.js';

const TARGETS = ['figjam'];

/** The first example, which messages about a wrong call show. */
const EXAMPLE = 'dgr export figjam diagrams/order.dgr';

export const exportCommand: Command = command({
  name: 'export',
  doc: "Exports diagrams for another tool. `figjam` writes, per picture, an SVG rewritten for Figma's SVG import as `<file>.figjam.svg` and `<file>.<variant>.figjam.svg` (or a PNG with `--as png`), and one `board.js`. An agent uploads the pictures with the Figma tool `upload_assets`, posting each file as multipart so its name names the layer, then runs `board.js` with `use_figma`: it lays every picture into a section of its own, several side by side in one board, and replaces the sections of an earlier export in place. Nothing is written when a diagram has an error.",
  arguments: [
    { name: 'target', count: 'one', doc: 'What to export for. So far only `figjam`.' },
    { name: 'files', count: 'many', doc: 'The .dgr files to export, each with all its pictures.' },
  ],
  options: {
    as: {
      type: 'string',
      value: 'format',
      choices: ['svg', 'png'],
      doc: '`svg` (default) arrives in FigJam as vectors and text that stay sharp and searchable. `png` is a picture as `dgr build --png` draws it, for when the SVG import loses too much, such as the stripes of `areas=stripe`.',
    },
    scale: {
      type: 'string',
      value: 'factor',
      doc: `Size in FigJam per unit of the SVG, from ${FIGJAM_SCALE.min} to ${FIGJAM_SCALE.max}. Default: ${FIGJAM_SCALE.standard}, which puts text, lines and boxes at the size of FigJam's own. Scales the width and height of the SVG, keeping its view box, or the pixels of the PNG, and the sections.`,
    },
    variant: {
      type: 'string',
      value: 'id',
      doc: 'Export only the picture of this variant of each file.',
    },
    board: {
      type: 'string',
      value: 'name',
      doc: 'Name of the section that holds the pictures when there is more than one, shown as `diagrist · <name>`. Default: the name of the first file without `.dgr`.',
    },
    out: {
      type: 'string',
      short: 'o',
      value: 'dir',
      doc: 'An existing folder for the pictures and `board.js`. Default: each picture beside its source, `board.js` beside the first.',
    },
  },
  examples: [
    { command: EXAMPLE, doc: 'Write diagrams/order.figjam.svg, one per variant beside it, and diagrams/board.js.' },
    { command: 'dgr export figjam diagrams/*.dgr -o figjam --board Architecture', doc: 'All pictures into one board.' },
    { command: 'dgr export figjam diagrams/order.dgr --as png --scale 2', doc: 'PNGs at twice the size of the SVG.' },
    { command: 'dgr export figjam diagrams/order.dgr --variant next', doc: 'Only diagrams/order.next.figjam.svg.' },
  ],
  json: {
    pictures:
      'Every picture asked for: `{ file, variant, output, layer, section, width, height, lost }`. `layer` is the name FigJam gives the upload, `section` the title of its section, `width` and `height` its size in FigJam. `lost` counts what the SVG import still drops, `{ filters, letterSpacing }`, `null` for a PNG. `output` is `null` when nothing was written.',
    board: 'Path of `board.js`, `null` when nothing was written.',
    diagnostics: 'All findings of all files, see "Diagnostics".',
  },
  async run({ arguments: { target, files }, options, io, engine, raster, locale }) {
    if (!TARGETS.includes(target))
      return problem('unknownTarget', { found: target, allowed: list(TARGETS), example: EXAMPLE });
    const scale = figjamScale(options.scale);
    if (typeof scale !== 'number') return scale;
    const sources = await readSources(io, files, locale);
    if ('problem' in sources) return sources;
    const lines: string[] = [];
    const diagnostics: Readonly<Record<string, unknown>>[] = [];
    const planned = [];
    let failed = false;
    for (const source of sources) {
      const compiled = await compileSource(io, engine, source, locale);
      if ('problem' in compiled) return compiled;
      const found = [...source.notices, ...compiled.compilation.diagnostics];
      failed ||= hasError(found);
      lines.push(...diagnosticLines(source.file, source.text, compiled.files, found, locale));
      diagnostics.push(...found.map((d) => diagnosticJson(source.file, d)));
      const pictures = planPictures(source.file, compiled.compilation.pictures, options.variant, undefined);
      if ('problem' in pictures) return withExample(pictures);
      planned.push(...pictures.map((p) => ({ ...p, file: source.file })));
    }
    const as = options.as === 'png' ? 'png' : 'svg';
    const exported = failed ? [] : await exportedPictures(planned, { as, scale, out: options.out, raster });
    if (!Array.isArray(exported)) return exported;
    const first = files[0] ?? '';
    const board = exported.length === 0 ? null : inFolder(options.out ?? folderOf(first), 'board.js');
    const contents: [string, string | Uint8Array][] = exported.map((e) => [e.picture.output, e.content]);
    if (board !== null)
      contents.push([
        board,
        boardScript(
          exported.map((e) => e.picture),
          scale,
          options.board ?? baseName(first).replace(/\.(dgr|dia)$/, ''),
        ),
      ]);
    for (const [path, content] of contents) {
      const refused = await writeOutput(io, path, content, locale);
      if (refused) return refused;
    }
    lines.push(...contents.map(([path]) => say('wrote', locale, { file: path })));
    lines.push(...exported.flatMap((e) => lostLine(e, locale)));
    if (board !== null) lines.push(say('figjamNext', locale, { file: board }));
    return {
      exitCode: failed ? 1 : 0,
      json: { pictures: picturesJson(planned, exported), board, diagnostics },
      text: lines.join('\n'),
    };
  },
});

/** A refusal of `--variant` with the example written for `export` instead of `build`. */
const withExample = (found: Problem): Problem =>
  problem(found.problem, {
    ...found.values,
    example: (found.values.example ?? EXAMPLE).replace('dgr build', 'dgr export figjam'),
  });

const folderOf = (path: string): string => path.slice(0, Math.max(0, path.length - baseName(path).length - 1));

function lostLine(e: Exported, locale: Locale): string[] {
  if (e.lost === null || e.lost.filters + e.lost.letterSpacing === 0) return [];
  const values = { file: e.picture.output, filters: String(e.lost.filters), spacing: String(e.lost.letterSpacing) };
  return [say('figjamLost', locale, values)];
}

function picturesJson(
  planned: readonly { file: string; picture: { variant?: string } }[],
  exported: readonly Exported[],
) {
  if (exported.length > 0) return exported.map((e) => e.json);
  return planned.map((p) => ({ file: p.file, variant: p.picture.variant ?? null, output: null }));
}
