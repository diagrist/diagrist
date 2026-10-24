import type { Value } from '@diagrist/lang';

/**
 * One element of UML 2.5.1 that a diagram kind can show: the section of the specification that defines it and a
 * short title in Diagrist's own words. The catalog quotes no text of the specification.
 */
export interface SpecElement {
  readonly section: string;
  readonly title: string;
}

/** The elements of one kind by the name the tables use for them, such as `INTERACTIONS.lifeline`. */
export type Catalog = Readonly<Record<string, SpecElement>>;

type Elements = readonly SpecElement[];

/**
 * What a part of a table implements (ADR 0017): `uml` whenever the part is used, `umlValues` when it takes a certain
 * value (an arrow, a choice, a reserved word such as `found`), `umlFlags` when its statement carries a certain flag.
 * Nothing else says which elements are covered; the coverage report is derived from these marks.
 */
export interface Implements {
  readonly uml?: Elements;
  readonly umlValues?: Readonly<Record<string, Elements>>;
  readonly umlFlags?: Readonly<Record<string, Elements>>;
}

type ValueKey<P> = P extends { readonly value: Value<infer T> } ? (T extends string ? T : never) : never;
type FlagKey<P> = P extends { readonly flags: infer F } ? keyof F & string : never;

/** The marks `implementing` accepts for a part: values only of its own type, flags only of its own table. */
interface Marks<P> {
  readonly uml?: Elements;
  readonly values?: Partial<Record<ValueKey<P>, Elements>>;
  readonly flags?: Partial<Record<FlagKey<P>, Elements>>;
}

/** `17.4.3.1 Message, 17.4.3.1 Lost message`: section and title of each element. */
const named = (elements: Elements): string => elements.map((e) => `${e.section} ${e.title}`).join(', ');

/** The sentence that names what a part implements, for its doc and thus for the grammar and the docs. */
const citation = (elements: Elements): string => `UML 2.5.1: ${named(elements)}.`;

/** The sentence that names what each value implements: `` UML 2.5.1: `->` 17.4.3.1 Synchronous call; ... ``. */
const valueCitation = (values: Readonly<Record<string, Elements>>): string =>
  `UML 2.5.1: ${Object.entries(values)
    .map(([value, elements]) => `\`${value}\` ${named(elements)}`)
    .join('; ')}.`;

const cited = (doc: string, sentences: readonly string[]): string => [doc, ...sentences].join(' ');

/** The flag docs of a statement definition, each marked flag with its citation. */
function citedFlags(flags: Readonly<Record<string, string>>, marks: Readonly<Record<string, Elements>>) {
  return Object.fromEntries(
    Object.entries(flags).map(([name, doc]) => {
      const elements = marks[name];
      return [name, elements ? cited(doc, [citation(elements)]) : doc];
    }),
  );
}

/**
 * Marks a part of a table as implementing catalog elements: a statement definition, an argument, a clause, an
 * attribute or a rule. Its doc, and the doc of each marked flag, gains the sentence that names them, so agents read
 * the citation in the grammar (`grammarOf`), the language spec and the skill without `lang` knowing of UML. Values
 * and flags are typed by the part: a mark on an arrow or a flag the part does not have does not compile.
 */
export function implementing<const P extends { readonly doc: string }>(marks: Marks<P>, part: P): P & Implements {
  const umlValues = marks.values as Readonly<Record<string, Elements>> | undefined;
  const umlFlags = marks.flags as Readonly<Record<string, Elements>> | undefined;
  const flags = (part as { readonly flags?: Readonly<Record<string, string>> }).flags;
  const sentences = [...(marks.uml ? [citation(marks.uml)] : []), ...(umlValues ? [valueCitation(umlValues)] : [])];
  return {
    ...part,
    doc: cited(part.doc, sentences),
    ...(flags && umlFlags ? { flags: citedFlags(flags, umlFlags) } : {}),
    ...(marks.uml ? { uml: marks.uml } : {}),
    ...(umlValues ? { umlValues } : {}),
    ...(umlFlags ? { umlFlags } : {}),
  };
}
