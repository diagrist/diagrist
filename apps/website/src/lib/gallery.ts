import { compile } from '@diagrist/core';
import { plugins } from './render.js';

/** Every file of the example folders, `.dgr` and the files they read, by their path from the repository root. */
const FILES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../../plugins/*/examples/**/*', { query: '?raw', import: 'default', eager: true }),
  ).map(([path, text]) => [path.replace(/^(\.\.\/)+/, ''), text]),
);

const GITHUB = 'https://github.com/diagrist/diagrist/blob/main/';

/** An example of the gallery: where it lies, what it shows, its picture and where to open it. */
export interface Example {
  /** Path from the repository root without `.dgr`, such as `plugins/plugin-uml/examples/sequence/cache`. */
  readonly id: string;
  /** Its name in the gallery's address and files, such as `uml/sequence/cache`. */
  readonly slug: string;
  /** The folder it lies in, such as `sequence` or `radverleih`. */
  readonly group: string;
  readonly file: string;
  readonly kind: string;
  /** The look the header asks for with `look=`, such as `cards`; absent for the standard look. */
  readonly look?: string;
  readonly title: string;
  readonly source: string;
  readonly svg: string;
  /** What the picture shows in words, for readers who cannot see it. */
  readonly description?: string;
  readonly github: string;
  /** Whether the live editor can draw it: not when it reads other files, since the editor holds one source. */
  readonly editable: boolean;
}

/** The examples once drawn, shared by the gallery page and the pictures it links. */
let drawn: Example[] | undefined;

/**
 * Every example in the example folders of the plugins, drawn as `dgr build` draws it: an example that uses another
 * file or reads source code gets these files from its folder. An example that draws no picture stops the build.
 */
export function examples(): Example[] {
  drawn ??= Object.keys(FILES)
    .filter((path) => path.endsWith('.dgr'))
    .sort()
    .map((path) => {
      const source = FILES[path] ?? '';
      const folder = path.slice(0, path.lastIndexOf('/') + 1);
      const file = path.slice(folder.length);
      const first = compile(source, { plugins, path: file });
      const files = Object.fromEntries(first.needs.map((need) => [need.path, FILES[folder + need.path] ?? '']));
      const result = first.needs.length === 0 ? first : compile(source, { plugins, path: file, files });
      if (result.svg === undefined) throw new Error(`Diagrist: the example ${path} draws no picture`);
      const header = /^diagram\s+([\w-]+)\s+"([^"]*)"(.*)$/m.exec(source);
      const look = /\blook=([\w-]+)/.exec(header?.[3] ?? '')?.[1];
      return {
        id: path.slice(0, -'.dgr'.length),
        slug: path.slice('plugins/plugin-'.length, -'.dgr'.length).replace('/examples/', '/'),
        group: folder.split('/').at(-2) ?? '',
        file,
        kind: header?.[1] ?? '',
        ...(look === undefined ? {} : { look }),
        title: header?.[2] ?? file,
        source,
        svg: result.svg,
        ...(result.description === undefined ? {} : { description: result.description }),
        github: GITHUB + path,
        editable: first.needs.length === 0,
      };
    });
  return drawn;
}

/** The plugins as the gallery names them. */
const LABELS: Readonly<Record<string, string>> = { uml: 'UML', architecture: 'C4', concept: 'Concept', code: 'Code' };

/** The kinds the examples draw, each with its count, in the order of the plugins and then by name. */
export function kinds(all: readonly Example[]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const example of groups(all).flatMap((group) => group.examples)) {
    counts.set(example.kind, (counts.get(example.kind) ?? 0) + 1);
  }
  return [...counts.entries()].map(([kind, count]) => ({ kind, count }));
}

/** The examples by their folder, in the order of the plugins and then of the folders. */
export function groups(all: readonly Example[]): { name: string; plugin: string; examples: Example[] }[] {
  const byFolder = new Map<string, Example[]>();
  for (const example of all) {
    const key = example.id.slice(0, example.id.lastIndexOf('/'));
    byFolder.set(key, [...(byFolder.get(key) ?? []), example]);
  }
  const order = plugins.map((plugin) => LABELS[plugin.name] ?? plugin.name);
  return [...byFolder.entries()]
    .map(([key, list]) => ({ name: list[0]?.group ?? key, plugin: pluginOf(key), examples: list }))
    .sort((a, b) => order.indexOf(a.plugin) - order.indexOf(b.plugin) || (a.name < b.name ? -1 : 1));
}

const pluginOf = (key: string): string => {
  const name = key.split('/')[1]?.replace(/^plugin-/, '') ?? '';
  return LABELS[name] ?? name;
};
