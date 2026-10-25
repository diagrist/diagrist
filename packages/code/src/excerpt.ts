import { nearest } from '@diagrist/lang';
import { type CodeLine, dedent } from './lines.js';
import { region, regionNames } from './region.js';
import { declaredNames, symbol } from './symbol.js';

/**
 * Which part of a file to show. `symbol` is the declaration of a method or type by name, with the annotations and
 * the comment right above it, to its closing brace; it follows the code when lines move, so it is the first choice.
 * `region` is the lines between `#region <name>` and `#endregion` comments, in any language's comment syntax, without
 * the markers. `lines` is a range of line numbers, both ends included, which drifts with every edit above it.
 */
export type Selection =
  | { readonly symbol: string }
  | { readonly region: string }
  | { readonly lines: readonly [number, number] };

/**
 * The selected lines, dedented and with their numbers in the file; or what the selection missed and what the file
 * offers instead, so a kind can phrase a diagnostic an agent fixes without opening the file: the names the file
 * declares or the regions it marks, in file order, the one closest to the name asked for, and its number of lines.
 */
export type Excerpt =
  | { readonly lines: readonly CodeLine[] }
  | {
      readonly missing: 'symbol' | 'region' | 'lines';
      readonly found: readonly string[];
      readonly nearest?: string;
      readonly last: number;
    };

/** Cuts a selection out of a highlighted file, or takes all of it without one, and removes the shared indentation. */
export function excerpt(file: readonly CodeLine[], selection?: Selection): Excerpt {
  if (selection === undefined) return { lines: dedent(file) };
  if ('lines' in selection) return byLines(file, selection.lines);
  const [name, found, cut] =
    'symbol' in selection
      ? [selection.symbol, declaredNames(file), symbol(file, selection.symbol)]
      : [selection.region, regionNames(file), region(file, selection.region)];
  if (cut !== undefined) return { lines: dedent(cut) };
  const close = nearest(name, found);
  return {
    missing: 'symbol' in selection ? 'symbol' : 'region',
    found,
    ...(close === undefined ? {} : { nearest: close }),
    last: file.length,
  };
}

function byLines(file: readonly CodeLine[], [from, to]: readonly [number, number]): Excerpt {
  const fits = from >= 1 && from <= to && to <= file.length;
  return fits ? { lines: dedent(file.slice(from - 1, to)) } : { missing: 'lines', found: [], last: file.length };
}
