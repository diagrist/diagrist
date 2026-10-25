import { list } from '@diagrist/lang';
import type { Picture } from '../engine.js';
import { type Problem, problem } from '../messages.js';

/** A picture to write and the path of its SVG. */
export interface Planned {
  readonly picture: Picture;
  readonly output: string;
}

/**
 * Which pictures `build` writes, and where (ADR 0021): the base as `<source>.svg`, each variant as
 * `<source>.<variant>.svg`. `--variant` picks one (C016 when the file has no such variant), and `-o` names the SVG
 * of exactly one picture (C017 when there are several and none is picked).
 */
export function planPictures(
  file: string,
  pictures: readonly Picture[],
  variant: string | undefined,
  out: string | undefined,
): Planned[] | Problem {
  const stem = file.replace(/\.(dgr|dia)$/, '');
  const ids = pictures.flatMap((p) => p.variant ?? []);
  const example = `dgr build ${file} --variant ${ids[0] ?? 'next'}`;
  if (variant !== undefined) {
    const picture = pictures.find((p) => p.variant === variant);
    if (picture !== undefined) return [{ picture, output: out ?? `${stem}.${variant}.svg` }];
    if (pictures.length === 0) return [];
    return problem('unknownVariant', { found: variant, file, allowed: list(ids), example });
  }
  if (out !== undefined && pictures.length > 1) {
    const values = { file, count: String(pictures.length), allowed: list(ids), example: `${example} -o ${out}` };
    return problem('outWithPictures', values);
  }
  return pictures.map((picture) => ({
    picture,
    output: picture.variant === undefined ? (out ?? `${stem}.svg`) : `${stem}.${picture.variant}.svg`,
  }));
}
