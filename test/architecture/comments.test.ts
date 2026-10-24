import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';

/**
 * Code explains itself through names and structure. The only comments allowed are TSDoc blocks (`/** ... *\/`)
 * that document a declaration. See docs/engineering.md.
 */
describe('comments', () => {
  it('are TSDoc only', () => {
    const offending = sourceFiles().flatMap((file) =>
      forbiddenComments(file).map((comment) => `${file}:${comment.line}  ${comment.text}`),
    );
    expect(offending).toEqual([]);
  });
});

const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function sourceFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repository,
    encoding: 'utf8',
  });
  return listed.split('\n').filter((file) => /\.(ts|mts|cts|js|mjs)$/.test(file) && !file.endsWith('.d.ts'));
}

function forbiddenComments(file: string): { line: number; text: string }[] {
  const source = readFileSync(join(repository, file), 'utf8');
  const { comments } = parseSync(file, source);
  return comments
    .filter((comment) => !(comment.type === 'Block' && comment.value.startsWith('*')))
    .map((comment) => ({
      line: source.slice(0, comment.start).split('\n').length,
      text: source.slice(comment.start, comment.end).split('\n')[0] ?? '',
    }));
}
