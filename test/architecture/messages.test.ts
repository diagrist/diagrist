import { describe, expect, it } from 'vitest';
import { pluginsByPackage, type Template } from './plugins.js';

/**
 * Every message of a plugin says the same in every locale (ADR 0005): the German text reads the same values as the
 * English one and shows the same of them, and it is not the English text again. A value read in one locale only, or
 * shown in one only, is a placeholder lost or swapped in translation; a German text equal to the English one was not
 * translated. The templates are called with a stand-in for each value, so every code is checked, not only the cases
 * the rule tests reach. `case` selects a phrase and is read, not shown: German inflects by it, as in `Verlorene`.
 * Without its case a message may consist of stand-ins only, which then say nothing about the translation.
 */
describe('messages of a plugin', () => {
  it('read and show the same values in every locale, in words of their own', () => {
    const plugins = [...pluginsByPackage.values()].flat();
    const messages = new Map(plugins.flatMap((plugin) => Object.entries(plugin.messages)));
    expect(messages.has('U403')).toBe(true);
    expect([...messages].flatMap(translationProblems)).toEqual([]);
  });

  it('are found with a value lost, a value swapped, and a text not translated', () => {
    const fake: Record<string, Template> = {
      X100: { en: (v) => `\`${v.found}\` in ${v.known}`, de: (v) => `\`${v.found}\` in ${v.known}` },
      X101: { en: (v) => `\`${v.found}\` is no ${v.known}`, de: (v) => `\`${v.found}\` ist kein Element` },
      X102: { en: (v) => `\`${v.from}\` to ${v.to}`, de: (v) => `\`${v.from}\` an ${v.from}` },
    };
    expect(Object.entries(fake).flatMap(translationProblems)).toEqual([
      'X100 de: the same text as en',
      'X101 de: reads found, shows found, where en reads found, known and shows found, known',
      'X102 de: reads from, shows from, where en reads from, to and shows from, to',
    ]);
  });
});

/** What one locale of a template does with stand-ins for its values: the keys it reads, the stand-ins it shows. */
function trace(template: (values: Readonly<Record<string, string>>) => string): {
  text: string;
  reads: string;
  shows: string;
} {
  const read = new Set<string>();
  const values = new Proxy({} as Record<string, string>, {
    get: (_, key) => {
      if (typeof key !== 'string') return undefined;
      read.add(key);
      return `<${key}>`;
    },
  });
  const text = template(values);
  const shows = [...read].filter((key) => key !== 'case' && text.includes(`<${key}>`));
  return { text, reads: [...read].sort().join(', '), shows: shows.sort().join(', ') };
}

/** Each locale but `en` that reads or shows other values than `en`, or repeats its text. */
function translationProblems([code, template]: readonly [string, Template]): string[] {
  const { en, ...others } = template;
  if (en === undefined) return [`${code}: no en`];
  const english = trace(en);
  return Object.entries(others).flatMap(([locale, other]) => {
    const found = trace(other);
    const worded = /\p{L}{2,}/u.test(english.text.replace(/<\w+>/g, ''));
    if (worded && found.text === english.text) return [`${code} ${locale}: the same text as en`];
    if (found.reads === english.reads && found.shows === english.shows) return [];
    return [
      `${code} ${locale}: reads ${found.reads}, shows ${found.shows}, where en reads ${english.reads} and shows ${english.shows}`,
    ];
  });
}
