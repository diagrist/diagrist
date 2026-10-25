import type { ThemeRegistration } from '@shikijs/primitive';

/**
 * What a piece of code is, as far as a picture cares: the closed set a style table paints. Operators, punctuation
 * and plain names have no role and take the colour of their line, so a line is split into as few runs as it needs.
 * `literal` is a number or a constant such as `true` and `null`; `key` names a field of data: a YAML or JSON key, an
 * XML tag or attribute.
 */
export type TokenRole = 'keyword' | 'type' | 'function' | 'string' | 'literal' | 'comment' | 'annotation' | 'key';

/** The token roles in the order of the style table. */
export const TOKEN_ROLES: readonly TokenRole[] = [
  'keyword',
  'type',
  'function',
  'string',
  'literal',
  'comment',
  'annotation',
  'key',
];

/** A token role, or a name a declaration gives a method or a type: painted as `function` or `type`, found by `symbol`. */
type Kind = TokenRole | 'plain' | 'declaredFunction' | 'declaredType';

/**
 * TextMate selectors per kind of token. As in an editor theme the most specific selector wins: `storage.type.java`
 * is a class name, but its primitives and `var` are keywords; a keyword inside a comment, such as `@param` in
 * Javadoc, stays a comment; a method name after `meta.method.identifier` is declared, after `meta.method-call` called.
 */
const SELECTORS: Readonly<Record<Kind, readonly string[]>> = {
  plain: ['keyword.operator', 'punctuation', 'storage.type.function.arrow', 'meta.declaration.annotation constant'],
  comment: [
    'comment',
    'punctuation.definition.comment',
    ...['keyword', 'storage', 'entity', 'string', 'variable', 'punctuation'].map((s) => `comment ${s}`),
  ],
  string: ['string', 'punctuation.definition.string'],
  literal: ['constant.numeric', 'constant.language', 'constant.character'],
  keyword: ['keyword', 'storage.modifier', 'storage.type.primitive', 'storage.type.local', 'keyword.control.new'],
  type: ['entity.name.type', 'support.class', 'support.type', 'entity.other.inherited-class', 'storage.type'],
  function: ['entity.name.function', 'support.function'],
  annotation: [
    'storage.type.annotation',
    'punctuation.definition.annotation',
    'entity.name.type.annotation',
    'meta.declaration.annotation punctuation',
  ],
  key: [
    'entity.name.tag',
    'entity.other.attribute-name',
    'support.type.property-name',
    'punctuation.support.type.property-name',
  ],
  declaredFunction: ['entity.name.function.declaration', 'meta.method.identifier entity.name.function'],
  declaredType: [
    'entity.name.type.class',
    'entity.name.type.enum',
    'entity.name.type.record',
    'entity.name.type.object',
  ],
};

const KINDS = Object.keys(SELECTORS) as Kind[];

/** Kind `i` is painted `#0000<i+1>` by the theme, so the colour Shiki gives a token names its kind and nothing else. */
const colorOf = (index: number): string => `#0000${(index + 1).toString(16).padStart(2, '0')}`;

/** A Shiki theme that paints kinds of tokens instead of colours; the style table of the picture paints the roles. */
export const ROLE_THEME: ThemeRegistration & { readonly name: string } = {
  name: 'diagrist-roles',
  type: 'light',
  fg: colorOf(KINDS.indexOf('plain')),
  bg: '#ffffff',
  settings: KINDS.map((kind, index) => ({ scope: [...SELECTORS[kind]], settings: { foreground: colorOf(index) } })),
};

/** What a token is by the colour the role theme gave it: its role, none for plain text, and whether it declares. */
export function tokenOf(color: string | undefined): { readonly role?: TokenRole; readonly declares?: true } {
  const kind = KINDS[Number.parseInt((color ?? '').slice(1), 16) - 1] ?? 'plain';
  if (kind === 'plain') return {};
  if (kind === 'declaredFunction') return { role: 'function', declares: true };
  if (kind === 'declaredType') return { role: 'type', declares: true };
  return { role: kind };
}
