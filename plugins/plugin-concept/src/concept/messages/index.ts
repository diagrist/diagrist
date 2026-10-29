import { type Catalogue, pick } from '@diagrist/core';

type Values = Readonly<Record<string, string>>;

const known = (v: Values, en: boolean) => (v.types === '' ? (en ? 'none' : 'keine') : v.types);

/** The nearest declared id in brackets, when one is near enough to be meant. */
const meant = (v: Values, en: boolean) =>
  v.nearest === '' || v.nearest === undefined ? '' : ` (${en ? 'did you mean' : 'gemeint ist wohl'} \`${v.nearest}\`?)`;

/** Messages of the concept rules M110 to M119 and M610 to M613, in English and German. */
export const CONCEPT_MESSAGES: Catalogue = {
  M110: {
    en: (v) =>
      `The item \`${v.item}\` ${pick(v, { none: 'names no type; add `is <type>`', unknown: `is of the type \`${v.type}\`, which is not declared${meant(v, true)}` })}. Declared types: ${known(v, true)}.`,
    de: (v) =>
      `Das Element \`${v.item}\` ${pick(v, { none: 'nennt keinen Typ; `is <Typ>` ergänzen', unknown: `hat den Typ \`${v.type}\`, der nicht deklariert ist${meant(v, false)}` })}. Deklarierte Typen: ${known(v, false)}.`,
  },
  M111: {
    en: (v) =>
      `The relation names the link \`${v.link}\`, which is not declared${meant(v, true)}. Declared links: ${v.links === '' ? 'none' : v.links}.`,
    de: (v) =>
      `Die Beziehung nennt die Verbindung \`${v.link}\`, die nicht deklariert ist${meant(v, false)}. Deklarierte Verbindungen: ${v.links === '' ? 'keine' : v.links}.`,
  },
  M112: {
    en: (v) =>
      `The link \`${v.link}\` ${pick(v, { none: `names no types with \`${v.side}=\``, unknown: `names \`${v.type}\` in \`${v.side}=\`, which is not a declared type` })}.`,
    de: (v) =>
      `Die Verbindung \`${v.link}\` ${pick(v, { none: `nennt mit \`${v.side}=\` keine Typen`, unknown: `nennt in \`${v.side}=\` \`${v.type}\`, das kein deklarierter Typ ist` })}.`,
  },
  M113: {
    en: (v) =>
      `The ${pick(v, { type: 'type', link: 'link' })} \`${v.id}\` is declared already by the vocabulary \`${v.vocabulary}\`. Use it as it is, or give yours another id.`,
    de: (v) =>
      `Der ${pick(v, { type: 'Typ', link: 'Verbindungstyp' })} \`${v.id}\` ist schon vom Vokabular \`${v.vocabulary}\` deklariert. Ihn so verwenden, wie er ist, oder dem eigenen eine andere Id geben.`,
  },
  M114: {
    en: (v) =>
      `The relation \`${v.link}\` ${v.side === 'from' ? 'starts at' : 'ends at'} \`${v.item}\`, of the type \`${v.type}\`; the link allows ${v.allowed} there.`,
    de: (v) =>
      `Die Beziehung \`${v.link}\` ${v.side === 'from' ? 'beginnt bei' : 'endet bei'} \`${v.item}\` vom Typ \`${v.type}\`; die Verbindung erlaubt dort ${v.allowed}.`,
  },
  M115: {
    en: (v) =>
      `\`${v.item}\` has no relation \`${v.link}\`; the link asks every such item for at least one ${v.side === 'from' ? 'from it' : 'to it'}.`,
    de: (v) =>
      `\`${v.item}\` hat keine Beziehung \`${v.link}\`; die Verbindung verlangt von jedem solchen Element mindestens eine ${v.side === 'from' ? 'von ihm aus' : 'zu ihm hin'}.`,
  },
  M116: {
    en: (v) =>
      `\`${v.item}\` has ${v.count} relations \`${v.link}\` ${v.side === 'from' ? 'from it' : 'to it'}; the link allows at most one.`,
    de: (v) =>
      `\`${v.item}\` hat ${v.count} Beziehungen \`${v.link}\` ${v.side === 'from' ? 'von ihm aus' : 'zu ihm hin'}; die Verbindung erlaubt höchstens eine.`,
  },
  M117: {
    en: (v) => `The relations \`${v.link}\` run in a circle: ${v.items}. The link is \`acyclic\`; remove one of them.`,
    de: (v) =>
      `Die Beziehungen \`${v.link}\` laufen im Kreis: ${v.items}. Die Verbindung ist \`acyclic\`; eine davon entfernen.`,
  },
  M118: {
    en: (v) => `The relation \`${v.link}\` joins \`${v.item}\` with itself. Join two different items.`,
    de: (v) =>
      `Die Beziehung \`${v.link}\` verbindet \`${v.item}\` mit sich selbst. Zwei verschiedene Elemente verbinden.`,
  },
  M119: {
    en: (v) =>
      `The item \`${v.item}\` has no entry, but its type \`${v.type}\` asks for one. Indent its definition below it, such as \`"What the word means here"\`.`,
    de: (v) =>
      `Das Element \`${v.item}\` hat keinen Eintrag, sein Typ \`${v.type}\` verlangt aber einen. Die Definition eingerückt darunter schreiben, etwa \`"Was das Wort hier bedeutet"\`.`,
  },
  M610: {
    en: (v) =>
      `The ${pick(v, { type: 'type', link: 'link' })} \`${v.id}\` is declared but not used. Remove it, or use it.`,
    de: (v) =>
      `Der ${pick(v, { type: 'Typ', link: 'Verbindungstyp' })} \`${v.id}\` ist deklariert, wird aber nicht verwendet. Ihn entfernen oder verwenden.`,
  },
  M611: {
    en: (v) =>
      `The picture shows ${v.count} types; at most ${v.most} stay apart at a glance. Split it into two pictures.`,
    de: (v) =>
      `Das Bild zeigt ${v.count} Typen; auf einen Blick unterscheidbar bleiben höchstens ${v.most}. Es in zwei Bilder teilen.`,
  },
  M612: {
    en: (v) => `The item \`${v.item}\` takes part in no relation. Relate it, or leave it out.`,
    de: (v) => `Das Element \`${v.item}\` ist an keiner Beziehung beteiligt. Es verbinden oder weglassen.`,
  },
  M613: {
    en: (v) =>
      `\`${v.from}\` and \`${v.to}\` mean the same. Keep one term, and mark the other with \`status=deprecated\`.`,
    de: (v) =>
      `\`${v.from}\` und \`${v.to}\` bedeuten dasselbe. Einen Begriff behalten und den anderen mit \`status=deprecated\` markieren.`,
  },
};
