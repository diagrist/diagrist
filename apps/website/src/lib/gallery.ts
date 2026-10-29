import { compile } from '@diagrist/core';
import { editorLink, plugins } from './render.js';

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
  /** Its address below `/gallery/` without the parts every example shares, such as `plugin-uml/sequence/cache`. */
  readonly slug: string;
  /** The folder it lies in, such as `sequence` or `radverleih`. */
  readonly group: string;
  readonly file: string;
  readonly kind: string;
  readonly title: string;
  readonly source: string;
  readonly svg: string;
  readonly github: string;
  /** The live editor with this source; absent when the example reads other files, which the editor cannot. */
  readonly editor?: string;
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
      const header = /^diagram\s+([\w-]+)\s+"([^"]*)"/m.exec(source);
      return {
        id: path.slice(0, -'.dgr'.length),
        slug: path.slice('plugins/'.length, -'.dgr'.length).replace('/examples/', '/'),
        group: folder.split('/').at(-2) ?? '',
        file,
        kind: header?.[1] ?? '',
        title: header?.[2] ?? file,
        source,
        svg: result.svg,
        github: GITHUB + path,
        ...(first.needs.length === 0 ? { editor: editorLink(source) } : {}),
      };
    });
  return drawn;
}

/** The examples by their folder, in the order of the plugins and then of the folders. */
export function groups(all: readonly Example[]): { name: string; plugin: string; examples: Example[] }[] {
  const byFolder = new Map<string, Example[]>();
  for (const example of all) {
    const key = example.id.slice(0, example.id.lastIndexOf('/'));
    byFolder.set(key, [...(byFolder.get(key) ?? []), example]);
  }
  const order = plugins.map((plugin) => `plugin-${plugin.name}`);
  return [...byFolder.entries()]
    .map(([key, list]) => ({ name: list[0]?.group ?? key, plugin: key.split('/')[1] ?? '', examples: list }))
    .sort((a, b) => order.indexOf(a.plugin) - order.indexOf(b.plugin) || (a.name < b.name ? -1 : 1));
}
