import { describe, expect, it } from 'vitest';
import { checkPlacement, compile, definePlugin, formatMessage, type Placed } from '../src/index.js';
import { linesPlugin } from './fixture.js';

const picture = { width: 200, height: 100 };
const box = (key: string, x: number, y: number, w: number, h: number, within?: string): Placed => ({
  key,
  kind: 'box',
  rect: { x, y, w, h },
  ...(within ? { within } : {}),
});
const label = (key: string, x: number, y: number, w: number, within?: string): Placed => ({
  ...box(key, x, y, w, 10, within),
  kind: 'text',
});
const found = (placed: readonly Placed[]) => checkPlacement(placed, picture).map((d) => [d.code, d.values]);

describe('the placement check', () => {
  it('finds overlapping boxes, overlapping texts and a text on a box it does not belong to', () => {
    expect(found([box('api', 10, 10, 50, 30), box('db', 40, 20, 50, 30)])).toEqual([
      ['G400', { case: 'boxes', first: 'api', second: 'db' }],
    ]);
    expect(found([label('a', 10, 10, 40), label('b', 30, 12, 40)])).toEqual([
      ['G400', { case: 'texts', first: 'a', second: 'b' }],
    ]);
    expect(found([box('db', 40, 0, 50, 40), label('api.label', 10, 10, 60)])).toEqual([
      ['G400', { case: 'covered', first: 'api.label', second: 'db' }],
    ]);
  });

  it('lets a text lie in its box and a box in its frame, but not two boxes in one frame on each other', () => {
    const frame = box('vpc', 0, 0, 150, 80);
    const inFrame = [box('a', 10, 10, 40, 40, 'vpc'), label('a.name', 12, 12, 30, 'a')];
    expect(found([frame, ...inFrame])).toEqual([]);
    expect(found([frame, ...inFrame, box('b', 30, 30, 40, 40, 'vpc')]).map(([code]) => code)).toEqual(['G400']);
  });

  it('finds what reaches outside the picture and what does not fit into its box', () => {
    expect(found([box('wide', 150, 10, 60, 20)])).toEqual([['G401', { key: 'wide' }]]);
    expect(found([box('a', 10, 10, 40, 20), label('a.name', 12, 12, 60, 'a')])).toEqual([
      ['G402', { key: 'a.name', within: 'a' }],
    ]);
  });

  it('takes touching edges and rounding by less than a pixel as no overlap', () => {
    expect(found([box('a', 0, 0, 50, 50), box('b', 50, 0, 50, 50), box('c', 0, 49.5, 50, 20)])).toEqual([]);
  });

  it('runs on every drawing in compile, as warnings at the line of the placed thing, and keeps the picture', () => {
    const [kind] = linesPlugin.kinds;
    if (kind === undefined) return;
    const crowded = definePlugin({
      ...linesPlugin,
      kinds: [
        {
          ...kind,
          layout: (model, context) => ({
            ...kind.layout(model, context),
            placed: [
              { ...label('first', 0, 0, 80), span: { line: 2, column: 1, length: 4 } },
              { ...label('second', 10, 2, 80), span: { line: 3, column: 1, length: 4 } },
            ],
          }),
        },
      ],
    });
    const result = compile('diagram lines "x"\nline "a"\nline "b"', { plugins: [crowded] });
    expect(result.diagnostics.map((d) => [d.code, d.severity, d.span.line])).toEqual([['G400', 'warning', 3]]);
    const [overlap] = result.diagnostics;
    expect(overlap && formatMessage(overlap, [crowded])).toBe(
      '`first` overlaps the text `second`. Shorten a text, or change what the layout places here.',
    );
    expect(overlap && formatMessage(overlap, [crowded], 'de')).toContain('überlappt den Text');
    expect(result.svg).toBeDefined();
  });
});
