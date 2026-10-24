/**
 * The handwritten part of the agent skill: when to use it and how to work. Everything after it, the commands, the
 * kinds and the codes, is generated. A test checks that every `dgr` command and option named here exists.
 */
export const SKILL_INTRO = {
  /** The skill's `description`, which decides when an agent loads it; `{kinds}` becomes the kinds, joined by `or`. */
  description:
    'Write, change, check and render Diagrist diagrams, text files ending in .dgr that the dgr command line turns into checked SVG and PNG pictures. Use it when a diagram such as a {kinds} diagram is wanted as code, when a .dgr file is created or edited, or when dgr reports a code such as L101 or U403.',
  lead: [
    'Diagrist turns a small text language into diagrams. The language is strict on purpose: every statement, argument and attribute is listed in a table, the check names what was found and what is allowed, and the same file always gives the same picture. Work with the tools instead of guessing.',
  ],
  workflow: [
    'Look up before writing. `dgr grammar` lists the kinds, and `dgr grammar <kind> --json` prints every statement of a kind with its arguments, attributes, flags, doc and examples as data. The reference below is the same grammar in short; do not use keywords or attributes it does not list.',
    'Write the file, then run `dgr check <file> --json`. Each diagnostic has a stable `code`, a `span` with line and column, and `values`; its message names what was found, what is allowed and a correct example. Fix every error and read every warning, then check again until nothing is reported.',
    'Run `dgr fmt <file>` to settle indentation and spacing, and `dgr build <file> --png` to write the SVG and a PNG beside it. Look at the PNG before you hand the diagram over: the check proves the file is valid, not that the picture says what was meant.',
  ],
} as const;
