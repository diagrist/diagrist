import { readFileSync } from 'node:fs';
import { type Shape, type Styles, toSvg } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { CODE_PALETTE, CODE_ROLES, codeRules, highlight, outline, sceneRole, TOKEN_ROLES } from '../src/index.js';

const JAVA = readFileSync(new URL('fixtures/TransferService.java', import.meta.url), 'utf8');

const styles: Styles = {
  root: 'dia',
  fontFamily: 'monospace',
  fontSize: 11,
  canvas: '#fff',
  markerSize: 12,
  markers: [],
  roles: { ...CODE_ROLES, code: { classes: ['code'] } },
  rules: [{ name: 'code', declarations: 'fill: #222;' }, ...codeRules(CODE_PALETTE)],
  fonts: { code: { size: 11 } },
};

describe('the style table of code', () => {
  it('has a role and a rule for every role a run carries, folds included', () => {
    const lines = [...highlight({ path: 'A.java', text: JAVA }), ...outline(highlight({ path: 'A.java', text: JAVA }))];
    const used = new Set(lines.flatMap((line) => line.runs.flatMap((run) => (run.role ? [run.role] : []))));
    const ruled = new Set(styles.rules.map((rule) => rule.name));
    expect([...used].filter((role) => !(role in CODE_ROLES))).toEqual([]);
    expect(Object.values(CODE_ROLES).flatMap((role) => role.classes.filter((name) => !ruled.has(name)))).toEqual([]);
    expect(Object.keys(CODE_ROLES)).toEqual([...TOKEN_ROLES.map(sceneRole), 'codeFold']);
  });

  it('paints runs in the palette it is given, through the classes a theme can replace', () => {
    const [line] = highlight({ path: 'A.java', text: 'public class A {}' });
    const text: Shape = {
      kind: 'text',
      x: 0,
      y: 12,
      text: line?.text ?? '',
      runs: line?.runs ?? [],
      role: 'code',
      font: 'code',
    };
    const svg = toSvg({ width: 200, height: 20, title: 'A', children: [text] }, styles);
    expect(svg).toContain('<tspan class="code-keyword">public class </tspan>');
    expect(svg).toContain(`.code-keyword { fill: ${CODE_PALETTE.keyword}; }`);
    const ink = codeRules({ ...CODE_PALETTE, comment: '#555' }).find((rule) => rule.name === 'code-comment');
    expect(ink?.declarations).toBe('fill: #555; font-style: italic;');
  });
});
