import type { LanguageRegistration } from '@shikijs/primitive';
import java from './grammars/java.json' with { type: 'json' };
import json from './grammars/json.json' with { type: 'json' };
import kotlin from './grammars/kotlin.json' with { type: 'json' };
import sql from './grammars/sql.json' with { type: 'json' };
import xml from './grammars/xml.json' with { type: 'json' };
import yaml from './grammars/yaml.json' with { type: 'json' };

const grammar = (data: unknown): LanguageRegistration => data as LanguageRegistration;

/**
 * The TextMate grammars this package ships, vendored as JSON from `tm-grammars` (provenance and licences in
 * GRAMMARS.md) instead of installing all two hundred of `@shikijs/langs`. XML embeds Java, which is here anyway.
 */
export const GRAMMARS: Readonly<Record<'java' | 'kotlin' | 'sql' | 'yaml' | 'json' | 'xml', LanguageRegistration>> = {
  java: grammar(java),
  kotlin: grammar(kotlin),
  sql: grammar(sql),
  yaml: grammar(yaml),
  json: grammar(json),
  xml: grammar(xml),
};

/** A language code can be shown in: one with a grammar, or `text`, which is drawn as written without colours. */
export type CodeLanguage = keyof typeof GRAMMARS | 'text';

/** Every language in a stable order, `text` last, for `oneOf` in a statement table. */
export const CODE_LANGUAGES: readonly CodeLanguage[] = ['java', 'kotlin', 'sql', 'yaml', 'json', 'xml', 'text'];

const EXTENSIONS: Readonly<Record<string, CodeLanguage>> = {
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  xml: 'xml',
  xsd: 'xml',
};

/** The language a file's extension names, case aside, such as `kotlin` for `Order.kt`; `text` for any other. */
export function languageOf(path: string): CodeLanguage {
  const extension = /\.([A-Za-z]+)$/.exec(path)?.[1]?.toLowerCase() ?? '';
  return EXTENSIONS[extension] ?? 'text';
}
