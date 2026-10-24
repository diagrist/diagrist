import { describe, expect, it } from 'vitest';
import { diagram } from './compile.js';

const rectOf = (svg: string, pattern: RegExp) => {
  const [, x = '0', y = '0', w = '0', h = '0'] = svg.match(pattern) ?? [];
  return { x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
};

describe('look=instrument', () => {
  const svg =
    diagram(
      'container look=instrument',
      'system shop "Shop" tech="sells online" at a/main emph mark=E1',
      'container db "Orders" tech="PostgreSQL" shape=db at c/main',
      'edge shop -> db "writes" via=SQL',
      'adr E1 "Who owns the shop?" = "Team Shop" => "No shared code."',
    ).svg ?? '';

  it('sets names in capitals of Space Grotesk, unkerned, and protocols in mono', () => {
    expect(svg).toMatch(/\.dia \{ font-family: "Space Grotesk", [^;]+; font-size: 10\.5px; font-kerning: none; \}/);
    expect(svg).toMatch(/\.label-bold \{ fill: #231f20; font-family: "Space Grotesk"[^;]*; font-weight: 500;/);
    expect(svg).toContain('class="label-bold">SHOP</text>');
    expect(svg).toContain('class="tag-label-dark">WRITES</text>');
    expect(svg).toContain('class="tag-mono-dark">SQL</text>');
  });

  it('names the type above a box only where it is not what the level is about, the technology always', () => {
    expect(svg).toContain('class="label-micro">SYSTEM</text>');
    expect(svg).toContain('class="label-micro">POSTGRESQL</text>');
    expect(svg).not.toContain('>CONTAINER · POSTGRESQL<');
    expect(svg).toContain('class="label-description">sells online</text>');
  });

  it('tags the core in black and the decision in orange outside the box, the decision in full beside the picture', () => {
    const box = rectOf(svg, /<g id="node-shop"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    const core = rectOf(
      svg,
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" class="tag-core"\/>\s*<text [^>]*>CORE</,
    );
    const mark = rectOf(
      svg,
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" class="tag-signal"\/>\s*<text [^>]*>E1</,
    );
    for (const tag of [core, mark]) {
      expect(tag.w).toBeGreaterThan(0);
      expect(tag.y + tag.h <= box.y || tag.y >= box.y + box.h).toBe(true);
    }
    expect(svg).toContain('class="leader-signal"');
    expect(svg).toContain('class="prose-choice">Team Shop</text>');
  });
});
