import type { Catalogue } from '@diagrist/core';
import { pick } from '../../class/messages/pick.js';
import { capital, deName, enName } from './nouns.js';

/** Messages of the state warnings U940 to U949, U960 and U961 (the predecessor's W440 to W461), in English and German. */
export const STATE_WARNINGS: Catalogue = {
  U940: {
    en: (v) =>
      v.case === 'none'
        ? 'The diagram has no initial pseudostate at the top level. Add `initial start` and `go start -> first`.'
        : `${capital(enName(v))} has no outgoing transition. Add \`go ${v.name} -> first\`.`,
    de: (v) =>
      v.case === 'none'
        ? 'Das Diagramm hat keinen Start auf oberster Ebene. `initial start` und `go start -> erster` ergänzen.'
        : `${capital(deName(v))} hat keine ausgehende Transition. \`go ${v.name} -> erster\` ergänzen.`,
  },
  U941: {
    en: (v) => `${capital(enName(v))} cannot be reached from the initial pseudostate. Add a transition into it.`,
    de: (v) => `${capital(deName(v))} ist vom Start aus nicht erreichbar. Eine Transition hinein ergänzen.`,
  },
  U942: {
    en: (v) => `${capital(enName(v))} has no way out. Add a transition, for instance to a final state.`,
    de: (v) => `${capital(deName(v))} hat keinen Ausgang. Eine Transition ergänzen, etwa zu einem Endzustand.`,
  },
  U943: {
    en: (v) =>
      pick(v, {
        guard: `${capital(enName(v))} has a way out without a guard. Give every way out \`when=\`.`,
        else: `${capital(enName(v))} has no else branch. Add one with \`when=else\`.`,
        misplaced: `\`${v.transition}\`: else belongs to a choice; put a \`choice\` in between.`,
      }),
    de: (v) =>
      pick(v, {
        guard: `${capital(deName(v))} hat einen Ausgang ohne Guard. Jeden Ausgang mit \`when=\` versehen.`,
        else: `${capital(deName(v))} hat keinen else-Zweig. Einen mit \`when=else\` ergänzen.`,
        misplaced: `\`${v.transition}\`: der Sonst-Zweig gehört an eine Entscheidung; ein \`choice\` dazwischensetzen.`,
      }),
  },
  U944: {
    en: (v) =>
      `${capital(enName(v))}: two ways out on "${v.on}" without guards that tell them apart. Give them opposite \`when=\`.`,
    de: (v) =>
      `${capital(deName(v))}: zwei Ausgänge bei „${v.on}“ ohne unterscheidenden Guard. Gegensätzliche \`when=\` angeben.`,
  },
  U945: {
    en: (v) =>
      `The transition of ${enName(v)} to itself runs its exit and entry behaviour again. If it should not, write \`internal ${v.id} on=...\`.`,
    de: (v) =>
      `Die Selbsttransition führt entry und exit erneut aus (${deName(v)}). Sonst \`internal ${v.id} on=...\` schreiben.`,
  },
  U946: {
    en: (v) =>
      `${capital(enName(v))} has no initial pseudostate for a transition that enters its frame. Add \`initial i in ${v.id}\`.`,
    de: (v) =>
      `${capital(deName(v))} hat keinen Start für eine Transition auf seinen Rahmen. \`initial i in ${v.id}\` ergänzen.`,
  },
  U947: {
    en: (v) => `${capital(enName(v))} has no join. Bring its branches together with \`join\`.`,
    de: (v) => `${capital(deName(v))} hat keine Vereinigung. Die Zweige mit \`join\` zusammenführen.`,
  },
  U948: {
    en: (v) =>
      `${capital(enName(v))} has no initial pseudostate, but the entry in line ${v.line} does not enter it explicitly. Add \`initial ${v.id}_start in ${v.id}\`.`,
    de: (v) =>
      `${capital(deName(v))} hat keinen Start, der Eintritt in Zeile ${v.line} betritt sie aber nicht ausdrücklich. \`initial ${v.id}_start in ${v.id}\` ergänzen.`,
  },
  U949: {
    en: (v) =>
      `${capital(enName(v))} has no ${v.case === 'in' ? 'incoming' : 'outgoing'} transition. ${v.kind === 'entrypoint' ? 'An entry point is reached from outside and leads inside.' : 'An exit point is reached from inside and leads outside.'}`,
    de: (v) =>
      `${capital(deName(v))} hat keine ${v.case === 'in' ? 'eingehende' : 'ausgehende'} Transition. ${v.kind === 'entrypoint' ? 'Ein Eintrittspunkt wird von außen erreicht und führt nach innen.' : 'Ein Austrittspunkt wird von innen erreicht und führt nach außen.'}`,
  },
  U960: {
    en: (v) =>
      `${capital(enName(v))} defers "${v.event}" but fires a transition on it itself; the transition wins. Remove the deferral or the transition.`,
    de: (v) =>
      `${capital(deName(v))} stellt „${v.event}“ zurück, verarbeitet es aber selbst; die Transition geht vor. defer oder die Transition streichen.`,
  },
  U961: {
    en: (v) =>
      `${capital(enName(v))} defers "${v.event}", but no transition fires on it. Add one in a later state: \`go ... on="${v.event}"\`.`,
    de: (v) =>
      `${capital(deName(v))} stellt „${v.event}“ zurück, aber keine Transition verarbeitet es. In einem späteren Zustand ergänzen: \`go ... on="${v.event}"\`.`,
  },
};
