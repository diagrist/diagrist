import { describe, expect, it } from 'vitest';
import { wrapTwo, wrapWithin } from '../src/index.js';

/** Six pixels a character, as a monospaced label font of size 10 measures. */
const mono = (s: string) => 6 * s.length;

describe('wrapWithin', () => {
  it('breaks a guard before its join, keeping each number with its unit', () => {
    expect(wrapWithin('[Auslastung > 30 % und < 70 %]', 160, mono)).toEqual(['[Auslastung > 30 %', 'und < 70 %]']);
  });

  it('breaks before a guard rather than inside it', () => {
    expect(wrapWithin('Abfahrt [Auslastung ≤ 30 %]', 160, mono)).toEqual(['Abfahrt', '[Auslastung ≤ 30 %]']);
  });

  it('starts no line with a closing token and ends none with an operator', () => {
    const lines = wrapWithin('Wert a > 1000 , b <= 20 ) und weiter', 66, mono);
    expect(lines.some((l) => /^[%)\],:]/u.test(l) || /(?:<=|>)$/u.test(l))).toBe(false);
    expect(lines.join(' ')).toBe('Wert a > 1000 , b <= 20 ) und weiter');
  });

  it('wraps prose into the fewest lines and of those the narrowest', () => {
    expect(wrapWithin('liest und schreibt die Bestellungen', 120, mono)).toEqual([
      'liest und schreibt',
      'die Bestellungen',
    ]);
    expect(wrapWithin('', 120, mono)).toEqual([]);
    expect(wrapWithin('Überlang-ohne-Leerzeichen kurz', 60, mono)).toEqual(['Überlang-ohne-Leerzeichen', 'kurz']);
  });
});

describe('wrapTwo', () => {
  it('keeps a number with its unit and breaks near the middle elsewhere', () => {
    expect(wrapTwo('after(10 min)')).toEqual(['after(10 min)']);
    expect(wrapTwo('Fehler behoben, sofort')).toEqual(['Fehler behoben,', 'sofort']);
    expect(wrapTwo('liest die Daten aus')).toEqual(['liest die', 'Daten aus']);
  });

  it('keeps a guard in brackets whole and breaks before it, or inside it before a join', () => {
    expect(wrapTwo('stornieren [noch nicht versandt]')).toEqual(['stornieren', '[noch nicht versandt]']);
    expect(wrapTwo('[Betrag > 100 und Kunde neu]')).toEqual(['[Betrag > 100', 'und Kunde neu]']);
  });
});
