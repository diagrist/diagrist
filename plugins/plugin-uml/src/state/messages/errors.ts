import type { Catalogue } from '@diagrist/core';
import { pick } from '../../class/messages/pick.js';
import { capital, deName, enName } from './nouns.js';

/** Messages of the state errors U440 to U449, in English and German. */
export const STATE_ERRORS: Catalogue = {
  U440: {
    en: (v) =>
      v.case === 'from'
        ? `${capital(enName(v))} has no outgoing transitions. Remove the transition or turn it around.`
        : `${capital(enName(v))} is an entry only, no target of a transition. Point at the first state instead.`,
    de: (v) =>
      v.case === 'from'
        ? `${capital(deName(v))} hat keine ausgehenden Transitionen. Die Transition entfernen oder umdrehen.`
        : `${capital(deName(v))} ist nur Einstieg und kein Ziel einer Transition. Auf den ersten Zustand zeigen lassen.`,
  },
  U441: {
    en: (v) =>
      `${capital(enName(v))} needs ${pick({ case: v.kind ?? '' }, { initial: 'at most one outgoing transition', history: 'at most one outgoing transition', fork: 'exactly one incoming and at least two outgoing transitions', join: 'at least two incoming and exactly one outgoing transition', choice: 'at least one incoming and one outgoing transition', junction: 'at least one incoming and one outgoing transition' })} (it has ${v.ins} in, ${v.outs} out).`,
    de: (v) =>
      `${capital(deName(v))} braucht ${pick({ case: v.kind ?? '' }, { initial: 'höchstens eine ausgehende Transition', history: 'höchstens eine ausgehende Transition', fork: 'genau einen Eingang und mindestens zwei Ausgänge', join: 'mindestens zwei Eingänge und genau einen Ausgang', choice: 'mindestens einen Ein- und einen Ausgang', junction: 'mindestens einen Ein- und einen Ausgang' })} (hat ${v.ins} ein, ${v.outs} aus).`,
  },
  U442: {
    en: (v) =>
      `\`${v.transition}\`: ${pick(v, { initial: 'the transition from the initial pseudostate has neither trigger nor guard; only `do=` is allowed', branch: 'a branch of a fork or join has neither trigger nor guard; only `do=` is allowed', pseudo: 'a pseudostate is left without a trigger; remove `on=` and use `when=`' })}.`,
    de: (v) =>
      `\`${v.transition}\`: ${pick(v, { initial: 'die Starttransition hat weder Trigger noch Guard; nur `do=` ist erlaubt', branch: 'ein Zweig von Gabelung oder Vereinigung hat weder Trigger noch Guard; nur `do=` ist erlaubt', pseudo: 'aus einem Pseudozustand geht es ohne Trigger weiter; `on=` entfernen und `when=` verwenden' })}.`,
  },
  U443: {
    en: (v) =>
      `${capital(enName(v))}: the same region already has \`${v.first}\`. One initial pseudostate per region, one history of each kind.`,
    de: (v) =>
      `${capital(deName(v))}: im selben Bereich gibt es schon \`${v.first}\`. Je Bereich ein Start, je Art eine Historie.`,
  },
  U444: {
    en: (v) => `${capital(enName(v))} lies in no composite state. Put it inside one: \`history h in active\`.`,
    de: (v) => `${capital(deName(v))} liegt in keinem zusammengesetzten Zustand. Hineinlegen: \`history h in aktiv\`.`,
  },
  U445: {
    en: (v) =>
      v.case === 'cycle'
        ? `${capital(enName(v))}: nesting with \`in\` forms a cycle.`
        : `The internal transition on ${enName(v)} has no trigger. Add \`on="event"\`.`,
    de: (v) =>
      v.case === 'cycle'
        ? `${capital(deName(v))}: die Schachtelung mit \`in\` bildet einen Kreis.`
        : `Eine interne Transition hat keinen Auslöser (${deName(v)}). \`on="Ereignis"\` angeben.`,
  },
  U446: {
    en: (v) =>
      v.case === 'fork'
        ? `The fork branch \`${v.transition}\` ends at ${enName(v)}, not at a state.`
        : `The join branch \`${v.transition}\` starts at ${enName(v)}, not at a state.`,
    de: (v) =>
      v.case === 'fork'
        ? `Der Gabelungszweig \`${v.transition}\` endet nicht an einem Zustand: Ziel ist ${deName(v)}.`
        : `Der Vereinigungszweig \`${v.transition}\` beginnt nicht an einem Zustand: Quelle ist ${deName(v)}.`,
  },
  U447: {
    en: (v) => `${capital(enName(v))} has ${v.count} else branches. Keep exactly one \`when=else\`.`,
    de: (v) => `${capital(deName(v))} hat ${v.count} else-Zweige. Genau einen mit \`when=else\` behalten.`,
  },
  U448: {
    en: (v) =>
      pick(v, {
        owner: `${capital(enName(v))} belongs to no state. Write \`region ... in state\`.`,
        direct: `${capital(enName(v))} lies directly in ${enName(v, 'owner')}, which has regions. Put it into one of its regions.`,
        crossing: `\`go\` from region \`${v.a}\` to region \`${v.b}\`: regions of one state run at the same time, no transition crosses between them. Connect them with a fork or join outside.`,
        branches: `${capital(enName(v))} has two branches in the region \`${v.region}\`; a region is in one state at a time.`,
      }),
    de: (v) =>
      pick(v, {
        owner: `${capital(deName(v))} gehört zu keinem Zustand. \`region ... in zustand\` schreiben.`,
        direct: `${capital(deName(v))} liegt direkt in einem Zustand mit Regionen (${deName(v, 'owner')}). In eine seiner Regionen legen.`,
        crossing: `\`go\` von Region \`${v.a}\` nach Region \`${v.b}\`: Regionen eines Zustands laufen gleichzeitig, keine Transition kreuzt zwischen ihnen. Mit Gabelung oder Vereinigung außerhalb verbinden.`,
        branches: `${capital(deName(v))} hat zwei Zweige in der Region \`${v.region}\`; eine Region ist nur in einem Zustand zugleich.`,
      }),
  },
  U449: {
    en: (v) =>
      v.case === 'owner'
        ? `${capital(enName(v))} sits on no state. Write \`... in state\`.`
        : `${capital(enName(v))}: \`${v.transition}\` ${pick(v, { entryFromInside: 'comes from inside; an entry point is reached from outside', entryToOutside: 'leads outside; an entry point leads inside', exitFromOutside: 'comes from outside; an exit point is reached from inside', exitToInside: 'leads inside; an exit point leads outside' })}.`,
    de: (v) =>
      v.case === 'owner'
        ? `${capital(deName(v))} sitzt auf keinem Zustand. \`... in zustand\` schreiben.`
        : `${capital(deName(v))}: \`${v.transition}\` ${pick(v, { entryFromInside: 'kommt von innen; ein Eintrittspunkt wird von außen erreicht', entryToOutside: 'führt nach außen; ein Eintrittspunkt führt nach innen', exitFromOutside: 'kommt von außen; ein Austrittspunkt wird von innen erreicht', exitToInside: 'führt nach innen; ein Austrittspunkt führt nach außen' })}.`,
  },
};
