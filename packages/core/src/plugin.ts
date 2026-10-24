import type { KindReading, KindSpec, Locale, Severity, Span } from '@diagrist/lang';
import type { Anchors } from './anchors.js';
import type { Scene } from './scene.js';
import type { Styles } from './styles.js';

/** A finding of a rule: where, and the values its catalogue message is phrased with. */
export interface Finding {
  readonly span: Span;
  readonly values?: Readonly<Record<string, string>>;
}

/**
 * A check on the model of a kind. Code and severity live here once; the message texts live in the plugin's
 * catalogue under the same code (ADR 0004), so the rule only says where and with which values.
 */
export interface Rule<M> {
  /** Plugin prefix and number, such as `U403` (ADR 0008). */
  readonly code: string;
  readonly severity: Severity;
  /** What the rule checks and why, for the docs and for agents. */
  readonly doc: string;
  check(model: M): readonly Finding[];
}

/** What a kind's layout hands to the kernel: the scene, the table its roles are styled with, the anchors. */
export interface Drawing {
  readonly scene: Scene;
  readonly styles: Styles;
  readonly anchors: Anchors;
}

/** What a kind learns about the compilation besides its model. */
export interface KindContext {
  /** Language of the texts in the picture and the description (ADR 0008). */
  readonly locale: Locale;
}

/**
 * A diagram kind, such as `sequence`: its statement tables, how a reading becomes a model, the rules on
 * that model, the layout into a scene, and a description in words. `S` is the statement value type that
 * `readKind` derives from the tables, `M` the model.
 */
export interface Kind<M = unknown, S = unknown> {
  readonly spec: KindSpec;
  model(reading: KindReading<S>): M;
  readonly rules: readonly Rule<M>[];
  layout(model: M, context: KindContext): Drawing;
  /** Alt text: the diagram in sentences, in the locale of the context. */
  describe(model: M, context: KindContext): string;
}

/** Message templates by code and locale, filled with the values of a diagnostic. */
export type Catalogue = Readonly<
  Record<string, Readonly<Record<Locale, (values: Readonly<Record<string, string>>) => string>>>
>;

/** A package that adds diagram kinds. Its rule codes share one prefix and have a message in every locale. */
export interface Plugin {
  readonly name: string;
  readonly kinds: readonly Kind[];
  readonly messages: Catalogue;
}

/** Declares a plugin. It is plain data; hosts pass it to `compile` in the `plugins` list. */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}
