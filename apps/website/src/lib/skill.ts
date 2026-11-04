/**
 * The files of the agent skill by their path inside `skills/diagrist`, such as `SKILL.md` or `reference/class.md`:
 * the handwritten guides and the generated reference, served as they are checked in.
 */
export const skillFiles: ReadonlyMap<string, string> = new Map(
  Object.entries(
    import.meta.glob<string>('../../../../skills/diagrist/**/*.md', { query: '?raw', import: 'default', eager: true }),
  ).map(([path, text]) => [path.slice(path.indexOf('skills/diagrist/') + 'skills/diagrist/'.length), text]),
);

/** A response with a Markdown file of the skill. */
export const markdown = (text: string): Response =>
  new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
