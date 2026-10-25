import { fileURLToPath } from 'node:url';
import { either, GRAMMAR_SCHEMA, grammarOf, SHARED_KEYWORDS } from '@diagrist/lang';
import { compareGolden } from '@diagrist/testkit';
import { COMMANDS, GLOBAL_OPTIONS, PLUGINS, SCHEMA_PATH } from 'diagrist/tables';
import { describe, expect, it } from 'vitest';
import { derivedFiles } from '../src/files.js';
import { SKILL_PATH } from '../src/skill.js';
import { SKILL_INTRO } from '../src/skill-intro.js';
import { specPath } from '../src/spec.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const files = derivedFiles(PLUGINS, COMMANDS);
const content = (path: string): string => files.find((file) => file.path === path)?.content ?? '';
const kinds = PLUGINS.flatMap((plugin) => plugin.kinds);

describe('the derived files', () => {
  it.each(files.map((file) => [file.path, file.content]))(
    '%s is what its sources generate (regenerate with `pnpm docs:generate`)',
    (path, generated) => {
      const result = compareGolden(`${root}${path}`, generated);
      expect(result.status, `${path} is out of date; run \`pnpm docs:generate\``).not.toBe('mismatch');
    },
  );

  it('name their source near the top and say not to edit them', () => {
    const unnamed = files.filter(
      ({ content }) => !/Generated from .+ Do not edit\./.test(content.split('\n').slice(0, 8).join('\n')),
    );
    expect(unnamed.map((file) => file.path)).toEqual([]);
  });
});

describe('the overview of the language', () => {
  it('describes the statements every kind has once', () => {
    const overview = content('docs/language/README.md');
    expect(SHARED_KEYWORDS.filter((k) => !overview.includes(`### \`${k}\``))).toEqual([]);
  });
});

describe('the grammar schema', () => {
  it('is published as the schema of the language plus its address', () => {
    const published = JSON.parse(content(SCHEMA_PATH)) as Record<string, unknown>;
    expect(published).toMatchObject({ ...GRAMMAR_SCHEMA, $id: expect.stringContaining(SCHEMA_PATH) });
  });
});

describe('the language spec of a kind', () => {
  it.each(kinds.map((kind) => [kind.spec.name, kind]))(
    'of %s describes every statement and every rule code',
    (name, kind) => {
      const spec = content(specPath(name));
      const keywords = JSON.stringify(grammarOf(kind.spec)).match(/"keyword":"[^"]+"/g) ?? [];
      const own = [...new Set(keywords.map((k) => k.slice(11, -1)))].filter((k) => !SHARED_KEYWORDS.includes(k));
      const missing = own.filter((k) => !spec.includes(`### \`${k}\``));
      expect(missing).toEqual([]);
      expect(kind.rules.filter((rule) => !spec.includes(`| \`${rule.code}\` |`)).map((rule) => rule.code)).toEqual([]);
    },
  );
});

describe('the agent skill', () => {
  const skill = content(SKILL_PATH);

  it('starts with frontmatter whose description is a plain YAML scalar', () => {
    const [, frontmatter = ''] = /^---\n([\s\S]*?)\n---\n/.exec(skill) ?? [];
    const description = /^description: (.*)$/m.exec(frontmatter)?.[1] ?? '';
    expect(frontmatter).toMatch(/^name: diagrist$/m);
    expect(description).toContain(either(kinds.map((kind) => kind.spec.name)));
    expect(description).not.toMatch(/: | #|^["'{[]/);
  });

  it('names only commands and options the CLI has in its handwritten part', () => {
    const text = [...SKILL_INTRO.lead, ...SKILL_INTRO.workflow].join('\n');
    const calls = [...text.matchAll(/`dgr ([a-z]+)([^`]*)`/g)];
    expect(calls.length).toBeGreaterThan(0);
    const wrong = calls.flatMap(([whole, name, rest = '']) => {
      const command = COMMANDS.find((c) => c.name === name);
      if (command === undefined) return [whole];
      const options = [...rest.matchAll(/--([a-z-]+)/g)].map((m) => m[1] ?? '');
      return options.filter((o) => !(o in command.options) && !(o in GLOBAL_OPTIONS)).map((o) => `${whole}: --${o}`);
    });
    expect(wrong).toEqual([]);
  });

  it('lists every rule code of every kind', () => {
    const codes = kinds.flatMap((kind) => kind.rules.map((rule) => rule.code));
    expect(codes.filter((c) => !skill.includes(`\`${c}\``))).toEqual([]);
  });
});
