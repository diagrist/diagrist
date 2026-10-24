type Values = Readonly<Record<string, string>>;

/** Picks the text for `v.case` from a table, so a finding names its case as data, not as prose. */
export const pick = (v: Values, cases: Readonly<Record<string, string>>): string => cases[v.case ?? ''] ?? v.case ?? '';
