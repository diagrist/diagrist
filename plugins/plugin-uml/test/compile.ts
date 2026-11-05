import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile } from '@diagrist/core';
import { umlPlugin } from '../src/index.js';

export const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);

/** The example files of a kind in `examples/<kind>/`, by file name, and a reader for one of them. */
export function examplesOf(kind: string): { names: readonly string[]; source: (name: string) => string } {
  const folder = new URL(`../examples/${kind}/`, import.meta.url);
  return {
    names: readdirSync(folder).filter((file) => file.endsWith('.dgr')),
    source: (name) => readFileSync(new URL(name, folder), 'utf8'),
  };
}

/**
 * The pictures of a kind's examples as each example's own test compiles them, and the hash file they make: one line
 * per example, the SHA-256 of its SVG and its path below `examples/`, as `sha256sum` writes them, the content of
 * `<kind>-examples.sha256`. Each example is compiled once in its own test, so no test compiles them all.
 */
export function examplePictures(kind: string): { keep: (name: string, svg: string) => void; hashes: () => string } {
  const { names } = examplesOf(kind);
  const pictures = new Map<string, string>();
  const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
  return {
    keep: (name, svg) => void pictures.set(name, svg),
    hashes: () =>
      names
        .map((name) => {
          const svg = pictures.get(name);
          if (svg === undefined) throw new Error(`${kind}/${name} was not compiled: run the whole file, not one test`);
          return `${sha256(svg)}  ${kind}/${name}\n`;
        })
        .join(''),
  };
}

/** Compiles lines of a diagram of `kind` with the UML plugin, adding the header. */
const diagramOf =
  (kind: string) =>
  (...lines: string[]): Compilation =>
    compile([`diagram ${kind} "Test"`, ...lines].join('\n'), { plugins: [umlPlugin] });

export const { names: sequenceNames, source: sequenceSource } = examplesOf('sequence');
export const sequence = diagramOf('sequence');

export const { names: usecaseNames, source: usecaseSource } = examplesOf('usecase');
export const usecase = diagramOf('usecase');

export const { names: activityNames, source: activitySource } = examplesOf('activity');
export const activity = diagramOf('activity');

export const { names: classNames, source: classSource } = examplesOf('class');
export const classDiagram = diagramOf('class');

export const { names: stateNames, source: stateSource } = examplesOf('state');
export const stateDiagram = diagramOf('state');
