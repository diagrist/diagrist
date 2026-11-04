import type { Locale } from '@diagrist/lang';
import type { Picture } from '../engine.js';
import { say } from '../say.js';

/** A drawn picture with the measures of its lines, as `check --metrics` reports it. */
export interface MeasuredPicture {
  readonly variant?: string;
  readonly metrics: Readonly<Record<string, number>>;
}

/** The pictures that were drawn, each with its variant and the measures of its lines. */
export function measuredPictures(pictures: readonly Picture[]): MeasuredPicture[] {
  return pictures.flatMap(({ variant, metrics }) =>
    metrics === undefined ? [] : [{ ...(variant === undefined ? {} : { variant }), metrics }],
  );
}

/** One line of text with the main measures of a picture, named `file` or `file#variant`. */
export function metricsLine(file: string, picture: MeasuredPicture, locale: Locale): string {
  const named = picture.variant === undefined ? file : `${file}#${picture.variant}`;
  const values = Object.fromEntries(Object.entries(picture.metrics).map(([key, value]) => [key, String(value)]));
  return say('metrics', locale, { ...values, picture: named });
}
