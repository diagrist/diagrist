import type { Shape } from '@diagrist/core';
import { HEADER, headerShapes, imageTitle, MARGIN } from '@diagrist/parts';
import { cased, type Look, type LookOptions } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';

/** Baselines of kicker, title and subtitle at the top of the sheet. */
const KICKER = { kicker: 30, title: 50, subtitle: 67 } as const;

/** The name of the kind: `label=` replaces it, an empty one leaves it out. */
const kindOf = (model: ArchitectureModel, texts: Texts): string => model.label ?? texts.kinds[model.level];

/** The title line `Kind · Title`, and the subtitle below. */
function inlineShapes(model: ArchitectureModel, texts: Texts): Shape[] {
  const kind = kindOf(model, texts);
  return headerShapes(HEADER, kind ? imageTitle(kind, model.title) : model.title, model.subtitle);
}

/** The kind in the group font above the title, then title and subtitle; `label=""` leaves the kicker out. */
function kickerShapes(model: ArchitectureModel, texts: Texts, look: Look): Shape[] {
  const kind = kindOf(model, texts);
  const { kicker, title, subtitle } = KICKER;
  return [
    ...(kind
      ? [
          {
            kind: 'text',
            x: MARGIN,
            y: kicker,
            text: cased(kind, look.fonts.group),
            role: 'kicker',
            font: 'group',
          } as const,
        ]
      : []),
    { kind: 'text', x: MARGIN, y: title, text: model.title, role: 'title', font: 'title' },
    ...(model.subtitle
      ? [{ kind: 'text', x: MARGIN, y: subtitle, text: model.subtitle, role: 'subtitle', font: 'note' } as const]
      : []),
  ];
}

/** How each value of `header` draws the head of the sheet. */
export const HEADERS: Readonly<
  Record<LookOptions['header'], (model: ArchitectureModel, texts: Texts, look: Look) => Shape[]>
> = {
  inline: inlineShapes,
  kicker: kickerShapes,
};
