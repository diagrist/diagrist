import { describe, expect, it } from 'vitest';
import { sequence } from './compile.js';

/** The SVG and anchor contract that embeddings such as code-animations rely on. */
describe('sequence SVG contract', () => {
  const result = sequence('actor u "User"', 'participant api "API"', 'msg u -> api "GET"', 'msg api --> u "200"');
  const svg = result.svg ?? '';

  it('puts every head into node-<id> and every message into edge-<k>, line first with its arrowhead', () => {
    expect(svg).toContain('<g id="node-u">');
    expect(svg).toContain('<g id="node-api">');
    expect(svg).toMatch(/<g id="edge-0"><path d="M[^"]+" class="line" marker-end="url\(#m-filled\)"\/>/);
    expect(svg).toMatch(/<g id="edge-1"><path d="M[^"]+" class="line dashed" marker-end="url\(#m-open\)"\/>/);
    expect(svg).toMatch(/<defs><marker id="m-open".*<marker id="m-filled-accent"/);
  });

  it('anchors heads and messages where the SVG draws them', () => {
    const anchors = result.anchors;
    expect(anchors?.nodes.map((n) => n.domId)).toEqual(['node-u', 'node-api']);
    expect(anchors?.edges.map((e) => [e.domId, e.from, e.to])).toEqual([
      ['edge-0', 'u', 'api'],
      ['edge-1', 'api', 'u'],
    ]);
    const [x1, y1] = anchors?.edges[0]?.points[0] ?? [];
    expect(svg).toContain(`<g id="edge-0"><path d="M${x1} ${y1} `);
  });
});
