import { readFileSync } from 'node:fs';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { flattenSvg } from '../src/index.js';

/** A golden file's path; `<name>.kernel.svg` is a picture as the kernel drew it when the test was written. */
const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;
const fixture = (name: string): string => readFileSync(golden(`${name}.kernel.svg`), 'utf8');

/** A picture as `toSvg` writes it: the root class, its stylesheet, a background, `defs` and the body. */
const picture = (css: string, body: string, defs = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100" class="dg" role="img" aria-label="T"><title>T</title><style>\n  .dg { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; font-kerning: none; }\n${css}</style><rect width="200" height="100" fill="#fafafa"/><defs>${defs}</defs>\n${body}\n</svg>\n`;

const flat = (css: string, body: string, defs = ''): string => flattenSvg(picture(css, body, defs)).svg;

/** The body of the flattened picture, after the background. */
const bodyOf = (svg: string): string => svg.slice(svg.indexOf('</defs>') + 7).trim();

describe('flattenSvg resolves classes into attributes', () => {
  it('lets a rule beat the attribute the element carries', () => {
    const svg = flat('  .dg .box { fill: #ffffff; stroke-width: 1.5px; }\n', '<rect x="1" fill="#000" class="box"/>');
    expect(bodyOf(svg)).toBe('<rect x="1" fill="#ffffff" stroke-width="1.5"/>\n</svg>');
  });

  it('lets a later rule beat an earlier one of the same rank', () => {
    const css = '  .dg .line { stroke: #111111; }\n  .dg .dashed { stroke: #222222; stroke-dasharray: 6 4; }\n';
    expect(flat(css, '<path d="M0 0 L9 0" class="line dashed"/>')).toContain(
      '<path d="M0 0 L9 0" stroke="#222222" stroke-dasharray="6 4"/>',
    );
  });

  it('lets the rule of an area beat the base rule through an ancestor group, even when written first', () => {
    const css = '  .dg .area-green .shape { fill: #dcfce7; }\n  .dg .shape { fill: #ffffff; stroke: #18181b; }\n';
    const svg = flat(css, '<g id="n" class="area-green"><g><rect class="shape"/></g></g><rect class="shape"/>');
    expect(bodyOf(svg)).toBe(
      '<g id="n"><g><rect fill="#dcfce7" stroke="#18181b"/></g></g><rect fill="#ffffff" stroke="#18181b"/>\n</svg>',
    );
  });

  it('gives a text the first family and size of the root, and kerning as style', () => {
    const svg = flat(
      '  .dg .label { fill: #18181b; font-size: 10px; }\n',
      '<text x="1" y="2" class="label">a</text><text>b</text>',
    );
    expect(svg).toContain(
      '<text x="1" y="2" fill="#18181b" font-size="10" font-family="JetBrains Mono" style="font-kerning: none">a</text>',
    );
    expect(svg).toContain('<text font-family="JetBrains Mono" font-size="11" style="font-kerning: none">b</text>');
    expect(svg).not.toContain('class=');
    expect(svg).not.toContain('<style');
  });

  it('draws a halo text as a copy in the halo stroke behind the text, which keeps no stroke', () => {
    const css =
      '  .dg .label { fill: #18181b; }\n  .dg .halo { paint-order: stroke; stroke: #fafafa; stroke-width: 4px; stroke-linejoin: round; }\n';
    const { svg, report } = flattenSvg(
      picture(css, '<text x="5" y="9" class="label halo">a <tspan class="label">b</tspan></text>'),
    );
    const back =
      '<text x="5" y="9" fill="#fafafa" stroke="#fafafa" stroke-width="4" stroke-linejoin="round" font-family="JetBrains Mono" font-size="11" style="font-kerning: none">a <tspan fill="#18181b">b</tspan></text>';
    const front =
      '<text x="5" y="9" fill="#18181b" font-family="JetBrains Mono" font-size="11" style="font-kerning: none">a <tspan fill="#18181b">b</tspan></text>';
    expect(bodyOf(svg)).toBe(`${back}${front}\n</svg>`);
    expect(svg).not.toContain('paint-order');
    expect(report.halos).toBe(1);
  });
});

describe('flattenSvg draws markers into the picture', () => {
  const marker = (id: string, orient: string) =>
    `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="${orient}"><path d="M1 1 L11 6 L1 11 Z" class="head"/></marker>`;
  const css = '  .dg .head { fill: #18181b; }\n';

  it('turns the marker at the end along the last segment, as orient="auto" does', () => {
    const { svg, report } = flattenSvg(
      picture(css, '<path d="M10 10 L10 50 H60" marker-end="url(#m-a)"/>', marker('m-a', 'auto')),
    );
    expect(bodyOf(svg)).toBe(
      '<path d="M10 10 L10 50 H60"/><g transform="translate(60 50) rotate(0) translate(-11 -6)"><path d="M1 1 L11 6 L1 11 Z" fill="#18181b"/></g>\n</svg>',
    );
    expect(svg).not.toContain('<marker');
    expect(report).toMatchObject({ markersExpanded: 1, markersKept: 0 });
  });

  it('turns the marker at the start backwards for auto-start-reverse and keeps the path move', () => {
    const body = '<path d="M10 10 V50" marker-start="url(#m-s)" transform="translate(3 4)"/>';
    const svg = flat(css, body, marker('m-s', 'auto-start-reverse'));
    expect(svg).toContain(
      '<path d="M10 10 V50" transform="translate(3 4)"/><g transform="translate(3 4)"><g transform="translate(10 10) rotate(270) translate(-11 -6)">',
    );
  });

  it('keeps the reference and its marker when the path has a curve', () => {
    const { svg, report } = flattenSvg(
      picture(css, '<path d="M0 0 C5 5 9 9 20 20" marker-end="url(#m-c)"/>', marker('m-c', 'auto')),
    );
    expect(svg).toContain('marker-end="url(#m-c)"');
    expect(svg).toContain('<marker id="m-c"');
    expect(report).toMatchObject({ markersExpanded: 0, markersKept: 1 });
  });
});

describe('flattenSvg rewrites what the import loses', () => {
  it('rewrites a nested icon as a group that moves and scales it', () => {
    const svg = flat(
      '  .dg .icon { fill: #18181b; }\n',
      '<svg x="62" y="145" width="22" height="22" viewBox="0 0 24 24" class="icon"><path d="M1 1"/></svg>',
    );
    expect(bodyOf(svg)).toBe(
      '<g transform="translate(62 145) scale(0.917)" fill="#18181b"><path d="M1 1"/></g>\n</svg>',
    );
  });

  it('keeps a run of spaces that FigJam collapsed, "09 a   b    c" losing the c, as no-break spaces', () => {
    const { svg, report } = flattenSvg(picture('', '<text x="1" y="9" xml:space="preserve">09 a   b    c</text>'));
    expect(svg).toContain(`>09 a   b    c</text>`);
    expect(svg).not.toContain('xml:space');
    expect(report.preservedTexts).toBe(1);
  });

  it('removes the stripe filter of an area and counts it', () => {
    const css = '  .dg .area-green .shape { fill: #ffffff; filter: url(#area-green); }\n';
    const defs = '<filter id="area-green"><feOffset dx="6"/></filter>';
    const { svg, report } = flattenSvg(picture(css, '<g class="area-green"><rect class="shape"/></g>', defs));
    expect(svg).not.toContain('filter');
    expect(report.filters).toBe(1);
  });

  it('multiplies width and height by the scale and keeps the view box', () => {
    const { svg } = flattenSvg(picture('', '<rect/>'), { scale: 1.5 });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 200 100" width="300" height="150" /);
  });

  it('leaves an SVG without a stylesheet as it is', () => {
    const inline =
      '<svg xmlns="http://www.w3.org/2000/svg" class="dg"><text xml:space="preserve" class="a">  x</text></svg>\n';
    expect(flattenSvg(inline)).toEqual({ svg: inline, report: expect.objectContaining({ classes: 0 }) });
  });
});

describe('flattenSvg on pictures the kernel drew', () => {
  it('leaves no class, marker, stylesheet, filter or nested svg in the cloud picture, one head per marker', () => {
    const original = fixture('cloud');
    const { svg, report } = flattenSvg(original);
    expect(svg).not.toMatch(/class=|marker-|<marker|<style|filter/);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    const references = original.match(/marker-(end|start)="/g)?.length ?? 0;
    expect(references).toBeGreaterThan(10);
    expect(svg.match(/rotate\(/g)).toHaveLength(references);
    expect(report).toMatchObject({
      markersExpanded: references,
      markersKept: 0,
      icons: original.match(/<svg x=/g)?.length,
    });
    expect(report.halos).toBeGreaterThan(0);
    expect(compareGolden(golden('cloud.figjam.svg'), svg)).not.toMatchObject({ status: 'mismatch' });
  });

  it('writes every space of an indented line of code as a no-break space, without xml:space', () => {
    const original = fixture('methode');
    const { svg, report } = flattenSvg(original);
    const preserved = original.match(/xml:space="preserve"/g)?.length ?? 0;
    expect(preserved).toBeGreaterThan(3);
    expect(report.preservedTexts).toBe(preserved);
    expect(svg).not.toContain('xml:space');
    const line = /<text x="104" y="219"[^>]*>(.*?)<\/text>/.exec(svg)?.[1] ?? '';
    expect(line.startsWith('\u00a0'.repeat(8))).toBe(true);
    expect(line.replace(/<[^>]+>/g, '')).toBe(`${'\u00a0'.repeat(8)}return\u00a0existing.get().id();`);
    expect(report.letterSpacing).toBeGreaterThan(0);
  });
});
