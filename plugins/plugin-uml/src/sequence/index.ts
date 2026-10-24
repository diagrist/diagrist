import { definePlugin, type Plugin } from '@diagrist/core';
import { sequenceKind } from './kind.js';
import { SEQUENCE_ERRORS } from './messages/errors.js';
import { SEQUENCE_WARNINGS } from './messages/warnings.js';

/**
 * UML sequence diagrams alone, as `@diagrist/plugin-uml/sequence`: the kind `sequence` with its messages, and nothing of the
 * other UML kinds, for hosts that draw only this one. `umlPlugin` registers all five (ADR 0024).
 */
export const sequencePlugin: Plugin = definePlugin({
  name: 'uml-sequence',
  kinds: [sequenceKind],
  messages: { ...SEQUENCE_ERRORS, ...SEQUENCE_WARNINGS },
});
