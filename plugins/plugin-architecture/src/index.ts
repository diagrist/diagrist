import { definePlugin, type Plugin } from '@diagrist/core';
import { component, container, context } from './kinds.js';
import { ERRORS } from './messages/errors.js';
import { LAYOUT_ERRORS } from './messages/layout-errors.js';
import { WARNINGS } from './messages/warnings.js';

/** C4 architecture diagrams: the kinds `context`, `container` and `component`. Rule codes start with `A` (ADR 0011). */
export const architecturePlugin: Plugin = definePlugin({
  name: 'architecture',
  kinds: [context, container, component],
  messages: { ...ERRORS, ...LAYOUT_ERRORS, ...WARNINGS },
});
