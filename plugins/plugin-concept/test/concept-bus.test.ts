import { describe, expect, it } from 'vitest';
import { concept } from './compile.js';

/** Three channels and three services, every channel using every service unless `leave` names a pair to leave out. */
const channels = (leave = '') => [
  'type kanal "Kanal" shape=round',
  'type dienst "Dienst"',
  'link nutzt "nutzt" from=kanal to=dienst',
  ...['app', 'web', 'tel'].map((k) => `item ${k} "${k}" is kanal`),
  ...['kat', 'kto', 'bu'].map((d) => `item ${d} "${d}" is dienst`),
  ...['app', 'web', 'tel'].flatMap((k) =>
    ['kat', 'kto', 'bu'].flatMap((d) => (`${k} ${d}` === leave ? [] : [`rel ${k} nutzt ${d}`])),
  ),
];

/** The heights at which a line runs across, each once. */
const across = (points: readonly (readonly [number, number])[]) =>
  points.slice(1).flatMap((p, i) => (p[1] === points[i]?.[1] && p[0] !== points[i]?.[0] ? [p[1]] : []));

describe('a complete set of relations between two types', () => {
  it('runs on one bus: every line crosses on one height, and the line check reads them as one bundle', () => {
    const result = concept('arrange=layers', ...channels());
    const edges = result.anchors?.edges ?? [];
    expect(edges).toHaveLength(9);
    expect(new Set(edges.flatMap((e) => across(e.points)))).toEqual(new Set([across(edges[1]?.points ?? [])[0]]));
    expect(new Set(edges.map((e) => e.bus))).toEqual(new Set(['0']));
    expect(result.diagnostics).toEqual([]);
  });

  it('draws a line per pair again when one pair is missing', () => {
    const result = concept('arrange=layers', ...channels('web kto'));
    const edges = result.anchors?.edges ?? [];
    expect(edges).toHaveLength(8);
    expect(edges.every((e) => e.bus === undefined)).toBe(true);
  });
});
