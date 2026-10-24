import { checkKind, LOCALES } from '@diagrist/lang';
import type { Plugin } from './plugin.js';

/**
 * Checks a plugin against ADR 0004 and ADR 0005: every kind passes `checkKind`, every rule has a doc and a
 * catalogue message in every locale, and codes are unique. Returns one message per problem; plugin tests
 * expect an empty list.
 */
export function checkPlugin(plugin: Plugin): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const kind of plugin.kinds) {
    problems.push(...checkKind(kind.spec).map((problem) => `kind ${kind.spec.name}: ${problem}`));
    for (const rule of kind.rules) {
      if (seen.has(rule.code)) problems.push(`rule ${rule.code} is defined twice`);
      seen.add(rule.code);
      if (rule.doc.trim() === '') problems.push(`rule ${rule.code} has no doc`);
      for (const locale of LOCALES)
        if (plugin.messages[rule.code]?.[locale] === undefined)
          problems.push(`rule ${rule.code} has no message in ${locale}`);
    }
  }
  return problems;
}
