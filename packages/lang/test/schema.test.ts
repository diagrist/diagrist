import { validateJson } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { GRAMMAR_SCHEMA, grammarOf } from '../src/index.js';
import { sequence, structure } from './fixtures/kinds.js';

const problems = (value: unknown): string[] => validateJson(GRAMMAR_SCHEMA, value);

describe('GRAMMAR_SCHEMA', () => {
  it('accepts the grammar of kinds with header, references, clauses and line forms', () => {
    expect(problems(grammarOf(sequence))).toEqual([]);
    expect(problems(grammarOf(structure))).toEqual([]);
  });

  it('rejects a field the grammar does not have, so the schema stays closed for tools', () => {
    const grammar = grammarOf(structure);
    const [group, ...rest] = grammar.statements;
    const changed = { ...grammar, statements: [{ ...group, colour: 'red' }, ...rest] };
    expect(problems(changed)).toEqual(['/statements/0/colour: not allowed']);
  });

  it('requires what every statement must have: a doc and at least one example', () => {
    const grammar = grammarOf(structure);
    const [group, ...rest] = grammar.statements;
    const changed = { ...grammar, statements: [{ ...group, doc: '', examples: [] }, ...rest] };
    expect(problems(changed)).toEqual(['/statements/0/doc: too short', '/statements/0/examples: fewer than 1 items']);
  });

  it('describes a reference as a JSON Pointer into the statements', () => {
    const grammar = grammarOf(sequence);
    const alt = grammar.statements[2];
    const broken = { ...alt, children: [{ keyword: 'msg', ref: 'statements/1' }] };
    expect(problems({ ...grammar, statements: [grammar.statements[0], grammar.statements[1], broken] })).toEqual([
      '/statements/2/children/0: matches none of anyOf',
    ]);
  });
});
