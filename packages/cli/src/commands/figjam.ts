import { flattenSvg } from '@diagrist/export-figjam';
import type { Picture } from '../engine.js';
import { type Problem, problem } from '../messages.js';
import type { Raster } from '../raster.js';
import { type BoardPicture, baseName, inFolder, layerName, sheetName } from './figjam-board.js';
import { renderPng } from './png.js';

/**
 * Range and default of `export figjam --scale`. 1.5 puts text at 18 and 15 px, lines at 2.25 px and boxes 84 px
 * high, the size of FigJam's own shapes and texts (measured 2026-11-09); below 1 the pictures look lost beside them,
 * above 3 they dwarf them.
 */
export const FIGJAM_SCALE = { min: 1, max: 3, standard: 1.5 } as const;

/** The scale of `export figjam`, or the refusal of one that is no number in range (C013). */
export function figjamScale(scale: string | undefined): number | Problem {
  if (scale === undefined) return FIGJAM_SCALE.standard;
  const factor = Number(scale);
  if (factor >= FIGJAM_SCALE.min && factor <= FIGJAM_SCALE.max) return factor;
  const range = { min: String(FIGJAM_SCALE.min), max: String(FIGJAM_SCALE.max) };
  return problem('invalidScale', { found: scale, ...range, example: 'dgr export figjam diagrams/order.dgr --scale 2' });
}

/** A picture to export: the source it came from, the picture and the path `build` would give its SVG. */
interface Planned {
  readonly file: string;
  readonly picture: Picture;
  readonly output: string;
}

/** What `--as`, `--scale` and `-o` ask for. */
interface Asked {
  readonly as: 'svg' | 'png';
  readonly scale: number;
  readonly out: string | undefined;
  readonly raster: Raster;
}

/** What the SVG import of FigJam still drops from an exported SVG, `null` for a PNG. */
type Lost = { readonly filters: number; readonly letterSpacing: number } | null;

/** One exported picture: its place on the board, the bytes to write, what it loses and its `--json` entry. */
export interface Exported {
  readonly picture: BoardPicture;
  readonly content: string | Uint8Array;
  readonly lost: Lost;
  readonly json: Readonly<Record<string, unknown>>;
}

const SIZE = /^<svg\b[^>]*?\bwidth="([\d.]+)" height="([\d.]+)"/;
const CANVAS = /<rect width="[\d.]+" height="[\d.]+" fill="(#[0-9a-fA-F]{3,8})"\/>/;

/** `order.svg` becomes `order.figjam.svg`, in the folder of `-o` when it is given. */
function outputOf(planned: string, as: 'svg' | 'png', out: string | undefined): string {
  const named = `${planned.replace(/\.svg$/, '')}.figjam.${as}`;
  return out === undefined ? named : inFolder(out, baseName(named));
}

/**
 * Flattens or renders every planned picture. Its size and canvas colour are read from the kernel's SVG, which
 * writes both on the root and on the first rectangle; a picture without a canvas, such as `inline`, gets white.
 */
export async function exportedPictures(planned: readonly Planned[], asked: Asked): Promise<Exported[] | Problem> {
  const out: Exported[] = [];
  for (const { file, picture, output } of planned) {
    const svg = picture.svg;
    if (svg === undefined) continue;
    const size = SIZE.exec(svg);
    const fill = CANVAS.exec(svg)?.[1] ?? '#ffffff';
    const variant = picture.variant === undefined ? {} : { variant: picture.variant };
    const placed: BoardPicture = {
      file,
      ...variant,
      output: outputOf(output, asked.as, asked.out),
      width: Number(size?.[1] ?? 0),
      height: Number(size?.[2] ?? 0),
      fill,
    };
    let content: string | Uint8Array;
    let lost: Lost = null;
    if (asked.as === 'png') {
      const png = await renderPng(asked.raster, svg, file, asked.scale);
      if (!(png instanceof Uint8Array)) return png;
      content = png;
    } else {
      const flat = flattenSvg(svg, { scale: asked.scale });
      content = flat.svg;
      lost = { filters: flat.report.filters, letterSpacing: flat.report.letterSpacing };
    }
    const json = {
      file,
      variant: picture.variant ?? null,
      output: placed.output,
      layer: layerName(placed.output),
      section: sheetName(placed),
      width: Math.round(placed.width * asked.scale * 1000) / 1000,
      height: Math.round(placed.height * asked.scale * 1000) / 1000,
      lost,
    };
    out.push({ picture: placed, content, lost, json });
  }
  return out;
}
