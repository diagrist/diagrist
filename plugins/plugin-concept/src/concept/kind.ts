import { defineKind } from '@diagrist/core';
import { imageTitle } from '@diagrist/parts';
import { layoutGraph } from '../shared/graph/layout/index.js';
import { graphAnchors, graphScene } from '../shared/graph/scene/index.js';
import { GRAPH_STYLES } from '../shared/graph/styles.js';
import { describeConcept } from './describe.js';
import { conceptSpec } from './grammar/spec.js';
import { conceptModel } from './model.js';
import { CONCEPT_RULES } from './rules/index.js';
import { CONCEPT_WORDS } from './texts/index.js';

/** The kind `concept`: declared types and links, items and relations checked against them, laid out in layers. */
export const conceptKind = defineKind({
  spec: conceptSpec,
  model: conceptModel,
  rules: CONCEPT_RULES,
  layout: (model, { locale }) => {
    const words = CONCEPT_WORDS[locale];
    const title = imageTitle(words.kind, model.title);
    const layout = layoutGraph(model, words, title, locale);
    return {
      scene: graphScene(layout, model, title),
      styles: GRAPH_STYLES,
      anchors: graphAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeConcept(model, locale),
});
