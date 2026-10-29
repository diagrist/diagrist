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

/** Compiles an example, or a text in its place. */
export const compileExample = (name: string, text?: string): Compilation =>
  compile(text ?? readFileSync(new URL(name, examples), 'utf8'), { plugins, path: name });

/** A matrix of a few lines below a header with the given attributes, such as `scale=raci`. */
export const matrix = (header: string, ...lines: string[]): Compilation =>
  compile([`diagram matrix "Test" ${header}`.trimEnd(), ...lines].join('\n'), { plugins });

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);

/** A concept picture of a few lines below a header with the given attributes, such as `vocabulary=terms`. */
export const concept = (header: string, ...lines: string[]): Compilation =>
  compile([`diagram concept "Test" ${header}`.trimEnd(), ...lines].join('\n'), { plugins });
