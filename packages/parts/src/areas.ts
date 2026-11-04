import type { Areas } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { WORDS } from './words.js';

/**
 * The areas of a picture in the description (ADR 0033): one sentence per area with members, in declaration order,
 * naming its tone and what belongs to it. `members` gives the names of the elements of each area by its id.
 */
export function areaSentences(areas: Areas, members: ReadonlyMap<string, readonly string[]>, locale: Locale): string[] {
  const w = WORDS[locale];
  return areas.list.flatMap((area) => {
    const names = members.get(area.id) ?? [];
    return names.length === 0 ? [] : [w.area(area.label, area.tone, names)];
  });
}
