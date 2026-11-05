import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Counts that may only fall, by name, such as the findings of one rule of the line check. */
export type Counts = Readonly<Record<string, number>>;

/** One entry of a budget: counts that may only fall, and measures that are recorded but may move either way. */
export interface BudgetEntry {
  readonly counts: Counts;
  readonly measures?: Readonly<Record<string, number>>;
}

/** A count of an entry that is higher than its budget allows. */
export interface Rise {
  readonly entry: string;
  readonly count: string;
  readonly budget: number;
  readonly actual: number;
}

/** Result of comparing entries with their budget file. */
export type BudgetResult =
  | { status: 'match' }
  | { status: 'written'; reason: 'missing' | 'update' }
  | { status: 'risen'; rises: readonly Rise[] }
  | { status: 'changed'; entries: readonly string[] };

/** When `compareBudget` writes the budget file. Defaults to `process.env.UPDATE_GOLDEN === '1'`. */
export interface BudgetOptions {
  update?: boolean;
}

/** The text of a budget file: one entry per line, sorted by name, so a change shows as a change of its lines. */
function budgetText(entries: Readonly<Record<string, BudgetEntry>>): string {
  const lines = Object.keys(entries)
    .sort()
    .map((name) => `${JSON.stringify(name)}: ${JSON.stringify(entries[name])}`);
  return `{\n  ${lines.join(',\n  ')}\n}\n`;
}

/**
 * Compares entries with the budget file at `path`, a golden file whose counts may only fall. A count above its
 * budget is a rise and fails even on update, so a budget can only be tightened; a count the budget of an entry
 * does not name is allowed none, and a new entry is recorded as it is. Any other difference, a count that fell, a measure that moved or an entry added or gone, is recorded on
 * update and fails otherwise, so every improvement is kept.
 */
export function compareBudget(
  path: string,
  entries: Readonly<Record<string, BudgetEntry>>,
  options: BudgetOptions = {},
): BudgetResult {
  const update = options.update ?? process.env.UPDATE_GOLDEN === '1';
  const exists = existsSync(path);
  const budget: Record<string, BudgetEntry> = exists ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const rises = Object.keys(entries)
    .sort()
    .flatMap((entry) => {
      const allowed = budget[entry]?.counts;
      return allowed === undefined ? [] : risesOf(entry, entries[entry]?.counts ?? {}, allowed);
    });
  if (rises.length > 0) return { status: 'risen', rises };
  const text = budgetText(entries);
  if (update) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    return { status: 'written', reason: exists ? 'update' : 'missing' };
  }
  if (exists && readFileSync(path, 'utf8') === text) return { status: 'match' };
  const names = [...new Set([...Object.keys(entries), ...Object.keys(budget)])].sort();
  const changed = names.filter((n) => JSON.stringify(entries[n] ?? null) !== JSON.stringify(budget[n] ?? null));
  return { status: 'changed', entries: changed.length > 0 ? changed : names };
}

function risesOf(entry: string, actual: Counts, budget: Counts): Rise[] {
  return Object.keys(actual)
    .sort()
    .flatMap((count) => {
      const [now, allowed] = [actual[count] ?? 0, budget[count] ?? 0];
      return now > allowed ? [{ entry, count, budget: allowed, actual: now }] : [];
    });
}
