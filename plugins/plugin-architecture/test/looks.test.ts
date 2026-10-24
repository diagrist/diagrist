import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { diagram, plugins, source } from './compile.js';

const SHOP = ['system shop "Shop" icon=database tech="sells" at b/main', 'system pay "Payments" shape=db at c/main'];

describe('looks', () => {
  it('draw plain boxes with a legend, cards with icon circles and no legend', () => {
    const plain = diagram('context', ...SHOP).svg ?? '';
    const cards = diagram('context look=cards', ...SHOP).svg ?? '';
    expect(plain).toContain('<g class="legend">');
    expect(plain).toContain('data-icon="database"');
    expect(cards).not.toContain('<g class="legend">');
    expect(cards).toMatch(/<circle cx="[\d.]+" cy="[\d.]+" r="22" class="tone-blue"\/>/);
    expect(cards).toContain('stroke="#ffffff"');
  });

  it('draw blocks larger, with the variant’s measures in the stylesheet', () => {
    const svg = compile(source('patterns/layered.dgr'), { plugins }).svg ?? '';
    expect(svg).toContain(
      '.dia { font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 16px; }',
    );
    expect(svg).toContain('markerWidth="18"');
    expect(svg).toContain('class="block-title">Presentation Layer</text>');
  });

  it('select their fonts: paper sets Inter unkerned, technologies of containers in JetBrains Mono', () => {
    const svg =
      diagram(
        'container look=paper',
        'system shop "Shop" tech="sells online" at a/main emph',
        'container db "Orders" tech="PostgreSQL" shape=db at c/main',
        'edge shop -> db "writes" via=SQL',
      ).svg ?? '';
    expect(svg).toMatch(/\.dia \{ font-family: Inter, [^;]+; font-size: 11px; font-kerning: none; \}/);
    expect(svg).toMatch(/\.label-tech \{ fill: #6f6d68; font-family: "JetBrains Mono"[^;]*; font-size: 9\.5px; \}/);
    expect(svg).toMatch(
      /\.label-bold \{ fill: #222220; font-family: Inter[^;]*; font-weight: 600; font-size: 13px; \}/,
    );
    expect(svg).toContain('class="label-description">sells online</text>');
    expect(svg).toContain('class="label-tech">PostgreSQL</text>');
    expect(svg).toContain('class="shape-core"/>');
    expect(svg).toContain('fill="#f7f6f3"');
    expect(svg).not.toContain('<g class="legend">');
  });

  it('keep the same bytes for the same source, whatever was compiled before', () => {
    const first = diagram('context look=cards', ...SHOP).svg;
    compile(source('architecture/cloud.dgr'), { plugins });
    expect(diagram('context look=cards', ...SHOP).svg).toBe(first);
  });
});
