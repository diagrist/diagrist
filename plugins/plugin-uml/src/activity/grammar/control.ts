import { arg, id, optionalArg, statement, text } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import { frames, lane } from './values.js';

const node = arg('id', id(), 'Id that `go`, `handler` and `in` use for this node.');

export const initial = statement(
  'initial',
  implementing(
    { uml: [ACTIVITIES.initialNode] },
    {
      doc: 'An initial node: a filled circle where the flow starts. It has no text and no incoming edge.',
      examples: ['initial start in customer'],
      arguments: [node],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const final = statement(
  'final',
  implementing(
    { uml: [ACTIVITIES.activityFinal] },
    {
      doc: 'An activity final node: a circle with a filled core. The first token to reach it ends the whole activity, every parallel branch included. It has no text and no outgoing edge.',
      examples: ['final done in customer'],
      arguments: [node],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const flowfinal = statement(
  'flowfinal',
  implementing(
    { uml: [ACTIVITIES.flowFinal] },
    {
      doc: 'A flow final node: a circle with a cross. It ends only the branch that reaches it, the rest of the activity goes on. It has no text and no outgoing edge.',
      examples: ['flowfinal mailed'],
      arguments: [node],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const decision = statement(
  'decision',
  implementing(
    { uml: [ACTIVITIES.decision] },
    {
      doc: 'A decision node: a diamond with one incoming edge and alternatives going out, each with a guard on its `go`. The optional question stands at the top beside the diamond. The outermost alternatives leave at the left and right corner, the others at the bottom. The decision bar below the picture is `adr`, not `decision`.',
      examples: ['decision stock "Enough stock?" in warehouse', 'decision paid'],
      arguments: [node, optionalArg('question', text(), 'Question the guards answer, shown beside the diamond.')],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const merge = statement(
  'merge',
  implementing(
    { uml: [ACTIVITIES.merge] },
    {
      doc: 'A merge node: a diamond that brings alternative branches together without waiting for each other, with exactly one outgoing edge. Branches leave a decision; parallel branches of a `fork` meet in a `join` instead.',
      examples: ['merge together in support'],
      arguments: [node, optionalArg('label', text(), 'Text beside the diamond.')],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const fork = statement(
  'fork',
  implementing(
    { uml: [ACTIVITIES.fork] },
    {
      doc: 'A fork node: a bar across the flow that starts all its outgoing branches at the same time. It has exactly one incoming edge; the bar is as wide as the branches below it.',
      examples: ['fork split in warehouse'],
      arguments: [node],
      clauses: lane,
      attributes: frames,
    },
  ),
);

export const join = statement(
  'join',
  implementing(
    { uml: [ACTIVITIES.join] },
    {
      doc: 'A join node: a bar across the flow that waits for all incoming branches and then continues on its one outgoing edge. Alternatives of a decision meet in a `merge`; a join would wait forever for the branch not taken.',
      examples: ['join done in service'],
      arguments: [node],
      clauses: lane,
      attributes: frames,
    },
  ),
);
