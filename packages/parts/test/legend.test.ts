import { type Shape, standardStyles, textWidth, toSvg } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { LEGEND, type LegendItem, legendLayout, legendShapes, markShapes, PART_ROLES } from '../src/index.js';

/**
 * The legend of the predecessor's `radverleih/kontext.dgr` (952 pixels wide, legend from y = 736), the reference C4
 * renders byte-identical to: two edges, two flow badges, a swatch and a decision mark. Badge widths are those of
 * `(1)` and `(3)`, marks those of their text, as the predecessor measured them.
 */
const badge = Math.max(12, textWidth('(1)', { size: 10 }));
const mark = Math.max(12, textWidth('E1', { size: 10 }));
const KONTEXT: readonly LegendItem<string>[] = [
  { sample: 'sync', sampleWidth: LEGEND.sampleWidth, labelDx: LEGEND.labelDx, text: 'synchroner Aufruf' },
  { sample: 'async', sampleWidth: LEGEND.sampleWidth, labelDx: LEGEND.labelDx, text: 'asynchrones Domain-Event' },
  { sample: 'flow-1', sampleWidth: badge, labelDx: LEGEND.markDx, text: 'Flow nutzung (1) bis (2)' },
  { sample: 'flow-3', sampleWidth: badge, labelDx: LEGEND.markDx, text: 'Flow lieferung (3) bis (4)' },
  { sample: 'emph', sampleWidth: LEGEND.sampleWidth, labelDx: LEGEND.labelDx, text: 'Kernentscheidung' },
  { sample: 'mark', sampleWidth: mark, labelDx: LEGEND.markDx, text: 'Entscheidung, siehe Leiste' },
];

describe('legend', () => {
  const legend = legendLayout(KONTEXT, 736, 952);

  it('places entries as the predecessor did, wrapping before an entry that would cross the right margin', () => {
    expect(legend.entries.map((e) => [e.sample, e.at.x, e.at.y, e.textAt.x, e.textAt.y])).toEqual([
      ['sync', 32, 752, 84, 756],
      ['async', 226, 752, 278, 756],
      ['flow-1', 462, 752, 482, 756],
      ['flow-3', 666, 752, 686, 756],
      ['emph', 32, 776, 84, 780],
      ['mark', 220, 776, 240, 780],
    ]);
    expect(legend.separator).toEqual({ x1: 32, y1: 728, x2: 920, y2: 728 });
    expect(legend.bottom).toBe(816);
  });

  it('draws the samples the plugin knows and the texts, to the bytes of the predecessor', () => {
    const sample = (e: { sample: string; at: { x: number; y: number } }): readonly Shape[] =>
      e.sample === 'mark' ? markShapes('E1', e.at.x, e.at.y) : [];
    const scene = { width: 952, height: 816, title: 'T', children: legendShapes(legend, sample) };
    const svg = toSvg(scene, standardStyles({ roles: PART_ROLES, rules: [] }));
    expect(svg).toContain(
      '<g class="legend"><rect x="208" y="769" width="24" height="14" rx="3" class="mark"/><text x="220" y="779.5" text-anchor="middle" class="mark-text">E1</text><text x="240" y="780" class="label-note">Entscheidung, siehe Leiste</text></g>',
    );
    expect(svg).toContain('<line x1="32" y1="728" x2="920" y2="728" class="line"/>');
  });

  it('starts with an empty row and ends just below the separator without items', () => {
    const empty = legendLayout([], 100, 400);
    expect(empty.entries).toEqual([]);
    expect(empty.bottom).toBe(156);
  });
});
