import { describe, expect, it } from 'vitest';
import { diagram } from './compile.js';

const texts = (svg: string, cls: string) =>
  [...svg.matchAll(new RegExp(`class="${cls}">([^<]*)</text>`, 'g'))].map((m) => m[1]);

describe('look=columns', () => {
  it('names each column band by what stands in it and draws the context of the focus flow in grey', () => {
    const svg =
      diagram(
        'context look=columns',
        'grid cols users,core,around',
        'grid rows main,low',
        'person customer "Customer" tech="account holder" at users/main',
        'system shop "Shop" tech="sells online" at core/main emph',
        'system pay "Payments" tech="cards" at around/main',
        'system mail "Mail" tech="sends receipts" at around/low',
        'flow buy accent',
        '  customer -> shop "orders goods" via=HTTPS',
        'flow notify',
        '  shop -> mail "sends receipt"',
        'edge shop -> pay "charges card"',
      ).svg ?? '';
    expect(texts(svg, 'col-band-title')).toEqual(['Users', 'Shop', 'Neighbours']);
    expect(texts(svg, 'col-band-subtitle')).toEqual(['outside the system', 'in focus', '2 systems']);
    expect(svg).toContain('class="col-box-focus"/>');
    expect(svg).toMatch(/<g id="node-mail"><rect [^>]* class="col-box-context"\/>/);
    expect(svg).toMatch(/class="line-context"[^>]*marker-end="url\(#m-context\)"/);
    expect(texts(svg, 'col-verb')).toEqual(['orders']);
    expect(texts(svg, 'label-tech')).toContain('HTTPS');
  });

  it('moves a line that would end under the name in the top edge to the right of it, or the name inside', () => {
    const boxes = (db: string) =>
      diagram(
        'container look=columns',
        'container api "Orders" tech="Java" at a/top',
        `container db "${db}" tech="PostgreSQL" at a/main`,
        'edge api -> db "writes" via=SQL',
      ).svg ?? '';
    const svg = boxes('Order database');
    const gap = svg.match(/<g id="node-db"><rect [^>]*\/><rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/);
    const line = svg.match(/<g id="edge-0"><path d="M([\d.]+) [\d.]+ L([\d.]+)/);
    expect(line?.[1]).toBe(line?.[2]);
    expect(Number(line?.[1])).toBeGreaterThan(Number(gap?.[1]) + Number(gap?.[2]));
    expect(boxes('Order and payment database')).toMatch(
      /<g id="node-db"><rect [^>]*\/><text [^>]*text-anchor="middle" class="label-bold">Order and payment database</,
    );
  });

  it('turns layers into bands at the left when no column can be named', () => {
    const svg =
      diagram(
        'container look=columns layout=adaptive',
        'grid cols a,b',
        'grid rows front,back',
        'layer front "Front end"',
        'layer back "Back end"',
        'group app "App" own',
        'container web "Web" tech="Vue" at a/front in app',
        'container api "API" tech="Kotlin" at b/back in app',
        'edge web -> api "calls" via=HTTPS',
      ).svg ?? '';
    expect(texts(svg, 'col-band-title')).toEqual(['Front end', 'Back end']);
    expect(svg).not.toContain('col-separator');
  });
});
