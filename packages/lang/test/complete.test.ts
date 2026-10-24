import { describe, expect, it } from 'vitest';
import { arg, attr, complete, id, type KindSpec, kind, ref, statement } from '../src/index.js';
import { sequence, structure } from './fixtures/kinds.js';

/** Completes at the `|` in the lines, which is removed from the source. */
function at(spec: KindSpec, ...lines: string[]) {
  const line = lines.findIndex((text) => text.includes('|'));
  const column = (lines[line] ?? '').indexOf('|') + 1;
  const source = lines.map((text) => text.replace('|', '')).join('\n');
  return complete(source, { line: line + 1, column }, spec);
}
const labels = (completion: ReturnType<typeof at>) => completion.items.map((item) => item.label);

const login = ['diagram sequence "Login"', 'participant client "Browser"', 'participant api "API"'];

describe('complete', () => {
  it('starts a diagram with `diagram`, then the name of the kind', () => {
    expect(labels(at(sequence, '|'))).toEqual(['diagram']);
    expect(labels(at(sequence, 'diagram |'))).toEqual(['sequence']);
  });

  it('offers the header attributes after the title and their values after `=`', () => {
    expect(labels(at(sequence, 'diagram sequence "Login" |'))).toEqual(['numbering=']);
    const value = at(sequence, 'diagram sequence "Login" numbering=o|');
    expect(labels(value)).toEqual(['on', 'off']);
    expect(value.span).toEqual({ line: 1, column: 36, length: 1 });
  });

  it('offers the top-level keywords at the top level, not those of a block', () => {
    expect(labels(at(sequence, ...login, '|'))).toEqual(['participant', 'msg', 'alt']);
  });

  it('offers the children of the enclosing block, found by indentation', () => {
    expect(labels(at(sequence, ...login, 'alt "valid"', '  |'))).toEqual(['msg', 'else']);
    expect(labels(at(sequence, ...login, 'alt "valid"', '  msg client -> api', '  e|'))).toEqual(['else']);
    expect(labels(at(sequence, ...login, 'alt "valid"', '  msg client -> api', '|'))).toContain('participant');
  });

  it('keeps only what starts with the typed word and replaces exactly that word', () => {
    const completion = at(sequence, ...login, 'pa|');
    expect(labels(completion)).toEqual(['participant']);
    expect(completion.span).toEqual({ line: 4, column: 1, length: 2 });
  });

  it('offers the declared ids where an argument refers to them, also ids declared further down', () => {
    expect(
      labels(at(sequence, 'diagram sequence "Login"', 'participant client "Browser"', 'msg |', 'participant db')),
    ).toEqual(['client', 'db']);
    expect(at(sequence, ...login, 'msg c|').items).toEqual([
      { label: 'client', kind: 'id', doc: 'Declared by `participant` in line 2.' },
    ]);
  });

  it('offers the allowed operators as the next argument', () => {
    expect(labels(at(sequence, ...login, 'msg client -|'))).toEqual(['->', '-->']);
  });

  it('offers flags and attributes once only optional arguments are left, each until it is used', () => {
    expect(labels(at(sequence, ...login, 'participant db |'))).toEqual(['external', 'stereotype=']);
    expect(labels(at(sequence, ...login, 'participant db "DB" external stereotype="x" |'))).toEqual([]);
  });

  it('offers nothing but the next required argument before it is given', () => {
    expect(labels(at(structure, 'diagram structure "Shop"', 'node api |'))).toEqual([]);
  });

  it('offers clause keywords and, after one, the ids its value refers to', () => {
    const shop = ['diagram structure "Shop"', 'group backend "Backend"'];
    expect(labels(at(structure, ...shop, 'node api "API" |'))).toEqual(['in', 'tone=']);
    expect(labels(at(structure, ...shop, 'node api "API" in |'))).toEqual(['backend']);
    expect(labels(at(structure, ...shop, 'node api "API" in backend |'))).toEqual(['tone=']);
  });

  it('offers what a line form starts with inside a block that has one', () => {
    const shop = ['diagram structure "Shop"', 'node client "Client"', 'node api "API"', 'flow checkout "Checkout"'];
    expect(labels(at(structure, ...shop, '  |'))).toEqual(['client', 'api']);
    expect(labels(at(structure, ...shop, '  client |'))).toEqual(['->', '~>']);
  });

  it('offers ids declared by attributes, such as a message named with `id=`', () => {
    const steps = kind('steps', {
      doc: 'Steps.',
      statements: [
        statement('step', { doc: 'A step.', examples: ['step id=a'], attributes: { id: attr(id(), 'Name.') } }),
        statement('after', { doc: 'Order.', examples: ['after a'], arguments: [arg('step', ref('step'), 'Step.')] }),
      ],
    });
    expect(labels(at(steps, 'diagram steps "S"', 'step id=first', 'step', 'after |'))).toEqual(['first']);
  });

  it('offers nothing inside a text or a comment', () => {
    expect(labels(at(sequence, ...login, 'msg client -> api "GET |'))).toEqual([]);
    expect(labels(at(sequence, ...login, '# msg |'))).toEqual([]);
  });
});
