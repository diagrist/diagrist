import { definePlugin, type Plugin } from '@diagrist/core';
import { sequence } from './sequence/kind.js';
import { ERRORS } from './sequence/messages/errors.js';
import { WARNINGS } from './sequence/messages/warnings.js';
import { usecase } from './usecase/kind.js';
import { USECASE_ERRORS } from './usecase/messages/errors.js';
import { USECASE_WARNINGS } from './usecase/messages/warnings.js';

/** UML diagrams: the kinds `sequence` and `usecase`. Rule codes start with `U` (ADR 0008). */
export const umlPlugin: Plugin = definePlugin({
  name: 'uml',
  kinds: [sequence, usecase],
  messages: { ...ERRORS, ...WARNINGS, ...USECASE_ERRORS, ...USECASE_WARNINGS },
});
