import { describe, expect, it } from 'vitest';
import { type Scene, type Shape, standardStyles, toSvg } from '../src/index.js';

const styles = standardStyles({
  roles: {
    box: { classes: ['shape'] },
    boxEmph: { classes: ['shape-emph'] },
    call: { classes: ['line'], marker: 'filled' },
    event: { classes: ['line', 'dashed'], marker: 'open' },
    plain: { classes: ['line'] },
    halo: { classes: ['line', 'halo'] },
  },
  rules: [],
});

const box = (role: string): Shape => ({ kind: 'rect', x: 100, y: 0, w: 80, h: 100, rx: 8, role });

const svgOf = (...children: Shape[]): string => {
  const scene: Scene = { width: 200, height: 100, title: 'T', children };
  return toSvg(scene, styles);
};

/** The numbers of the path data the SVG writes for the path of `role`. */
function pathOf(svg: string, role: string): number[] {
  const d = new RegExp(`<path d="([^"]*)" class="${role}`).exec(svg)?.[1] ?? '';
  return (d.match(/-?[\d.]+/g) ?? []).map(Number);
}

/** How far an open head's stroke of 1.5 reaches past its point: half the stroke, drawn out by the miter. */
const OPEN_MITER = 0.75 / Math.sin(Math.atan(5 / 10));

describe('line ends fitted to their heads', () => {
  it('ends a line with a filled head inside the head, whose reference point sits there too', () => {
    const svg = svgOf({ kind: 'path', d: 'M0 50 L60 50', role: 'call' });
    expect(pathOf(svg, 'line')).toEqual([0, 50, 50.5, 50]);
    expect(svg).toContain('refX="1.5" refY="6"');
    expect(svg).toContain('overflow="visible"');
  });

  it('lets the tip touch the outer edge of the border it ends on, a thick one as well as a thin one', () => {
    for (const [role, half] of [
      ['box', 0.75],
      ['boxEmph', 1.25],
    ] as const) {
      const end = pathOf(svgOf(box(role), { kind: 'path', d: 'M0 50 L100 50', role: 'call' }), 'line')[2] as number;
      expect(end + 9.5).toBeCloseTo(100 - half, 0);
      expect(end + 9.5).toBeGreaterThan(100 - half - 0.15);
    }
  });

  it('runs a line between the strokes of an open head to its point, and stops where the miter of the tip ends', () => {
    const end = pathOf(svgOf(box('box'), { kind: 'path', d: 'M0 50 L100 50', role: 'event' }), 'line')[2] as number;
    expect(end + OPEN_MITER).toBeCloseTo(100 - 0.75, 0);
  });

  it('steps a slanted line back along itself, farther than half the border', () => {
    const [x0, y0, x1, y1] = pathOf(svgOf(box('box'), { kind: 'path', d: 'M50 0 L100 50', role: 'call' }), 'line');
    const back = Math.hypot(100 - (x1 as number), 50 - (y1 as number));
    expect([x0, y0]).toEqual([50, 0]);
    expect(back).toBeCloseTo(9.5 + 0.75 * Math.SQRT2 - 0.05, 0);
  });

  it('shortens the halo of the line in the same group to the same point, and leaves other lines alone', () => {
    const svg = svgOf(box('box'), {
      kind: 'group',
      children: [
        { kind: 'path', d: 'M0 50 L100 50', role: 'halo' },
        { kind: 'path', d: 'M0 50 L100 50', role: 'call' },
        { kind: 'path', d: 'M0 20 L100 20', role: 'plain' },
      ],
    });
    expect(pathOf(svg, 'line halo')).toEqual(pathOf(svg, 'line"'));
    expect(pathOf(svg, 'line"')[2]).toBeLessThan(91);
    expect(svg).toContain('<path d="M0 20 L100 20" class="line"/>');
  });

  it('walks back over the short pieces of a bowed line, so its head keeps the way the line ends', () => {
    const svg = svgOf({ kind: 'path', d: 'M0 50 L40 50 L46 50 L48 50 L49 50', role: 'call' });
    expect(pathOf(svg, 'line')).toEqual([0, 50, 39.5, 50]);
  });

  it('leaves a curve as it is', () => {
    const svg = svgOf({ kind: 'path', d: 'M0 50 Q30 0 60 50', role: 'call' });
    expect(svg).toContain('<path d="M0 50 Q30 0 60 50" class="line"');
  });
});
