import type { Catalog } from './catalog.js';

/**
 * The elements of UML 2.5.1 a state machine diagram can show: chapter 14 (State Machines), plus the comment from
 * chapter 7 and the time and change events from chapter 13. Sections are the clause that defines the element, the
 * semantics clause 14.2.3 where the numbering below it is not certain; titles are Diagrist's own words.
 */
export const STATE_MACHINES = {
  comment: { section: '7.2.3.2', title: 'Comment (note)' },
  timeEvent: { section: '13.3.3', title: 'Time event as a trigger, after(...)' },
  changeEvent: { section: '13.3.3', title: 'Change event as a trigger, when(...)' },
  state: { section: '14.2.3.4', title: 'Simple state' },
  compositeState: { section: '14.2.3.4', title: 'Composite state with substates' },
  orthogonalRegion: { section: '14.2.3.2', title: 'Orthogonal regions of a state, separated by dashed lines' },
  submachineState: { section: '14.2.3.4', title: 'Submachine state calling another state machine' },
  stateBehavior: { section: '14.2.4', title: 'Entry, do and exit behavior in the compartment of a state' },
  deferredEvent: { section: '14.2.4', title: 'Deferred event in the compartment of a state' },
  internalTransition: { section: '14.2.4', title: 'Internal transition in the compartment of a state' },
  finalState: { section: '14.2.3', title: 'Final state' },
  initial: { section: '14.2.3', title: 'Initial pseudostate' },
  history: { section: '14.2.3', title: 'Shallow and deep history pseudostates' },
  choice: { section: '14.2.3', title: 'Choice pseudostate' },
  junction: { section: '14.2.3', title: 'Junction pseudostate' },
  fork: { section: '14.2.3', title: 'Fork pseudostate' },
  join: { section: '14.2.3', title: 'Join pseudostate' },
  terminate: { section: '14.2.3', title: 'Terminate pseudostate' },
  entryPoint: { section: '14.2.3', title: 'Entry point on the border of a state' },
  exitPoint: { section: '14.2.3', title: 'Exit point on the border of a state' },
  transition: { section: '14.2.3.8', title: 'Transition with trigger, guard and effect' },
  elseGuard: { section: '14.2.3.8', title: 'Predefined guard else' },
  completionTransition: { section: '14.2.3.8', title: 'Completion transition without trigger' },
  protocolStateMachine: { section: '14.4.3', title: 'Protocol state machine' },
  protocolTransition: { section: '14.4.3', title: 'Protocol transition with precondition and postcondition' },
} as const satisfies Catalog;
