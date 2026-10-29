import { defineKind } from '@diagrist/core';
import { imageTitle } from '@diagrist/parts';
import { describeConcept } from './describe.js';
import { conceptSpec } from './grammar/spec.js';
import { layoutConcept } from './layout/index.js';
import { conceptModel } from './model.js';
import { CONCEPT_RULES } from './rules/index.js';
import { conceptAnchors, conceptScene } from './scene/index.js';
import { CONCEPT_STYLES } from './styles.js';
import { CONCEPT_WORDS } from './texts/index.js';

/** The kind `concept`: declared types and links, items and relations checked against them, laid out in layers. */
export const conceptKind = defineKind({
  spec: conceptSpec,
  model: conceptModel,
  rules: CONCEPT_RULES,
  layout: (model, { locale }) => {
    const words = CONCEPT_WORDS[locale];
    const title = imageTitle(words.kind, model.title);
    const layout = layoutConcept(model, words, title, locale);
    return {
      scene: conceptScene(layout, model, title),
      styles: CONCEPT_STYLES,
      anchors: conceptAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeConcept(model, locale),
});
