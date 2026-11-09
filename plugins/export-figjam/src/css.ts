/** One rule of the kernel's stylesheet: the class chain of its descendant selector, without the root class. */
export interface Rule {
  /** `.diagrist .area-green .shape` gives `['area-green', 'shape']`; the last class is the element's own. */
  readonly chain: readonly string[];
  readonly props: Readonly<Record<string, string>>;
}

/** The stylesheet of a picture: the declarations of the root rule apart, the other rules in cascade order. */
export interface Sheet {
  /** `font-family`, `font-size` and `font-kerning` of the whole picture, which Figma does not inherit. */
  readonly root: Readonly<Record<string, string>>;
  /** By specificity, then by their place in the sheet, so applying them in turn lets the winner write last. */
  readonly rules: readonly Rule[];
}

const RULE = /([^{}]+)\{([^}]*)\}/g;

/** Declarations as properties; a number in pixels loses its unit, which an attribute does not take. */
function declarations(body: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (name !== '' && value !== '') props[name] = value.replace(/^(-?[\d.]+)px$/, '$1');
  }
  return props;
}

/**
 * Reads the stylesheet `toSvg` writes: `.root { … }` and rules of class chains such as `.root .area-x .name { … }`.
 * A rule of more classes outranks one of fewer, as in CSS, and of equal rank the later one wins.
 */
export function readSheet(css: string, rootClass: string): Sheet {
  const root: Record<string, string> = {};
  const rules: Rule[] = [];
  for (const [, selector = '', body = ''] of css.matchAll(RULE)) {
    const classes = selector
      .trim()
      .split(/\s+/)
      .map((part) => part.replace(/^\./, ''));
    const chain = classes.filter((name) => name !== rootClass);
    if (chain.length === 0) Object.assign(root, declarations(body));
    else rules.push({ chain, props: declarations(body) });
  }
  return {
    root,
    rules: rules
      .map((rule, at) => ({ rule, at }))
      .sort(byRank)
      .map(({ rule }) => rule),
  };
}

const byRank = (a: { rule: Rule; at: number }, b: { rule: Rule; at: number }): number =>
  a.rule.chain.length - b.rule.chain.length || a.at - b.at;

/**
 * Whether a descendant selector matches an element of the classes `own` below ancestors of the classes in
 * `ancestors`, outermost first: its last class is the element's, every other one belongs to an ancestor, in order.
 */
export function matches(
  chain: readonly string[],
  own: readonly string[],
  ancestors: readonly (readonly string[])[],
): boolean {
  const last = chain.at(-1);
  if (last === undefined || !own.includes(last)) return false;
  let depth = ancestors.length - 1;
  for (let i = chain.length - 2; i >= 0; i--) {
    const wanted = chain[i] ?? '';
    while (depth >= 0 && !(ancestors[depth] ?? []).includes(wanted)) depth--;
    if (depth < 0) return false;
    depth--;
  }
  return true;
}

/** The first family of a CSS font stack, without quotes: Figma's import reads no fallback list. */
export const firstFamily = (stack: string): string => (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
