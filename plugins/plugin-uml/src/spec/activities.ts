import type { Catalog } from './catalog.js';

/**
 * The elements of UML 2.5.1 an activity diagram can show: chapter 15 (Activities) and the actions of chapter 16 that
 * activity diagrams draw. Sections are the deepest heading of the specification that defines the element, the
 * notation heading where only the notation is meant; titles are Diagrist's own words.
 */
export const ACTIVITIES = {
  controlFlow: { section: '15.2.3.3', title: 'Control flow' },
  guard: { section: '15.2.3.3', title: 'Guard on an activity edge' },
  weight: { section: '15.2.3.3', title: 'Weight of an activity edge' },
  objectFlow: { section: '15.2.3.4', title: 'Object flow' },
  initialNode: { section: '15.3.3.1', title: 'Initial node' },
  activityFinal: { section: '15.3.3.2', title: 'Activity final node, ending every flow' },
  flowFinal: { section: '15.3.3.2', title: 'Flow final node, ending one flow' },
  fork: { section: '15.3.3.3', title: 'Fork node' },
  join: { section: '15.3.3.4', title: 'Join node' },
  merge: { section: '15.3.3.5', title: 'Merge node' },
  decision: { section: '15.3.3.6', title: 'Decision node' },
  elseGuard: { section: '15.3.3.6', title: 'Predefined guard else' },
  objectNode: { section: '15.4.3.1', title: 'Object node' },
  parameterNode: { section: '15.4.3.2', title: 'Activity parameter node on the border of the activity' },
  centralBuffer: { section: '15.4.3.3', title: 'Central buffer node' },
  dataStore: { section: '15.4.3.4', title: 'Data store node' },
  objectState: { section: '15.4.4.1', title: 'States of an object node in brackets below its name' },
  exceptionHandler: { section: '15.5.3.1', title: 'Exception handler of an executable node' },
  partition: { section: '15.6.3.1', title: 'Activity partition (swimlane)' },
  interruptibleRegion: { section: '15.6.3.2', title: 'Interruptible activity region' },
  interruptingEdge: { section: '15.6.3.2', title: 'Edge that interrupts its region' },
  action: { section: '16.2.3.1', title: 'Action' },
  pin: { section: '16.2.3.3', title: 'Input and output pin of an action' },
  sendSignal: { section: '16.3.3.2', title: 'Send signal action' },
  callBehavior: { section: '16.3.4.1', title: 'Call behavior action with the rake symbol' },
  callOperation: { section: '16.3.4.2', title: 'Call operation action' },
  acceptEvent: { section: '16.10.3.1', title: 'Accept event action' },
  waitTime: { section: '16.10.4', title: 'Accept time event action drawn as an hourglass' },
  structuredNode: { section: '16.11.3.1', title: 'Structured activity node' },
  expansionRegion: { section: '16.12.3', title: 'Expansion region' },
  expansionNode: { section: '16.12.3', title: 'Expansion node on the border of its region' },
  iterative: { section: '16.12.3', title: 'Expansion mode iterative' },
  parallel: { section: '16.12.3', title: 'Expansion mode parallel' },
  stream: { section: '16.12.3', title: 'Expansion mode stream' },
} as const satisfies Catalog;
