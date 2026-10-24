import { describe, expect, it } from 'vitest';
import { JSON_ENVELOPE } from '../src/commands/command.js';
import { DIAGNOSTIC_FIELDS } from '../src/report/diagnostics.js';
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { call, callJson } from './support/memory-io.js';

interface Table {
  readonly name: string;
  readonly doc: string;
  readonly usage: string;
  readonly arguments: readonly { readonly name: string; readonly doc: string }[];
  readonly options: readonly { readonly name: string; readonly doc: string }[];
  readonly examples: readonly { readonly command: string; readonly doc: string }[];
  readonly json: Readonly<Record<string, string>>;
}

const tables = async (): Promise<readonly Table[]> => (await callJson(['help'])).json.commands as Table[];
const envelope = Object.keys(JSON_ENVELOPE);

describe('help', () => {
  it('lists every command of the tables in the overview', async () => {
    const overview = (await call(['help'])).stdout;
    for (const table of await tables()) expect(overview).toMatch(new RegExp(`\\n  ${table.name}\\s+\\S`));
  });

  it('shows the usage, arguments, options and examples of each command as its table has them', async () => {
    for (const table of await tables()) {
      const text = (await call(['help', table.name])).stdout;
      expect(text.startsWith(`${table.usage}\n\n${table.doc}\n`)).toBe(true);
      for (const a of table.arguments) expect(text).toContain(a.doc);
      for (const o of [...table.options, { name: 'json', doc: '' }, { name: 'locale', doc: '' }]) {
        expect(text).toContain(`--${o.name}`);
        expect(text).toContain(o.doc);
      }
      for (const e of table.examples) expect(text).toMatch(new RegExp(`  ${literal(e.command)}\\s+${literal(e.doc)}`));
    }
  });

  it('has a doc for every command, argument, option, example and JSON field (ADR 0005)', async () => {
    const help = (await callJson(['help'])).json;
    const options = [...(help.options as Table['options']), ...(help.rootOptions as Table['options'])];
    const undocumented = (await tables()).flatMap((t) => [
      ...[t, ...t.arguments, ...t.options, ...t.examples].filter((part) => part.doc.trim() === ''),
      ...Object.entries(t.json).filter(([, doc]) => doc.trim() === ''),
    ]);
    expect([...undocumented, ...options.filter((o) => o.doc.trim() === '')]).toEqual([]);
  });

  it('documents every field each command prints with --json', async () => {
    const engine = fakeEngine();
    const files = { 'a.dgr': LOGIN };
    const calls = [
      ['fmt', 'a.dgr'],
      ['check', 'a.dgr'],
      ['build', 'a.dgr'],
      ['grammar'],
      ['grammar', 'sequence'],
      ['help'],
    ];
    const documented = new Map((await tables()).map((t) => [t.name, [...envelope, ...Object.keys(t.json)]]));
    for (const argv of calls) {
      const { json } = await callJson(argv, { files, engine });
      expect(
        Object.keys(json).filter((key) => !documented.get(argv[0] ?? '')?.includes(key)),
        argv.join(' '),
      ).toEqual([]);
    }
    const { json } = await callJson(['check', 'a.dgr'], { files: { 'a.dgr': `${LOGIN}msg api -> x\n` }, engine });
    const [first] = json.diagnostics as Record<string, unknown>[];
    expect(Object.keys(first ?? {}).sort()).toEqual(Object.keys(DIAGNOSTIC_FIELDS).sort());
  });
});

function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
