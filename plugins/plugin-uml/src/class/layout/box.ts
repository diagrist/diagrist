import { type Rect, textWidth } from '@diagrist/core';
import type { Classifier, Member } from '../diagram.js';
import { parseMember } from '../members.js';
import { CLASS as C, CLASS_FONTS as F } from './metrics.js';

/** A line of text in a class box; italic for abstract, underlined for static. */
export interface ClassText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly italic: boolean;
  readonly underline?: { readonly x1: number; readonly x2: number; readonly y: number };
}

/** A class box after UML: the name field with stereotype and `{abstract}`, below it the compartments. */
export interface ClassArt {
  readonly rect: Rect;
  /** The name field, which the card look tones. */
  readonly head: Rect;
  readonly stereotype?: ClassText;
  readonly name: ClassText;
  readonly property?: ClassText;
  /** Template parameters: a dashed box over the top right corner. */
  readonly template?: { readonly rect: Rect; readonly text: ClassText };
  /** Lines above the compartments, as heights. */
  readonly dividers: readonly number[];
  readonly members: readonly ClassText[];
}

const KIND_STEREOTYPE = { class: undefined, interface: 'interface', enum: 'enumeration' } as const;

/** Baseline of a line, from its top: font size plus one pixel. */
const baseline = (size: number) => size + 1;

/** `«interface, entity»`: kind and own stereotype in one line. */
export function stereotypeText(c: Classifier): string | undefined {
  const names = [KIND_STEREOTYPE[c.kind], c.stereotype].filter((s): s is string => Boolean(s));
  return names.length ? `«${names.join(', ')}»` : undefined;
}

const isOperation = (m: Member) => parseMember(m.text).operation;

/**
 * Compartments below the name. Classes always show attributes and operations, as exams expect; interfaces the
 * attribute compartment only when it holds something; enumerations their values.
 */
export function compartments(c: Classifier): Member[][] {
  if (c.kind === 'enum') return [[...c.members]];
  const attributes = c.members.filter((m) => !isOperation(m));
  const operations = c.members.filter(isOperation);
  return c.kind === 'interface' && !attributes.length ? [operations] : [attributes, operations];
}

/** Below the template box the head moves down by half its height. */
const templateDrop = (c: Classifier) => (c.template ? C.templateH / 2 : 0);

const templateWidth = (c: Classifier) =>
  c.template ? Math.ceil(textWidth(c.template, F.member) + 2 * C.templatePadX) : 0;

function headHeight(c: Classifier): number {
  const lines = C.nameH + (stereotypeText(c) ? C.stereoH : 0) + (c.abstract ? C.stereoH : 0);
  return 2 * C.headPad + lines + templateDrop(c);
}

const sectionHeight = (members: readonly Member[]): number =>
  members.length ? members.length * C.memberH + 2 * C.sectionPad : C.emptyH;

/** Height of a class box: head and compartments. */
export const classHeight = (c: Classifier): number =>
  headHeight(c) + compartments(c).reduce((h, s) => h + sectionHeight(s), 0);

/** Width after the widest text, rounded up to the grid; members never wrap. */
export function classWidth(c: Classifier): number {
  const texts = [
    textWidth(c.label, F.name),
    textWidth(stereotypeText(c) ?? '', F.stereo),
    ...c.members.map((m) => textWidth(m.text, F.member)),
  ];
  const inner = Math.max(...texts, templateWidth(c)) + 2 * C.padX;
  return Math.max(C.minW, Math.ceil(inner / C.grid) * C.grid);
}

function memberText(c: Classifier, m: Member, x: number, y: number): ClassText {
  const italic = m.abstract || (c.kind === 'interface' && isOperation(m));
  if (!m.static) return { text: m.text, x, y, italic };
  const at = y + C.underline;
  return { text: m.text, x, y, italic, underline: { x1: x, x2: x + textWidth(m.text, F.member), y: at } };
}

/** The box of template parameters reaches over the top and right edge. */
function templateBox(text: string, rect: Rect, w: number): NonNullable<ClassArt['template']> {
  const box = { x: rect.x + rect.w + C.templateOver - w, y: rect.y - C.templateH / 2, w, h: C.templateH };
  const y = box.y + (C.templateH + F.member.size) / 2 - 1;
  return { rect: box, text: { text, x: box.x + C.templatePadX, y, italic: false } };
}

/** Every coordinate in the class box. */
export function classArt(c: Classifier, rect: Rect): ClassArt {
  const mid = rect.x + rect.w / 2;
  let y = rect.y + C.headPad + templateDrop(c);
  const line = (text: string, h: number, size: number, italic = false): ClassText => {
    const out = { text, x: mid, y: y + baseline(size), italic };
    y += h;
    return out;
  };
  const stereo = stereotypeText(c);
  const stereotype = stereo ? line(stereo, C.stereoH, F.stereo.size) : undefined;
  const name = line(c.label, C.nameH, F.name.size, c.abstract);
  const property = c.abstract ? line('{abstract}', C.stereoH, F.stereo.size) : undefined;
  const head = { ...rect, h: headHeight(c) };
  y = rect.y + head.h;
  const dividers: number[] = [];
  const members: ClassText[] = [];
  for (const section of compartments(c)) {
    dividers.push(y);
    const top = y + (section.length ? C.sectionPad : 0);
    section.forEach((m, i) => {
      members.push(memberText(c, m, rect.x + C.padX, top + i * C.memberH + baseline(F.member.size)));
    });
    y += sectionHeight(section);
  }
  return {
    rect,
    head,
    ...(stereotype ? { stereotype } : {}),
    name,
    ...(property ? { property } : {}),
    ...(c.template ? { template: templateBox(c.template, rect, templateWidth(c)) } : {}),
    dividers,
    members,
  };
}
