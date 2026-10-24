import { definePlugin, type Plugin } from '@diagrist/core';
import { usecaseKind } from './kind.js';
import { USECASE_ERRORS } from './messages/errors.js';
import { USECASE_WARNINGS } from './messages/warnings.js';

/**
 * UML use case diagrams alone, as `@diagrist/plugin-uml/usecase`: the kind `usecase` with its messages, and nothing of the
 * other UML kinds, for hosts that draw only this one. `umlPlugin` registers all five (ADR 0024).
 */
export const usecasePlugin: Plugin = definePlugin({
  name: 'uml-usecase',
  kinds: [usecaseKind],
  messages: { ...USECASE_ERRORS, ...USECASE_WARNINGS },
});
