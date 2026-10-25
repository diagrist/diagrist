import { readdirSync } from 'node:fs';
import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { fixedWidth, nodeWidth } from '../src/layout/measure.js';
import { LOOK_NAMES, LOOKS } from '../src/looks/index.js';
import type { Look, LookOptions } from '../src/looks/look.js';
import type { ArchNode } from '../src/model/types.js';
import { stylesOf } from '../src/styles/index.js';
import { ARCHITECTURE_ROLES } from '../src/styles/roles.js';
import { STANDARD_STROKES, standardChanges } from '../src/styles/rules.js';
import { compileExample, diagram, exampleNames, plugins, source } from './compile.js';

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

describe('the registry of looks', () => {
  it('lists every look of src/looks, in the order the docs name them', () => {
    const files = readdirSync(new URL('../src/looks/', import.meta.url))
      .map((file) => file.replace(/\.ts$/, ''))
      .filter((name) => name !== 'index' && name !== 'look');
    expect([...LOOK_NAMES].sort()).toEqual(files.sort());
    expect(LOOK_NAMES[0]).toBe('plain');
  });

  it.each(LOOK_NAMES)('%s draws every example without errors, twice to the same bytes', (name) => {
    for (const example of exampleNames) {
      const text = source(example)
        .replace(/ look=\w+/, '')
        .replace(/^(diagram .*)$/m, `$1 look=${name}`);
      const first = compileExample(example, text);
      expect(
        first.diagnostics.filter((d) => d.severity === 'error'),
        example,
      ).toEqual([]);
      expect(compileExample(example, text).pictures.map((p) => p.svg)).toEqual(first.pictures.map((p) => p.svg));
    }
  });

  /** Roles of a diff picture (ADR 0021): boxes, edges and tags that are added, removed or changed. */
  const CHANGE_ROLES = Object.keys(ARCHITECTURE_ROLES).filter((role) =>
    /(Added|Removed|Changed)(Text)?$|-(added|removed)$/.test(role),
  );
  const standard = new Set(standardChanges(LOOKS.plain.fonts, STANDARD_STROKES).map((r) => r.name));

  it.each(LOOK_NAMES)('%s paints every class of a diff picture with its own rules', (name) => {
    const look: Look = LOOKS[name];
    const styles = stylesOf(look);
    const own = look.paint.changes(look.fonts, look.paint.strokes).map((r) => r.name);
    const written = new Set(styles.rules.map((r) => r.name));
    const classes = CHANGE_ROLES.flatMap((role) => styles.roles[role]?.classes ?? [role]);
    expect(CHANGE_ROLES.length).toBeGreaterThan(20);
    expect(new Set(own)).toEqual(standard);
    expect(classes.filter((c) => !written.has(c))).toEqual([]);
  });
});

describe('a box is measured by the options that draw it', () => {
  const box = (extra: Partial<ArchNode>): ArchNode => ({
    id: 'docs',
    keyword: 'container',
    label: 'Dokumenten-Service',
    tech: 'Spring Boot',
    emph: false,
    source: { line: 1, column: 1, length: 4 },
    ...extra,
  });
  const choosing = (options: Partial<LookOptions>): Look => ({
    ...LOOKS.plain,
    options: { ...LOOKS.plain.options, ...options },
  });
  const grows = (extra: Partial<ArchNode>, look: Look) => nodeWidth(box(extra), look) - nodeWidth(box({}), look);

  it('keeps room for the status word or dot as `status` says, and for a mark inside as `marks` says', () => {
    expect(grows({ status: 'planned' }, choosing({ status: 'word' }))).toBe(24);
    expect(grows({ status: 'planned' }, choosing({ status: 'dot' }))).toBe(16);
    expect(grows({ mark: 'E1' }, choosing({ marks: 'aside' }))).toBe(0);
    expect(grows({ mark: 'E1' }, choosing({ marks: 'inside' }))).toBe(40);
  });

  it('gives a box its own width in an adaptive grid only in the `block` family', () => {
    expect(fixedWidth(box({}), choosing({ nodes: 'box' }))).toBeUndefined();
    expect(fixedWidth(box({}), choosing({ nodes: 'block' }))).toBe(nodeWidth(box({}), choosing({ nodes: 'block' })));
  });
});
