import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, optionalArg, ref, statement, text } from '@diagrist/lang';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';

const parent = implementing(
  { uml: [S.compositeState] },
  attr(
    ref('state', 'region'),
    'The composite state or the region the vertex lies in; without it it stands at the top level.',
  ),
);

export const stateStatement = statement(
  'state',
  implementing(
    { uml: [S.state] },
    {
      doc: 'A state: a rounded box with the name, below it a compartment with `entry`, `do` and `exit`, deferred events and internal transitions. A state with vertices `in` it is a composite state, drawn as a frame around them; with `submachine=` it calls another state machine. Diagrist lays states out in layers from the initial pseudostate to the final state.',
      examples: ['state open "Open" entry="set deadline"', 'state check "Check" submachine="Credit check"'],
      arguments: [
        arg('id', id(), 'Id that `go`, `in`, `internal` and `note` use for this state.'),
        arg('label', text(), 'Name of the state.'),
      ],
      clauses: { in: parent },
      attributes: {
        entry: implementing({ uml: [S.stateBehavior] }, attr(text(), 'Behaviour on entering, shown as `entry / ...`.')),
        do: implementing({ uml: [S.stateBehavior] }, attr(text(), 'Behaviour while in the state, `do / ...`.')),
        exit: implementing({ uml: [S.stateBehavior] }, attr(text(), 'Behaviour on leaving, `exit / ...`.')),
        defer: implementing(
          { uml: [S.deferredEvent] },
          attr(text(), 'Events the state defers, separated by commas; each shows as `event / defer`.'),
        ),
        submachine: implementing(
          { uml: [S.submachineState] },
          attr(
            text(),
            'Name of the state machine the state calls: the box reads `Name : Machine` and carries the submachine symbol. Entry and exit points `in` it are its connection point references.',
          ),
        ),
        file: attr(
          text(),
          'File of the called state machine, relative to this one; named in the description, not checked yet.',
        ),
        tone: attr(oneOf(TONE_NAMES), 'Colour of the name field in `look=cards`; without it slate.'),
        mark: attr(ref('adr'), 'Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it.'),
      },
      flags: { emph: 'Highlights the state in the accent colour.' },
    },
  ),
);

/** A pseudostate or final state: a symbol with an optional name beside it. */
function vertex<const K extends string>(keyword: K, uml: readonly SpecElement[], doc: string, example: string) {
  return statement(
    keyword,
    implementing(
      { uml },
      {
        doc,
        examples: [example],
        arguments: [
          arg('id', id(), 'Id that `go` uses for this vertex.'),
          optionalArg('label', text(), 'Name shown small beside the symbol.'),
        ],
        clauses: { in: parent },
      },
    ),
  );
}

export const initial = vertex(
  'initial',
  [S.initial],
  'The initial pseudostate: a filled circle. Each region, the top level included, has at most one; its transition has neither trigger nor guard.',
  'initial start',
);
export const final = vertex(
  'final',
  [S.finalState],
  'A final state: a circle with a dot. No transition leaves it. Diagrist puts final states into the last layer.',
  'final end',
);
export const choice = vertex(
  'choice',
  [S.choice],
  'A choice pseudostate: a diamond. Its outgoing transitions carry guards, one of them `when=else`.',
  'choice paid',
);
export const junction = vertex(
  'junction',
  [S.junction],
  'A junction pseudostate: a small filled circle that joins or splits transitions without a decision of its own.',
  'junction merge',
);
export const fork = vertex(
  'fork',
  [S.fork],
  'A fork pseudostate: a bar across the flow, from one incoming to several outgoing transitions into states, often into the regions of a state.',
  'fork split',
);
export const join = vertex(
  'join',
  [S.join],
  'A join pseudostate: a bar across the flow that waits for all its incoming transitions from states.',
  'join done',
);
export const terminate = vertex(
  'terminate',
  [S.terminate],
  'A terminate pseudostate: a cross. The state machine ends at once.',
  'terminate abort',
);

export const history = statement(
  'history',
  implementing(
    { uml: [S.history] },
    {
      doc: 'A history pseudostate inside a composite state: a circle with `H`, with `deep` `H*`. Entering it resumes the substate last active.',
      examples: ['history resume in active deep'],
      arguments: [
        arg('id', id(), 'Id that `go` uses for this pseudostate.'),
        optionalArg('label', text(), 'Name shown small beside the symbol.'),
      ],
      clauses: { in: parent },
      flags: { deep: 'Deep history: resumes the innermost substates too, drawn `H*`.' },
    },
  ),
);

/** An entry or exit point on the border of a state. */
function point<const K extends string>(keyword: K, uml: SpecElement, doc: string, example: string) {
  return statement(
    keyword,
    implementing(
      { uml: [uml] },
      {
        doc,
        examples: [example],
        arguments: [
          arg('id', id(), 'Id that `go` uses for this point.'),
          optionalArg('label', text(), 'Name shown small outside the circle.'),
        ],
        clauses: {
          in: attr(ref('state'), 'The composite or submachine state on whose border the point sits. Required.'),
        },
      },
    ),
  );
}

export const entrypoint = point(
  'entrypoint',
  S.entryPoint,
  'An entry point: a small circle on the border of its state. A transition from outside ends at it and continues inside; on a submachine state the way inside lies in the called machine.',
  'entrypoint fresh "New customer" in check',
);
export const exitpoint = point(
  'exitpoint',
  S.exitPoint,
  'An exit point: a small circle with a cross on the border of its state. A transition from inside ends at it and continues outside.',
  'exitpoint rejected "Rejected" in check',
);

export const region = statement(
  'region',
  implementing(
    { uml: [S.orthogonalRegion] },
    {
      doc: 'An orthogonal region of a state: the regions of a state are active at the same time and stand side by side, separated by dashed lines, the name at the top left. Vertices come in with `in`; each region has its own initial pseudostate unless a fork enters it.',
      examples: ['region payment "Payment" in processing'],
      arguments: [
        arg('id', id(), 'Id that `in` uses for this region.'),
        optionalArg('label', text(), 'Name of the region, shown at its top left.'),
      ],
      clauses: { in: attr(ref('state'), 'The state the region belongs to. Required.') },
    },
  ),
);
