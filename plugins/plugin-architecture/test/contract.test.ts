import { describe, expect, it } from 'vitest';
import { diagram } from './compile.js';

/** The SVG and anchor contract that embeddings such as code-animations rely on. */
describe('C4 SVG contract', () => {
  const result = diagram(
    'container',
    'group g "Backend" own',
    'container api "API" at a/main in g',
    'container db "DB" shape=db at c/main',
    'flow read primary',
    '  api -> db "reads" via=SQL',
  );
  const svg = result.svg ?? '';

  it('puts nodes, frames, edges and labels into groups with stable ids', () => {
    expect(svg).toContain('<g id="node-api">');
    expect(svg).toContain('<g id="group-g">');
    expect(svg).toMatch(/<g id="edge-0"><path d="M[^"]+" class="line" marker-end="url\(#m-filled\)"\/>/);
    expect(svg).toContain('<g id="label-0">');
  });

  it('anchors them where the SVG draws them', () => {
    const anchors = result.anchors;
    expect(anchors?.nodes.map((n) => n.domId)).toEqual(['node-api', 'node-db']);
    expect(anchors?.groups.map((g) => g.domId)).toEqual(['group-g']);
    expect(anchors?.edges.map((e) => [e.domId, e.from, e.to, e.labelId])).toEqual([['edge-0', 'api', 'db', 'label-0']]);
    const [x, y] = anchors?.edges[0]?.points[0] ?? [];
    expect(svg).toContain(`<g id="edge-0"><path d="M${x} ${y} `);
  });

  it('numbers flow steps and names the flow in the legend', () => {
    expect(svg).toContain('class="badge-text">(1)</text>');
    expect(svg).toContain('>Flow read (1) to (1)</text>');
  });
});
