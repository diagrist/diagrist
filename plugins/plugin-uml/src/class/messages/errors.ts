import type { Catalogue } from '@diagrist/core';
import { pick } from './pick.js';

const MEMBER_EN: Readonly<Record<string, string>> = {
  noName: 'the name is missing',
  spaceInName: 'separate the type with a colon, as in `name : Type`',
  notIdentifier: 'the name is no identifier',
  afterName: 'after the name only `: Type` follows',
  noType: 'a colon without a type',
  unclosed: 'the operation lacks its closing parenthesis',
  literal: 'a value of an enumeration is a plain name such as `"OPEN"`',
  literalFlag: 'a value of an enumeration is neither `static` nor `abstract`',
};

const MEMBER_DE: Readonly<Record<string, string>> = {
  noName: 'der Name fehlt',
  spaceInName: 'den Typ mit Doppelpunkt abtrennen, etwa `name : Typ`',
  notIdentifier: 'der Name ist kein Bezeichner',
  afterName: 'nach dem Namen folgt nur `: Typ`',
  noType: 'Doppelpunkt ohne Typ',
  unclosed: 'der Operation fehlt die schließende Klammer',
  literal: 'ein Aufzählungswert ist ein einfacher Name wie `"OFFEN"`',
  literalFlag: 'ein Aufzählungswert ist weder `static` noch `abstract`',
};

/** Messages of the class errors U410 to U419, U470 and U471, in English and German. */
export const CLASS_ERRORS: Catalogue = {
  U410: {
    en: (v) =>
      v.case === 'target'
        ? `\`${v.relation}\`: "${v.label}" is no interface; a realization points at an interface. Declare it with \`interface\`, or use a generalization \`-|>\`.`
        : `\`${v.relation}\`: the interface "${v.label}" realizes nothing; interfaces extend each other with \`-|>\`.`,
    de: (v) =>
      v.case === 'target'
        ? `\`${v.relation}\`: „${v.label}“ ist keine Schnittstelle; eine Realisierung zeigt auf eine Schnittstelle. Mit \`interface\` anlegen oder Generalisierung \`-|>\` verwenden.`
        : `\`${v.relation}\`: die Schnittstelle „${v.label}“ realisiert nichts; Schnittstellen erweitern einander mit \`-|>\`.`,
  },
  U411: {
    en: (v) =>
      `\`${v.relation}\` ${pick(v, { cycle: 'closes a cycle of generalizations; the triangle points at the more general one', self: 'points at itself', interface: `makes the class "${v.from}" inherit from the interface "${v.to}"; a class implements an interface with \`--|>\``, kinds: `joins "${v.from}" and "${v.to}" of different kinds; only classifiers of one kind inherit from each other` })}.`,
    de: (v) =>
      `\`${v.relation}\` ${pick(v, { cycle: 'schließt einen Kreis von Generalisierungen; das Dreieck zeigt zur allgemeineren Klasse', self: 'zeigt auf sich selbst', interface: `lässt die Klasse „${v.from}“ von der Schnittstelle „${v.to}“ erben; eine Klasse setzt eine Schnittstelle mit \`--|>\` um`, kinds: `verbindet „${v.from}“ und „${v.to}“ verschiedener Art; nur gleiche Arten erben voneinander` })}.`,
  },
  U412: {
    en: (v) =>
      v.case === 'attribute'
        ? `\`${v.member}\` is an attribute and cannot be abstract; \`abstract\` belongs to operations.`
        : `The abstract operation \`${v.member}\` stands in the concrete class "${v.label}". Mark the class \`abstract\` or implement the operation.`,
    de: (v) =>
      v.case === 'attribute'
        ? `\`${v.member}\` ist ein Attribut und kann nicht abstrakt sein; \`abstract\` gehört an Operationen.`
        : `Die abstrakte Operation \`${v.member}\` steht in der konkreten Klasse „${v.label}“. Die Klasse mit \`abstract\` kennzeichnen oder die Operation umsetzen.`,
  },
  U413: {
    en: (v) =>
      `\`"${v.member}"\`: ${MEMBER_EN[v.case ?? ''] ?? ''}. Write members like \`"- name : String"\` or \`"+ total(tax : Rate) : Money"\`.`,
    de: (v) =>
      `\`"${v.member}"\`: ${MEMBER_DE[v.case ?? ''] ?? ''}. Mitglieder schreiben wie \`"- name : String"\` oder \`"+ summe(steuer : Satz) : Geld"\`.`,
  },
  U414: {
    en: (v) =>
      `\`${v.relation}\` joins types and has no multiplicity or role; \`source=\`, \`card=\`, \`role=\` and \`srole=\` belong to associations, aggregations and compositions.`,
    de: (v) =>
      `\`${v.relation}\` verbindet Typen und trägt keine Multiplizität oder Rolle; \`source=\`, \`card=\`, \`role=\` und \`srole=\` gehören an Assoziation, Aggregation und Komposition.`,
  },
  U415: {
    en: (v) =>
      `\`${v.relation}\`: the whole has the multiplicity ${v.source}, a composition allows \`1\` and \`0..1\`. Model parts of several wholes as an aggregation \`o--\` or an association \`--\`.`,
    de: (v) =>
      `\`${v.relation}\`: am Ganzen steht ${v.source}, eine Komposition erlaubt \`1\` und \`0..1\`. Teile mehrerer Ganzer als Aggregation \`o--\` oder Assoziation \`--\` modellieren.`,
  },
  U416: {
    en: (v) =>
      `\`"${v.member}"\` stands twice in "${v.label}". Remove one, or give the operation other parameter types.`,
    de: (v) =>
      `\`"${v.member}"\` steht in „${v.label}“ doppelt. Eines streichen oder der Operation andere Parametertypen geben.`,
  },
  U417: {
    en: (v) =>
      `The association class \`${v.via}\` at \`${v.at}\` ${pick(v, { notAssociation: 'belongs to an association (`--`, `->`, `<->`, `o--`, `*--`)', package: 'joins classifiers only, no packages', ownEnd: 'is an end of its own association', twice: 'already belongs to another association' })}. Put \`class=\` on exactly one association between two other classes.`,
    de: (v) =>
      `Die Assoziationsklasse \`${v.via}\` an \`${v.at}\` ${pick(v, { notAssociation: 'gehört an eine Assoziation (`--`, `->`, `<->`, `o--`, `*--`)', package: 'verbindet nur Klassifizierer, keine Pakete', ownEnd: 'ist ein Ende der eigenen Assoziation', twice: 'gehört schon zu einer anderen Assoziation' })}. \`class=\` an genau eine Assoziation zwischen zwei anderen Klassen setzen.`,
  },
  U418: {
    en: (v) =>
      v.case === 'end'
        ? `\`${v.relation}\`: the package \`${v.package}\` is an end of dependencies \`-->\` only. Write \`rel a --> b\`, optionally with \`import\` or \`access\`.`
        : `\`${v.relation}\`: \`${v.keyword}\` marks a package import and belongs to a dependency \`-->\`. Use \`-->\` or leave \`${v.keyword}\` out.`,
    de: (v) =>
      v.case === 'end'
        ? `\`${v.relation}\`: das Paket \`${v.package}\` ist nur Ende einer Abhängigkeit \`-->\`. \`rel a --> b\` schreiben, wahlweise mit \`import\` oder \`access\`.`
        : `\`${v.relation}\`: \`${v.keyword}\` kennzeichnet einen Paketimport und gehört an eine Abhängigkeit \`-->\`. \`-->\` verwenden oder \`${v.keyword}\` streichen.`,
  },
  U419: {
    en: (v) => `\`${v.relation}\` leads into its own package. Point the dependency at an element outside the package.`,
    de: (v) =>
      `\`${v.relation}\` führt in das eigene Paket. Die Abhängigkeit auf ein Element außerhalb des Pakets richten.`,
  },
  U470: {
    en: (v) =>
      v.case === 'kind'
        ? `\`${v.relation}\`: \`nonav=\` belongs to associations; generalization, realization and dependency have no navigable ends. Leave it out.`
        : `\`${v.relation}\`: the end ${v.ends} has an arrowhead and is navigable, \`nonav=${v.nonav}\` says it is not. Use \`--\` for open ends or \`->\` for a head at \`to\` only, then put \`nonav=\` on the other end.`,
    de: (v) =>
      v.case === 'kind'
        ? `\`${v.relation}\`: \`nonav=\` gehört an Assoziationen; Generalisierung, Realisierung und Abhängigkeit haben keine navigierbaren Enden. Weglassen.`
        : `\`${v.relation}\`: das Ende ${v.ends} trägt eine Pfeilspitze und ist navigierbar, \`nonav=${v.nonav}\` sagt das Gegenteil. \`--\` für offene Enden oder \`->\` für eine Spitze nur am Ziel wählen, dann \`nonav=\` an das andere Ende.`,
  },
  U471: {
    en: () => 'The note names no classifier. Add the one it belongs to: `note "..." on order`.',
    de: () => 'Die Notiz nennt keinen Klassifizierer. Den ergänzen, zu dem sie gehört: `note "..." on auftrag`.',
  },
};
