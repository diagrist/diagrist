import { createHash } from 'node:crypto';
import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, golden, plugins, source } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const svgOf = (text: string) => compile(text, { plugins }).svg ?? '';
const paper = (name: string) => source(name).includes('look=paper');

/** Every picture of an example as `dir/name.dgr` or `dir/name.dgr#variant`, with its SVG. */
const picturesOf = (name: string, text?: string) =>
  compileExample(name, text).pictures.map((p) => ({
    picture: p.variant === undefined ? name : `${name}#${p.variant}`,
    svg: p.svg ?? '',
  }));
const hashLines = (pictures: readonly { picture: string; svg: string }[]) =>
  pictures.map(({ picture, svg }) => `${sha256(svg)}  ${picture}\n`).join('');

/**
 * Warnings of the kernel's placement check: labels reaching into other frames, as the predecessor placed them, and
 * in the diff pictures labels of removed and kept edges between the same two boxes.
 */
const PLACEMENT: Readonly<Record<string, readonly string[]>> = {
  'radverleih/komponenten.dgr': ['G400'],
  'radverleih/radverleih.dgr': [
    'G400 soll',
    'G400 soll',
    'G400',
    'G400 soll',
    'G400 soll',
    'G400 soll',
    'G402 soll',
    'G400 soll',
    'G400 a',
    'G400 a',
    'G400 a',
  ],
  'radverleih/entscheidung.dgr': ['G400', 'G400 b', 'G400 b', 'G400 b', 'G400 b'],
};

/** The SHA-256 of the files `radverleih.dgr` replaced, as `main` rendered them, plain and in `look=cards`. */
const REPLACED = {
  soll: [
    'a298ba956a49da233e3bb4df010917aadea165fbd9310777f5c0b90896b2ddbd',
    'd2704fb89f277a36c895db5b2da78e1934a9db0aaf25e86b4bd0c155bf26e894',
  ],
  a: [
    '50392d819119a5cd4572a058932bcb6b25a9b9b3130077e4fd5670a13ddd9ce8',
    '134ab0c82829dc568e64f034b6658b849efbd8b60055fc8c43233967b40a7f66',
  ],
} as const;

describe('C4 examples', () => {
  it.each(exampleNames)('%s renders without errors, twice to the same bytes', (name) => {
    const first = compileExample(name);
    expect(first.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const placement = first.diagnostics.filter((d) => d.code.startsWith('G'));
    expect(placement.map((d) => [d.code, d.picture].filter(Boolean).join(' '))).toEqual(PLACEMENT[name] ?? []);
    expect(first.pictures.every((p) => p.svg !== undefined)).toBe(true);
    expect(compileExample(name).pictures).toEqual(first.pictures);
  });

  it('radverleih.dgr draws soll and a without diff in the bytes of the files they replaced', () => {
    const plain = source('radverleih/radverleih.dgr').replace(/^(variant .*) diff$/gm, '$1');
    const cards = plain.replace(/^(diagram .*)$/m, '$1 look=cards');
    for (const [variant, [bytes, inCards]] of Object.entries(REPLACED)) {
      const svg = (text: string) =>
        compileExample('radverleih/radverleih.dgr', text).pictures.find((p) => p.variant === variant)?.svg;
      expect(sha256(svg(plain) ?? '')).toBe(bytes);
      expect(sha256(svg(cards) ?? '')).toBe(inCards);
    }
  });

  it.each(['kontext', 'komponenten', 'cloud'])('%s renders the reviewed picture', (name) => {
    const file = exampleNames.find((f) => f.endsWith(`/${name}.dgr`)) ?? '';
    expect(compareGolden(golden(`${name}.svg`), svgOf(source(file)))).toEqual({ status: 'match' });
  });

  it('all render the reviewed bytes, checked by a SHA-256 per picture', () => {
    const hashes = hashLines(exampleNames.filter((name) => !paper(name)).flatMap((name) => picturesOf(name)));
    expect(compareGolden(golden('examples.sha256'), hashes)).toEqual({ status: 'match' });
  });

  it('render the reviewed pictures in look=paper, which has no predecessor', () => {
    const hashes = exampleNames.filter(paper).map((name) => `${sha256(svgOf(source(name)))}  ${name}\n`);
    expect(hashes).toHaveLength(3);
    expect(compareGolden(golden('paper.sha256'), hashes.join(''))).toEqual({ status: 'match' });
  });

  it('render the bytes of the predecessor in look=cards too', () => {
    const plain = exampleNames.filter((name) => !source(name).includes('look='));
    const cards = plain.flatMap((name) => picturesOf(name, source(name).replace(/^(diagram .*)$/m, '$1 look=cards')));
    expect(compareGolden(golden('cards.sha256'), hashLines(cards))).toEqual({ status: 'match' });
  });

  it('describes a diagram in German with locale=de, as the predecessor did', () => {
    const text = compile(source('radverleih/kontext.dgr'), { plugins }).description ?? '';
    expect(compareGolden(golden('kontext.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(source('radverleih/kontext.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>Context diagram (C4 L1) · Radverleih im Systemkontext</text>');
    expect(result.svg).toContain('>synchronous call</text>');
    expect(result.description?.split('\n')[0]).toBe(
      'Radverleih im Systemkontext. Context diagram (C4 L1) with 5 elements in 0 groups.',
    );
  });
});
