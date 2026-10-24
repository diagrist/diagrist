import { defineKind } from '@diagrist/core';
import { imageTitle, WORDS } from '@diagrist/parts';
import { TEXTS } from '../texts/index.js';
import { describeSequence } from './describe/index.js';
import { sequenceSpec } from './grammar/spec.js';
import { layoutSequence } from './layout/index.js';
import { sequenceModel } from './model/index.js';
import { SEQUENCE_RULES } from './rules/index.js';
import { sequenceAnchors, sequenceScene } from './scene/index.js';
import { sequenceDiagram } from './source.js';
import { SEQUENCE_STYLES } from './styles.js';

/** The kind `sequence`: tables, model, rules, layout, styles and description of UML sequence diagrams. */
export const sequence = defineKind({
  spec: sequenceSpec,
  model: (reading) => sequenceModel(sequenceDiagram(reading)),
  rules: SEQUENCE_RULES,
  layout: (model, { locale }) => {
    const words = { ...WORDS[locale], title: imageTitle(TEXTS[locale].picture.sequence, model.diagram.title) };
    const layout = layoutSequence(model, words);
    return { scene: sequenceScene(layout, model, words), styles: SEQUENCE_STYLES, anchors: sequenceAnchors(layout) };
  },
  describe: (model, { locale }) => describeSequence(model, locale),
});
