import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile, type Rect, segmentMeetsRect } from '@diagrist/core';
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

/** Room a line keeps from the frame of a subject it does not end in, as the price of the layout asks. */
const CLEAR = 6;

const within = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** The lines of a compiled picture that run through or past a frame holding neither of their ends, as text. */
export function framesPassed(result: Compilation): string[] {
  const anchors = result.anchors;
  const rects = new Map((anchors?.nodes ?? []).map((n) => [n.id, n.rect]));
  const holds = (g: Rect, id: string) => {
    const r = rects.get(id);
    return r !== undefined && within(r, g);
  };
  return (anchors?.edges ?? []).flatMap((e) =>
    (anchors?.groups ?? [])
      .filter((g) => !holds(g.rect, e.from) && !holds(g.rect, e.to))
      .filter((g) => e.points.slice(1).some((q, i) => segmentMeetsRect(e.points[i] ?? q, q, g.rect, CLEAR)))
      .map((g) => `${e.from} -- ${e.to} past ${g.id}`),
  );
}

/** How many subjects a use case source declares; with more than one, a line may pass a subject it does not join. */
export const subjects = (source: string): number => (source.match(/^subject /gm) ?? []).length;

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
