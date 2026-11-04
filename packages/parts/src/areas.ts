import { type Areas, areaMark, type Scene, type Shape } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { LEGEND, legendLayout } from './legend/layout.js';
import { legendShapes } from './legend/scene.js';
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

/** Room between the picture and the legend of its areas below it. */
const AREA_LEGEND_GAP = 8;

/**
 * The scene with a legend of its areas appended below it (ADR 0033), for kinds that draw no legend of their own: a
 * rule, then per area in use a sample in `sampleRole`, painted like the elements of the area, and its name. Without
 * an area in `used` the scene is returned as it is.
 */
export function withAreaLegend(scene: Scene, areas: Areas, used: ReadonlySet<string>, sampleRole: string): Scene {
  const items = areas.list
    .filter((area) => used.has(area.id))
    .map((area) => ({ sample: area, sampleWidth: LEGEND.sampleWidth, labelDx: LEGEND.labelDx, text: area.label }));
  if (items.length === 0) return scene;
  const legend = legendLayout(items, scene.height + AREA_LEGEND_GAP, scene.width);
  const shapes = legendShapes(legend, (entry): Shape[] => {
    const box: Shape = { kind: 'rect', x: entry.at.x, y: entry.at.y - 9, w: 32, h: 18, rx: 3, role: sampleRole };
    const mark = areaMark(areas, entry.sample.id, 'body');
    return mark === undefined ? [box] : [{ kind: 'group', area: mark, children: [box] }];
  });
  return { ...scene, height: Math.ceil(legend.bottom), children: [...scene.children, ...shapes] };
}
