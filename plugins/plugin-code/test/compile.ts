import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile } from '@diagrist/core';
import { codePlugin } from '../src/index.js';

const examples = new URL('../examples/', import.meta.url);

/** The examples as `dir/name.dgr`, sorted. */
export const exampleNames: readonly string[] = readdirSync(examples)
  .flatMap((dir) => readdirSync(new URL(`${dir}/`, examples)).map((f) => `${dir}/${f}`))
  .filter((f) => f.endsWith('.dgr'))
  .sort();

const read = (name: string): string => readFileSync(new URL(name, examples), 'utf8');

export const plugins = [codePlugin];

/**
 * Compiles a diagram the way `dgr` does: compile, read the files it needs, compile again. `text` is the diagram, by
 * default the example `name`; `files` are texts by path that stand in for files, and the rest is read from the
 * examples folder, as an example lying at `name` would find them.
 */
export function compileCode(
  name: string,
  text: string = read(name),
  files: Readonly<Record<string, string>> = {},
): Compilation {
  const handed: Record<string, string> = {};
  for (;;) {
    const compiled = compile(text, { plugins, path: name, files: handed });
    const missing = compiled.needs.filter((need) => !Object.hasOwn(handed, need.path));
    if (missing.length === 0) return compiled;
    for (const need of missing) handed[need.path] = files[need.path] ?? read(need.path);
  }
}

/** A diagram of a few lines below the header, compiled as if it lay beside the example sources. */
export const diagram = (...lines: string[]): Compilation =>
  compileCode('ueberweisung/test.dgr', ['diagram code "Test"', ...lines].join('\n'));

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);
