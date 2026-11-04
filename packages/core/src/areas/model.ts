import type { Span } from '@diagrist/lang';
import { AREA_PAINTS, type AreaMark, type AreaPaint, type AreaTone } from './tones.js';

/** One declared area: its id, its name in the legend, its tone (none for an area in ink) and where it stands. */
export interface Area {
  readonly id: string;
  readonly label: string;
  readonly tone?: AreaTone;
  /** Marked as the core the other areas extend (`core`). */
  readonly core?: boolean;
  readonly span: Span;
}

/** The areas of a picture in their order, and how their elements are painted. */
export interface Areas {
  readonly paint: AreaPaint;
  readonly list: readonly Area[];
}

/** A statement as the kernel reads it without knowing its kind: keyword, values and the lines below it. */
interface Loose {
  readonly keyword?: unknown;
  readonly id?: unknown;
  readonly label?: unknown;
  readonly span?: Span;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly flags?: Readonly<Record<string, unknown>>;
  readonly children?: readonly unknown[];
  readonly lines?: readonly unknown[];
}

const DEFAULT_SPAN: Span = { line: 1, column: 1, length: 1 };

/** The declared `area` statements of a reading, in order. */
export function declaredAreas(statements: readonly unknown[]): Area[] {
  return (statements as readonly Loose[])
    .filter((s) => s.keyword === 'area' && typeof s.id === 'string')
    .map((s) => {
      const tone = s.attributes?.tone as AreaTone | undefined;
      return {
        id: s.id as string,
        label: typeof s.label === 'string' ? s.label : '',
        ...(tone === undefined ? {} : { tone }),
        ...(s.flags?.core === true ? { core: true } : {}),
        span: s.span ?? DEFAULT_SPAN,
      };
    });
}

/** Every `area=` value written anywhere in the statements, their children and their lines. */
export function joinedAreas(statements: readonly unknown[], into: Set<string> = new Set()): Set<string> {
  for (const s of statements as readonly Loose[]) {
    const area = s.attributes?.area;
    if (typeof area === 'string') into.add(area);
    joinedAreas(s.children ?? [], into);
    joinedAreas(s.lines ?? [], into);
  }
  return into;
}

/**
 * The areas of a reading for a kind's model: the declared ones and the paint the header's `areas=` names. A kind
 * keeps the result on its model and asks it with `areaMark` and `lineArea` while it builds the scene.
 */
export function readAreas(statements: readonly unknown[], header: Readonly<Record<string, unknown>> = {}): Areas {
  const paint = AREA_PAINTS.find((p) => p === header.areas) ?? 'tint';
  return { paint, list: declaredAreas(statements) };
}

/** The tone of the area `id`; none for an unknown area, for one in ink and for no area. */
export const areaTone = (areas: Areas, id: string | undefined): AreaTone | undefined =>
  id === undefined ? undefined : areas.list.find((a) => a.id === id)?.tone;

/** The mark a group of the area `id` carries in the scene, or none when the area has no tone. */
export function areaMark(areas: Areas, id: string | undefined, as: AreaMark['as']): AreaMark | undefined {
  const tone = areaTone(areas, id);
  return tone === undefined ? undefined : { tone, as };
}

/**
 * The area of a line: its own, else the area of its first end when that has a tone, else that of its second. A line
 * from an extension to the core thus belongs to the extension, and one inside the core to none.
 */
export function lineArea(
  areas: Areas,
  own: string | undefined,
  from: string | undefined,
  to: string | undefined,
): string | undefined {
  if (own !== undefined) return own;
  if (areaTone(areas, from) !== undefined) return from;
  return areaTone(areas, to) !== undefined ? to : undefined;
}
