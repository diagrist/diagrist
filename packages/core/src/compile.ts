import {
  type Attr,
  attr,
  type Diagnostic,
  type Document,
  diagnostic,
  type Locale,
  oneOf,
  read,
  readKind,
} from '@diagrist/lang';
import type { Anchors } from './anchors.js';
import { KERNEL_CODES } from './messages.js';
import type { Kind, Plugin } from './plugin.js';
import { toSvg } from './svg.js';

/** What `compile` may draw and how: the registered plugins and whether the SVG is inline. */
export interface CompileOptions {
  /** The plugins whose kinds may be drawn; nothing else is known to the kernel. */
  readonly plugins: readonly Plugin[];
  /** Leave stylesheet and background out of the SVG, for hosts that style the classes themselves. */
  readonly inline?: boolean;
}

/**
 * The result of `compile`. Picture, anchors and description are present exactly when no diagnostic is an error.
 * Diagnostics are data; `formatMessage` phrases them in any locale.
 */
export interface Compilation {
  readonly diagnostics: readonly Diagnostic[];
  /** Language of the picture and the description, from the `locale=` header (default `en`). */
  readonly locale: Locale;
  readonly svg?: string;
  readonly anchors?: Anchors;
  readonly description?: string;
}

const LOCALES = ['en', 'de'] as const satisfies readonly Locale[];

/**
 * The `locale=` header attribute shared by all kinds: plugins put it into their header table, the kernel
 * reads it. It sets the language of texts in the picture such as `[else]`, and of the description.
 */
export const localeAttribute: Attr<Locale> = attr(
  oneOf(LOCALES),
  'Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`.',
);

/**
 * Turns a source into a checked picture. The header names the kind; the plugin that registered it reads the
 * statements against its tables, builds the model, runs its rules and lays out the scene. Pure: same source
 * and plugins, same bytes.
 */
export function compile(source: string, options: CompileOptions): Compilation {
  const { document, diagnostics: syntax } = read(source);
  const fallback = 'en' as const;
  const registry = register(options.plugins);
  const name = kindName(document);
  const kind = name === undefined ? undefined : registry.kinds.get(name);
  if (kind === undefined) {
    const at = document.statements[0]?.keywordSpan ?? { line: 1, column: 1, length: 1 };
    const allowed = [...registry.kinds.keys()].map((k) => `\`${k}\``).join(', ') || 'none';
    const unknown = diagnostic(KERNEL_CODES.unknownKind, 'error', at, { found: name ?? '', allowed });
    return { diagnostics: sorted([...syntax, ...registry.diagnostics, unknown]), locale: fallback };
  }
  const reading = readKind(kind.spec, document);
  const locale = LOCALES.find((l) => l === reading.header?.attributes.locale) ?? fallback;
  const found = [...syntax, ...registry.diagnostics, ...reading.diagnostics];
  if (hasErrors(found)) return { diagnostics: sorted(found), locale };
  const model = kind.model(reading);
  const checked = sorted([...found, ...runRules(kind, model)]);
  if (hasErrors(checked)) return { diagnostics: checked, locale };
  const drawing = kind.layout(model, { locale });
  return {
    diagnostics: checked,
    locale,
    svg: toSvg(drawing.scene, drawing.styles, options.inline === true ? { inline: true } : {}),
    anchors: drawing.anchors,
    description: kind.describe(model, { locale }),
  };
}

function kindName(document: Document): string | undefined {
  const [head] = document.statements;
  const [name] = head?.keyword === 'diagram' ? head.arguments : [];
  return name?.kind === 'word' ? name.value : undefined;
}

/** Kinds by name. A kind registered twice keeps its first plugin and is reported. */
function register(plugins: readonly Plugin[]): { kinds: Map<string, Kind>; diagnostics: Diagnostic[] } {
  const kinds = new Map<string, Kind>();
  const owners = new Map<string, string[]>();
  for (const plugin of plugins)
    for (const kind of plugin.kinds) {
      if (!kinds.has(kind.spec.name)) kinds.set(kind.spec.name, kind);
      owners.set(kind.spec.name, [...(owners.get(kind.spec.name) ?? []), plugin.name]);
    }
  const diagnostics = [...owners]
    .filter(([, names]) => names.length > 1)
    .map(([kind, names]) =>
      diagnostic(
        KERNEL_CODES.duplicateKind,
        'warning',
        { line: 1, column: 1, length: 1 },
        {
          kind,
          plugins: names.map((n) => `\`${n}\``).join(', '),
        },
      ),
    );
  return { kinds, diagnostics };
}

function runRules(kind: Kind, model: unknown): Diagnostic[] {
  return kind.rules.flatMap((rule) =>
    rule.check(model).map((finding) => diagnostic(rule.code, rule.severity, finding.span, { ...finding.values })),
  );
}

const hasErrors = (diagnostics: readonly Diagnostic[]): boolean => diagnostics.some((d) => d.severity === 'error');

const sorted = (diagnostics: readonly Diagnostic[]): Diagnostic[] =>
  [...diagnostics].sort((a, b) => a.span.line - b.span.line || a.span.column - b.span.column);
