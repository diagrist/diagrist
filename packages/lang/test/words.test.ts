import { describe, expect, it } from 'vitest';
import { article, either, ref } from '../src/index.js';

describe('values in words', () => {
  it('name the statements a reference may point to with the right article and an English list', () => {
    expect(ref('participant').expected).toBe('the id of a `participant` declared in this diagram');
    expect(ref('actor', 'usecase').expected).toBe('the id of an `actor` or `usecase` declared in this diagram');
    expect(ref('initial', 'final', 'action').expected).toBe(
      'the id of an `initial`, `final` or `action` declared in this diagram',
    );
  });

  it.each([
    ['activity', 'an'],
    ['adr', 'an'],
    ['interruptible', 'an'],
    ['expansion', 'an'],
    ['object', 'an'],
    ['update', 'an'],
    ['usecase', 'a'],
    ['unit', 'a'],
    ['state', 'a'],
    ['sequence', 'a'],
  ])('put the article before %s as it is read aloud', (word, expected) => {
    expect(article(word)).toBe(expected);
  });

  it('list alternatives with commas and a last `or`', () => {
    expect([either([]), either(['a']), either(['a', 'b']), either(['a', 'b', 'c'])]).toEqual([
      '',
      'a',
      'a or b',
      'a, b or c',
    ]);
  });
});
