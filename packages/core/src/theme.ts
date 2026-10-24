import type { Icon, Marker, RoleStyle, StyleRule, Styles } from './styles.js';

/**
 * Changes to a kind's style table, such as a corporate design (ADR 0008 Nr. 1, ADR 0010). A theme paints: roles,
 * CSS rules, markers, icons and the canvas. It does not change fonts or sizes, because the layout has measured with
 * them already; a theme that needs other measures is a variant of the kind.
 */
export interface Theme {
  /** Roles drawn differently; each replaces the role's classes and markers. */
  readonly roles?: Readonly<Record<string, RoleStyle>>;
  /** A rule with the name of an existing one replaces its declarations in place; a new name is added at the end. */
  readonly rules?: readonly StyleRule[];
  /** A marker with the id of an existing one replaces it; a new id is added. */
  readonly markers?: readonly Marker[];
  readonly icons?: Readonly<Record<string, Icon>>;
  readonly canvas?: string;
}

/** The style table with the theme laid over it. Without a theme it is the table itself. */
export function applyTheme(styles: Styles, theme: Theme | undefined): Styles {
  if (theme === undefined) return styles;
  const icons = { ...styles.icons, ...theme.icons };
  return {
    ...styles,
    canvas: theme.canvas ?? styles.canvas,
    roles: { ...styles.roles, ...theme.roles },
    rules: overlay(styles.rules, theme.rules ?? [], (rule) => rule.name),
    markers: overlay(styles.markers, theme.markers ?? [], (marker) => marker.id),
    ...(Object.keys(icons).length > 0 ? { icons } : {}),
  };
}

/**
 * Items of `base` overlaid in place by items of `over` with the same key, fields of `over` winning, then the new
 * ones in their order. A replaced rule keeps what the theme does not say, such as where it stands.
 */
function overlay<T extends object>(base: readonly T[], over: readonly T[], key: (item: T) => string): T[] {
  const replaced = new Map(over.map((item) => [key(item), item]));
  const known = new Set(base.map(key));
  const merged = base.map((item) => ({ ...item, ...replaced.get(key(item)) }));
  return [...merged, ...over.filter((item) => !known.has(key(item)))];
}
