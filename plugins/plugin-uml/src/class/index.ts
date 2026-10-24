import { definePlugin, type Plugin } from '@diagrist/core';
import { classKind } from './kind.js';
import { CLASS_ERRORS } from './messages/errors.js';
import { CLASS_WARNINGS } from './messages/warnings.js';

/**
 * UML class diagrams alone, as `@diagrist/plugin-uml/class`: the kind `class` with its messages, and nothing of the
 * other UML kinds, for hosts that draw only this one. `umlPlugin` registers all five (ADR 0024).
 */
export const classPlugin: Plugin = definePlugin({
  name: 'uml-class',
  kinds: [classKind],
  messages: { ...CLASS_ERRORS, ...CLASS_WARNINGS },
});
