import { type Catalogue, pick } from '@diagrist/core';

const HINT_EN: Readonly<Record<string, string>> = {
  include: 'draw the relation with `rel a --> b include`',
  extend: 'draw the relation with `rel a --> b extend`',
  actor: 'declare an actor with `actor id "Role"`',
  subsystem: 'declare the system with `subject id "System"`',
};

const HINT_DE: Readonly<Record<string, string>> = {
  include: 'die Beziehung mit `rel a --> b include` zeichnen',
  extend: 'die Beziehung mit `rel a --> b extend` zeichnen',
  actor: 'einen Akteur mit `actor id "Rolle"` anlegen',
  subsystem: 'das System mit `subject id "System"` anlegen',
};

/** Messages of the use case errors U421 to U428, in English and German. */
export const USECASE_ERRORS: Catalogue = {
  U421: {
    en: (v) =>
      `\`${v.relation}\`: \`${v.actor}\` is an actor. \`${v.kind}\` joins two use cases; an actor takes part through an association, e.g. \`rel ${v.actor} -- case\`.`,
    de: (v) =>
      `\`${v.relation}\`: \`${v.actor}\` ist ein Akteur. \`${v.kind}\` verbindet zwei Anwendungsfälle; ein Akteur ist über eine Assoziation beteiligt, etwa \`rel ${v.actor} -- fall\`.`,
  },
  U422: {
    en: (v) =>
      `The association \`${v.relation}\` ${pick(v, { self: 'joins an element with itself', actors: 'joins two actors; two roles are related by a generalization `-|>` at most', cases: 'joins two use cases; between use cases use `--> include`, `--> extend` or `-|>`' })}. An association joins an actor with a use case: \`rel customer -- order\`.`,
    de: (v) =>
      `Die Assoziation \`${v.relation}\` ${pick(v, { self: 'verbindet ein Element mit sich selbst', actors: 'verbindet zwei Akteure; zwei Rollen verbindet höchstens eine Generalisierung `-|>`', cases: 'verbindet zwei Anwendungsfälle; zwischen Anwendungsfällen gibt es `--> include`, `--> extend` oder `-|>`' })}. Eine Assoziation verbindet einen Akteur mit einem Anwendungsfall: \`rel kunde -- bestellen\`.`,
  },
  U423: {
    en: (v) =>
      `The generalization \`${v.relation}\` ${pick(v, { self: 'points at itself', mixed: 'joins an actor with a use case; specialize an actor from an actor, a use case from a use case', cycle: 'closes a cycle; the triangle points at the more general one' })}.`,
    de: (v) =>
      `Die Generalisierung \`${v.relation}\` ${pick(v, { self: 'zeigt auf sich selbst', mixed: 'verbindet einen Akteur mit einem Anwendungsfall; nur Akteur von Akteur oder Anwendungsfall von Anwendungsfall spezialisieren', cycle: 'schließt einen Kreis; das Dreieck zeigt zum Allgemeineren' })}.`,
  },
  U424: {
    en: (v) =>
      v.case === 'twice'
        ? `"${v.label}" names the extension point "${v.point}" twice; each point needs its own name.`
        : `\`${v.relation}\`: "${v.label}" has no extension point "${v.point}". ${v.case === 'unknown' ? `Known: ${v.known}.` : `Declare it on the extended use case: \`usecase ${v.id} "..." points="${v.point}"\`.`}`,
    de: (v) =>
      v.case === 'twice'
        ? `„${v.label}“ nennt die Erweiterungsstelle „${v.point}“ zweimal; jede Stelle braucht einen eigenen Namen.`
        : `\`${v.relation}\`: „${v.label}“ hat keine Erweiterungsstelle „${v.point}“. ${v.case === 'unknown' ? `Bekannt: ${v.known}.` : `Am erweiterten Fall anlegen: \`usecase ${v.id} "..." points="${v.point}"\`.`}`,
  },
  U425: {
    en: (v) =>
      `\`${v.relation}\` closes a cycle of includes. The arrow points from the base to the included use case; move shared behaviour into a use case of its own.`,
    de: (v) =>
      `\`${v.relation}\` schließt einen Kreis von include-Beziehungen. Der Pfeil zeigt von der Basis zum eingeschlossenen Fall; gemeinsames Verhalten in einen eigenen Fall auslagern.`,
  },
  U426: {
    en: (v) =>
      `\`${v.relation}\`: ${pick(v, { noKind: '`-->` stands for include and extend; add the flag, e.g. `rel order --> pay include` or `rel voucher --> order extend when="voucher present"`', bothKinds: 'a relation is `include` or `extend`, not both', flagOnArrow: '`include` and `extend` belong to `-->`; write `rel a --> b include`, or leave the flag out for `--` and `-|>`', multiplicity: 'multiplicities `source=` and `card=` belong to associations `--`; leave them out', extendOnly: '`when=` and `at=` say when and where an `extend` applies; leave them out here' })}.`,
    de: (v) =>
      `\`${v.relation}\`: ${pick(v, { noKind: '`-->` steht für include und extend; das Merkwort ergänzen, etwa `rel bestellen --> bezahlen include` oder `rel gutschein --> bestellen extend when="Gutschein vorhanden"`', bothKinds: 'eine Beziehung ist `include` oder `extend`, nicht beides', flagOnArrow: '`include` und `extend` gehören zu `-->`; `rel a --> b include` schreiben oder das Merkwort bei `--` und `-|>` weglassen', multiplicity: 'Multiplizitäten `source=` und `card=` gehören zu Assoziationen `--`; hier weglassen', extendOnly: '`when=` und `at=` sagen, wann und wo ein `extend` greift; hier weglassen' })}.`,
  },
  U427: {
    en: (v) => `"${v.label}": «${v.name}» is no stereotype of a use case; ${HINT_EN[v.name ?? ''] ?? ''}.`,
    de: (v) => `„${v.label}“: «${v.name}» ist kein Stereotyp eines Anwendungsfalls; ${HINT_DE[v.name ?? ''] ?? ''}.`,
  },
  U428: {
    en: () => 'The note names no element. Add the actor, use case or subject it belongs to: `note "..." on shop`.',
    de: () =>
      'Die Notiz nennt kein Element. Den Akteur, Anwendungsfall oder die Systemgrenze ergänzen: `note "..." on shop`.',
  },
};
