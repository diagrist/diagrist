import { defineKind } from '@diagrist/core';
import { imageTitle, WORDS } from '@diagrist/parts';
import { describeUseCase } from './describe/index.js';
import { USECASE_NAME } from './describe/texts.js';
import { usecaseSpec } from './grammar/spec.js';
import { layoutUseCase } from './layout/index.js';
import { useCaseModel } from './model.js';
import { USECASE_RULES } from './rules/index.js';
import { useCaseAnchors, useCaseScene } from './scene/index.js';
import { useCaseDiagram } from './source.js';
import { USECASE_STYLES } from './styles.js';

/** The kind `usecase`: tables, model, rules, layout, styles and description of UML use case diagrams. */
export const usecaseKind = defineKind({
  spec: usecaseSpec,
  model: (reading) => useCaseModel(useCaseDiagram(reading)),
  rules: USECASE_RULES,
  layout: (model, { locale }) => {
    const words = { ...WORDS[locale], title: imageTitle(USECASE_NAME[locale], model.diagram.title) };
    const layout = layoutUseCase(model, words);
    return {
      scene: useCaseScene(layout, model, words),
      styles: USECASE_STYLES,
      anchors: useCaseAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeUseCase(model, locale),
});
