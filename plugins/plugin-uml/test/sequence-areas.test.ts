import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const picture = (header: string, extra: readonly string[] = []) =>
  compile(
    [
      `diagram sequence "Test" ${header}`.trimEnd(),
      'area kern "Kern"',
      'area zahlung "Zahlungen" tone=green',
      'participant shop "Shop" area=kern',
      'participant pay "Zahlungsdienst" area=zahlung',
      'msg shop -> pay "belasten"',
      'msg pay --> shop "ok"',
      'msg shop ~> shop "merken"',
      ...extra,
    ].join('\n'),
    { plugins: [umlPlugin] },
  );

describe('areas in sequence diagrams', () => {
  const plain = picture('locale=de');

  it('mark the head, the dashed line and the bars of a lifeline, and leave the core in ink', () => {
    expect(plain.diagnostics.filter((d) => d.severity !== 'warning')).toEqual([]);
    expect(plain.svg).toContain('<g id="node-pay" class="area-green">');
    expect(plain.svg).toContain('<g id="node-shop">');
    expect(plain.svg).toMatch(/<g class="area-green"><line [^>]*class="seq-lifeline"/);
    expect(plain.svg).toMatch(/<g class="area-green"><rect [^>]*class="seq-activation"/);
    expect((plain.svg ?? '').match(/class="area-green"><line/g)).toHaveLength(1);
  });

  it('give messages between an extension and the core its tone, both ways, and none inside the core', () => {
    expect(plain.svg).toContain('<g id="edge-0" class="area-green-line">');
    expect(plain.svg).toContain('<g id="edge-1" class="area-green-line">');
    expect(plain.svg).toContain('<g id="edge-2">');
  });

  it('let a message name its own area', () => {
    const own = picture('', ['msg shop -> pay "quittung" area=kern', 'msg pay --> shop']);
    expect(own.svg).toContain('<g id="edge-3">');
  });

  it('append a legend of the areas and name them with their lifelines in the description', () => {
    expect(plain.svg).toContain('>Zahlungen</text>');
    expect(plain.svg).toContain('>Kern</text>');
    expect(plain.description).toContain('Bereich Zahlungen (grün): Zahlungsdienst.');
  });

  it('let a coloured area paint its lifelines in the card look, as its legend shows, unless they name a tone', () => {
    const cards = picture('look=cards', ['participant psp "PSP" area=zahlung tone=blue', 'msg pay ~> psp "buchen"']);
    const svg = cards.svg ?? '';
    const head = (id: string) => {
      const start = svg.indexOf(`<g id="node-${id}"`);
      return svg.slice(start, svg.indexOf('</g>', start));
    };
    expect(head('pay')).toContain('class="card-box"');
    expect(head('pay')).toContain('class="label-bold"');
    expect(head('psp')).toContain('class="tone-blue"');
    expect(head('shop')).toContain('class="tone-slate"');
    expect(svg).toMatch(/<g class="area-green"><rect [^>]*class="seq-activation"/);
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = compile('diagram sequence "Test"\nparticipant a "A"\nparticipant b "B"\nmsg a -> b "x"', {
      plugins: [umlPlugin],
    });
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
