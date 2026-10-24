import { definePlugin, type Plugin } from '@diagrist/core';
import { sequence } from './sequence/kind.js';
import { ERRORS } from './sequence/messages/errors.js';
import { WARNINGS } from './sequence/messages/warnings.js';

/** UML diagrams; for now the kind `sequence`. Rule codes start with `U` (ADR 0008). */
export const umlPlugin: Plugin = definePlugin({
  name: 'uml',
  kinds: [sequence],
  messages: { ...ERRORS, ...WARNINGS },
});
