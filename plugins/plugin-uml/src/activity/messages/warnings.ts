import type { Catalogue } from '@diagrist/core';
import { noun } from './nouns.js';

/** Messages of the activity warnings U930 to U957 (the predecessor's W430 to W457), in English and German. */
export const ACTIVITY_WARNINGS: Catalogue = {
  U930: {
    en: (v) =>
      v.case === 'none'
        ? 'The activity has no initial node. Add one: `initial start`.'
        : `The activity has ${v.count} initial nodes; exam practice expects one. Start once and branch with \`fork\`.`,
    de: (v) =>
      v.case === 'none'
        ? 'Die Aktivität hat keinen Startknoten. Einen ergänzen: `initial start`.'
        : `Die Aktivität hat ${v.count} Startknoten; in Prüfungen ist genau einer üblich. Einmal starten und mit \`fork\` verzweigen.`,
  },
  U931: {
    en: (v) =>
      `The ${noun(v, 'en')} has ${v.count} outgoing edge${v.count === '1' ? '' : 's'}. Give it two alternatives with guards at least, one of them \`else\`: \`go ${v.id} -> next else\`.`,
    de: (v) =>
      `Die ${noun(v, 'de')} hat ${v.count} ${v.count === '1' ? 'Ausgang' : 'Ausgänge'}. Mindestens zwei Alternativen mit Guard, eine davon gern \`else\`: \`go ${v.id} -> weiter else\`.`,
  },
  U932: {
    en: (v) =>
      `The ${noun(v, 'en')} has fewer than two ${v.case === 'incoming' ? 'incoming' : 'outgoing'} edges and does nothing. Leave it out.`,
    de: (v) =>
      `${noun(v, 'de')} hat weniger als zwei ${v.case === 'incoming' ? 'Eingänge' : 'Ausgänge'} und bewirkt nichts. Weglassen.`,
  },
  U933: {
    en: (v) =>
      `The edge ${v.from} -> ${v.to} out of the ${noun(v, 'en')} has no guard. Write when it applies: \`go ${v.from} -> ${v.to} "condition"\`, or \`else\`.`,
    de: (v) =>
      `Der Ausgang ${v.from} -> ${v.to} der ${noun(v, 'de')} hat keinen Guard. Angeben, wann er gilt: \`go ${v.from} -> ${v.to} "Bedingung"\` oder \`else\`.`,
  },
  U934: {
    en: (v) =>
      `The guards ${v.guards} of the ${noun(v, 'en')} do not visibly cover every case. Mark one edge with \`else\`.`,
    de: (v) =>
      `Die Guards ${v.guards} der ${noun(v, 'de')} decken nicht erkennbar alle Fälle ab. Einen Ausgang mit \`else\` markieren.`,
  },
  U935: {
    en: (v) => `The ${noun(v, 'en')} is not reachable from any start. Add an edge into it.`,
    de: (v) => `${noun(v, 'de')} ist von keinem Start aus erreichbar. Eine eingehende Kante ergänzen.`,
  },
  U936: {
    en: (v) =>
      v.case === 'none'
        ? 'The activity has no end. Add one: `final done`.'
        : `The ${noun(v, 'en')} has no outgoing edge. End its flow with \`final\` (activity final) or \`flowfinal\` (flow final).`,
    de: (v) =>
      v.case === 'none'
        ? 'Die Aktivität hat kein Ende. Eines ergänzen: `final ende`.'
        : `${noun(v, 'de')} hat keinen Ausgang. Mit \`final\` (Aktivitätsende) oder \`flowfinal\` (Flussende) abschließen.`,
  },
  U937: {
    en: (v) =>
      `The ${noun(v, 'en')} brings together parallel branches of the ${noun(v, 'en', 'from')} without synchronizing; what follows runs several times. Use \`join ${v.id}\` instead.`,
    de: (v) =>
      `Die ${noun(v, 'de')} vereint parallele Zweige der ${noun(v, 'de', 'from')}, ohne zu synchronisieren; was folgt, läuft mehrfach. \`join ${v.id}\` verwenden.`,
  },
  U938: {
    en: (v) =>
      `${v.count} parallel branches of the ${noun(v, 'en')} end in an activity final; the first stops the others. Synchronize them with \`join\`, or end side branches with \`flowfinal\`.`,
    de: (v) =>
      `${v.count} parallele Zweige der ${noun(v, 'de')} enden in einem Aktivitätsende; das erste bricht die anderen ab. Mit \`join\` synchronisieren oder Nebenzweige mit \`flowfinal\` beenden.`,
  },
  U939: {
    en: (v) =>
      v.case === 'join'
        ? `The ${noun(v, 'en')} has ${v.count} incoming edges and waits for all of them. Bring alternatives together with \`merge\` first, parallel branches with \`join\`.`
        : `The ${noun(v, 'en')} has ${v.count} outgoing edges and starts all of them. Show alternatives with \`decision\`, parallel branches with \`fork\`.`,
    de: (v) =>
      v.case === 'join'
        ? `${noun(v, 'de')} hat ${v.count} Eingänge und wartet auf alle. Alternativen vorher mit \`merge\`, parallele Zweige mit \`join\` zusammenführen.`
        : `${noun(v, 'de')} hat ${v.count} Ausgänge und startet alle. Alternativen mit \`decision\`, parallele Zweige mit \`fork\` darstellen.`,
  },
  U955: {
    en: (v) =>
      `The interruptible region "${v.region}" has no interrupting edge. Add one out of it: \`go trigger ~> target\`.`,
    de: (v) =>
      `Der Unterbrechungsbereich „${v.region}“ hat keine unterbrechende Kante. Eine aus ihm heraus ergänzen: \`go auslöser ~> ziel\`.`,
  },
  U956: {
    en: (v) =>
      `\`go ${v.flow}\` crosses the frame of \`${v.region}\` without an expansion node. Go through its ${v.case === 'in' ? `input: \`go ${v.from} => ${v.region}\` and \`go ${v.region} => ${v.to}\`` : `output: \`go ${v.from} => ${v.region}\` and \`go ${v.region} => ${v.to}\``}.`,
    de: (v) =>
      `\`go ${v.flow}\` kreuzt den Rahmen von \`${v.region}\` ohne Expansionsknoten. Über den ${v.case === 'in' ? `Eingang gehen: \`go ${v.from} => ${v.region}\` und \`go ${v.region} => ${v.to}\`` : `Ausgang gehen: \`go ${v.from} => ${v.region}\` und \`go ${v.region} => ${v.to}\``}.`,
  },
  U957: {
    en: (v) =>
      v.case === 'empty'
        ? `The ${noun(v, 'en')} has no nodes. Put nodes into it with \`expansion=${v.region}\`.`
        : `No edge leads from the input${v.pin ? ` "${v.pin}"` : ''} of the ${noun(v, 'en')} inside. Add \`go ${v.region} => ${v.first}${v.pin ? ` pin="${v.pin}"` : ''}\`.`,
    de: (v) =>
      v.case === 'empty'
        ? `Der ${noun(v, 'de')} hat keine Knoten. Knoten mit \`expansion=${v.region}\` hineinlegen.`
        : `Vom Eingang${v.pin ? ` „${v.pin}“` : ''} des ${noun(v, 'de')} führt keine Kante nach innen. \`go ${v.region} => ${v.first}${v.pin ? ` pin="${v.pin}"` : ''}\` ergänzen.`,
  },
};
