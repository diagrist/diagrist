import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { PLUGINS } from '../src/plugins.js';
import { call } from './support/memory-io.js';

const plugins = new URL('../../../plugins/', import.meta.url);

/** Every example file of every plugin, as `plugin-uml/examples/state/freigabe.dgr`. */
const examples = readdirSync(plugins, { recursive: true, encoding: 'utf8' })
  .filter((path) => /^[^/]+\/examples\/.+\.dgr$/.test(path))
  .sort();

const files = Object.fromEntries(examples.map((path) => [path, readFileSync(new URL(path, plugins), 'utf8')]));
const engine = coreEngine(PLUGINS);

/**
 * The examples are what users and agents copy from, and what the docs show. Whatever folder they sit in, each one
 * passes `dgr check` without an error and `dgr fmt --check`, and every kind the CLI draws has at least one.
 */
describe('the examples of every plugin', () => {
  it('show every kind the CLI draws', () => {
    const shown = new Set(examples.map((path) => /^diagram (\S+)/m.exec(files[path] ?? '')?.[1]));
    const kinds = PLUGINS.flatMap((plugin) => plugin.kinds.map((kind) => kind.spec.name));
    expect(kinds.filter((kind) => !shown.has(kind))).toEqual([]);
  });

  it.each(examples)('%s checks without errors and is formatted', async (path) => {
    const checked = await call(['check', path], { files, engine });
    expect(checked.stdout).not.toMatch(/ error: /);
    expect(checked.exitCode).toBe(0);
    expect(await call(['fmt', '--check', path], { files, engine })).toMatchObject({ exitCode: 0 });
  });
});
