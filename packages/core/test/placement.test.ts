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

  it('counts the ellipse of an ellipse, not its rectangle', () => {
    const useCase: Placed = { ...box('order', 0, 0, 100, 60), outline: 'ellipse' };
    expect(found([useCase, label('corner', 0, 0, 14)])).toEqual([]);
    expect(found([useCase, label('curve', 10, 10, 30)])).toEqual([
      ['G400', { case: 'covered', first: 'curve', second: 'order' }],
    ]);
    expect(found([useCase, { ...box('other', 90, 35, 100, 60), outline: 'ellipse' }])).toEqual([]);
    expect(found([useCase, { ...box('other', 80, 0, 100, 60), outline: 'ellipse' }]).map(([code]) => code)).toEqual([
      'G400',
    ]);
    expect(found([useCase, label('order.name', 0, 0, 30, 'order')])).toEqual([
      ['G402', { key: 'order.name', within: 'order' }],
    ]);
  });

  it('reports a box in a frame it does not belong to as an error, its members and texts on it as before', () => {
    const region: Placed = { ...box('storno', 10, 10, 120, 80), kind: 'frame' };
    const member = box('pack', 20, 20, 40, 20, 'storno');
    expect(found([region, member])).toEqual([]);
    const result = checkPlacement([region, member, box('pay', 70, 50, 40, 20)], picture);
    expect(result.map((d) => [d.code, d.severity, d.values])).toEqual([
      ['G403', 'error', { frame: 'storno', key: 'pay' }],
    ]);
    expect(found([region, { ...box('refund', 100, 0, 80, 40), kind: 'frame' }]).map(([code]) => code)).toEqual([
      'G403',
    ]);
    expect(found([region, label('guard', 100, 20, 60)])).toEqual([
      ['G400', { case: 'covered', first: 'guard', second: 'storno' }],
    ]);
  });

  it('lets things lie in and cross an area, but checks areas against each other and what belongs into them', () => {
    const lane = (key: string, x: number): Placed => ({ ...box(key, x, 0, 100, 100), kind: 'area' });
    expect(found([lane('sales', 0), lane('stock', 100), box('bar', 50, 40, 100, 10)])).toEqual([]);
    expect(found([lane('sales', 0), lane('stock', 90)]).map(([code]) => code)).toEqual(['G400']);
    expect(found([lane('sales', 0), box('order', 80, 40, 40, 20, 'sales')])).toEqual([
      ['G402', { key: 'order', within: 'sales' }],
    ]);
  });

  it('lets a box sit on the border of the box it is on, half outside, but not on a foreign one', () => {
    const state = box('checkout', 20, 20, 100, 40);
    const point = { ...box('express', 112, 32, 16, 16), on: 'checkout' };
    expect(found([state, point])).toEqual([]);
    expect(found([state, point, box('ship', 124, 20, 60, 40)])).toEqual([
      ['G400', { case: 'boxes', first: 'express', second: 'ship' }],
    ]);
    expect(found([state, box('express', 112, 32, 16, 16)]).map(([code]) => code)).toEqual(['G400']);
    expect(found([state, box('express', 112, 32, 16, 16, 'checkout')])).toEqual([
      ['G402', { key: 'express', within: 'checkout' }],
    ]);
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
