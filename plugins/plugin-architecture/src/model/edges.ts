import { ARROWS } from '../grammar/edges.js';
import type { ArchitectureStatement } from '../grammar/spec.js';
import { compact } from './compact.js';
import type { ArchEdge, Flow, Step } from './types.js';

type Of<K extends ArchitectureStatement['keyword']> = Extract<ArchitectureStatement, { keyword: K }>;
type Line = Of<'edge'> | Of<'flow'>['lines'][number];
type Styles = ReadonlyMap<string, { readonly tone?: ArchEdge['tone'] }>;

function edgeOf(e: Line, index: number, styles: Styles, step: Step | undefined): ArchEdge {
  const a = e.attributes;
  return {
    index,
    from: e.from,
    to: e.to,
    kind: ARROWS[e.arrow].kind,
    source: e.span,
    ...compact({
      label: e.label,
      via: a.via,
      schedule: a.schedule,
      volume: a.volume,
      sla: a.sla,
      mark: a.mark,
      bundle: a.bundle,
      lane: a.lane,
      tone: a.tone ?? styles.get(a.style ?? '')?.tone,
      step,
      origin: e.origin,
    }),
  };
}

/**
 * All edges in drawing order: the steps of the flows in source order, numbered across all flows, then the free
 * edges. The numbers are made here once; legend and description read them from the model. A step a diff picture
 * shows as removed gets no number, so the others keep theirs.
 */
export function edgesOf(
  flows: readonly Of<'flow'>[],
  free: readonly Of<'edge'>[],
  styles: Styles,
): { edges: ArchEdge[]; flows: Flow[] } {
  const edges: ArchEdge[] = [];
  const ranges: Flow[] = [];
  let numbered = 0;
  for (const f of flows) {
    const accent = f.flags.accent;
    const from = numbered + 1;
    for (const line of f.lines) {
      const gone = line.origin === 'removed';
      if (!gone) numbered++;
      edges.push(edgeOf(line, edges.length, styles, gone ? undefined : { flow: f.id, n: numbered, accent }));
    }
    if (numbered >= from) ranges.push({ id: f.id, accent, from, to: numbered });
  }
  for (const e of free) edges.push(edgeOf(e, edges.length, styles, undefined));
  return { edges, flows: ranges };
}
