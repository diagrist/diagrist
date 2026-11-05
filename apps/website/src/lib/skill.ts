import { digestOf, type Files, tarGz, zip } from './archive.js';

/**
 * The files of the agent skill by their path inside `skills/diagrist`, such as `SKILL.md` or `reference/class.md`:
 * the handwritten guides and the generated reference, served as they are checked in.
 */
export const skillFiles: ReadonlyMap<string, string> = new Map(
  Object.entries(
    import.meta.glob<string>('../../../../skills/diagrist/**/*', { query: '?raw', import: 'default', eager: true }),
  ).map(([path, text]) => [path.slice(path.indexOf('skills/diagrist/') + 'skills/diagrist/'.length), text]),
);

/** The name the skill is installed under, the `name` of its frontmatter. */
const SKILL_NAME = 'diagrist';

/** Where the discovery index and the archives are served (Agent Skills Discovery 0.2.0). */
const WELL_KNOWN = '/.well-known/agent-skills';

const bytes: Files = new Map([...skillFiles].map(([path, text]) => [path, new TextEncoder().encode(text)]));

/** The skill folder as a `.tar.gz`, which the discovery index names. */
export const skillTarGz: Uint8Array = tarGz(bytes);

/** The skill folder as a `.zip`, to upload where an agent takes skills as a file, such as claude.ai. */
export const skillZip: Uint8Array = zip(bytes);

/** The description of the skill, read from the frontmatter of `SKILL.md`. */
const skillDescription: string =
  /^description: (.*)$/m.exec(skillFiles.get('SKILL.md') ?? '')?.[1] ?? 'Write, check and render Diagrist diagrams.';

/** The discovery index: one skill, published as an archive with its digest. */
export const skillIndex = {
  $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
  skills: [
    {
      name: SKILL_NAME,
      type: 'archive',
      description: skillDescription,
      url: `${WELL_KNOWN}/${SKILL_NAME}.tar.gz`,
      digest: digestOf(skillTarGz),
    },
  ],
};

/** A response with a Markdown file of the skill. */
export const markdown = (text: string): Response =>
  new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });

/** A response with the bytes of an archive. */
export const archive = (body: Uint8Array, type: string): Response =>
  new Response(new Uint8Array(body), { headers: { 'Content-Type': type } });
