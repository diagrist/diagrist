import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile } from '@diagrist/core';
import { conceptPlugin } from '../src/index.js';

const examples = new URL('../examples/', import.meta.url);

/** The examples as `dir/name.dgr`, sorted. */
export const exampleNames: readonly string[] = readdirSync(examples)
  .flatMap((dir) => readdirSync(new URL(`${dir}/`, examples)).map((f) => `${dir}/${f}`))
  .filter((f) => f.endsWith('.dgr'))
  .sort();

export const plugins = [conceptPlugin];

const read = (path: string): string => readFileSync(new URL(path, examples), 'utf8');

/**
 * Compiles an example, or a text in its place, the way `dgr` does: compile, read the files it needs from the
 * examples folder or from `files`, compile again.
 */
export function compileExample(
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

/** A matrix of a few lines below a header with the given attributes, such as `scale=raci`. */
export const matrix = (header: string, ...lines: string[]): Compilation =>
  compile([`diagram matrix "Test" ${header}`.trimEnd(), ...lines].join('\n'), { plugins });

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);

/** A concept picture of a few lines below a header with the given attributes, such as `vocabulary=terms`. */
export const concept = (header: string, ...lines: string[]): Compilation =>
  compile([`diagram concept "Test" ${header}`.trimEnd(), ...lines].join('\n'), { plugins });
