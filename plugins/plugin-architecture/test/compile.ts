import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile } from '@diagrist/core';
import { architecturePlugin } from '../src/index.js';

export const examples = new URL('../examples/', import.meta.url);
export const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;

/** The examples as `dir/name.dgr`, sorted. */
export const exampleNames: readonly string[] = readdirSync(examples)
  .flatMap((dir) => readdirSync(new URL(`${dir}/`, examples)).map((f) => `${dir}/${f}`))
  .filter((f) => f.endsWith('.dgr'))
  .sort();

export const source = (name: string): string => readFileSync(new URL(name, examples), 'utf8');

export const plugins = [architecturePlugin];

/**
 * Compiles a diagram from its lines, adding the header and a small grid unless the lines bring one. `head` is the
 * level with header attributes after it, such as `container layout=adaptive`.
 */
export function diagram(head: string, ...lines: string[]): Compilation {
  const [level, ...attributes] = head.split(' ');
  const grid = lines.some((l) => l.startsWith('grid ')) ? [] : ['grid cols a,b,c', 'grid rows top,main'];
  const header = [`diagram ${level} "Test"`, ...attributes].join(' ');
  return compile([header, ...grid, ...lines].join('\n'), { plugins });
}

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);
