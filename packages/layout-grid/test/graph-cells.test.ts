import { describe, expect, it } from 'vitest';
import { type CellGraph, layoutGraph, placeGrid, routeEdges } from '../src/index.js';
import { edge, group, METRICS, PADS, spec } from './fixture.js';

const { colGap, rowGap, laneGap, portSpread, labelGap, marginX, firstRowY, ...rest } = METRICS;

/** Three boxes in a grid of two columns and two rows, `y` in a frame, and the edges `x → y` and `x → z`. */
function graph(signs: CellGraph['given']['cells']['signs'] = {}): CellGraph {
  return {
    nodes: ['x', 'y', 'z'].map((id) => ({ id, width: METRICS.nodeW, height: METRICS.nodeH })),
    edges: [
      { id: 'x-y', from: 'x', to: 'y', rank: 'free' },
      { id: 'x-z', from: 'x', to: 'z', rank: 'free' },
    ],
    containers: [
      { id: 'f', kind: 'frame', members: ['y'], pad: PADS.bottom, top: PADS.top, head: { width: 0, height: 0 } },
    ],
    metrics: {
      colGap,
      rowGapMin: rowGap,
      track: laneGap,
      portGap: portSpread,
      lead: 24,
      tail: 24,
      labelGap,
      left: marginX,
      top: firstRowY,
    },
    given: {
      cells: {
        cols: [{ name: 'a' }, { name: 'b' }],
        rows: [{ name: 'r' }, { name: 's' }],
        cells: [
          { node: 'x', col: 'a', row: 'r' },
          { node: 'y', col: 'b', row: 'r' },
          { node: 'z', col: 'b', row: 's' },
        ],
        frames: [{ frame: 'f', left: PADS.left, right: PADS.right }],
        adaptive: false,
        metrics: rest,
        texts: [{ edge: 'x-y', name: 'calls' }],
        signs,
      },
    },
  };
}

describe('a layout graph with the author’s cells', () => {
  it('stands and runs as the grid it describes, routed through its channels', () => {
    const grid = spec('a b', 'r s', ['x@a/r', 'y@b/r', 'z@b/s'], {
      groups: [group('f', ['y'])],
      edges: [edge('x', 'y'), edge('x', 'z')],
      metrics: { ...METRICS, lead: 24 },
      channels: true,
    });
    const placed = placeGrid(grid);
    const laid = layoutGraph(graph());
    expect(laid.grid).toEqual(placed);
    expect(laid.routes).toEqual(routeEdges(grid, placed));
    expect(laid.labels.map((l) => l.text)).toEqual(['calls']);
  });

  it('sets numbers on lines, pins beside them and signs at corners, and hands them to the placement check', () => {
    const laid = layoutGraph(
      graph({
        numbers: { w: 24, h: 16, room: 2, offset: 28, edges: ['x-y'] },
        pins: { w: 24, h: 14, edges: ['x-z'] },
        corners: { w: 24, h: 14, at: [{ node: 'z', inside: { dx: 20, dy: 13 } }, { node: 'x' }, { node: 'gone' }] },
      }),
    );
    const z = laid.grid.nodes.find((n) => n.id === 'z')?.rect;
    expect(laid.numbers.map((n) => n.edge)).toEqual(['x-y']);
    expect(laid.pins.map((p) => p.edge)).toEqual(['x-z']);
    expect(laid.corners.map((c) => c.node)).toEqual(['z', 'x']);
    expect(laid.corners[0]).toMatchObject({ x: (z?.x ?? 0) + (z?.w ?? 0) - 20, y: (z?.y ?? 0) + 13 });
    const keys = laid.placed.map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(['x-y.label.1', 'x-y.number', 'x-z.mark']));
  });
});
