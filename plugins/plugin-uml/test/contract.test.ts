import { describe, expect, it } from 'vitest';
import { activity, classDiagram, sequence, stateDiagram, usecase } from './compile.js';

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

/** The same contract for use case diagrams, where labels of a line have a group of their own. */
describe('use case SVG contract', () => {
  const result = usecase(
    'actor u "User"',
    'subject s "System"',
    'usecase a "Order" in s',
    'usecase b "Pay" in s',
    'rel u -- a',
    'rel a --> b include',
  );
  const svg = result.svg ?? '';

  it('puts actors and use cases into node-<id>, subjects into group-<id>, lines into edge-<k>', () => {
    expect(svg).toContain('<g id="node-u">');
    expect(svg).toContain('<g id="node-a">');
    expect(svg).toContain('<g id="group-s">');
    expect(svg).toMatch(
      /<g id="edge-1"><path d="M[^"]+" class="line halo"\/><path d="M[^"]+" class="line dashed" marker-end="url\(#m-open\)"\/>/,
    );
  });

  it('names the label group of a line in its anchor', () => {
    const edges = result.anchors?.edges ?? [];
    expect(edges.map((e) => [e.domId, e.from, e.to, e.labelId])).toEqual([
      ['edge-0', 'u', 'a', undefined],
      ['edge-1', 'a', 'b', 'label-1'],
    ]);
    expect(svg).toMatch(/<g id="label-1"><text [^>]+>«include»<\/text><\/g>/);
  });
});

/** The same contract for activity diagrams: lanes and regions are groups, a guard is the label of its edge. */
describe('activity SVG contract', () => {
  const result = activity(
    'partition l "Lane"',
    'initial s in l',
    'decision d in l',
    'action a "A" in l',
    'final e in l',
    'go s -> d',
    'go d -> a "yes"',
    'go d -> e else',
    'go a -> e',
  );
  const svg = result.svg ?? '';

  it('puts nodes into node-<id>, lanes into group-<id>, edges into edge-<k> with an open arrowhead', () => {
    expect(svg).toContain('<g id="node-d">');
    expect(svg).toContain('<g id="group-l">');
    expect(svg).toMatch(/<g id="edge-1"><path d="M[^"]+" class="line" marker-end="url\(#m-open\)"\/><\/g>/);
  });

  it('names the label group of a guarded edge in its anchor', () => {
    const edges = result.anchors?.edges ?? [];
    expect(edges.map((e) => [e.domId, e.from, e.to, e.labelId])).toEqual([
      ['edge-0', 's', 'd', undefined],
      ['edge-1', 'd', 'a', 'label-1'],
      ['edge-2', 'd', 'e', 'label-2'],
      ['edge-3', 'a', 'e', undefined],
    ]);
    expect(svg).toMatch(/<g id="label-1"><text [^>]+>\[yes\]<\/text><\/g>/);
  });
});

/** The same contract for class diagrams: packages are groups, a named relation has a label group. */
describe('class SVG contract', () => {
  const result = classDiagram(
    'package p "P"',
    'class a "A" in p',
    'class b "B"',
    'interface i "I"',
    'rel a --> b "uses"',
    'rel a --|> i',
  );
  const svg = result.svg ?? '';

  it('puts classifiers into node-<id>, packages into group-<id>, relations into edge-<k>', () => {
    expect(svg).toContain('<g id="node-a">');
    expect(svg).toContain('<g id="group-p">');
    expect(svg).toMatch(/<g id="edge-0"><path d="M[^"]+" class="line halo"\/>/);
    expect(svg).toMatch(/<g id="label-0"><text [^>]+>uses<\/text><\/g>/);
  });

  it('anchors classifiers, packages and relations with the label group of a named one', () => {
    expect(result.anchors?.nodes.map((n) => n.domId)).toEqual(['node-a', 'node-b', 'node-i']);
    expect(result.anchors?.groups.map((g) => g.domId)).toEqual(['group-p']);
    expect(result.anchors?.edges.map((e) => [e.domId, e.from, e.to, e.labelId])).toEqual([
      ['edge-0', 'a', 'b', 'label-0'],
      ['edge-1', 'a', 'i', undefined],
    ]);
  });
});

/** The same contract for state machine diagrams: a composite state is a group around its substates. */
describe('state SVG contract', () => {
  const result = stateDiagram(
    'initial s',
    'state c "C"',
    'state x "X" in c',
    'initial t in c',
    'final e',
    'go s -> c',
    'go t -> x',
    'go c -> e on="done"',
  );
  const svg = result.svg ?? '';

  it('puts vertices into node-<id>, composite states into group-<id>, transitions into edge-<k>', () => {
    expect(result.diagnostics).toEqual([]);
    expect(svg).toContain('<g id="node-s">');
    expect(svg).toContain('<g id="group-c">');
    expect(svg).toMatch(/<g id="edge-0"><path d="M[^"]+" class="line halo"\/>/);
  });

  it('anchors vertices, composite states and transitions with the label group of a triggered one', () => {
    expect(result.anchors?.nodes.map((n) => n.domId)).toEqual(['node-s', 'node-t', 'node-x', 'node-e']);
    expect(result.anchors?.groups.map((g) => g.domId)).toEqual(['group-c']);
    expect(result.anchors?.edges.map((e) => [e.domId, e.from, e.to, e.labelId])).toEqual([
      ['edge-0', 's', 'c', undefined],
      ['edge-1', 't', 'x', undefined],
      ['edge-2', 'c', 'e', 'label-2'],
    ]);
  });
});
