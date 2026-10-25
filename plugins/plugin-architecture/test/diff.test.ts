import { describe, expect, it } from 'vitest';
import { diagram } from './compile.js';

const BASE = [
  'node a "Alpha" at a/main',
  'node b "Beta" at b/main',
  'node c "Gamma" at c/main',
  'flow f',
  '  a -> b "asks"',
  '  b -> c "stores"',
];
const VARIANT = [
  '  drop node c',
  '  drop flow f',
  '  flow f',
  '  a -> b "asks again"',
  '  node d "Delta" at c/top',
  '  edge a -> d "tells"',
];
const withDiff = (diff: boolean) =>
  diagram(
    'container',
    ...BASE,
    `variant next "Next"${diff ? ' diff' : ''}`,
    ...VARIANT.map((l) => l.replace(/^ {2}a/, '    a')),
  );

describe('a diff picture of C4', () => {
  const picture = withDiff(true).pictures[1];

  it('draws added, removed and changed boxes and edges with their roles and signs, readable without colour', () => {
    const svg = picture?.svg ?? '';
    for (const role of [
      'shape-added',
      'shape-removed',
      'line-added',
      'line-removed',
      'diff-tag-added',
      'diff-tag-removed',
    ])
      expect(svg).toContain(role);
    expect(svg).toContain('>+<');
    expect(svg).toContain('>×<');
    expect(svg).toContain('~ asks again');
  });

  it('explains the changes in the legend and the description', () => {
    expect(picture?.svg).toContain('>added</text>');
    expect(picture?.svg).toContain('>removed</text>');
    expect(picture?.description).toContain('Added: Delta, Alpha → Delta.');
    expect(picture?.description).toContain('Removed: Gamma, Beta → Gamma.');
    expect(picture?.description).toContain('Changed: Alpha → Beta.');
  });

  it('numbers only the steps the variant keeps', () => {
    expect(picture?.description).toContain('(1) Alpha → Beta');
    expect(picture?.description).not.toContain('(2)');
  });

  it('is drawn only with diff: the same variant without it shows nothing of the comparison', () => {
    const plain = withDiff(false).pictures[1]?.svg ?? '';
    expect(plain).not.toMatch(/shape-added|shape-removed|line-removed|diff-tag/);
    expect(plain).not.toContain('Gamma');
  });
});

describe('a diff picture in look=paper', () => {
  it('stays in the inks of the sheet and says the changes in the legend sentence', () => {
    const lines = [...BASE, 'variant next "Next" diff', ...VARIANT.map((l) => l.replace(/^ {2}a/, '    a'))];
    const svg = diagram('container look=paper', ...lines).pictures[1]?.svg ?? '';
    expect(svg).toMatch(/\.shape-added \{ fill: #ffffff; stroke: #222220;/);
    expect(svg).not.toMatch(/f6eb6a/);
    expect(svg).toContain('Heavy outline and +: added.');
  });
});
