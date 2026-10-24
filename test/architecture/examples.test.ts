import { describe, expect, it } from 'vitest';
import { packageOf, readSource, repositoryFiles } from './source.js';

/**
 * Every example keeps its picture: its path below the plugin's `examples/` stands in a hash file of the plugin's
 * golden files (`test/__golden__/*.sha256`), whose test compares the SHA-256 of the SVG it renders. An example
 * without one is checked only for crashes and determinism, and a change of its layout goes unseen.
 */
describe('examples of a plugin', () => {
  it('each have a hash of their picture', () => {
    const files = repositoryFiles();
    const examples = files.filter((file) => /^plugins\/[^/]+\/examples\/.+\.dgr$/.test(file));
    const hashFiles = files.filter((file) => /^plugins\/[^/]+\/test\/__golden__\/[^/]+\.sha256$/.test(file));
    expect(examples.length).toBeGreaterThan(60);
    expect(unhashed(examples, new Map(hashFiles.map((file) => [file, readSource(file)])))).toEqual([]);
  });

  it('are found without a hash, or with one only in another plugin', () => {
    const hashes = new Map([
      ['plugins/a/test/__golden__/x.sha256', 'f00d  one/first.dgr\n'],
      ['plugins/b/test/__golden__/y.sha256', 'f00d  one/second.dgr\n'],
    ]);
    const examples = ['plugins/a/examples/one/first.dgr', 'plugins/a/examples/one/second.dgr'];
    expect(unhashed(examples, hashes)).toEqual(['plugins/a/examples/one/second.dgr']);
  });
});

/** The examples that no line of a hash file of their own plugin names, by their path below `examples/`. */
function unhashed(examples: readonly string[], hashFiles: ReadonlyMap<string, string>): string[] {
  const listed = new Set(
    [...hashFiles].flatMap(([file, text]) =>
      text
        .split('\n')
        .map((line) => /^[0-9a-f]+ {2}(.+)$/.exec(line)?.[1])
        .filter((path) => path !== undefined)
        .map((path) => `${packageOf(file)}/examples/${path}`),
    ),
  );
  return examples.filter((example) => !listed.has(example));
}
