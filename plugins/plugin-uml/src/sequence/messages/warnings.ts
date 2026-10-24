import type { Catalogue } from '@diagrist/core';

/** Messages of the sequence warnings U900 to U951 (the predecessor's W400 to W451), in English and German. */
export const SEQUENCE_WARNINGS: Catalogue = {
  U900: {
    en: (v) =>
      `\`${v.operator}\` has one operand only. ${v.operator === 'alt' ? 'Use `opt` for a conditional part, or add `else`.' : 'Separate parallel operands with `and`.'}`,
    de: (v) =>
      `\`${v.operator}\` hat nur einen Operanden. ${v.operator === 'alt' ? 'Für einen bedingten Abschnitt `opt` verwenden oder `else` ergänzen.' : 'Parallele Operanden mit `and` trennen.'}`,
  },
  U901: {
    en: (v) =>
      `The call ${v.label ? `"${v.label}" ` : ''}from \`${v.from}\` to \`${v.to}\` gets no reply. Add \`msg ${v.to} --> ${v.from} "..."\` or use \`~>\` for an asynchronous message.`,
    de: (v) =>
      `Der Aufruf ${v.label ? `„${v.label}“ ` : ''}von \`${v.from}\` an \`${v.to}\` bekommt keine Antwort. \`msg ${v.to} --> ${v.from} "..."\` ergänzen oder \`~>\` für eine asynchrone Nachricht verwenden.`,
  },
  U902: {
    en: (v) => `The lifeline "${v.label}" (\`${v.id}\`) appears in no message, note or reference.`,
    de: (v) => `Die Lebenslinie „${v.label}“ (\`${v.id}\`) kommt in keiner Nachricht, Notiz und keinem Verweis vor.`,
  },
  U903: {
    en: (v) =>
      `An operand${v.guard ? ` [${v.guard}]` : ''} of \`${v.operator}\` is empty. Indent its messages below it or remove it.`,
    de: (v) =>
      `Ein Operand${v.guard ? ` [${v.guard}]` : ''} von \`${v.operator}\` ist leer. Seine Nachrichten darunter einrücken oder ihn entfernen.`,
  },
  U904: {
    en: () =>
      'This operand of `alt` has no guard; only the last may go without one. Write the condition, e.g. `alt "token valid"`.',
    de: () =>
      'Dieser Operand von `alt` hat keinen Wächter; nur der letzte darf ohne sein. Die Bedingung angeben, etwa `alt "Token gültig"`.',
  },
  U905: {
    en: (v) =>
      `\`activate ${v.lifeline}\` without \`deactivate\`: the bar reaches to the end. Write \`deactivate ${v.lifeline}\` after the last message of the processing.`,
    de: (v) =>
      `\`activate ${v.lifeline}\` ohne \`deactivate\`: der Balken reicht bis zum Ende. \`deactivate ${v.lifeline}\` nach der letzten Nachricht der Verarbeitung schreiben.`,
  },
  U906: {
    en: (v) =>
      v.case === 'same'
        ? `\`duration\` from \`${v.from}\` to \`${v.to}\` has no length; use \`time\` for a point in time.`
        : `\`duration\` names \`${v.from}\` first although \`${v.to}\` comes earlier; write \`duration ${v.to} ${v.from} "..."\`.`,
    de: (v) =>
      v.case === 'same'
        ? `\`duration\` von \`${v.from}\` bis \`${v.to}\` hat keine Dauer; für einen Zeitpunkt \`time\` verwenden.`
        : `\`duration\` nennt \`${v.from}\` zuerst, obwohl \`${v.to}\` vorher kommt; \`duration ${v.to} ${v.from} "..."\` schreiben.`,
  },
  U907: {
    en: (v) =>
      `A ${v.case} message as a synchronous call: no reply is possible. Use \`~>\` for an asynchronous message.`,
    de: (v) =>
      `${v.case === 'lost' ? 'Verlorene' : 'Gefundene'} Nachricht als synchroner Aufruf: eine Antwort ist nicht möglich. \`~>\` für eine asynchrone Nachricht verwenden.`,
  },
  U908: {
    en: (v) =>
      `\`duration="${v.duration}"\` on ${v.case === 'create' ? 'a creation' : 'a self call'} is not drawn. Name two messages with \`id=\` and write \`duration m1 m2 "..."\`.`,
    de: (v) =>
      `\`duration="${v.duration}"\` an ${v.case === 'create' ? 'einer Erzeugung' : 'einem Selbstaufruf'} wird nicht gezeichnet. Zwei Nachrichten mit \`id=\` benennen und \`duration m1 m2 "..."\` schreiben.`,
  },
  U909: {
    en: (v) =>
      `The coregion on \`${v.on}\` holds ${v.count === '0' ? 'no message' : 'one message only'}; it needs at least two whose order is open, otherwise leave it out.`,
    de: (v) =>
      `Die Coregion auf \`${v.on}\` enthält ${v.count === '0' ? 'keine Nachricht' : 'nur eine Nachricht'}; sie braucht mindestens zwei mit offener Reihenfolge, sonst weglassen.`,
  },
  U950: {
    en: (v) =>
      `The frame \`${v.frame}\` has no message at its edge. Write one with \`${v.frame}\` as an end, e.g. \`msg a -> ${v.frame} "..."\`, or leave out \`id=\`.`,
    de: (v) =>
      `Der Rahmen \`${v.frame}\` hat keine Nachricht an seinem Rand. Eine mit \`${v.frame}\` als Ende schreiben, etwa \`msg a -> ${v.frame} "..."\`, oder \`id=\` weglassen.`,
  },
  U951: {
    en: (v) =>
      `The gate \`${v.gate}\` ${v.frame ? `at \`${v.frame}\`` : 'on the frame sd'} is ${v.end === 'to' ? 'reached' : 'left'} twice. Give each gate one message per direction and name the second one differently.`,
    de: (v) =>
      `Das Gate \`${v.gate}\` ${v.frame ? `an \`${v.frame}\`` : 'am Rahmen sd'} wird zweimal ${v.end === 'to' ? 'erreicht' : 'verlassen'}. Jedem Gate je Richtung eine Nachricht geben und das zweite anders benennen.`,
  },
};
