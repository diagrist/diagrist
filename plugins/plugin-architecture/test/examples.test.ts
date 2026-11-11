import { createHash } from 'node:crypto';
import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, golden, plugins, source } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const svgOf = (text: string) => compile(text, { plugins }).svg ?? '';
/** The examples drawn in a look without predecessor, which keep their own hashes. */
const OWN_LOOKS = ['paper', 'columns', 'lowfi'] as const;
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

describe('C4 examples', () => {
  it.each(exampleNames)('%s renders without errors, twice to the same bytes', (name) => {
    const first = compileExample(name);
    expect(first.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const placement = first.diagnostics.filter((d) => d.code.startsWith('G'));
    expect(placement.map((d) => [d.code, d.picture].filter(Boolean).join(' '))).toEqual([]);
    expect(first.pictures.every((p) => p.svg !== undefined)).toBe(true);
    expect(compileExample(name).pictures).toEqual(first.pictures);
  });

  it('radverleih.dgr draws soll and a without diff in the reviewed bytes, plain and in look=cards', () => {
    const plain = source('radverleih/radverleih.dgr').replace(/^(variant .*) diff$/gm, '$1');
    const cards = plain.replace(/^(diagram .*)$/m, '$1 look=cards');
    const lines = [plain, cards].flatMap((text, i) =>
      compileExample('radverleih/radverleih.dgr', text)
        .pictures.filter((p) => p.variant !== undefined)
        .map((p) => `${sha256(p.svg ?? '')}  radverleih/radverleih.dgr#${p.variant}${i === 1 ? ' look=cards' : ''}\n`),
    );
    expect(compareGolden(golden('replaced.sha256'), lines.join(''))).toEqual({ status: 'match' });
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

  it('render the reviewed bytes in look=cards too', () => {
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
