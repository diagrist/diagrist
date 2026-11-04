import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, KERNEL_CODES } from '@diagrist/core';
import { either, LANG_CODES } from '@diagrist/lang';
import { COMMANDS, GLOBAL_OPTIONS, PLUGINS } from 'diagrist/tables';
import { describe, expect, it } from 'vitest';
import { derivedFiles } from '../src/files.js';
import { SKILL_DIR, SKILL_REFERENCE } from '../src/skill.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const dir = `${root}${SKILL_DIR}/`;
const kinds = PLUGINS.flatMap((plugin) => plugin.kinds);

/** Every Markdown file of the skill folder by its path inside the folder, such as `reference/class.md`. */
const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((path) => path.endsWith('.md'))
  .map((path) => path.replaceAll('\\', '/'))
  .sort();
const read = (path: string): string => readFileSync(`${dir}${path}`, 'utf8');
const handwritten = files.filter((path) => !path.startsWith(`${SKILL_REFERENCE}/`));
const skill = read('SKILL.md');

/** The relative Markdown links of a file, resolved against the folder of the file. */
function linksOf(path: string): string[] {
  const base = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
  return [...read(path).matchAll(/\]\(([^)#\s]+\.md)\)/g)]
    .map((m) => m[1] ?? '')
    .filter((target) => !/^[a-z]+:/.test(target))
    .map((target) => new URL(target, `file:///${base}`).pathname.slice(1));
}

describe('the agent skill', () => {
  it('starts with frontmatter whose description is a plain YAML scalar naming every kind', () => {
    const [, frontmatter = ''] = /^---\n([\s\S]*?)\n---\n/.exec(skill) ?? [];
    const description = /^description: (.*)$/m.exec(frontmatter)?.[1] ?? '';
    expect(frontmatter).toMatch(/^name: diagrist$/m);
    expect(description).toContain(either(kinds.map((kind) => kind.spec.name)));
    expect(description).not.toMatch(/: | #|^["'{[]/);
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  it('holds in its reference folder only what the tables generate', () => {
    const generated = derivedFiles(PLUGINS, COMMANDS)
      .map((file) => file.path)
      .filter((path) => path.startsWith(`${SKILL_DIR}/`))
      .map((path) => path.slice(SKILL_DIR.length + 1))
      .sort();
    expect(files.filter((path) => path.startsWith(`${SKILL_REFERENCE}/`))).toEqual(generated);
  });

  it('links every other file of the folder from SKILL.md, one level deep', () => {
    const linked = new Set(linksOf('SKILL.md'));
    expect(files.filter((path) => path !== 'SKILL.md' && !linked.has(path))).toEqual([]);
  });

  it.each(files)('%s links only files that exist', (path) => {
    expect(linksOf(path).filter((target) => !files.includes(target))).toEqual([]);
  });

  it.each(handwritten)('%s names only commands and options the CLI has', (path) => {
    const calls = [...read(path).matchAll(/`dgr ([a-z]+)([^`]*)`/g)];
    const wrong = calls.flatMap(([whole, name, rest = '']) => {
      const command = COMMANDS.find((c) => c.name === name);
      if (command === undefined) return [whole];
      const options = [...rest.matchAll(/--([a-z-]+)/g)].map((m) => m[1] ?? '');
      return options.filter((o) => !(o in command.options) && !(o in GLOBAL_OPTIONS)).map((o) => `${whole}: --${o}`);
    });
    expect(wrong).toEqual([]);
  });

  it.each(handwritten)('%s names only codes that exist', (path) => {
    const known = new Set<string>([
      ...Object.values(LANG_CODES),
      ...Object.values(KERNEL_CODES),
      ...kinds.flatMap((kind) => kind.rules.map((rule) => rule.code)),
    ]);
    const named = [...read(path).matchAll(/\(([A-Z]\d{3})\)/g)].map((m) => m[1] ?? '');
    expect(named.filter((c) => !known.has(c))).toEqual([]);
  });

  it.each(handwritten)('%s shows only diagrams that check without a finding', (path) => {
    const blocks = [...read(path).matchAll(/```dgr\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
    const findings = blocks.flatMap((text) =>
      compile(text, { plugins: PLUGINS }).diagnostics.map((d) => `${d.code} at ${d.span.line}`),
    );
    expect(findings).toEqual([]);
  });

  it('lists every rule code of every kind', () => {
    const all = files.map(read).join('\n');
    const codes = kinds.flatMap((kind) => kind.rules.map((rule) => rule.code));
    expect(codes.filter((c) => !all.includes(`\`${c}\``))).toEqual([]);
  });
});
