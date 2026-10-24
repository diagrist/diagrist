import { type Shape, standardStyles, toSvg } from '@diagrist/core';
import { checkKind, kind, read, readKind } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import {
  adr,
  type Decision,
  decisionOf,
  decisionStrip,
  HEADER,
  headerShapes,
  imageTitle,
  PART_ROLES,
  stripShapes,
  stripWidth,
  WORDS,
} from '../src/index.js';

const spec = kind('decisions', { doc: 'Only decisions.', header: {}, statements: [adr] });

function decisions(...lines: string[]): Decision[] {
  const reading = readKind(spec, read(['diagram decisions "D"', ...lines].join('\n')).document);
  expect(reading.diagnostics).toEqual([]);
  return reading.statements.map(decisionOf);
}

const svgOf = (children: Shape[]): string =>
  toSvg({ width: 600, height: 300, title: 'T', children }, standardStyles({ roles: PART_ROLES, rules: [] }));

describe('adr', () => {
  it('is a complete table that any kind can list among its statements', () => {
    expect(checkKind(spec)).toEqual([]);
  });

  it('reads question, choice, consequence and who still decides, leaving out what is not written', () => {
    const [closed, open] = decisions('adr E1 "Who?" = "Team A" => "Owns it"', 'adr E2 "When?" = "Q3" open="Board"');
    expect(closed).toEqual({
      id: 'E1',
      question: 'Who?',
      choice: 'Team A',
      consequence: 'Owns it',
      span: closed?.span,
    });
    expect(open).toEqual({ id: 'E2', question: 'When?', choice: 'Q3', open: 'Board', span: open?.span });
  });
});

describe('decision bar', () => {
  const [closed, open] = decisions('adr E1 "Who?" = "Team A" => "Owns it"', 'adr E2 "When?" = "Q3" open="Board"');
  const both = [closed, open] as Decision[];

  it('draws an open decision dashed, with who decides in the words of the locale', () => {
    const svg = svgOf(stripShapes(decisionStrip(both, 100, 600), WORDS.de));
    expect(svg).toContain('>Entscheidungen (Marken im Bild)</text>');
    expect(svg).toContain('<rect x="32" y="148" width="260" height="78" rx="8" class="shape"/>');
    expect(svg).toContain('<rect x="308" y="148" width="260" height="78" rx="8" class="frame"/>');
    expect(svg).toContain('>E2  When? (offen, Board)</text>');
  });

  it('is as wide as its longest texts need, so the picture can grow to fit it', () => {
    const long = decisions('adr E1 "Which store holds the orders of every tenant?" = "Postgres"');
    expect(stripWidth(long, WORDS.en.open)).toBe(
      2 * 32 + 2 * 12 + 6 * 'E1  Which store holds the orders of every tenant?'.length,
    );
    expect(stripWidth([], WORDS.en.open)).toBe(0);
  });

  it('adds nothing to a picture without decisions', () => {
    const strip = decisionStrip([], 100, 600);
    expect(stripShapes(strip, WORDS.en)).toEqual([]);
    expect(strip.bottom).toBe(strip.y);
  });

  it('is described in a sentence per decision in every locale', () => {
    expect(WORDS.en.decision(open as Decision)).toBe('E2 When? Chosen: Q3. Open: Board.');
    expect(WORDS.de.decision(closed as Decision)).toBe('E1 Who? Gewählt: Team A. Owns it');
  });
});

describe('title header', () => {
  it('writes the title line with the kind, and the subtitle only when there is one', () => {
    const title = imageTitle('Context diagram (C4)', 'Radverleih');
    expect(svgOf(headerShapes(HEADER, title, undefined))).toContain(
      '<text x="32" y="36" class="label-title">Context diagram (C4) · Radverleih</text>\n</svg>',
    );
    expect(svgOf(headerShapes(HEADER, title, 'v2'))).toContain('<text x="32" y="52" class="label-note">v2</text>');
  });
});
