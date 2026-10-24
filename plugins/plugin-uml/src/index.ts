import { definePlugin, type Plugin } from '@diagrist/core';
import { activityPlugin } from './activity/index.js';
import { classPlugin } from './class/index.js';
import { sequencePlugin } from './sequence/index.js';
import { statePlugin } from './state/index.js';
import { usecasePlugin } from './usecase/index.js';

const KINDS: readonly Plugin[] = [sequencePlugin, usecasePlugin, activityPlugin, classPlugin, statePlugin];

/**
 * UML diagrams: the kinds `sequence`, `usecase`, `activity`, `class` and `state`. Rule codes start with `U` (ADR 0008).
 * A host that draws one kind only imports its entry instead, such as `@diagrist/plugin-uml/sequence` (ADR 0024).
 */
export const umlPlugin: Plugin = definePlugin({
  name: 'uml',
  kinds: KINDS.flatMap((plugin) => plugin.kinds),
  messages: Object.fromEntries(KINDS.flatMap((plugin) => Object.entries(plugin.messages))),
});
