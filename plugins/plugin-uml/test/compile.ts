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
 * One line per example of a kind, the SHA-256 of its SVG and its path below `examples/`, as `sha256sum` writes them:
 * the content of `<kind>-examples.sha256`, which keeps every example's picture.
 */
export function exampleHashes(kind: string): string {
  const { names, source } = examplesOf(kind);
  const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
  return names
    .map((name) => `${sha256(compile(source(name), { plugins: [umlPlugin] }).svg ?? '')}  ${kind}/${name}\n`)
    .join('');
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
