import { definePlugin, type Plugin } from '@diagrist/core';
import { activity } from './activity/kind.js';
import { ACTIVITY_ERRORS } from './activity/messages/errors.js';
import { ACTIVITY_WARNINGS } from './activity/messages/warnings.js';
import { sequence } from './sequence/kind.js';
import { ERRORS } from './sequence/messages/errors.js';
import { WARNINGS } from './sequence/messages/warnings.js';
import { usecase } from './usecase/kind.js';
import { USECASE_ERRORS } from './usecase/messages/errors.js';
import { USECASE_WARNINGS } from './usecase/messages/warnings.js';

/** UML diagrams: the kinds `sequence`, `usecase` and `activity`. Rule codes start with `U` (ADR 0008). */
export const umlPlugin: Plugin = definePlugin({
  name: 'uml',
  kinds: [sequence, usecase, activity],
  messages: {
    ...ERRORS,
    ...WARNINGS,
    ...USECASE_ERRORS,
    ...USECASE_WARNINGS,
    ...ACTIVITY_ERRORS,
    ...ACTIVITY_WARNINGS,
  },
});
