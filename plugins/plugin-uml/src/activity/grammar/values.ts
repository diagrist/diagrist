import { TONE_NAMES } from '@diagrist/core';
import { attr, oneOf, ref, text } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';

/** Every keyword that declares a node, for `go` and the references that name nodes. */
export const NODE_KEYWORDS = [
  'initial',
  'final',
  'flowfinal',
  'action',
  'decision',
  'merge',
  'fork',
  'join',
  'object',
  'datastore',
  'buffer',
  'send',
  'accept',
  'wait',
] as const;

/** A keyword that declares a node. */
export type NodeKind = (typeof NODE_KEYWORDS)[number];

/** `in`: the swimlane of a node. */
export const lane = {
  in: implementing(
    { uml: [ACTIVITIES.partition] },
    attr(
      ref('partition'),
      'The partition (swimlane) the node stands in. Without it, Diagrist puts the node into the lane of its first predecessor that has one, else of its first successor, else into the first lane.',
    ),
  ),
};

/** The frames a node may lie in besides its lane. */
export const frames = {
  interruptible: implementing(
    { uml: [ACTIVITIES.interruptibleRegion] },
    attr(
      ref('interruptible'),
      'The interruptible region the node belongs to; its dashed frame is drawn around all members.',
    ),
  ),
  expansion: implementing(
    { uml: [ACTIVITIES.expansionRegion] },
    attr(ref('expansion'), 'The expansion region the node belongs to, run once per element.'),
  ),
};

/** `tone=` of a node drawn as a card in `look=cards`. */
export const tone = attr(
  oneOf(TONE_NAMES),
  'Colour of the card outline in `look=cards`; without it the card is white with a grey outline. The plain look ignores it.',
);

/** `mark=`: a decision of the decision bar beside the node. */
export const mark = attr(
  ref('adr'),
  'Id of a decision of the decision bar, such as `E1`; the mark is drawn at the top right of the node.',
);

/** Pins of an action as a list of object types. */
export const pins = (side: 'input' | 'output', where: string) =>
  implementing(
    { uml: [ACTIVITIES.pin] },
    attr(
      text(),
      `${side === 'input' ? 'Input' : 'Output'} pins by object type, separated by commas like \`"Order, Amount"\`; small squares on the ${where} edge, the type beside each.`,
    ),
  );
