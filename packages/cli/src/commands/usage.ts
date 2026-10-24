import type { ArgumentSpec, Command, OptionSpec } from './command.js';

/** Arguments as written in a usage line: `<file>`, `[kind]`, `<files...>`. */
export function usageOf(specs: readonly ArgumentSpec[]): string {
  return specs.map(argumentLabel).join(' ');
}

/** One argument as written in a usage line: `<file>`, `[kind]` when optional, `<files...>` when many. */
export function argumentLabel(spec: ArgumentSpec): string {
  if (spec.count === 'many') return `<${spec.name}...>`;
  return spec.count === 'optional' ? `[${spec.name}]` : `<${spec.name}>`;
}

/** `dgr fmt <files...> [options]`, the first line of a command's help. */
export function commandLine(command: Command): string {
  return ['dgr', command.name, usageOf(command.arguments), '[options]'].filter((part) => part !== '').join(' ');
}

/** An option as written in help: `-o, --out <file>`, `--locale <en|de>`, `--check`. */
export function optionLabel(name: string, spec: OptionSpec): string {
  const flag = spec.short ? `-${spec.short}, --${name}` : `--${name}`;
  if (spec.type === 'boolean') return flag;
  return `${flag} <${spec.choices ? spec.choices.join('|') : (spec.value ?? 'value')}>`;
}

/** The first sentence of a doc, used as the summary of a command in lists. */
export function summaryOf(doc: string): string {
  const end = doc.search(/\.(\s|$)/);
  return end === -1 ? doc : doc.slice(0, end + 1);
}
