import { defineKind, definePlugin, type Plugin } from '@diagrist/core';
import { codeSpec } from './grammar/spec.js';
import { layoutCode } from './layout/index.js';
import { CODE_MESSAGES } from './messages/index.js';
import { codeModel } from './model.js';
import { CODE_RULES } from './rules/index.js';
import { codeAnchors, codePlaced, codeScene } from './scene/index.js';
import { CODE_STYLES } from './styles.js';
import { describeCode, headerOf } from './texts.js';

const code = defineKind({
  spec: codeSpec,
  model: codeModel,
  rules: CODE_RULES,
  layout: (model, { locale }) => {
    const header = headerOf(model, locale);
    const layout = layoutCode(model, { width: header.width, subtitle: header.subtitle !== undefined });
    return {
      scene: codeScene(layout, header),
      styles: CODE_STYLES,
      anchors: codeAnchors(layout),
      placed: codePlaced(layout),
    };
  },
  describe: (model, { locale }) => describeCode(model, locale),
});

/**
 * Code diagrams: the kind `code`, cards of highlighted source read from files when the picture is built, with marks,
 * notes and links. Highlighting and excerpts come from `@diagrist/code`; rule codes start with `S` (ADR 0011, 0026).
 */
export const codePlugin: Plugin = definePlugin({ name: 'code', kinds: [code], messages: CODE_MESSAGES });
