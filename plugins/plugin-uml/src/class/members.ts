/** Visibility marks of UML members: public, private, protected, package. */
const VISIBILITIES = ['+', '-', '#', '~'] as const;

/** Why a member text is no valid UML member, as a case the catalogue phrases. */
export type MemberProblem = 'noName' | 'spaceInName' | 'notIdentifier' | 'afterName' | 'noType' | 'unclosed';

/**
 * A member as UML writes it: `[visibility] name [: Type]` for an attribute, `[visibility] name(params) [: Type]` for
 * an operation. Compiler, rules and description read members through this one function.
 */
export interface ParsedMember {
  readonly visibility?: (typeof VISIBILITIES)[number];
  readonly name: string;
  /** An operation is recognised by its opening parenthesis. */
  readonly operation: boolean;
  /** Parameters without parentheses, operations only. */
  readonly params?: string;
  /** Type of an attribute or return type of an operation. */
  readonly type?: string;
  readonly problem?: MemberProblem;
}

/** A name: a letter or `_`, then letters, digits and `_`; derived attributes start with `/`. */
const NAME = /^\/?[\p{L}_$][\p{L}\p{N}_$]*$/u;

function nameProblem(name: string): MemberProblem | undefined {
  if (!name) return 'noName';
  if (/\s/.test(name)) return 'spaceInName';
  return NAME.test(name) ? undefined : 'notIdentifier';
}

/** Text after the name: nothing, or `: Type`. */
function typeAfter(rest: string): { type?: string; problem?: MemberProblem } {
  const trimmed = rest.trim();
  if (!trimmed) return {};
  if (!trimmed.startsWith(':')) return { problem: 'afterName' };
  const type = trimmed.slice(1).trim();
  return type ? { type } : { problem: 'noType' };
}

const some = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };

function operation(head: Pick<ParsedMember, 'visibility'>, body: string): ParsedMember {
  const open = body.indexOf('(');
  const close = body.lastIndexOf(')');
  const name = body.slice(0, open).trim();
  const base = { ...head, name, operation: true };
  if (close < open) return { ...base, problem: 'unclosed' };
  const after = typeAfter(body.slice(close + 1));
  return {
    ...base,
    params: body.slice(open + 1, close).trim(),
    ...some('type', after.type),
    ...some('problem', nameProblem(name) ?? after.problem),
  };
}

/** Reads an attribute or an operation. */
export function parseMember(text: string): ParsedMember {
  const trimmed = text.trim();
  const first = VISIBILITIES.find((v) => trimmed.startsWith(v));
  const head = some('visibility', first);
  const body = (first ? trimmed.slice(1) : trimmed).trim();
  if (body.includes('(')) return operation(head, body);
  const colon = body.indexOf(':');
  const name = (colon < 0 ? body : body.slice(0, colon)).trim();
  const after = colon < 0 ? {} : typeAfter(body.slice(colon));
  return {
    ...head,
    name,
    operation: false,
    ...some('type', after.type),
    ...some('problem', nameProblem(name) ?? after.problem),
  };
}

/** Types of the parameters of an operation, to tell overloads apart. */
export function parameterTypes(params: string): string[] {
  if (!params.trim()) return [];
  return params.split(',').map((p) => {
    const colon = p.indexOf(':');
    return (colon < 0 ? p : p.slice(colon + 1)).replace(/\s+/g, '');
  });
}

/** Properties in braces, such as `{readOnly, ordered}`, as single words. */
export const properties = (text: string): string[] =>
  [...text.matchAll(/\{([^{}]*)\}/g)].flatMap((m) => (m[1] ?? '').split(',').map((p) => p.trim()));
