import { compile, type Point, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';

const plugins = [architecturePlugin];

/** A star of eight neighbours, one of them with a way back, so lines crowd round the hub. */
const STAR = [
  'person kunde "Kunde" tech="kauft ein"',
  'person service "Service" tech="hilft"',
  'system portal "Portal" tech="Verträge und Rechnungen" emph',
  'system sap "SAP" tech="Abrechnung"',
  'system crm "CRM" tech="Kunden"',
  'system psp "Zahlung" tech="Karte"',
  'system mail "Mail" tech="SES"',
  'system dms "Archiv" tech="Ablage"',
  'system idp "Login" tech="OIDC"',
  'edge kunde -> portal "bestellt" via=HTTPS',
  'edge service -> portal "sieht"',
  'edge portal -> sap "liest"',
  'edge sap ~> portal "meldet"',
  'edge portal -> crm "schreibt"',
  'edge portal -> psp "bucht"',
  'edge portal -> mail "schickt"',
  'edge portal -> dms "legt ab"',
  'edge idp -> portal "meldet an"',
];

const star = (header: string, ...more: string[]) =>
  compile([`diagram context "Portal" layout=star locale=de ${header}`, ...STAR, ...more].join('\n'), { plugins });

const sizeOf = (svg: string): number => {
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  return Number(w) * Number(h);
};

/** The room between two rectangles: the larger of the gaps across and down, 0 where they overlap. */
const gap = (a: Rect, b: Rect): number =>
  Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h), 0);

const middle = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];

describe('spacing', () => {
  it('reads the level and single measures without findings', () => {
    expect(star('spacing=loose', 'spacing ring=120 gap=56 label=10 margin=64').diagnostics).toEqual([]);
    expect(star('', 'spacing ring=8').diagnostics.length).toBeGreaterThan(0);
  });

  it('keeps every neighbour of a star at least `ring` from the hub', () => {
    const anchors = star('', 'spacing ring=200').anchors;
    const hub = anchors?.nodes.find((n) => n.id === 'portal')?.rect as Rect;
    for (const n of anchors?.nodes ?? []) if (n.id !== 'portal') expect(gap(n.rect, hub)).toBeGreaterThanOrEqual(199);
  });

  it('draws a star smaller with `compact` and larger with `loose`', () => {
    const [compact, normal, loose] = ['compact', 'normal', 'loose'].map((s) => sizeOf(star(`spacing=${s}`).svg ?? ''));
    expect(compact).toBeLessThan(normal as number);
    expect(loose).toBeGreaterThan(normal as number);
  });

  it('moves a neighbour with `distance=far` further from the hub', () => {
    const reach = (more: string) => {
      const anchors = compile(
        [
          `diagram context "Portal" layout=star locale=de`,
          ...STAR.map((l) => (l.startsWith('system mail ') ? `${l} ${more}` : l)),
        ].join('\n'),
        { plugins },
      ).anchors;
      const at = (id: string) => middle(anchors?.nodes.find((n) => n.id === id)?.rect as Rect);
      const [hx, hy] = at('portal');
      const [x, y] = at('mail');
      return Math.hypot(x - hx, y - hy);
    };
    expect(reach('distance=far')).toBeGreaterThan(reach(''));
  });

  it('spreads the lines over the outline of the hub instead of crowding them in its middle', () => {
    const anchors = star('').anchors;
    const hub = anchors?.nodes.find((n) => n.id === 'portal')?.rect as Rect;
    const onHub = (p: Point) =>
      Math.min(
        Math.abs(p[0] - hub.x),
        Math.abs(p[0] - hub.x - hub.w),
        Math.abs(p[1] - hub.y),
        Math.abs(p[1] - hub.y - hub.h),
      ) < 2;
    const ends = (anchors?.edges ?? []).flatMap((e) => [e.points[0], e.points.at(-1)] as Point[]).filter(onHub);
    expect(ends.length).toBe(9);
    for (const a of ends)
      for (const b of ends) if (a !== b) expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(16);
  });

  it('leaves a grid picture without `spacing` as it was and widens its columns with `loose`', () => {
    const grid = (header: string) =>
      compile(
        [
          `diagram container "Shop" ${header}`,
          'grid cols a,b',
          'grid rows main',
          'container web "Web" at a/main',
          'container db "DB" at b/main',
          'edge web -> db "reads"',
        ].join('\n'),
        { plugins },
      );
    expect(grid('spacing=normal').svg).toBe(grid('').svg);
    const x = (header: string) => grid(header).anchors?.nodes.find((n) => n.id === 'db')?.rect.x as number;
    expect(x('spacing=loose')).toBeGreaterThan(x(''));
    expect(x('spacing=compact')).toBeLessThan(x(''));
  });
});
