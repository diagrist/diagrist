import { arg, type Infer, type KindReading, kind, statement, text, word } from '@diagrist/lang';
import { describe, expectTypeOf, it } from 'vitest';
import type { defineKind, Kind } from '../src/index.js';

const line = statement('line', { doc: 'A line.', examples: ['line "a"'], arguments: [arg('text', text(), 'Text.')] });
const tag = statement('tag', { doc: 'A tag.', examples: ['tag a'], arguments: [arg('name', word(), 'Name.')] });
const lines = kind('lines', { doc: 'Lines.', statements: [line] });

type LineTables = typeof lines.statements;
type ModelOf<S extends LineTables> = Parameters<typeof defineKind<number, S>>[0]['model'];

describe('a kind', () => {
  it('reads its model from the statements of its own tables, and only from those', () => {
    expectTypeOf<(reading: KindReading<Infer<typeof line>>) => number>().toExtend<ModelOf<LineTables>>();
    expectTypeOf<(reading: KindReading<Infer<typeof tag>>) => number>().not.toExtend<ModelOf<LineTables>>();
    expectTypeOf<
      Parameters<Kind<number, LineTables>['model']>[0]['statements'][number]['text']
    >().toEqualTypeOf<string>();
  });
});
