import { join } from 'node:path';
import { manifest, packageOf, repository, sourceFiles } from './source.js';

/** A statement table as far as the architecture tests read it: its keyword and the tables below it. */
export interface Table {
  readonly keyword: string;
  readonly children: readonly Table[];
}

/** The parts of a diagram kind the architecture tests read: its name and its statement tables. */
export interface KindTables {
  readonly spec: { readonly name: string; readonly statements: readonly Table[] };
}

/** A message template of a catalogue, by locale. */
export type Template = Readonly<Record<string, (values: Readonly<Record<string, string>>) => string>>;

/** A plugin as the kernel receives it, reduced to what the architecture tests read. */
export interface PluginObject {
  readonly name: string;
  readonly kinds: readonly KindTables[];
  readonly messages: Readonly<Record<string, Template>>;
}

const isPlugin = (value: unknown): value is PluginObject =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as PluginObject).kinds) &&
  typeof (value as PluginObject).messages === 'object';

/**
 * Every plugin object a package exports, read from the entries of its package.json through the source condition,
 * by the package's root such as `plugins/plugin-uml`. The tests learn kinds, tables and codes from the objects the
 * kernel receives, not from patterns in their source. Loaded once, when a test file imports this module.
 */
export const pluginsByPackage: ReadonlyMap<string, readonly PluginObject[]> = new Map(
  await Promise.all(
    [...new Set(sourceFiles().map(packageOf))]
      .filter((root): root is string => root?.startsWith('plugins/') === true)
      .map(async (root) => {
        const entries = Object.values(manifest(root).exports ?? {})
          .map((conditions) => conditions['@diagrist/source'])
          .filter((path) => path !== undefined);
        const modules = await Promise.all(entries.map((path) => import(join(repository, root, path))));
        const plugins = modules.flatMap((module: Record<string, unknown>) => Object.values(module).filter(isPlugin));
        return [root, [...new Set(plugins)]] as const;
      }),
  ),
);

/** Every keyword of a kind's tables, the nested ones included; a table that holds itself is read once. */
export function keywordsOf(kind: KindTables): string[] {
  const seen = new Set<Table>();
  const walk = (table: Table): string[] => {
    if (seen.has(table)) return [];
    seen.add(table);
    return [table.keyword, ...table.children.flatMap(walk)];
  };
  return kind.spec.statements.flatMap(walk);
}
