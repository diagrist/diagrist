import { createHash } from 'node:crypto';
import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, golden, plugins, source } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const svgOf = (text: string) => compile(text, { plugins }).svg ?? '';
/** The examples drawn in a look without predecessor, which keep their own hashes. */
const OWN_LOOKS = ['paper', 'columns'] as const;
const inLook = (look: string) => (name: string) => source(name).includes(`look=${look}`);
const ownLook = (name: string) => OWN_LOOKS.some((look) => inLook(look)(name));

/** Every picture of an example as `dir/name.dgr` or `dir/name.dgr#variant`, with its SVG. */
const picturesOf = (name: string, text?: string) =>
  compileExample(name, text).pictures.map((p) => ({
    picture: p.variant === undefined ? name : `${name}#${p.variant}`,
    svg: p.svg ?? '',
  }));
const hashLines = (pictures: readonly { picture: string; svg: string }[]) =>
  pictures.map(({ picture, svg }) => `${sha256(svg)}  ${picture}\n`).join('');

/**
 * Warnings of the kernel's placement check: labels reaching into other frames, as the predecessor placed them, in
 * the diff pictures labels of removed and kept edges between the same two boxes, and flow numbers standing on the
 * border of the frame their edge leaves (docs/burn-down.md).
 */
const PLACEMENT: Readonly<Record<string, readonly string[]>> = {
  'radverleih/entscheidung.dgr': ['G400 b', 'G400', 'G400 b', 'G400 b', 'G400 b', 'G400 b', 'G400 b'],
  'radverleih/komponenten-columns.dgr': ['G400'],
  'radverleih/komponenten-paper.dgr': ['G400', 'G400', 'G400'],
  'radverleih/komponenten.dgr': ['G400', 'G400', 'G400', 'G400'],
  'radverleih/kontext-paper.dgr': ['G400'],
  'radverleih/radverleih.dgr': [
    'G400',
    'G400 soll',
    'G400 soll',
    'G400 soll',
    'G400 soll',
    'G400 a',
    'G400 a',
    'G400 soll',
    'G400 a',
    'G400 a',
    'G400 a',
  ],
};

/** The SHA-256 of the pictures `soll` and `a` of `radverleih.dgr` drawn without `diff`, plain and in `look=cards`. */
const REPLACED = {
  soll: [
    '7783c0fee509ea80c75a6be503cb7d72e16597c233f7f2f02e48b4269eb5017b',
    '75f5f5200a1aaf1bd6f730961a452a1c76d2ba5f70808311fedb665a0dd5dc28',
  ],
  a: [
    'a447728c20c5ce754c733e982fbd651fcdafe7feab722361d0b65ba8466bee0b',
    '20fe6f81d6cd06efc78222654a3972ca0a7eaa982ec3090103034ff13c869941',
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

  it('radverleih.dgr draws soll and a without diff in the reviewed bytes', () => {
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
    const hashes = hashLines(exampleNames.filter((name) => !ownLook(name)).flatMap((name) => picturesOf(name)));
    expect(compareGolden(golden('examples.sha256'), hashes)).toEqual({ status: 'match' });
  });

  it.each(OWN_LOOKS)('render the reviewed pictures in look=%s, which has no predecessor', (look) => {
    const hashes = exampleNames.filter(inLook(look)).map((name) => `${sha256(svgOf(source(name)))}  ${name}\n`);
    expect(hashes).toHaveLength(3);
    expect(compareGolden(golden(`${look}.sha256`), hashes.join(''))).toEqual({ status: 'match' });
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
      'Radverleih im Systemkontext. Context diagram (C4 L1) with 6 elements in 0 groups.',
    );
  });
});
