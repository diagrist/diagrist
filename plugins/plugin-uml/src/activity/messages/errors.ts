import { type Catalogue, pick } from '@diagrist/core';
import { noun } from './nouns.js';

/** Messages of the activity errors U430 to U458, in English and German. */
export const ACTIVITY_ERRORS: Catalogue = {
  U430: {
    en: (v) =>
      v.case === 'incoming'
        ? `The ${noun(v, 'en')} has an incoming edge. Lead a flow back into a merge after the start instead.`
        : `The ${noun(v, 'en')} has an outgoing edge; an end ends the flow. Remove the edge.`,
    de: (v) =>
      v.case === 'incoming'
        ? `Der ${noun(v, 'de')} hat eine eingehende Kante. Einen Rückfluss in eine Zusammenführung (merge) nach dem Start führen.`
        : `${noun(v, 'de')} hat eine ausgehende Kante; ein Ende beendet den Fluss. Die Kante entfernen.`,
  },
  U431: {
    en: (v) =>
      `The ${noun(v, 'en')} has ${v.count} incoming edges. Bring them together in a merge first: \`merge m\`, \`go m -> ${v.id}\`.`,
    de: (v) =>
      `Die ${noun(v, 'de')} hat ${v.count} Eingänge. Sie erst in einer Zusammenführung vereinen: \`merge m\`, \`go m -> ${v.id}\`.`,
  },
  U432: {
    en: (v) =>
      v.case === 'outgoing'
        ? `The ${noun(v, 'en')} has ${v.count} outgoing edges; exactly one is allowed. To branch, put a ${v.kind === 'merge' ? 'decision' : 'fork'} behind it.`
        : `The ${noun(v, 'en')} has ${v.count} incoming edges; exactly one is allowed. Synchronize parallel branches with a join first.`,
    de: (v) =>
      v.case === 'outgoing'
        ? `${noun(v, 'de')} hat ${v.count} Ausgänge, erlaubt ist genau einer. Zum Verzweigen ${v.kind === 'merge' ? 'eine Entscheidung' : 'eine Gabelung'} dahinter setzen.`
        : `${noun(v, 'de')} hat ${v.count} Eingänge, erlaubt ist genau einer. Parallele Zweige erst mit einer Vereinigung (join) synchronisieren.`,
  },
  U433: {
    en: (v) =>
      v.case === 'twice'
        ? `The ${noun(v, 'en')} has the guard [${v.guard}] more than once; guards of a decision exclude each other.`
        : `\`go ${v.flow}\` has [else] but does not leave a decision. Write \`else\` only on edges out of a \`decision\`.`,
    de: (v) =>
      v.case === 'twice'
        ? `Die ${noun(v, 'de')} hat den Guard [${v.guard}] mehrfach; Guards einer Entscheidung schließen sich aus.`
        : `\`go ${v.flow}\` trägt [else], kommt aber aus keiner Entscheidung. \`else\` nur an Ausgängen einer \`decision\`.`,
  },
  U434: {
    en: (v) =>
      v.case === 'control'
        ? `The control flow \`go ${v.flow}\` touches an object node. Write it as an object flow with \`=>\`.`
        : `The object flow \`go ${v.flow}\` has no object node at either end. Put an \`object\` between them, give pins with \`output=\`/\`input=\`, or use a control flow \`->\`.`,
    de: (v) =>
      v.case === 'control'
        ? `Der Kontrollfluss \`go ${v.flow}\` berührt einen Objektknoten. Als Objektfluss mit \`=>\` schreiben.`
        : `Der Objektfluss \`go ${v.flow}\` hat an keinem Ende einen Objektknoten. Ein \`object\` dazwischen setzen, Pins mit \`output=\`/\`input=\` angeben oder Kontrollfluss \`->\` verwenden.`,
  },
  U435: {
    en: (v) =>
      `The ${noun(v, 'en')} waits for alternatives of the ${noun(v, 'en', 'from')}; only one of them runs and the activity hangs. Bring alternatives together with \`merge ${v.id}\`.`,
    de: (v) =>
      `Die ${noun(v, 'de')} wartet auf Alternativen der ${noun(v, 'de', 'from')}; nur eine läuft, die Aktivität bleibt stehen. Alternativen mit \`merge ${v.id}\` zusammenführen.`,
  },
  U437: {
    en: (v) =>
      v.case === 'outside'
        ? `The interrupting edge \`go ${v.flow}\` starts outside every interruptible region. Put \`${v.from}\` into one with \`interruptible=region\`, or use \`->\`.`
        : `The interrupting edge \`go ${v.flow}\` stays in the region \`${v.region}\`. Its target lies outside the region it interrupts.`,
    de: (v) =>
      v.case === 'outside'
        ? `Die unterbrechende Kante \`go ${v.flow}\` beginnt außerhalb eines Unterbrechungsbereichs. \`${v.from}\` mit \`interruptible=bereich\` hineinlegen oder \`->\` verwenden.`
        : `Die unterbrechende Kante \`go ${v.flow}\` bleibt im Bereich \`${v.region}\`. Ihr Ziel liegt außerhalb des Bereichs, den sie unterbricht.`,
  },
  U455: {
    en: (v) =>
      `${pick(v, {
        twice: `\`${v.id}\` names the pin "${v.pin}" twice on one side; name each pin once`,
        control: `\`go ${v.flow}\` is a control flow; \`pin=\` belongs to object flows \`=>\``,
        unknown: `\`go ${v.flow}\`: there is no pin "${v.pin}" at either end. ${v.known ? `Known: ${v.known}` : 'Declare pins with `output=` and `input=`'}`,
      })}.`,
    de: (v) =>
      `${pick(v, {
        twice: `\`${v.id}\` nennt den Pin „${v.pin}“ auf einer Seite zweimal; jeden Pin einmal nennen`,
        control: `\`go ${v.flow}\` ist ein Kontrollfluss; \`pin=\` gehört an Objektflüsse \`=>\``,
        unknown: `\`go ${v.flow}\`: einen Pin „${v.pin}“ gibt es an keinem Ende. ${v.known ? `Vorhanden: ${v.known}` : 'Pins mit `output=` und `input=` anlegen'}`,
      })}.`,
  },
  U456: {
    en: (v) =>
      `${pick(v, {
        self: `\`${v.id}\` cannot be its own handler`,
        edges: `The handler \`${v.handler}\` has edges of its own; remove them, after the handler the flow goes on at the output of \`${v.protected}\``,
        input: `The handler \`${v.handler}\` has \`input=\`; its only input pin is the exception pin`,
        outputs: `The handler \`${v.handler}\` needs as many output pins as \`${v.protected}\`; align \`output=\``,
      })}.`,
    de: (v) =>
      `${pick(v, {
        self: `\`${v.id}\` kann nicht ihr eigener Handler sein`,
        edges: `Der Handler \`${v.handler}\` hat eigene Kanten; sie entfernen, nach dem Handler geht es am Ausgang von \`${v.protected}\` weiter`,
        input: `Der Handler \`${v.handler}\` hat \`input=\`; sein einziger Eingabe-Pin ist der Ausnahme-Pin`,
        outputs: `Der Handler \`${v.handler}\` braucht so viele Ausgabe-Pins wie \`${v.protected}\`; \`output=\` angleichen`,
      })}.`,
  },
  U457: {
    en: (v) =>
      `The ${noun(v, 'en')} gets no collection from outside${v.pin ? ` at its input "${v.pin}"` : ''}. Add an object flow \`go source => ${v.region}${v.pin ? ` pin="${v.pin}"` : ''}\`; it ends at the input on the top edge.`,
    de: (v) =>
      `Der ${noun(v, 'de')} bekommt keine Sammlung von außen${v.pin ? ` am Eingang „${v.pin}“` : ''}. Objektfluss \`go quelle => ${v.region}${v.pin ? ` pin="${v.pin}"` : ''}\` ergänzen; er endet am Eingang oben auf dem Rahmen.`,
  },
  U458: {
    en: (v) =>
      `\`go ${v.flow}\` at the expansion region \`${v.region}\` is no object flow; expansion nodes take objects only. Write \`=>\`.`,
    de: (v) =>
      `\`go ${v.flow}\` am Expansionsbereich \`${v.region}\` ist kein Objektfluss; Expansionsknoten nehmen nur Objekte. \`=>\` schreiben.`,
  },
};
