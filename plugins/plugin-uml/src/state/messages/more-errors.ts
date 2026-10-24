import { type Catalogue, pick } from '@diagrist/core';
import { capital, deName, enName } from './nouns.js';

/** Messages of the state errors U460 to U465, in English and German; the 44x range is full. */
export const STATE_MORE_ERRORS: Catalogue = {
  U460: {
    en: (v) =>
      `${capital(enName(v))} sits on the state "${v.ownerName}", which has neither substates nor a submachine. Make it a submachine state: \`state ${v.owner} "${v.ownerName}" submachine="Machine"\`.`,
    de: (v) =>
      `${capital(deName(v))} sitzt auf dem Zustand „${v.ownerName}“, der weder Unterzustände noch einen Unterautomaten hat. Zum Unterautomaten-Zustand machen: \`state ${v.owner} "${v.ownerName}" submachine="Automat"\`.`,
  },
  U461: {
    en: (v) =>
      pick(v, {
        inner: `${capital(enName(v))} calls the submachine "${v.machine}" and has no substates or regions of its own. Remove \`submachine=\` or draw the inside as a diagram of its own.`,
        entryOn: `${capital(enName(v))}: \`${v.transition}\` continues from the entry point; on a submachine state the way inside lies in the called machine.`,
        exitInto: `${capital(enName(v))}: \`${v.transition}\` comes from inside; on a submachine state the way starts at the exit point and leads outside.`,
      }),
    de: (v) =>
      pick(v, {
        inner: `${capital(deName(v))} ruft den Unterautomaten „${v.machine}“ auf und hat keine eigenen Unterzustände oder Regionen. \`submachine=\` entfernen oder das Innere als eigenes Diagramm zeichnen.`,
        entryOn: `${capital(deName(v))}: \`${v.transition}\` führt vom Eintrittspunkt weiter; am Unterautomaten liegt der Weg innen im aufgerufenen Automaten.`,
        exitInto: `${capital(deName(v))}: \`${v.transition}\` kommt von innen; am Unterautomaten beginnt der Weg am Austrittspunkt und führt nach außen.`,
      }),
  },
  U462: {
    en: (v) =>
      `\`${v.where}\`: ${pick(v, { parentheses: `\`${v.word}(...)\` needs parentheses`, empty: `\`${v.word}()\` without ${v.word === 'after' ? 'a duration' : 'a condition'}`, guard: `\`${v.trigger}\` is an event, not a guard; write \`on="${v.trigger}"\`` })}. A time event reads \`on="after(30 days)"\`.`,
    de: (v) =>
      `\`${v.where}\`: ${pick(v, { parentheses: `\`${v.word}(...)\` braucht runde Klammern`, empty: `\`${v.word}()\` ohne ${v.word === 'after' ? 'Dauer' : 'Bedingung'}`, guard: `\`${v.trigger}\` ist ein Ereignis, kein Guard; \`on="${v.trigger}"\` schreiben` })}. Ein Zeitereignis lautet \`on="after(30 Tage)"\`.`,
  },
  U463: {
    en: (v) =>
      `Protocol state machine: ${pick(v, { behaviour: `${enName(v)} has entry, do or exit behaviour`, history: `${enName(v)} does not exist here`, effect: `\`${v.where}\` has the effect "${v.effect}"; write it as postcondition \`post="${v.effect}"\`` })}.`,
    de: (v) =>
      `Protokoll-Zustandsautomat: ${pick(v, { behaviour: `${deName(v)} hat entry, do oder exit`, history: `${deName(v)} gibt es hier nicht`, effect: `\`${v.where}\` hat den Effekt „${v.effect}“; als Nachbedingung \`post="${v.effect}"\` schreiben` })}.`,
  },
  U464: {
    en: (v) =>
      `\`${v.transition}\`: \`post=\` exists in protocol state machines only. Write \`{protocol}\` into the title, or use \`do=\` for an effect.`,
    de: (v) =>
      `\`${v.transition}\`: \`post=\` gibt es nur im Protokoll-Zustandsautomaten. \`{protocol}\` in den Titel schreiben oder \`do=\` für einen Effekt verwenden.`,
  },
  U465: {
    en: () => 'The note names no vertex. Add the one it belongs to: `note "..." on open`.',
    de: () => 'Die Notiz nennt kein Element. Das ergänzen, zu dem sie gehört: `note "..." on offen`.',
  },
};
