import { defineKind } from '@diagrist/core';
import { imageTitle, WORDS } from '@diagrist/parts';
import { TEXTS } from '../texts/index.js';
import { describeClass } from './describe/index.js';
import { classSpec } from './grammar/spec.js';
import { layoutClass } from './layout/index.js';
import { classModel } from './model.js';
import { CLASS_RULES } from './rules/index.js';
import { classAnchors, classScene } from './scene/index.js';
import { classDiagram } from './source.js';
import { CLASS_STYLES } from './styles.js';

/** The kind `class`: tables, model, rules, layout, styles and description of UML class diagrams. */
export const classKind = defineKind({
  spec: classSpec,
  model: (reading) => classModel(classDiagram(reading)),
  rules: CLASS_RULES,
  layout: (model, { locale }) => {
    const words = { ...WORDS[locale], title: imageTitle(TEXTS[locale].picture.class, model.diagram.title) };
    const layout = layoutClass(model, words);
    return {
      scene: classScene(layout, model, words),
      styles: CLASS_STYLES,
      anchors: classAnchors(layout),
      placed: layout.placed,
    };
  },
  describe: (model, { locale }) => describeClass(model, locale),
});
