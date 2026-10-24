import { createHash } from 'node:crypto';
import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { exampleNames, golden, plugins, source } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const svgOf = (text: string) => compile(text, { plugins }).svg ?? '';
const paper = (name: string) => source(name).includes('look=paper');
const panel = (name: string) => source(name).includes('look=panel');

/** Warnings of the kernel's placement check on the predecessor's layouts: labels reaching into other frames. */
const PLACEMENT: Readonly<Record<string, readonly string[]>> = {
  'radverleih/komponenten.dgr': ['G400'],
  'radverleih/soll.dgr': ['G400', 'G400', 'G402', 'G400'],
  'radverleih/variante-a.dgr': ['G400', 'G400', 'G400'],
};

describe('C4 examples', () => {
  it.each(exampleNames)('%s renders without errors, twice to the same bytes', (name) => {
    const first = compile(source(name), { plugins });
    expect(first.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(first.diagnostics.filter((d) => d.code.startsWith('G')).map((d) => d.code)).toEqual(PLACEMENT[name] ?? []);
    expect(first.svg).toBeDefined();
    expect(compile(source(name), { plugins }).svg).toBe(first.svg);
  });

  it.each(['kontext', 'komponenten', 'cloud'])('%s renders the reviewed picture', (name) => {
    const file = exampleNames.find((f) => f.endsWith(`/${name}.dgr`)) ?? '';
    expect(compareGolden(golden(`${name}.svg`), svgOf(source(file)))).toEqual({ status: 'match' });
  });

  it('all render the bytes of the predecessor, checked by a SHA-256 per example', () => {
    const hashes = exampleNames
      .filter((name) => !paper(name) && !panel(name))
      .map((name) => `${sha256(svgOf(source(name)))}  ${name}\n`);
    expect(compareGolden(golden('examples.sha256'), hashes.join(''))).toEqual({ status: 'match' });
  });

  it('render the reviewed pictures in look=paper, which has no predecessor', () => {
    const hashes = exampleNames.filter(paper).map((name) => `${sha256(svgOf(source(name)))}  ${name}\n`);
    expect(hashes).toHaveLength(3);
    expect(compareGolden(golden('paper.sha256'), hashes.join(''))).toEqual({ status: 'match' });
  });

  it('render the reviewed pictures in look=panel, which has no predecessor either', () => {
    const hashes = exampleNames.filter(panel).map((name) => `${sha256(svgOf(source(name)))}  ${name}\n`);
    expect(hashes).toHaveLength(3);
    expect(compareGolden(golden('panel.sha256'), hashes.join(''))).toEqual({ status: 'match' });
  });

  it('render the bytes of the predecessor in look=cards too', () => {
    const plain = exampleNames.filter((name) => !source(name).includes('look='));
    const cards = plain.map((name) => {
      const text = source(name).replace(/^(diagram .*)$/m, '$1 look=cards');
      return `${sha256(svgOf(text))}  ${name}\n`;
    });
    expect(compareGolden(golden('cards.sha256'), cards.join(''))).toEqual({ status: 'match' });
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
