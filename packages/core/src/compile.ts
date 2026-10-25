import {
  type Attr,
  attr,
  type Diagnostic,
  type Document,
  diagnostic,
  LANG_CODES,
  LOCALES,
  type Locale,
  list,
  type Need,
  oneOf,
  read,
  unfold,
} from '@diagrist/lang';
import type { Anchors } from './anchors.js';
import { mergeFindings } from './findings.js';
import { KERNEL_CODES } from './messages.js';
import { type DrawnPicture, drawPicture } from './picture.js';
import type { Kind, Plugin } from './plugin.js';
import { register } from './registry.js';
import type { Theme } from './theme.js';

/** What `compile` may draw and how: the registered plugins, the files the source needs, and whether the SVG is inline. */
export interface CompileOptions {
  /** The plugins whose kinds may be drawn; nothing else is known to the kernel. */
  readonly plugins: readonly Plugin[];
  /** Leave stylesheet and background out of the SVG, for hosts that style the classes themselves. */
  readonly inline?: boolean;
  /** Laid over the style table of the drawn kind, such as a corporate design; see `Theme`. */
  readonly theme?: Theme;
  /** Path of the source relative to the folder the host runs in; paths the source names are resolved against it. */
  readonly path?: string;
  /** Texts of the files the source needs (`Compilation.needs`), by their path. */
  readonly files?: Readonly<Record<string, string>>;
}

/**
 * The result of `compile`. Picture, anchors and description of the base are present exactly when no diagnostic is
 * an error. Diagnostics are data; `formatMessage` phrases them in any locale.
 */
export interface Compilation {
  readonly diagnostics: readonly Diagnostic[];
  /** Language of the picture and the description, from the `locale=` header (default `en`). */
  readonly locale: Locale;
  readonly svg?: string;
  readonly anchors?: Anchors;
  readonly description?: string;
  /** The base picture first, then one per variant of the file (ADR 0021), each drawn when it has no error. */
  readonly pictures: readonly DrawnPicture[];
  /**
   * Every file the source reads, with the place that names it. A host reads those `files` lacks and compiles again;
   * a missing one is L118 until it does.
   */
  readonly needs: readonly Need[];
}

/**
 * The `locale=` header attribute shared by all kinds: plugins put it into their header table, the kernel
 * reads it. It sets the language of texts in the picture such as `[else]`, and of the description.
 */
export const localeAttribute: Attr<Locale> = attr(
  oneOf(LOCALES),
  'Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`.',
);

/**
 * Turns a source into checked pictures. The header names the kind; `use` and variants are unfolded into one reading
 * per picture, and the plugin that registered the kind builds each model, runs its rules and lays out the scene.
 * Pure: same source, files and plugins, same bytes. It does not throw: a plugin that fails is reported as K110, with
 * its error message.
 */
export function compile(source: string, options: CompileOptions): Compilation {
  const { document, diagnostics: syntax } = read(source);
  const registry = register(options.plugins);
  const name = kindName(document);
  const kind = name === undefined ? undefined : registry.kinds.get(name);
  if (kind === undefined) {
    const found = noKind(document, name, [...registry.kinds.keys()]);
    return { ...nothing(FALLBACK), diagnostics: sorted([...syntax, ...registry.diagnostics, found]) };
  }
  const before = [...syntax, ...registry.diagnostics];
  try {
    return compileKind(kind, document, before, options);
  } catch (error) {
    const found = failed(kind, options.plugins, document, error);
    return { ...nothing(FALLBACK), diagnostics: sorted([...before, found]) };
  }
}

const FALLBACK = 'en' as const;

/** The work of the plugin that owns the kind, from unfolding the file to the SVG of every picture. */
function compileKind(kind: Kind, document: Document, before: Diagnostic[], options: CompileOptions): Compilation {
  const unfolded = unfold(kind.spec, document, {
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.files === undefined ? {} : { files: options.files }),
  });
  const [base] = unfolded.pictures;
  const locale = LOCALES.find((l) => l === base?.reading.header?.attributes.locale) ?? FALLBACK;
  const file = [...before, ...unfolded.diagnostics];
  const withDiff = options.plugins.flatMap((p) => p.kinds.filter((k) => k.diff === true).map((k) => k.spec.name));
  const pictures = unfolded.pictures.map((picture) =>
    drawPicture(kind, picture, { locale, blocked: hasErrors(file), withDiff, options }),
  );
  const diagnostics = sorted(mergeFindings(file, pictures));
  const [drawn] = pictures;
  const clean = !hasErrors(diagnostics) && drawn !== undefined;
  return {
    diagnostics,
    locale,
    ...(clean && drawn.svg !== undefined ? { svg: drawn.svg } : {}),
    ...(clean && drawn.anchors !== undefined ? { anchors: drawn.anchors } : {}),
    ...(clean && drawn.description !== undefined ? { description: drawn.description } : {}),
    pictures: pictures.map(({ diagnostics: _, ...picture }) => picture),
    needs: unfolded.needs,
  };
}

const nothing = (locale: Locale) => ({ locale, pictures: [], needs: [] });

/**
 * K110 on the header: which plugin failed on which kind, and what it threw as one line, such as
 * `RangeError: Maximum call stack size exceeded`. Never the stack, which says nothing to the author of a diagram.
 */
function failed(kind: Kind, plugins: readonly Plugin[], document: Document, error: unknown): Diagnostic {
  const plugin = plugins.find((candidate) => candidate.kinds.includes(kind))?.name ?? '';
  const at = document.statements[0]?.keywordSpan ?? { line: 1, column: 1, length: 1 };
  const thrown = error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
  const [line = ''] = (typeof error === 'string' ? error : thrown).split('\n');
  return diagnostic(KERNEL_CODES.kindFailed, 'error', at, { kind: kind.spec.name, plugin, error: line });
}

/**
 * Why no kind can draw the source: without a header line it is L100, which shows how a diagram starts; with a
 * header naming an unknown kind it is K100. Both list the registered kinds, so the next try can be right.
 */
function noKind(document: Document, name: string | undefined, kinds: readonly string[]): Diagnostic {
  const at = document.statements[0]?.keywordSpan ?? { line: 1, column: 1, length: 1 };
  const allowed = list(kinds);
  if (name !== undefined) return diagnostic(KERNEL_CODES.unknownKind, 'error', at, { found: name, allowed });
  const example = `diagram ${kinds[0] ?? '<kind>'} "Title"`;
  return diagnostic(LANG_CODES.missingHeader, 'error', at, { kind: '<kind>', allowed, example });
}

function kindName(document: Document): string | undefined {
  const [head] = document.statements;
  const [name] = head?.keyword === 'diagram' ? head.arguments : [];
  return name?.kind === 'word' ? name.value : undefined;
}

const hasErrors = (diagnostics: readonly Diagnostic[]): boolean => diagnostics.some((d) => d.severity === 'error');

const sorted = (diagnostics: readonly Diagnostic[]): Diagnostic[] =>
  [...diagnostics].sort((a, b) => a.span.line - b.span.line || a.span.column - b.span.column);
