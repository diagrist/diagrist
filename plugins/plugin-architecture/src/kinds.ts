import { defineKind } from '@diagrist/core';
import { WORDS } from '@diagrist/parts';
import { describeArchitecture } from './describe/index.js';
import type { Level } from './grammar/elements.js';
import { architectureSpec } from './grammar/spec.js';
import { layoutArchitecture } from './layout/index.js';
import { architectureModel } from './model/build.js';
import { ARCHITECTURE_RULES } from './rules/index.js';
import { architectureAnchors, architectureScene } from './scene/index.js';
import { stylesOf } from './styles/index.js';
import { TEXTS } from './texts/index.js';

/**
 * One C4 level as a kind: the shared tables with the level's elements, model, rules, layout on `layout-grid`,
 * the style table of its look, and a description. Each level draws diff pictures (ADR 0021).
 */
function architectureKind(level: Level) {
  return defineKind({
    spec: architectureSpec(level),
    model: (reading) => architectureModel(level, reading),
    rules: ARCHITECTURE_RULES,
    layout: (model, { locale }) => {
      const layout = layoutArchitecture(model, TEXTS[locale], locale);
      return {
        scene: architectureScene(model, layout, TEXTS[locale], WORDS[locale]),
        styles: stylesOf(model.look),
        anchors: architectureAnchors(model, layout),
        placed: layout.placed,
      };
    },
    describe: (model, { locale }) => describeArchitecture(model, TEXTS[locale], WORDS[locale]),
    diff: true,
  });
}

export const context = architectureKind('context');
export const container = architectureKind('container');
export const component = architectureKind('component');
