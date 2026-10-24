import { definePlugin, type Plugin } from '@diagrist/core';
import { activityKind } from './kind.js';
import { ACTIVITY_ERRORS } from './messages/errors.js';
import { ACTIVITY_WARNINGS } from './messages/warnings.js';

/**
 * UML activity diagrams alone, as `@diagrist/plugin-uml/activity`: the kind `activity` with its messages, and nothing of the
 * other UML kinds, for hosts that draw only this one. `umlPlugin` registers all five (ADR 0024).
 */
export const activityPlugin: Plugin = definePlugin({
  name: 'uml-activity',
  kinds: [activityKind],
  messages: { ...ACTIVITY_ERRORS, ...ACTIVITY_WARNINGS },
});
