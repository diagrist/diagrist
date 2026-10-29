import { definePlugin, type Plugin } from '@diagrist/core';
import { conceptKind } from './concept/kind.js';
import { CONCEPT_MESSAGES } from './concept/messages/index.js';
import { matrixKind } from './matrix/kind.js';
import { MATRIX_MESSAGES } from './matrix/messages/index.js';

/**
 * Pictures of a business concept: the kind `matrix`, columns, rows and a scale whose rules are checked (ADR 0031),
 * and the kind `concept`, items and relations of a declared vocabulary (ADR 0030). Rule codes start with `M`
 * (ADR 0011).
 */
export const conceptPlugin: Plugin = definePlugin({
  name: 'concept',
  kinds: [matrixKind, conceptKind],
  messages: { ...MATRIX_MESSAGES, ...CONCEPT_MESSAGES },
});
