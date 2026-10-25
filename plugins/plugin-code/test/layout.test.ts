import { describe, expect, it } from 'vitest';
import { compileCode, diagram } from './compile.js';

const call = compileCode('ueberweisung/aufruf.dgr');
const svg = call.svg ?? '';
const nodes = call.anchors?.nodes ?? [];

describe('code diagram layout', () => {
  it('stacks the cards one below the other, all as wide as the widest, in source order', () => {
    expect(nodes.map((n) => n.id)).toEqual(['submit', 'publish', 'table']);
    expect(new Set(nodes.map((n) => n.rect.x)).size).toBe(1);
    expect(new Set(nodes.map((n) => n.rect.w)).size).toBe(1);
    const [a, b, c] = nodes.map((n) => n.rect);
    expect((a?.y ?? 0) + (a?.h ?? 0)).toBeLessThan(b?.y ?? 0);
    expect((b?.y ?? 0) + (b?.h ?? 0)).toBeLessThan(c?.y ?? 0);
  });

  it('starts a link at the right edge of its line and ends it at the head of the other card', () => {
    const [first] = call.anchors?.edges ?? [];
    const [submit, publish] = nodes.map((n) => n.rect);
    const start = first?.points[0];
    const end = first?.points.at(-1);
    expect(start?.[0]).toBe((submit?.x ?? 0) + (submit?.w ?? 0));
    expect(end).toEqual([(publish?.x ?? 0) + (publish?.w ?? 0), (publish?.y ?? 0) + 16]);
    expect(svg).toMatch(/<g id="edge-0"><path d="M[^"]+" class="link" marker-end="url\(#m-open\)"\/>/);
  });

  it('lets links one below the other share a lane, and puts a longer link outside a shorter one', () => {
    const lanes = (result: typeof call) => (result.anchors?.edges ?? []).map((e) => e.points[1]?.[0]);
    const [one, two] = lanes(call);
    expect(one).toBe(two);
    const nested = compileCode(
      'ueberweisung/nested.dgr',
      [
        'diagram code "Test"',
        'source a "A" src="TransferService.java" symbol=submit',
        'source b "B" src="Outbox.java" region=publish',
        'source c "C" src="outbox.sql" region=table',
        'link a 34 -> c',
        'link b 19 -> c',
      ].join('\n'),
    );
    const [outer, inner] = lanes(nested);
    expect(outer).toBeGreaterThan(inner ?? 0);
  });

  it('draws each line as one text whose runs are classed tspans, numbered as in the file', () => {
    expect(svg).toContain('<tspan class="code-keyword">public </tspan>');
    expect(svg).toMatch(/>34<\/text>/);
    expect(svg).toContain('<g id="node-submit">');
  });

  it('puts no margin for badges left of cards without marks', () => {
    const plain = diagram('source a "A" src="Outbox.java" region=publish');
    const marked = diagram('source a "A" src="Outbox.java" region=publish', '  mark 19');
    expect(plain.anchors?.nodes[0]?.rect.x).toBe(32);
    expect(marked.anchors?.nodes[0]?.rect.x).toBeGreaterThan(32);
  });
});
