/**
 * The tables the CLI is built from, for the files derived from them in `tools/docs` (ADR 0004): the commands and
 * their options, exit codes and JSON fields, the plugins of this build, and the helpers that write a table as a
 * usage line. The subpath `@diagrist/cli/tables` resolves inside the workspace only, through the source condition,
 * so it is no part of the published package.
 */
export { COMMANDS } from './commands/all.js';
export {
  type Command,
  EXIT_CODES,
  GLOBAL_OPTIONS,
  JSON_ENVELOPE,
  type Options,
  ROOT_OPTIONS,
} from './commands/command.js';
export { SCHEMA_PATH } from './commands/grammar.js';
export { headerLine, isReference, signatureOf } from './commands/signature.js';
export { argumentLabel, commandLine, optionLabel, summaryOf } from './commands/usage.js';
export { DESCRIPTION, PROGRAM_NAMES } from './manifest.js';
export { PLUGINS } from './plugins.js';
export { DIAGNOSTIC_FIELDS } from './report/diagnostics.js';
