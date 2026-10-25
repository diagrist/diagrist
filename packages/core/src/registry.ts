import { type Diagnostic, diagnostic } from '@diagrist/lang';
import { KERNEL_CODES } from './messages.js';
import type { Kind, Plugin } from './plugin.js';

/** Kinds by name. A kind registered twice keeps its first plugin and is reported (K101). */
export function register(plugins: readonly Plugin[]): { kinds: Map<string, Kind>; diagnostics: Diagnostic[] } {
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
