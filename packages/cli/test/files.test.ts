import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { listingPlugin } from './support/listing-plugin.js';
import { call, callJson } from './support/memory-io.js';

const engine = coreEngine([listingPlugin]);
const SOURCE = 'docs/code.dgr';
const JAVA = 'class Order {\n    int total() {\n        return  sum;\n    }\n}\n';
const diagram = (src: string) => `diagram listing "Code"\nexcerpt order src="${src}"\n`;
const files = { [SOURCE]: diagram('../src/Order.java'), 'src/Order.java': JAVA };

describe('a diagram that shows a file through a file() value', () => {
  it('reads the file relative to the diagram and draws its lines as runs, spaces kept where they matter', async () => {
    const result = await call(['build', SOURCE], { files, engine });
    expect(result).toMatchObject({ exitCode: 0, stdout: 'wrote docs/code.svg\n' });
    const svg = String(result.files.get('docs/code.svg'));
    expect(svg).toContain('<text x="0" y="14" class="code"><tspan class="keyword">class</tspan> Order {</text>');
    expect(svg).toContain(
      '<text x="0" y="42" xml:space="preserve" class="code">        <tspan class="keyword">return</tspan>  sum;</text>',
    );
    expect(svg).toContain('.dia .keyword { fill: #a00; }');
  });

  it('refuses when the file cannot be read (C018), naming the line, as for a used file', async () => {
    const missing = await call(['build', SOURCE], { files: { [SOURCE]: files[SOURCE] }, engine });
    expect(missing).toMatchObject({ exitCode: 2 });
    expect(missing.stderr).toBe('Cannot read `src/Order.java`, named in line 2 of `docs/code.dgr`: no such file.\n');
    const large = await call(['check', SOURCE], {
      files: { ...files, 'src/Order.java': `${JAVA}${'/'.repeat(1024 * 1024)}\n` },
      engine,
    });
    expect(large.stderr).toContain('it is larger than 1 MB');
  });

  it('reports a path out of the folder or to a hidden file (L119) and reads nothing', async () => {
    const outside = await callJson(['check', SOURCE], { files: { [SOURCE]: diagram('../../Order.java') }, engine });
    expect(outside).toMatchObject({ exitCode: 1, json: { diagnostics: [{ code: 'L119', span: { line: 2 } }] } });
    const hidden = await callJson(['check', SOURCE], {
      files: { [SOURCE]: diagram('../.env'), '.env': 'KEY=1' },
      engine,
    });
    expect(hidden).toMatchObject({ exitCode: 1, json: { diagnostics: [{ code: 'L119' }] } });
  });

  it('watches the file too', async () => {
    const result = await call(['build', SOURCE, '--watch'], { files, engine, changes: [{}] });
    expect(result.watcher.watched).toEqual([SOURCE, 'src/Order.java']);
  });
});
