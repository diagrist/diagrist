import type { Plugin } from '@diagrist/core';
import { architecturePlugin } from '@diagrist/plugin-architecture';
import { umlPlugin } from '@diagrist/plugin-uml';

/** The plugins this build of the CLI draws with; the generated docs and the skill describe the same ones. */
export const PLUGINS: readonly Plugin[] = [umlPlugin, architecturePlugin];
