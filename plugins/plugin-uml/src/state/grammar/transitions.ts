import { arg, arrow, attr, ref, statement, text } from '@diagrist/lang';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';

const end = () =>
  ref(
    'state',
    'initial',
    'final',
    'choice',
    'junction',
    'history',
    'fork',
    'join',
    'terminate',
    'entrypoint',
    'exitpoint',
  );

const trigger = implementing(
  { uml: [S.transition] },
  attr(
    text(),
    'Trigger: the events that fire the transition, separated by commas. A time event is written `after(30 days)`, a change event `when(stock empty)`. In a protocol state machine the operation called.',
  ),
);

export const go = statement(
  'go',
  implementing(
    { uml: [S.transition, S.completionTransition] },
    {
      doc: 'A transition from `from` to `to`, labelled `trigger [guard] / effect`; without all three it is a completion transition. `when=else` is the else branch of a choice. A transition of a state to itself is a loop at its freest corner. In a protocol state machine (`{protocol}` in the title) it reads `[precondition] operation / [postcondition]`.',
      examples: [
        'go open -> paid on="pay" when="amount covered" do="send receipt"',
        'go choice -> open when=else',
        'go open -> cancelled on="after(14 days)"',
      ],
      arguments: [
        arg('from', end(), 'The vertex the transition leaves.'),
        arg('arrow', arrow({ '->': 'transition, with an open arrowhead at `to`' }), 'The arrow of a transition.'),
        arg('to', end(), 'The vertex the transition enters.'),
      ],
      attributes: {
        on: trigger,
        when: implementing(
          { uml: [S.elseGuard] },
          attr(text(), 'Guard, written without brackets; `else` is the predefined else branch.'),
        ),
        do: attr(text(), 'Effect: the behaviour the transition runs, shown after `/`.'),
        post: implementing(
          { uml: [S.protocolTransition] },
          attr(text(), 'Postcondition of a protocol transition, written without brackets.'),
        ),
      },
      flags: { emph: 'Highlights the line in the accent colour.' },
    },
  ),
);

export const internal = statement(
  'internal',
  implementing(
    { uml: [S.internalTransition] },
    {
      doc: 'An internal transition: a line `trigger [guard] / effect` in the compartment of its state. The state is neither left nor entered again, so no entry or exit behaviour runs.',
      examples: ['internal open on="change item" do="recalculate"'],
      arguments: [arg('state', ref('state'), 'The state whose compartment shows the transition.')],
      attributes: {
        on: trigger,
        when: attr(text(), 'Guard, written without brackets.'),
        do: attr(text(), 'Effect, shown after `/`.'),
      },
    },
  ),
);

export const stateNote = statement(
  'note',
  implementing(
    { uml: [S.comment] },
    {
      doc: 'A comment on a vertex: a dashed box above it with a tip down to it, below it when lines run above.',
      examples: ['note "Only for new customers" on check'],
      arguments: [arg('text', text(), 'What the note says, in one line.')],
      clauses: { on: attr(end(), 'The vertex the note belongs to. Required.') },
    },
  ),
);
