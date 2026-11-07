import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import {
  type Compilation,
  compile,
  type Drawing,
  linesOfDrawing,
  type Plugin,
  type Rect,
  segmentMeetsRect,
} from '@diagrist/core';
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

/** What the layouts of the compilation running now returned, one drawing per picture. */
const handed: Drawing[] = [];

/** The UML plugin with every kind's layout recorded into `handed`; its pictures are the plugin's, byte for byte. */
const recorder: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => handed[handed.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/** A compilation with the UML plugin and the drawing each picture's layout handed the kernel, in picture order. */
export interface Drawn extends Compilation {
  readonly drawings: readonly Drawing[];
}

/** Compiles a source with the UML plugin and keeps the drawings, so a test reads what the kernel was handed. */
export function drawn(source: string): Drawn {
  handed.length = 0;
  const result = compile(source, { plugins: [recorder] });
  return { ...result, drawings: [...handed] };
}

/**
 * A reader of compiled examples for one test file: the first call for a name compiles its source, every later call
 * returns that compilation, so a heavy picture is laid out once however many tests of the file read it.
 */
export function compiledOnce(source: (name: string) => string): (name: string) => Drawn {
  const kept = new Map<string, Drawn>();
  return (name) => {
    const got = kept.get(name) ?? drawn(source(name));
    kept.set(name, got);
    return got;
  };
}

/** The distance between two rectangles, 0 where they meet. */
const apart = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(0, b.x - a.x - a.w, a.x - b.x - b.w), Math.max(0, b.y - a.y - a.h, a.y - b.y - b.h));

/** The least distance between texts of two different lines in the first picture of a compilation. */
export function closestTexts(result: Drawn): number {
  const labels = linesOfDrawing(result.drawings[0] as Drawing).labels ?? [];
  const gaps = labels.flatMap((a, i) =>
    labels.slice(i + 1).flatMap((b) => (a.edge === b.edge ? [] : [apart(a.box, b.box)])),
  );
  return Math.min(...gaps);
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
