import { describe, expect, it } from 'vitest';
import { lineOf, manifest, nodes, packageOf, parse, sourceFiles } from './source.js';

/**
 * Layout libraries such as `@diagrist/layout-grid` serve every kind and therefore know none (ADR 0015): they depend
 * on the kernel only, and no string in their source names a diagram kind or one of its elements. A kind that needs
 * something of them describes it as data (a shape, an own size, a pad), not by its name.
 */
const KIND_WORDS = [
  'sequence',
  'usecase',
  'actor',
  'class',
  'state',
  'activity',
  'context',
  'container',
  'component',
  'person',
  'domain',
  'entity',
];

const LIBRARIES = /^packages\/layout-[^/]+\/src\//;

describe('layout libraries', () => {
  const files = sourceFiles().filter((file) => LIBRARIES.test(file));

  it('depend on the kernel only', () => {
    const roots = [...new Set(files.map(packageOf))].filter((root) => root !== undefined);
    const offending = roots.flatMap((root) =>
      Object.keys(manifest(root).dependencies ?? {})
        .filter((name) => name !== '@diagrist/core')
        .map((name) => `${root} depends on ${name}`),
    );
    expect(offending).toEqual([]);
  });

  it('name no diagram kind in their strings', () => {
    const offending = files.flatMap((file) => {
      const { source, program } = parse(file);
      return [...nodes(program)]
        .filter((node) => node.type === 'Literal' || node.type === 'TemplateElement')
        .map((node) => ({
          node,
          text: String(node.type === 'Literal' ? node.value : (node.value as { raw?: string }).raw),
        }))
        .filter(({ text }) => KIND_WORDS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(text)))
        .map(({ node, text }) => `${file}:${lineOf(source, node.start)}  ${text}`);
    });
    expect(offending).toEqual([]);
  });
});
