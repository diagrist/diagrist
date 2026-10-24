import { type Problem, problem } from '../messages.js';
import { fmt } from './fmt.js';

/** The refusal of a command that needs the kernel in a build without one, pointing to what works already. */
export function needEngine(name: string): Problem {
  return problem('noEngine', { command: name, example: fmt.examples[0].command });
}
