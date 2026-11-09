import { defineKind } from '@diagrist/core';
import { imageTitle, WORDS } from '@diagrist/parts';
import { withForms } from '../shared/forms.js';
import { describeState } from './describe/index.js';
import { STATE_NAME } from './describe/texts.js';
import { stateSpec } from './grammar/spec.js';
import { layoutState } from './layout/index.js';
import { stateModel } from './model.js';
import { STATE_RULES } from './rules/index.js';
import { stateAnchors, stateScene } from './scene/index.js';
import { vertexForm } from './scene/nodes.js';
import { stateDiagram } from './source.js';
import { STATE_STYLES } from './styles.js';

/** The kind `state`: tables, model, rules, layout, styles and description of UML state machine diagrams. */
export const stateKind = defineKind({
  spec: stateSpec,
  model: (reading) => stateModel(stateDiagram(reading)),
  rules: STATE_RULES,
  layout: (model, { locale }) => {
    const words = { ...WORDS[locale], title: imageTitle(STATE_NAME[locale], model.diagram.title) };
    const layout = layoutState(model, words);
    return {
      scene: stateScene(layout, model, words),
      styles: STATE_STYLES,
      anchors: withForms(stateAnchors(layout), (id) => {
        const v = model.vertices.get(id);
        return v && vertexForm(v);
      }),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeState(model, locale),
});
