import { defineKind, definePlugin, runsWidth, type Shape, type Styles, type TextRun } from '@diagrist/core';
import { arg, attr, file, id, kind, statement } from '@diagrist/lang';

const excerpt = statement('excerpt', {
  doc: 'The lines of a file, with its keywords set apart.',
  examples: ['excerpt order src="src/Order.java"'],
  arguments: [arg('id', id(), 'Id of the excerpt.')],
  attributes: { src: attr(file(), 'The file whose lines are shown.') },
});

const KEYWORDS = new Set(['class', 'return']);

const styles: Styles = {
  root: 'dia',
  fontFamily: 'monospace',
  fontSize: 11,
  canvas: '#fff',
  markerSize: 12,
  markers: [],
  roles: { code: { classes: ['code'] }, keyword: { classes: ['keyword'] } },
  rules: [
    { name: 'code', declarations: 'fill: #000;' },
    { name: 'keyword', declarations: 'fill: #a00;' },
  ],
  fonts: { code: { size: 11 } },
};

/** One line of code in runs: keywords in their own role, everything between them, spaces included, as written. */
function runsOf(line: string): TextRun[] {
  return line
    .split(/(\b\w+\b)/)
    .filter((part) => part !== '')
    .map((part) => (KEYWORDS.has(part) ? { text: part, role: 'keyword' } : { text: part }));
}

/**
 * A kind for tests only, the smallest user of `file()` and text runs together (ADR 0025): every line of every
 * excerpt's file is a text whose keywords are runs of their own, as wide as `runsWidth` measures them.
 */
const listing = defineKind({
  spec: kind('listing', { doc: 'Files shown line by line.', statements: [excerpt] }),
  model: (reading) => reading.statements.flatMap((s) => (s.attributes.src?.text ?? '').split('\n').filter(Boolean)),
  rules: [],
  layout: (lines) => {
    const font = styles.fonts.code ?? { size: 11 };
    const width = Math.max(0, ...lines.map((text) => runsWidth(runsOf(text).map((run) => ({ ...run, font })))));
    const children = lines.map(
      (text, i): Shape => ({
        kind: 'text',
        x: 0,
        y: 14 * (i + 1),
        text,
        runs: runsOf(text),
        role: 'code',
        font: 'code',
      }),
    );
    return {
      scene: { width, height: 14 * lines.length + 4, title: 'Listing', children },
      styles,
      anchors: { width, height: 0, nodes: [], groups: [], edges: [] },
    };
  },
  describe: (lines) => `${lines.length} lines of code.`,
});

export const listingPlugin = definePlugin({ name: 'listing', kinds: [listing], messages: {} });
