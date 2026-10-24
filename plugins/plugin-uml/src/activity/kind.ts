import { defineKind } from '@diagrist/core';
import { imageTitle, WORDS } from '@diagrist/parts';
import { describeActivity } from './describe/index.js';
import { ACTIVITY_NAME } from './describe/texts.js';
import { activitySpec } from './grammar/spec.js';
import { layoutActivity } from './layout/index.js';
import { activityModel } from './model/index.js';
import { ACTIVITY_RULES } from './rules/index.js';
import { activityAnchors, activityScene } from './scene/index.js';
import { activityDiagram } from './source.js';
import { ACTIVITY_STYLES } from './styles.js';

/** The kind `activity`: tables, model, rules, layout, styles and description of UML activity diagrams. */
export const activityKind = defineKind({
  spec: activitySpec,
  model: (reading) => activityModel(activityDiagram(reading)),
  rules: ACTIVITY_RULES,
  layout: (model, { locale }) => {
    const words = { ...WORDS[locale], title: imageTitle(ACTIVITY_NAME[locale], model.diagram.title) };
    const layout = layoutActivity(model, words);
    return {
      scene: activityScene(layout, model, words),
      styles: ACTIVITY_STYLES,
      anchors: activityAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeActivity(model, locale),
});
