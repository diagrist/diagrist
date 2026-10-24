import { describe, expect, it } from 'vitest';
import { lineOf, parse, sourceFiles } from './source.js';

/**
 * Code explains itself through names and structure. The only comments allowed are TSDoc blocks that add
 * something the name does not already say. See docs/engineering.md.
 */
describe('comments', () => {
  const files = sourceFiles().map((file) => ({ file, ...parse(file) }));

  it('are TSDoc only', () => {
    const offending = files.flatMap(({ file, source, comments }) =>
      comments
        .filter((comment) => !(comment.type === 'Block' && comment.value.startsWith('*')))
        .map(
          (comment) =>
            `${file}:${lineOf(source, comment.start)}  ${firstLine(source.slice(comment.start, comment.end))}`,
        ),
    );
    expect(offending).toEqual([]);
  });

  it('say more than the name they document', () => {
    const offending = files.flatMap(({ file, source, comments }) =>
      comments
        .filter((comment) => comment.type === 'Block' && comment.value.startsWith('*'))
        .filter((comment) => repeatsName(comment.value, documentedName(source, comment.end)))
        .map((comment) => `${file}:${lineOf(source, comment.start)}  ${firstLine(comment.value)}`),
    );
    expect(offending).toEqual([]);
  });
});

const FILLER = new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'for',
  'and',
  'or',
  'is',
  'are',
  'this',
  'that',
  'it',
  'returns',
  'gets',
  'sets',
]);

function documentedName(source: string, after: number): string | undefined {
  const next = source.slice(after, after + 200);
  const declaration =
    /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|interface|type|class)\s+([\w$]+)/.exec(
      next,
    );
  const member = /^\s*(?:readonly\s+)?([\w$]+)\??[:(]/.exec(next);
  return declaration?.[1] ?? member?.[1];
}

function repeatsName(doc: string, name: string | undefined): boolean {
  const said = words(doc.replace(/@\w+/g, '')).filter((word) => !FILLER.has(word));
  if (said.length === 0) return true;
  if (name === undefined) return false;
  const named = new Set(words(name.replace(/([a-z])([A-Z])/g, '$1 $2')));
  return said.every((word) => named.has(word) || named.has(word.replace(/s$/, '')));
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0] ?? '';
}
