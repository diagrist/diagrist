import manifest from '../package.json' with { type: 'json' };

/** Version of the package `diagrist`. The bundler inlines package.json, so nothing is read at run time. */
export const VERSION: string = manifest.version;

/** Names the CLI is installed under, taken from `bin` in package.json, the short one first. */
export const PROGRAM_NAMES: readonly string[] = Object.keys(manifest.bin).sort((a, b) => a.length - b.length);

/** What the CLI does, in one sentence: the intro of `dgr help` and of the reference. */
export const DESCRIPTION: string = manifest.description;
