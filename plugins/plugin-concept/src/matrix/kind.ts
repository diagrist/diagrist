import { defineKind } from '@diagrist/core';
import { imageTitle } from '@diagrist/parts';
import { describeMatrix } from './describe.js';
import { matrixSpec } from './grammar/spec.js';
import { layoutMatrix } from './layout/index.js';
import { matrixModel } from './model.js';
import { MATRIX_RULES } from './rules/index.js';
import { matrixAnchors, matrixPlaced, matrixScene } from './scene/index.js';
import { MATRIX_STYLES } from './styles.js';
import { MATRIX_WORDS } from './texts/index.js';

/** The kind `matrix`: tables, model, rules, layout, styles and description of matrices of two sets and a scale. */
export const matrixKind = defineKind({
  spec: matrixSpec,
  model: matrixModel,
  rules: MATRIX_RULES,
  layout: (model, { locale }) => {
    const words = MATRIX_WORDS[locale];
    const title = imageTitle(words.kind, model.title);
    const layout = layoutMatrix(model, words, title);
    return {
      scene: matrixScene(layout, model, title),
      styles: MATRIX_STYLES,
      anchors: matrixAnchors(layout),
      placed: matrixPlaced(layout, model),
    };
  },
  describe: (model, { locale }) => describeMatrix(model, locale),
});
