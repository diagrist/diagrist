import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { codes, diagram, plugins, source } from './compile.js';

/** The `y` of the first text that says `text`, or NaN. */
const yOf = (svg: string, text: string): number =>
  Number(new RegExp(`<text x="[\\d.]+" y="([\\d.]+)"[^>]*>${text}</text>`).exec(svg)?.[1] ?? Number.NaN);
/** The height of the first rectangle in the group of node `id`, or NaN. */
const heightOf = (svg: string, id: string): number =>
  Number(new RegExp(`id="node-${id}"><rect [^>]*height="([\\d.]+)"`).exec(svg)?.[1] ?? Number.NaN);

const TASKS = 'component tasks "billing_tasks" tech="stays due" at a/main';

describe('status of an element', () => {
  it.each([
    ['optional', 'shape-planned'],
    ['existing', 'shape-existing'],
    ['new', 'shape'],
  ])('`%s` is drawn as the body `%s` and named as a word in the standard look', (status, body) => {
    const svg = diagram('component', `${TASKS} status=${status}`).svg ?? '';
    expect(svg).toContain(`class="${body}"/>`);
    expect(svg).toContain(`class="label-status">${status}</text>`);
  });

  it('is told by the fill alone in look=lowfi, which the sentence legend explains', () => {
    const result = diagram(
      'component look=lowfi locale=de',
      `${TASKS} status=existing`,
      'component run "run-due" status=optional at b/main',
      'edge run --> tasks "legt an"',
    );
    const svg = result.svg ?? '';
    expect(svg).not.toContain('class="label-status"');
    expect(svg).toMatch(/\.shape-existing \{ fill: #e8e8e8;/);
    expect(svg).toContain('Gestrichelt: Abhängigkeit / optional. Grau: besteht.');
  });

  it('is a dot in look=paper, in a colour of its own', () => {
    const svg = diagram('component look=paper', `${TASKS} status=optional`).svg ?? '';
    expect(svg).toContain('class="dot-optional"');
    expect(svg).toContain('Grey dot: optional.');
  });
});

describe('indented lines of an element', () => {
  const lines = [TASKS, '  "due from, attempts"', '  "last error, done"'];

  it('stand between name and tech, a line each, and grow the box by a line each', () => {
    const svg = diagram('component layout=adaptive', ...lines).svg ?? '';
    const plain = diagram('component layout=adaptive', TASKS).svg ?? '';
    const name = yOf(svg, 'billing_tasks');
    const first = yOf(svg, 'due from, attempts');
    const second = yOf(svg, 'last error, done');
    expect(name).toBeLessThan(first);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(yOf(svg, 'stays due'));
    expect(heightOf(svg, 'tasks') - heightOf(plain, 'tasks')).toBe(2 * 14);
    expect(svg).toContain('class="label-entry">due from, attempts</text>');
  });

  it('keep inside their box in every look, in a fixed grid too, and join the description', () => {
    for (const look of ['plain', 'cards', 'blocks', 'paper', 'columns', 'lowfi']) {
      const result = diagram(`component look=${look}`, ...lines);
      expect(codes(result), look).toEqual([]);
      expect(result.svg, look).toContain('>last error, done</text>');
    }
    const text = diagram('component', ...lines).description ?? '';
    expect(text).toContain('billing_tasks: due from, attempts last error, done');
  });

  it('are allowed under elements only', () => {
    expect(codes(diagram('component', 'grid cols a', '  "a line"'))).not.toEqual([]);
  });
});

describe('notes', () => {
  it('take a tone for their frame and text', () => {
    const svg = diagram('component', TASKS, 'note "overdue" on tasks tone=red').svg ?? '';
    expect(svg).toContain('class="note-box-red"');
    expect(svg).toContain('class="note-text-red">overdue</text>');
    expect(svg).toMatch(/\.note-text-red \{ fill: #c62a2f;/);
  });

  it('without `on` are remarks below the picture, above the legend, and checked clean', () => {
    const result = diagram(
      'component',
      TASKS,
      'component run "run" at b/main',
      'edge tasks -> run "calls"',
      'note "overdue tasks are reported" tone=red',
    );
    const svg = result.svg ?? '';
    expect(codes(result)).toEqual([]);
    const remark = yOf(svg, 'overdue tasks are reported');
    expect(remark).toBeGreaterThan(yOf(svg, 'stays due') + 30);
    expect(remark).toBeLessThan(yOf(svg, 'synchronous call'));
    expect(result.description).toContain('Note: overdue tasks are reported.');
  });

  it('without `on` are written in a sheet look too', () => {
    const svg = diagram('component look=lowfi', TASKS, 'note "a remark"').svg ?? '';
    expect(svg).toContain('class="label-note">a remark</text>');
  });
});

describe('look=lowfi', () => {
  it('writes the title without the name of the kind, unless `label=` gives one', () => {
    const bare = diagram('component look=lowfi', TASKS).svg ?? '';
    const named = diagram('component look=lowfi label="Planner"', TASKS).svg ?? '';
    expect(bare).toContain('class="label-title">Test</text>');
    expect(bare).not.toContain('C4 L3');
    expect(named).toContain('class="label-title">Planner · Test</text>');
  });

  it('draws the planner of the example compact, its long edge text on one line', () => {
    const svg = compile(source('architecture/planer.dgr'), { plugins }).svg ?? '';
    const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
    expect(Number(width)).toBeLessThan(960);
    expect(Number(height)).toBeLessThan(480);
    expect(svg).toContain('>Fehler im Ablauf: RetryPolicy plant die nächste Aufgabe, keine mehr: Alarm</text>');
    expect(svg).toContain('text-anchor="middle" class="label-bold">billing_tasks</text>');
  });
});
