import type { Participant, SequenceDiagram } from '../diagram.js';
import { activations } from './activations.js';
import { frameIds, type Gates, resolveGates } from './gates.js';
import { buildTree } from './tree.js';
import type { SequenceModel } from './types.js';

/** The model of a sequence diagram: fragment tree, activation bars, gates and findings. */
export function sequenceModel(diagram: SequenceDiagram): SequenceModel {
  const participants = new Map<string, Participant>();
  for (const p of diagram.participants) if (!participants.has(p.id)) participants.set(p.id, p);
  const gates = resolveGates(diagram, participants);
  const tree = buildTree(diagram.events);
  const bars = activations(tree.root, gates.events, gates.byMessage);
  return {
    diagram,
    participants,
    order: [...participants.keys()],
    root: tree.root,
    fragments: tree.fragments,
    activations: bars.bars,
    answered: bars.answered,
    issues: bars.issues,
    framed: framed(diagram, gates),
    coregions: tree.coregions,
    gates: gates.byMessage,
    gateIds: gates.ids,
    frameIds: frameIds(diagram.events),
  };
}

/** A gate lies on the frame; without a name of its own the frame shows the title. */
function framed(d: SequenceDiagram, g: Gates): string | undefined {
  const gates = [...g.byMessage.values()].some((gate) => gate.frame === undefined);
  return d.frame || gates ? (d.frame?.label ?? d.title) : undefined;
}
