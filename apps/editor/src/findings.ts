import type { Diagnostic } from '@codemirror/lint';
import type { Text } from '@codemirror/state';
import type { Finding } from './protocol.js';

/** Where a finding sits in the document, clamped so a stale finding never points past the end. */
function range(doc: Text, finding: Finding): { from: number; to: number } {
  const line = doc.line(Math.min(Math.max(finding.line, 1), doc.lines));
  const from = Math.min(line.from + Math.max(finding.column - 1, 0), line.to);
  return { from, to: Math.min(from + Math.max(finding.length, 1), line.to) };
}

/** Findings as CodeMirror diagnostics, underlined in the source. */
export function toDiagnostics(doc: Text, findings: readonly Finding[]): Diagnostic[] {
  return findings.map((f) => ({
    ...range(doc, f),
    severity: f.severity,
    message: `${f.code} ${f.message}`,
    source: 'dgr',
  }));
}

/** Fills a list with one line per finding; `onPick` gets the clicked finding's place. */
export function showFindings(
  list: HTMLElement,
  findings: readonly Finding[],
  onPick?: (finding: Finding) => void,
): void {
  list.replaceChildren(
    ...findings.map((f) => {
      const item = document.createElement('li');
      item.className = f.severity;
      item.textContent = `${f.line}:${f.column}  ${f.code}  ${f.message}`;
      if (onPick) item.addEventListener('click', () => onPick(f));
      return item;
    }),
  );
}
