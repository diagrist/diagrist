import { describe, expect, it } from 'vitest';
import { formatDiagnostic, read } from '../src/index.js';

describe('formatDiagnostic', () => {
  const [found] = read('"no keyword"').diagnostics;

  it('phrases a diagnostic in English by default and in German on request', () => {
    expect(found && formatDiagnostic(found)).toBe('A line starts with a keyword, not with text "no keyword".');
    expect(found && formatDiagnostic(found, 'de')).toBe(
      'Eine Zeile beginnt mit einem Schlüsselwort, nicht mit text "no keyword".',
    );
  });
});
