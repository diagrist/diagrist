import { BOARD_SCRIPT } from './figjam-script.js';

/** One picture as `board.js` places it: where it came from, the file it was written to, its size in the SVG. */
export interface BoardPicture {
  readonly file: string;
  readonly variant?: string;
  readonly output: string;
  readonly width: number;
  readonly height: number;
  /** The canvas colour of the picture, which its section is filled with. */
  readonly fill: string;
}

/** A section of the board: its tag, its title, its size in FigJam and, inside a board, its place there. */
interface SectionSpec {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
}

/** A sheet, the section of one picture, with the names its upload may carry. */
interface SheetSpec extends SectionSpec {
  readonly layer: string;
  readonly file: string;
  readonly x: number;
  readonly y: number;
}

/** What `board.js` reads as `INPUT`. */
interface BoardInput {
  readonly board: SectionSpec | null;
  readonly sheets: readonly SheetSpec[];
  readonly gap: number;
  readonly pad: number;
}

/** Gap between sheets at scale 1, as between the sheets of the live probe; the board's margin is half of it. */
const GAP = 200;
/** Fill of the section that holds several sheets: FigJam's white. */
const BOARD_FILL = '#ffffff';

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** The last part of a path, whichever separator it uses. */
export const baseName = (path: string): string => path.split(/[\\/]/).at(-1) ?? path;

/** `name` inside `folder`, the folder written with or without a trailing separator; `''` is the working folder. */
export const inFolder = (folder: string, name: string): string =>
  folder === '' ? name : `${folder.replace(/[\\/]+$/, '')}/${name}`;

/** What FigJam names the layer of an upload: the file name without its last extension. */
export const layerName = (output: string): string => baseName(output).replace(/\.[^.]*$/, '');

/** The title of a picture's section, `diagrist · order.dgr#next`, which FigJam shows above it. */
export const sheetName = (picture: { file: string; variant?: string }): string =>
  `diagrist · ${baseName(picture.file)}${picture.variant === undefined ? '' : `#${picture.variant}`}`;

/**
 * The input of `board.js`: one sheet per picture, sized to the picture times `scale`; with more than one picture a
 * board named `diagrist · <board>` holds them side by side, `200 × scale` apart, with half that as its margin.
 */
function boardInput(pictures: readonly BoardPicture[], scale: number, board: string): BoardInput {
  const gap = round(GAP * scale);
  const pad = round(gap / 2);
  const several = pictures.length > 1;
  let x = several ? pad : 0;
  const sheets = pictures.map((picture) => {
    const width = round(picture.width * scale);
    const height = round(picture.height * scale);
    const id = `${picture.file}${picture.variant === undefined ? '' : `#${picture.variant}`}`;
    const sheet = { id, name: sheetName(picture), width, height, fill: picture.fill };
    const placed = {
      ...sheet,
      layer: layerName(picture.output),
      file: baseName(picture.output),
      x,
      y: several ? pad : 0,
    };
    x = round(x + width + gap);
    return placed;
  });
  const height = Math.max(0, ...sheets.map((sheet) => sheet.height));
  const outer = several
    ? {
        id: `board:${board}`,
        name: `diagrist · ${board}`,
        width: round(x - gap + pad),
        height: round(height + 2 * pad),
        fill: BOARD_FILL,
      }
    : null;
  return { board: outer, sheets, gap, pad };
}

/**
 * `board.js` for `use_figma`: the input as a constant, then the script that places the uploaded pictures. One file
 * under the 50,000 characters `use_figma` takes for any reasonable number of pictures, since the pictures themselves
 * travel through `upload_assets`.
 */
export function boardScript(pictures: readonly BoardPicture[], scale: number, board: string): string {
  return `const INPUT = ${JSON.stringify(boardInput(pictures, scale, board), null, 2)};\n${BOARD_SCRIPT}`;
}
