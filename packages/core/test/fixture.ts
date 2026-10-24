import { arg, kind, statement, text } from '@diagrist/lang';
import { definePlugin, type Kind, localeAttribute, type Styles } from '../src/index.js';

const line = statement('line', {
  doc: 'One line of text.',
  examples: ['line "Hello"'],
  arguments: [arg('text', text(), 'What the line says.')],
});

const spec = kind('lines', { doc: 'Lines of text.', header: { locale: localeAttribute }, statements: [line] });

const styles: Styles = {
  root: 'dia',
  fontFamily: 'monospace',
  fontSize: 11,
  canvas: '#fafafa',
  markerSize: 12,
  markers: [{ id: 'open', filled: false, name: 'arrow' }],
  roles: { line: { classes: ['text'] }, rule: { classes: ['stroke', 'thin'], marker: 'open' } },
  rules: [
    { name: 'base', declarations: 'fill: none;', always: true },
    { name: 'text', declarations: 'fill: #000;' },
    { name: 'stroke', declarations: 'stroke: #000;' },
  ],
  fonts: { body: { size: 11 } },
};

/** A kind that writes its lines below each other and warns about empty ones, for testing the kernel alone. */
const lines: Kind<{ readonly texts: readonly { text: string; line: number }[] }, { text: string; line: number }> = {
  spec,
  model: (reading) => ({ texts: reading.statements }),
  rules: [
    {
      code: 'T900',
      severity: 'warning',
      doc: 'Empty lines draw nothing.',
      check: (model) =>
        model.texts.filter((t) => t.text === '').map((t) => ({ span: { line: t.line, column: 1, length: 4 } })),
    },
  ],
  layout: (model, context) => ({
    scene: {
      width: 100,
      height: 20 * model.texts.length,
      title: `${context.locale}: "lines" & <more>`,
      children: model.texts.map((t, i) => ({
        kind: 'text',
        x: 0,
        y: 20 * i + 0.25,
        text: t.text,
        role: 'line',
        font: 'body',
      })),
    },
    styles,
    anchors: { width: 100, height: 0, nodes: [], groups: [], edges: [] },
  }),
  describe: (model) => model.texts.map((t) => t.text).join('\n'),
};

export const linesPlugin = definePlugin({
  name: 'lines',
  kinds: [lines],
  messages: { T900: { en: () => 'The line is empty.', de: () => 'Die Zeile ist leer.' } },
});

export { styles };
