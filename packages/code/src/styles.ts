import { type RoleStyle, rule, type StyleRule } from '@diagrist/core';
import { TOKEN_ROLES, type TokenRole } from './roles.js';

/** The scene role of a token role, the name a run carries: `codeKeyword` for `keyword`. */
export const sceneRole = (role: TokenRole): string => `code${role.charAt(0).toUpperCase()}${role.slice(1)}`;

/** The CSS class of a token role, which a theme overrides to recolour code: `code-keyword` for `keyword`. */
const classOf = (role: TokenRole | 'fold'): string => `code-${role}`;

/**
 * The roles highlighted runs carry, each to its class: `codeKeyword` to `code-keyword` and so on, and `codeFold` for
 * the `… }` of a folded body. A kind spreads them into the roles of its style table.
 */
export const CODE_ROLES: Readonly<Record<string, RoleStyle>> = {
  ...Object.fromEntries(TOKEN_ROLES.map((role) => [sceneRole(role), { classes: [classOf(role)] }])),
  codeFold: { classes: [classOf('fold')] },
};

/** A colour per token role and for the fold of an outline, as CSS colours. */
export type CodePalette = Readonly<Record<TokenRole | 'fold', string>>;

/**
 * Colours on a white card after Atom's One Light, calm enough for a diagram, each distinct in a grey print except
 * where the role is already plain from its place (keys stand left, strings right).
 */
export const CODE_PALETTE: CodePalette = {
  keyword: '#a626a4',
  type: '#b76b01',
  function: '#4078f2',
  string: '#50a14f',
  literal: '#986801',
  comment: '#8e8f96',
  annotation: '#0184bc',
  key: '#e45649',
  fold: '#a1a1aa',
};

/**
 * The rules that paint the runs of `CODE_ROLES` in a palette: only a fill each, comments in italics, since font and
 * size come from the text the runs belong to. A look passes its own palette; a theme replaces single rules by name.
 */
export function codeRules(palette: CodePalette): StyleRule[] {
  return [...TOKEN_ROLES, 'fold' as const].map((role) =>
    rule(classOf(role), `fill: ${palette[role]};${role === 'comment' ? ' font-style: italic;' : ''}`),
  );
}
