import { ACTIVITY_DE } from './activity-de.js';
import { CLASS_DE } from './class-de.js';
import type { Texts } from './index.js';
import { SEQUENCE_DE } from './sequence-de.js';
import { STATE_DE } from './state-de.js';
import { USECASE_DE } from './usecase-de.js';

/** German texts, as the predecessor wrote them. */
export const DE: Texts = {
  picture: {
    sequence: 'Sequenzdiagramm (UML)',
    usecase: 'Use-Case-Diagramm (UML)',
    activity: 'Aktivitätsdiagramm (UML)',
    class: 'Klassendiagramm (UML)',
    state: 'Zustandsdiagramm (UML)',
  },
  sequence: SEQUENCE_DE,
  usecase: USECASE_DE,
  activity: ACTIVITY_DE,
  class: CLASS_DE,
  state: STATE_DE,
};
