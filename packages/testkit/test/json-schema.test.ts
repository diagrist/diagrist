import { describe, expect, it } from 'vitest';
import { validateJson } from '../src/index.js';

const closed = {
  type: 'object',
  properties: { name: { type: 'string', minLength: 2 } },
  required: ['name'],
  additionalProperties: false,
};

describe('validateJson', () => {
  it('accepts a value that matches and names each violation by its JSON Pointer', () => {
    expect(validateJson(closed, { name: 'ok' })).toEqual([]);
    expect(validateJson(closed, { name: 'x', colour: 'red' })).toEqual(['/name: too short', '/colour: not allowed']);
    expect(validateJson({ type: 'array', items: closed }, [{}])).toEqual(['/0: missing name']);
  });

  it('treats names of Object.prototype members as ordinary property names', () => {
    expect(validateJson(closed, { name: 'ok', constructor: 'x' })).toEqual(['/constructor: not allowed']);
    expect(validateJson({ type: 'object', required: ['toString'] }, {})).toEqual(['/: missing toString']);
  });

  it('counts the length of a string in characters, not in UTF-16 code units', () => {
    expect(validateJson({ type: 'string', minLength: 2 }, '😀')).toEqual(['/: too short']);
  });

  it('reads `true` and `false` as schemas that accept or reject everything', () => {
    expect(validateJson({ type: 'array', items: false }, [1])).toEqual(['/0: not allowed']);
    expect(validateJson({ type: 'object', additionalProperties: true }, { any: 1 })).toEqual([]);
  });

  it('refuses a keyword or form it does not check, so a schema cannot rely on a check that never runs', () => {
    expect(() => validateJson({ enum: ['a'] }, 'b')).toThrow('does not support enum');
    expect(() => validateJson({ type: ['string', 'null'] }, 1)).toThrow('does not support type');
  });
});
