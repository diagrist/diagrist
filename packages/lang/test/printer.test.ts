import { describe, expect, it } from 'vitest';
import { print, read } from '../src/index.js';

const format = (source: string): string => print(read(source).document);

describe('print', () => {
  it('indents two spaces per level, for children and entries alike', () => {
    const source = 'class ticket "Ticket"\n    "- number : Integer"\n    note "audited"\n        tag x';
    expect(format(source)).toBe('class ticket "Ticket"\n  "- number : Integer"\n  note "audited"\n    tag x\n');
  });

  it('keeps the order in which arguments and attributes were written', () => {
    expect(format('node web "Web" icon=vuedotjs at web/clients in cloud')).toBe(
      'node web "Web" icon=vuedotjs at web/clients in cloud\n',
    );
  });

  it('keeps aligned columns but collapses blank lines', () => {
    const source = 'group infra   "Infra"   shared\ngroup web     "Web"\n\n\n\nnode a';
    expect(format(source)).toBe('group infra   "Infra"   shared\ngroup web     "Web"\n\nnode a\n');
  });

  it('keeps comments above, inline and at the end, including aligned continuations', () => {
    const source = '# owned by platform\n#     and audited\nnode api # public\n\n# end';
    expect(format(source)).toBe(source + '\n');
  });

  it('quotes texts and attribute values only where needed, escaping quotes and backslashes', () => {
    expect(format('note "say \\"hi\\"" label="two words" tone=blue path="a\\\\b"')).toBe(
      'note "say \\"hi\\"" label="two words" tone=blue path="a\\\\b"\n',
    );
  });

  it('is stable: reading and printing its own output changes nothing', () => {
    const once = format('diagram flow "x"\n      step a   "A" tone=red   # first\n\n\n  step b');
    expect(format(once)).toBe(once);
  });
});
