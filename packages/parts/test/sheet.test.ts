import { type Font, textWidth } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type Decision, fit, joinedSights, kickerShapes, MARGIN, noteGeometry, sheetOf, wrap } from '../src/index.js';

const FONT: Font = { size: 10 };
const SPAN = { line: 1, column: 1, length: 1 };
const DECISION: Decision = { id: 'E1', question: 'Who runs it?', choice: 'Team A', open: 'Board', span: SPAN };
const open = (who: string) => `(open, ${who})`;
const BASE = { top: 100, right: 500, bottom: 400, width: 600, margin: 48, open, font: FONT } as const;

describe('text', () => {
  it('wraps words greedily to the width, and lets a word wider than that stand alone', () => {
    const lines = wrap('one two three fourfourfourfour five', textWidth('one two three', FONT), FONT);
    expect(lines).toEqual(['one two three', 'fourfourfourfour', 'five']);
  });

  it('cuts a text that does not fit and ends it with an ellipsis, and leaves one that fits', () => {
    const width = textWidth('Kafka…', FONT);
    expect(fit('Kafka Streams', width, FONT)).toBe('Kafka…');
    expect(fit('Kafka', width, FONT)).toBe('Kafka');
    expect(fit('Kafka Streams', 0, FONT)).toBe('K…');
  });
});

describe('sheet', () => {
  it('sets decisions as notes right of the content and widens the picture by the column', () => {
    const sheet = sheetOf({ ...BASE, decisions: [DECISION], sentences: [] });
    expect(sheet.rules).toEqual([{ x1: 548, y1: 100, x2: 764, y2: 100 }]);
    expect(sheet.texts.map((t) => [t.role, t.x, t.y, t.text])).toEqual([
      ['marginId', 548, 118, 'E1'],
      ['marginText', 572, 118, 'Who runs it?'],
      ['marginChoice', 572, 133, 'Team A'],
      ['marginText', 572, 148, '(open, Board)'],
    ]);
    expect(sheet.width).toBe(764 + MARGIN);
    expect(sheet.height).toBe(400 + 48 + 32);
  });

  it('wraps the legend sentences below the content and the notes, under a hairline over the full width', () => {
    const sentences = ['Dashed: an event.', 'Solid: a call.'];
    const narrow = sheetOf({
      ...BASE,
      width: 2 * MARGIN + textWidth('Dashed: an event.', FONT),
      decisions: [],
      sentences,
    });
    expect(narrow.rules).toEqual([{ x1: MARGIN, y1: 440, x2: narrow.width - MARGIN, y2: 440 }]);
    expect(narrow.texts.map((t) => [t.role, t.y, t.text])).toEqual([
      ['legendText', 460, 'Dashed: an event.'],
      ['legendText', 476, 'Solid: a call.'],
    ]);
    expect(narrow.height).toBe(476 + 32);
    const below = sheetOf({ ...BASE, bottom: 110, decisions: [DECISION], sentences });
    expect(below.rules[1]?.y1).toBe(148 + 28 + 40);
  });

  it('joins the meanings of one sight in their order and says each once', () => {
    const pairs = [
      ['Dashed', 'event'],
      ['Solid', 'call'],
      ['Dashed', 'dependency'],
      ['Dashed', 'event'],
    ] as const;
    expect(joinedSights(pairs)).toEqual(['Dashed: event / dependency', 'Solid: call']);
  });

  it('writes the kicker header, leaving out an empty kicker and a missing subtitle', () => {
    const texts = (shapes: ReturnType<typeof kickerShapes>) => shapes.map((s) => s.kind === 'text' && [s.role, s.y]);
    expect(texts(kickerShapes({ kicker: 'CONTEXT', title: 'Shop', subtitle: 'Today' }))).toEqual([
      ['kicker', 30],
      ['title', 50],
      ['subtitle', 67],
    ]);
    expect(texts(kickerShapes({ kicker: '', title: 'Shop' }))).toEqual([['title', 50]]);
  });
});

describe('notes', () => {
  const target = { x: 100, y: 200, w: 160, h: 60 };

  it('stand above their target with the tip down to its top edge, or below it with the tip up', () => {
    const above = noteGeometry(target, 'new', FONT);
    expect(above.rect).toEqual({ x: 232, y: 152, w: textWidth('new', FONT) + 20, h: 26 });
    expect(above.tail).toEqual([
      [239, 178],
      [218, 200],
      [253, 178],
    ]);
    expect(above.at).toEqual({ x: 242, y: 169 });
    const below = noteGeometry(target, 'new', FONT, { below: true });
    expect([below.rect.y, below.tail[0]?.[1], below.tail[1]?.[1]]).toEqual([282, 282, 260]);
  });

  it('stand clear of what sticks out of the top edge, while the tip still reaches the edge', () => {
    const lifted = noteGeometry(target, 'new', FONT, { clear: 22 });
    expect(lifted.rect.y).toBe(152 - 22);
    expect(lifted.tail[1]).toEqual([218, 200]);
  });
});
