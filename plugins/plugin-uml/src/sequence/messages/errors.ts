import { type Catalogue, pick } from '@diagrist/core';

/** Messages of the sequence errors U400 to U454, in English and German. */
export const SEQUENCE_ERRORS: Catalogue = {
  U400: {
    en: (v) =>
      `\`${v.found}\` is no declared lifeline. Declared: ${v.known}. Declare it first, e.g. \`participant ${v.found} "..."\`.`,
    de: (v) =>
      `\`${v.found}\` ist keine deklarierte Lebenslinie. Deklariert: ${v.known}. Erst deklarieren, etwa \`participant ${v.found} "..."\`.`,
  },
  U401: {
    en: (v) =>
      `This line stands in \`${v.fragment}\` after \`${v.operand}\` at its level. Indent it below \`${v.operand}\` to put it into that operand, or move it before \`${v.operand}\`.`,
    de: (v) =>
      `Diese Zeile steht in \`${v.fragment}\` nach \`${v.operand}\` auf dessen Ebene. Unter \`${v.operand}\` einrücken, damit sie zu diesem Operanden gehört, oder vor \`${v.operand}\` stellen.`,
  },
  U403: {
    en: (v) =>
      `Reply from \`${v.from}\` to \`${v.to}\` without an open synchronous call the other way. Write \`msg ${v.to} -> ${v.from} "..."\` before it, or use \`~>\` for a message of its own.`,
    de: (v) =>
      `Antwort von \`${v.from}\` an \`${v.to}\` ohne offenen synchronen Aufruf in Gegenrichtung. Vorher \`msg ${v.to} -> ${v.from} "..."\` schreiben oder \`~>\` für eine eigenständige Nachricht verwenden.`,
  },
  U404: {
    en: (v) =>
      `\`${v.lifeline}\` ${pick(v, { createdTwice: 'is created a second time', destroyedTwice: 'is destroyed a second time', beforeCreate: 'is used before `create` creates it; put the creation before its first message', afterDestroy: 'is used after `destroy`' })}.`,
    de: (v) =>
      `\`${v.lifeline}\` ${pick(v, { createdTwice: 'wird ein zweites Mal erzeugt', destroyedTwice: 'wird ein zweites Mal zerstört', beforeCreate: 'wird benutzt, bevor `create` sie erzeugt; die Erzeugung vor die erste Nachricht stellen', afterDestroy: 'wird nach `destroy` noch benutzt' })}.`,
  },
  U405: {
    en: (v) =>
      `\`deactivate ${v.target}\` without an open \`activate ${v.target}\`. Calls and replies activate by themselves; \`activate\` is for processing after \`~>\`.`,
    de: (v) =>
      `\`deactivate ${v.target}\` ohne offenes \`activate ${v.target}\`. Aufruf und Antwort aktivieren von selbst; \`activate\` ist für die Verarbeitung nach \`~>\`.`,
  },
  U408: {
    en: (v) =>
      `${pick(v, { reserved: `\`${v.id}\` is reserved and no lifeline id`, lostSends: '`lost` is the receiver of a lost message, not a sender', foundReceives: '`found` is the sender of a found message, not a receiver', both: 'A message is not found and lost at once', reply: 'A reply cannot be lost or found', create: 'A creation cannot be lost or found' })}. Lost: \`msg a ~> lost "..."\`, found: \`msg found ~> b "..."\`.`,
    de: (v) =>
      `${pick(v, { reserved: `\`${v.id}\` ist reserviert und keine Lebenslinien-Id`, lostSends: '`lost` ist der Empfänger einer verlorenen Nachricht, kein Sender', foundReceives: '`found` ist der Sender einer gefundenen Nachricht, kein Empfänger', both: 'Eine Nachricht ist nicht zugleich gefunden und verloren', reply: 'Eine Antwort kann nicht verloren oder gefunden sein', create: 'Eine Erzeugung kann nicht verloren oder gefunden sein' })}. Verloren: \`msg a ~> lost "..."\`, gefunden: \`msg found ~> b "..."\`.`,
  },
  U450: {
    en: (v) =>
      `${pick(v, { reserved: `\`${v.id}\` is reserved and no lifeline id`, bothEnds: 'A message does not run from a gate to a gate', openEnd: 'A gate is a known end, not lost or found at once', create: 'A creation runs between two lifelines, not through a gate' })}. In: \`msg gate -> a "..."\`, back: \`msg a --> gate "..."\`.`,
    de: (v) =>
      `${pick(v, { reserved: `\`${v.id}\` ist reserviert und keine Lebenslinien-Id`, bothEnds: 'Eine Nachricht läuft nicht von einem Gate zu einem Gate', openEnd: 'Ein Gate ist ein bekanntes Ende, nicht zugleich verloren oder gefunden', create: 'Eine Erzeugung läuft zwischen zwei Lebenslinien, nicht über ein Gate' })}. Herein: \`msg gate -> a "..."\`, zurück: \`msg a --> gate "..."\`.`,
  },
  U451: {
    en: (v) =>
      `\`${v.operator}\` without messages: name the messages it ${v.operator === 'ignore' ? 'ignores' : 'considers'} as its guard, e.g. \`${v.operator} "ping, status"\`.`,
    de: (v) =>
      `\`${v.operator}\` ohne Nachrichten: die ${v.operator === 'ignore' ? 'ausgeblendeten' : 'betrachteten'} Nachrichten als Wächter nennen, etwa \`${v.operator} "ping, status"\`.`,
  },
  U452: {
    en: (v) =>
      `\`${v.statement}\` needs \`${v.attribute}\` with the lifelines it stands on, e.g. \`${v.attribute}a${v.attribute === 'over=' ? ',b' : ''}\`.`,
    de: (v) =>
      `\`${v.statement}\` braucht \`${v.attribute}\` mit den Lebenslinien, auf denen es steht, etwa \`${v.attribute}a${v.attribute === 'over=' ? ',b' : ''}\`.`,
  },
  U453: {
    en: (v) =>
      `The message does not touch \`${v.on}\`. In \`coregion ${v.on}\` stand only messages from or to \`${v.on}\`.`,
    de: (v) =>
      `Die Nachricht berührt \`${v.on}\` nicht. In \`coregion ${v.on}\` stehen nur Nachrichten von oder an \`${v.on}\`.`,
  },
  U454: {
    en: (v) =>
      `${pick(v, { lifeline: `\`${v.frame}\` is already a lifeline`, reserved: `\`${v.frame}\` is reserved`, twice: `The frame name \`${v.frame}\` is used twice`, frameToFrame: 'A message does not run from frame to frame', openEnd: 'A gate is a known end, not lost or found', create: 'A creation runs between two lifelines, not through a gate', outsideFragment: `The message does not stand inside the fragment \`${v.frame}\``, crossed: `Between the reference \`${v.frame}\` and the message stands something that crosses it or touches its lifelines`, covered: `The reference \`${v.frame}\` covers the lifeline itself` })}. Reference: \`msg a -> r\` after \`ref ... id=r\` with \`a\` outside \`over=\`; fragment: \`msg f -> a\` inside \`alt ... id=f\`.`,
    de: (v) =>
      `${pick(v, { lifeline: `\`${v.frame}\` ist schon eine Lebenslinie`, reserved: `\`${v.frame}\` ist reserviert`, twice: `Der Rahmenname \`${v.frame}\` ist doppelt vergeben`, frameToFrame: 'Eine Nachricht läuft nicht von Rahmen zu Rahmen', openEnd: 'Ein Gate ist ein bekanntes Ende, nicht verloren oder gefunden', create: 'Eine Erzeugung läuft zwischen zwei Lebenslinien, nicht über ein Gate', outsideFragment: `Die Nachricht steht nicht im Fragment \`${v.frame}\``, crossed: `Zwischen dem Verweis \`${v.frame}\` und der Nachricht steht etwas, das ihn kreuzt oder seine Lebenslinien berührt`, covered: `Der Verweis \`${v.frame}\` verdeckt die Lebenslinie selbst` })}. Verweis: \`msg a -> r\` nach \`ref ... id=r\`, \`a\` außerhalb von \`over=\`; Fragment: \`msg f -> a\` in \`alt ... id=f\`.`,
  },
};
