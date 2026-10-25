import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { diagram, plugins, source } from './compile.js';

const texts = (svg: string, cls: string) =>
  [...svg.matchAll(new RegExp(`class="${cls}">([^<]*)</text>`, 'g'))].map((m) => m[1]);
const number = (svg: string, attr: string) => Number(svg.match(new RegExp(`${attr}="([\\d.]+)"`))?.[1]);

const SHOP = [
  'grid cols users,core,around',
  'grid rows main,low',
  'person customer "Customer" tech="account holder" at users/main',
  'system shop "Shop" tech="sells online" at core/main emph',
  'system pay "Payments" tech="cards" at around/main',
  'system mail "Mail" tech="sends receipts" at around/low',
];

describe('look=columns', () => {
  it('names each band of columns by what stands in it, and a frame filling a band becomes its head', () => {
    const svg =
      diagram(
        'container look=columns',
        'grid cols users,app.1,app.2',
        'grid rows main',
        'group app "Online shop" own team="Team Shop"',
        'person customer "Customer" at users/main',
        'container web "Web" tech="Vue" at app.1/main in app',
        'container api "API" tech="Kotlin" at app.2/main in app',
      ).svg ?? '';
    expect(texts(svg, 'band-title')).toEqual(['Users', 'Online shop']);
    expect(texts(svg, 'band-subtitle')).toEqual(['outside the system', 'Team Shop']);
    expect(svg).not.toContain('id="group-app"');
  });

  it('greys what no flow touches, keeps the steps of every flow in ink and draws the accent flow heavy', () => {
    const svg =
      diagram(
        'context look=columns',
        ...SHOP,
        'flow buy accent',
        '  customer -> shop "orders goods" via=HTTPS',
        'flow notify',
        '  shop -> mail "sends receipt"',
        'edge shop -> pay "charges card"',
      ).svg ?? '';
    expect(texts(svg, 'band-title')).toEqual(['Users', 'Shop', 'Neighbours']);
    expect(svg).toMatch(/<g id="node-pay" class="context">/);
    expect(svg).not.toMatch(/<g id="node-mail" class="context">/);
    expect(svg).toMatch(/<g id="edge-2" class="context">/);
    expect(svg).toContain('class="badge-accent"');
    expect(svg).toContain('class="shape-emph"');
    expect(compile(source('radverleih/komponenten-columns.dgr'), { plugins }).svg).not.toContain('class="context"');
  });

  it('cuts the name into the top edge and docks a line from above right of it', () => {
    const svg =
      diagram(
        'container look=columns',
        'container api "Orders" tech="Java" at a/top',
        'container db "Order database" tech="PostgreSQL" at a/main',
        'edge api -> db "writes" via=SQL',
      ).svg ?? '';
    const node = svg.match(/<g id="node-db">.*?<\/g>/)?.[0] ?? '';
    const gap = node.match(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="4" class="gap"\/>/);
    const line = svg.match(/<g id="edge-0"><path d="M([\d.]+) [\d.]+ L([\d.]+)/);
    expect(line?.[1]).toBe(line?.[2]);
    expect(Number(line?.[1])).toBeGreaterThan(Number(gap?.[1]) + Number(gap?.[2]));
    expect(node).toContain('class="label-bold">Order database</text>');
  });

  it('sets layers as bands at the left of an adaptive picture whose columns name no band', () => {
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
    expect(texts(svg, 'band-title')).toEqual(['Front end', 'Back end']);
    expect(svg).not.toContain('class="separator"');
    expect(number(svg, '<rect x')).toBeLessThan(number(svg.split('id="group-app"')[1] ?? '', '<rect x'));
  });

  it('puts the decisions below a wide picture with decisions=auto, beside it otherwise', () => {
    const wide = (at: string) =>
      diagram(
        `context look=columns ${at}`,
        'grid cols a,b,c,d,e',
        'grid rows top',
        'system x "X" tech="one" at a/top mark=E1',
        'system y "Y" tech="two" at e/top',
        'adr E1 "Which?" = "This one" => "Because."',
      ).svg ?? '';
    const noteX = (svg: string) => Number(svg.match(/<text x="([\d.]+)" y="[\d.]+" class="margin-id">E1</)?.[1]);
    expect(noteX(wide('decisions=auto'))).toBe(32);
    expect(noteX(wide('decisions=right'))).toBeGreaterThan(1000);
  });
});
