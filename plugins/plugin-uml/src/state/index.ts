import { definePlugin, type Plugin } from '@diagrist/core';
import { stateKind } from './kind.js';
import { STATE_ERRORS } from './messages/errors.js';
import { STATE_MORE_ERRORS } from './messages/more-errors.js';
import { STATE_WARNINGS } from './messages/warnings.js';

/**
 * UML state machine diagrams alone, as `@diagrist/plugin-uml/state`: the kind `state` with its messages, and nothing of the
 * other UML kinds, for hosts that draw only this one. `umlPlugin` registers all five (ADR 0024).
 */
export const statePlugin: Plugin = definePlugin({
  name: 'uml-state',
  kinds: [stateKind],
  messages: { ...STATE_ERRORS, ...STATE_MORE_ERRORS, ...STATE_WARNINGS },
});
