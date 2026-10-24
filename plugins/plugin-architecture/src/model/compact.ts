/**
 * The object without its `undefined` entries, so optional fields are left out instead of set to `undefined`, as
 * `exactOptionalPropertyTypes` wants them.
 */
export function compact<T extends object>(values: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}
