import { type Command, SCHEMA_PATH } from '@diagrist/cli/tables';
import type { Plugin } from '@diagrist/core';
import { GRAMMAR_SCHEMA } from '@diagrist/lang';
import { languageOverview, OVERVIEW_PATH } from './overview.js';
import { REFERENCE_PATH, reference } from './reference.js';
import { agentSkill, SKILL_PATH } from './skill.js';
import { languageSpec, specPath } from './spec.js';

/** A checked-in file derived from the tables, by its path relative to the repository root. */
export interface DerivedFile {
  readonly path: string;
  readonly content: string;
}

/** Where the published schema can be fetched once it is on `main`; tools use it as the schema's `$id`. */
const SCHEMA_URL = `https://raw.githubusercontent.com/diagrist/diagrist/main/${SCHEMA_PATH}`;

/**
 * Every file derived from the command tables, the statement tables and the catalogues (ADR 0004). `pnpm
 * docs:generate` writes them; a test fails when a checked-in file differs from what this returns.
 */
export function derivedFiles(plugins: readonly Plugin[], commands: readonly Command[]): DerivedFile[] {
  return [
    { path: REFERENCE_PATH, content: reference(commands) },
    { path: SCHEMA_PATH, content: schemaFile() },
    { path: OVERVIEW_PATH, content: languageOverview(plugins) },
    ...plugins.flatMap((plugin) =>
      plugin.kinds.map((kind) => ({ path: specPath(kind.spec.name), content: languageSpec(kind, plugin.name) })),
    ),
    { path: SKILL_PATH, content: agentSkill(plugins, commands) },
  ];
}

function schemaFile(): string {
  const published = {
    $schema: GRAMMAR_SCHEMA.$schema,
    $id: SCHEMA_URL,
    $comment:
      'Generated from GRAMMAR_SCHEMA in packages/lang/src/grammar/schema.ts by `pnpm docs:generate`. Do not edit.',
    ...GRAMMAR_SCHEMA,
  };
  return `${JSON.stringify(published, null, 2)}\n`;
}
