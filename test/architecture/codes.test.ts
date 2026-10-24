import { describe, expect, it } from 'vitest';
import { lineOf, packageOf, readSource, sourceFiles } from './source.js';

/**
 * A diagnostic code lives in its rule and its catalogue, nowhere else (ADR 0011): models, layout and docs name the
 * case, and the generated tables name the code. A plugin's codes are the keys of its catalogues in `messages`; they
 * may appear only in files below `rules` and `messages`. Codes of the language such as L108, or the predecessor's
 * such as W110, are no plugin's and may be mentioned.
 */
describe('diagnostic codes of a plugin', () => {
  const files = sourceFiles().filter((file) => /^plugins\/[^/]+\/src\//.test(file));
  const owns = (file: string) => /\/(rules|messages)\//.test(file);

  it('are written in their rule and their catalogue only', () => {
    const offending = [...new Set(files.map(packageOf))].flatMap((plugin) => {
      const own = files.filter((file) => packageOf(file) === plugin);
      const codes = new Set(
        own
          .filter((file) => file.includes('/messages/'))
          .flatMap((file) => [...readSource(file).matchAll(/\b([A-Z]\d{3}): \{/g)].map((m) => m[1])),
      );
      return own
        .filter((file) => !owns(file))
        .flatMap((file) => {
          const source = readSource(file);
          return [...source.matchAll(/\b[A-Z]\d{3}\b/g)]
            .filter((m) => codes.has(m[0]))
            .map((m) => `${file}:${lineOf(source, m.index)}  ${m[0]}`);
        });
    });
    expect(offending).toEqual([]);
  });
});
