import { compile, type Plugin } from '@diagrist/core';
import { generatedFrom } from './markdown.js';

/** An example file the README shows in full, and where its picture is checked in; paths from the repository root. */
export interface ReadmeExample {
  readonly source: string;
  readonly image: string;
}

/** One small, real example per diagram plugin, shown in the README with its picture. */
export const README_EXAMPLES: readonly ReadmeExample[] = [
  { source: 'plugins/plugin-uml/examples/sequence/cache.dgr', image: 'docs/images/sequence-cache.svg' },
  { source: 'plugins/plugin-architecture/examples/radverleih/kontext.dgr', image: 'docs/images/context-radverleih.svg' },
];

/**
 * The picture of an example as the README links it: the SVG the kernel draws, under a comment naming its source.
 * `undefined` when the example does not compile without findings, since the README must not show a broken one.
 */
export function readmeImage(example: ReadmeExample, text: string, plugins: readonly Plugin[]): string | undefined {
  const compiled = compile(text, { plugins });
  if (compiled.svg === undefined || compiled.diagnostics.length > 0) return undefined;
  return `${generatedFrom(example.source)}\n${compiled.svg}`;
}
