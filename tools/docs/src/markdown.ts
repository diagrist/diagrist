/** A Markdown table; `|` inside a cell is escaped, so operators like `--|>` do not split it. */
export function table(head: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const line = (cells: readonly string[]): string =>
    `| ${cells.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`;
  return [line(head), `|${head.map(() => '---').join('|')}|`, ...rows.map(line)];
}

/** Inline code: `` `text` ``. */
export function code(text: string): string {
  return `\`${text}\``;
}

/** The first line of every derived Markdown file: where it comes from, and that it is not edited by hand. */
export function generatedFrom(source: string): string {
  return `<!-- Generated from ${source} by \`pnpm docs:generate\`. Do not edit. -->`;
}
