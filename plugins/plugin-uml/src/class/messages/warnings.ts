import type { Catalogue } from '@diagrist/core';
import { pick } from './pick.js';

/** Messages of the class warnings U910 to U918 (the predecessor's W410 to W418), in English and German. */
export const CLASS_WARNINGS: Catalogue = {
  U910: {
    en: (v) =>
      `\`${v.relation}\` has no multiplicity at ${v.ends}. Give \`source=\` for the end \`from\` and \`card=\` for the end \`to\`.`,
    de: (v) =>
      `\`${v.relation}\` hat keine Multiplizität am Ende ${v.ends}. \`source=\` für das Quellende und \`card=\` für das Zielende angeben.`,
  },
  U911: {
    en: (v) =>
      `Another relation between \`${v.a}\` and \`${v.b}\` without a name or role. Give a name in quotes or \`role=\`/\`srole=\`.`,
    de: (v) =>
      `Weitere Beziehung zwischen \`${v.a}\` und \`${v.b}\` ohne Name oder Rolle. Einen Namen in Anführungszeichen oder \`role=\`/\`srole=\` angeben.`,
  },
  U912: {
    en: (v) =>
      `The packages ${v.packages} depend on each other in a cycle. Turn one dependency around, for instance through an interface in the dependent package.`,
    de: (v) =>
      `Die Pakete ${v.packages} hängen im Kreis voneinander ab. Eine Abhängigkeit umkehren, etwa über eine Schnittstelle im abhängigen Paket.`,
  },
  U913: {
    en: (v) =>
      `The package "${v.label}" holds no classifier and is not drawn. Put classes \`in ${v.id}\` or remove it.`,
    de: (v) =>
      `Das Paket „${v.label}“ enthält keinen Klassifizierer und wird nicht gezeichnet. Klassen mit \`in ${v.id}\` hineinlegen oder das Paket streichen.`,
  },
  U916: {
    en: (v) =>
      `\`{${v.property}}\` holds for ${v.case === 'attribute' ? 'attributes' : 'operations'} only, not for \`"${v.member}"\`. ${v.case === 'attribute' ? 'On an operation it is `{query}`.' : 'On an attribute it is `{readOnly}`.'}`,
    de: (v) =>
      `\`{${v.property}}\` gilt nur für ${v.case === 'attribute' ? 'Attribute' : 'Operationen'}, nicht für \`"${v.member}"\`. ${v.case === 'attribute' ? 'An einer Operation heißt es `{query}`.' : 'An einem Attribut heißt es `{readOnly}`.'}`,
  },
  U917: {
    en: (v) =>
      `The n-ary association \`${v.id}\` has ${v.legs} ${v.legs === '1' ? 'leg' : 'legs'}, it needs at least three. ${v.legs === '2' ? 'Two ends are a binary association: `rel a -- b` instead of a diamond.' : 'One leg per class: `rel <assoc> -- <class> card=...`.'}`,
    de: (v) =>
      `Die n-äre Assoziation \`${v.id}\` hat ${v.legs} ${v.legs === '1' ? 'Bein' : 'Beine'}, nötig sind mindestens drei. ${v.legs === '2' ? 'Zwei Enden sind eine binäre Assoziation: `rel a -- b` statt Raute.' : 'Je Klasse ein Bein: `rel <raute> -- <klasse> card=...`.'}`,
  },
  U918: {
    en: (v) =>
      `The leg \`${v.relation}\` ${pick(v, { twoDiamonds: 'joins two diamonds; a leg runs from the diamond to a class', kind: 'is no association; legs are `--` or `->` (aggregation and composition exist only between two ends)', towardDiamond: 'points at the diamond; only a class end is navigable', via: 'carries `class=`; the association class belongs to the diamond (`assoc ... class=`)', endAtDiamond: 'has a multiplicity or role at the diamond; they belong to the class end', nonav: 'marks the diamond as not navigable; `nonav=` holds at the class end only' })}. Write \`rel <assoc> -- <class> card=... role=...\`.`,
    de: (v) =>
      `Das Bein \`${v.relation}\` ${pick(v, { twoDiamonds: 'verbindet zwei Rauten; ein Bein führt von der Raute zu einer Klasse', kind: 'ist keine Assoziation; Beine sind `--` oder `->` (Aggregation und Komposition gibt es nur binär)', towardDiamond: 'zeigt auf die Raute; navigierbar ist nur ein Klassenende', via: 'trägt `class=`; die Assoziationsklasse gehört an die Raute (`assoc ... class=`)', endAtDiamond: 'hat Multiplizität oder Rolle an der Raute; sie gehören an das Klassenende', nonav: 'markiert die Raute als nicht navigierbar; `nonav=` gilt nur am Klassenende' })}. \`rel <raute> -- <klasse> card=... role=...\` schreiben.`,
  },
};
