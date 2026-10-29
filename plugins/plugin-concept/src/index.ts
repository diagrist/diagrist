import { definePlugin, type Plugin } from '@diagrist/core';
import { matrixKind } from './matrix/kind.js';
import { MATRIX_MESSAGES } from './matrix/messages/index.js';

/**
 * Pictures of a business concept: so far the kind `matrix`, columns, rows and a scale whose rules are checked
 * (ADR 0031). Rule codes start with `M` (ADR 0011).
 */
export const conceptPlugin: Plugin = definePlugin({ name: 'concept', kinds: [matrixKind], messages: MATRIX_MESSAGES });
