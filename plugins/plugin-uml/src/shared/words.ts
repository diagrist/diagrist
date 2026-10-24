/** `n` with the singular or plural noun. */
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
