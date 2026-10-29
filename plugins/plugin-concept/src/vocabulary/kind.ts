import { defineKind } from '@diagrist/core';
import { imageTitle } from '@diagrist/parts';
import { layoutGraph } from '../shared/graph/layout/index.js';
import { graphAnchors, graphScene } from '../shared/graph/scene/index.js';
import { GRAPH_STYLES } from '../shared/graph/styles.js';

import { vocabularySpec } from '../shared/vocabulary.js';
import { describeVocabulary } from './describe.js';
import { graphOf } from './graph.js';
import { vocabularyModel } from './model.js';
import { VOCABULARY_RULES } from './rules/index.js';
import { VOCABULARY_WORDS } from './texts/index.js';

/** The kind `vocabulary`: types and links of a subject, drawn as a picture of the subject with the rules on its lines. */
export const vocabularyKind = defineKind({
  spec: vocabularySpec,
  model: vocabularyModel,
  rules: VOCABULARY_RULES,
  layout: (model, { locale }) => {
    const words = VOCABULARY_WORDS[locale];
    const title = imageTitle(words.kind, model.title);
    const graph = graphOf(model, locale, words);
    const layout = layoutGraph(graph, words, title, locale, { legend: false });
    return {
      scene: graphScene(layout, graph, title),
      styles: GRAPH_STYLES,
      anchors: graphAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeVocabulary(model, locale),
});
