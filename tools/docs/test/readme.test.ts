import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLUGINS } from '@diagrist/cli/tables';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { README_EXAMPLES, readmeImage } from '../src/readme.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const readme = readFileSync(`${root}README.md`, 'utf8');

describe('the README', () => {
  it.each(README_EXAMPLES.map((example) => [example.source, example]))(
    'shows %s as it is in the repository, with its current picture (regenerate with `pnpm docs:generate`)',
    (source, example) => {
      const text = readFileSync(`${root}${source}`, 'utf8');
      expect(readme, `README.md shows another version of ${source}`).toContain(`\`\`\`dgr\n${text}\`\`\``);
      expect(readme).toContain(`](${example.image})`);
      const image = readmeImage(example, text, PLUGINS);
      expect(image, `${source} has findings`).toBeDefined();
      const result = compareGolden(`${root}${example.image}`, image ?? '');
      expect(result.status, `${example.image} is out of date; run \`pnpm docs:generate\``).not.toBe('mismatch');
    },
  );

  it('links only files that exist', () => {
    const links = [...readme.matchAll(/\]\(((?!https?:|#)[^)\s]+)\)/g)].map((match) => match[1] ?? '');
    const missing = links.filter((link) => {
      try {
        readFileSync(`${root}${link.replace(/#.*$/, '')}`);
        return false;
      } catch (error) {
        return (error as NodeJS.ErrnoException).code !== 'EISDIR';
      }
    });
    expect(missing).toEqual([]);
  });
});
