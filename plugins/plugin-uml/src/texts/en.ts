import { ACTIVITY_EN } from './activity-en.js';
import { CLASS_EN } from './class-en.js';
import type { Texts } from './index.js';
import { SEQUENCE_EN } from './sequence-en.js';
import { STATE_EN } from './state-en.js';
import { USECASE_EN } from './usecase-en.js';

/** English texts. */
export const EN: Texts = {
  picture: {
    sequence: 'Sequence diagram (UML)',
    usecase: 'Use case diagram (UML)',
    activity: 'Activity diagram (UML)',
    class: 'Class diagram (UML)',
    state: 'State machine diagram (UML)',
  },
  sequence: SEQUENCE_EN,
  usecase: USECASE_EN,
  activity: ACTIVITY_EN,
  class: CLASS_EN,
  state: STATE_EN,
};
