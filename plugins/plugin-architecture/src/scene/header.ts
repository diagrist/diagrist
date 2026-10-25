import type { Shape } from '@diagrist/core';
import { HEADER, headerShapes, imageTitle, kickerShapes } from '@diagrist/parts';
import { cased, type Look, type LookOptions } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';

/** The name of the kind: `label=` replaces it, an empty one leaves it out. */
const kindOf = (model: ArchitectureModel, texts: Texts): string => model.label ?? texts.kinds[model.level];

/** The title line `Kind · Title`, and the subtitle below. */
function inlineShapes(model: ArchitectureModel, texts: Texts): Shape[] {
  const kind = kindOf(model, texts);
  return headerShapes(HEADER, kind ? imageTitle(kind, model.title) : model.title, model.subtitle);
}

/** The kind as the kicker above the title, in the case the look's group font sets; `label=""` leaves it out. */
function kickerOf(model: ArchitectureModel, texts: Texts, look: Look): Shape[] {
  const kind = kindOf(model, texts);
  return kickerShapes({ kicker: kind && cased(kind, look.fonts.group), title: model.title, subtitle: model.subtitle });
}

/** How each value of `header` draws the head of the sheet. */
export const HEADERS: Readonly<
  Record<LookOptions['header'], (model: ArchitectureModel, texts: Texts, look: Look) => Shape[]>
> = {
  inline: inlineShapes,
  kicker: kickerOf,
};
