import type { TextRun } from '@diagrist/core';
import type { FileText } from '@diagrist/lang';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import { codeToTokensBase, createShikiPrimitive, type ShikiPrimitive } from '@shikijs/primitive';
import { type CodeLanguage, GRAMMARS, languageOf } from './languages.js';
import type { CodeLine } from './lines.js';
import { ROLE_THEME, tokenOf } from './roles.js';
import { sceneRole } from './styles.js';

const TAB = '    ';

let shared: ShikiPrimitive | undefined;

/**
 * The tokenizer, built once on first use with every grammar: Shiki's JavaScript regex engine, no WebAssembly, with a
 * fixed target, so every runtime translates the grammars to the same expressions instead of the ones it supports.
 */
function tokenizer(): ShikiPrimitive {
  shared ??= createShikiPrimitive({
    engine: createJavaScriptRegexEngine({ target: 'ES2024' }),
    langs: Object.values(GRAMMARS),
    themes: [ROLE_THEME],
  });
  return shared;
}

/**
 * The lines of a file as highlighted code, numbered from 1, in the language its extension names unless `language`
 * says another. Tabs become four spaces, so a monospace face measures what is drawn; line ends become `\n`, and the
 * end of the last line starts no empty line, so a file has as many lines as an editor shows. The time limit per line
 * is off (`tokenizeTimeLimit: 0`): with Shiki's default of half a second a slow machine would cut a long line short
 * and colour it otherwise, and the same file must give the same runs everywhere. Neighbouring runs of one role are
 * joined, and whitespace joins the run before it, so a line has as few runs as its colours need.
 */
export function highlight(file: FileText, language: CodeLanguage = languageOf(file.path)): CodeLine[] {
  const code = file.text.replace(/\r\n?/g, '\n').replaceAll('\t', TAB).replace(/\n$/, '');
  if (language === 'text') return code.split('\n').map((text, index) => lineOf(index, [{ text }], []));
  const tokens = codeToTokensBase(tokenizer(), code, {
    lang: language,
    theme: ROLE_THEME.name,
    tokenizeTimeLimit: 0,
    tokenizeMaxLineLength: 0,
  });
  return tokens.map((line, index) => {
    const runs: TextRun[] = [];
    const declares: string[] = [];
    for (const token of line) {
      const { role, declares: declared } = tokenOf(token.color);
      if (declared) declares.push(token.content.trim());
      append(runs, token.content, role === undefined ? undefined : sceneRole(role));
    }
    return lineOf(index, runs, declares);
  });
}

/** Adds text to the last run when it has the same role or is only whitespace, else as a run of its own. */
function append(runs: TextRun[], text: string, role: string | undefined): void {
  const last = runs.at(-1);
  if (last !== undefined && (last.role === role || text.trim() === ''))
    runs[runs.length - 1] = { ...last, text: last.text + text };
  else runs.push(role === undefined ? { text } : { text, role });
}

function lineOf(index: number, runs: readonly TextRun[], declares: readonly string[]): CodeLine {
  const kept = runs.filter((run) => run.text !== '');
  return {
    number: index + 1,
    text: kept.map((run) => run.text).join(''),
    runs: kept,
    ...(declares.length > 0 ? { declares } : {}),
  };
}
