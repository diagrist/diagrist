import { domId, type Shape } from '@diagrist/core';
import type { PlacedFrame } from '../layout/index.js';
import type { Look, Role } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { BLOCK_RX, filledShapes } from './blocks.js';
import { paperFrame } from './paper.js';

const PLAIN_RX = 10;
const CARD_RX = 8;
const TAG_RX = 2;
const CARD_FRAME: Readonly<Record<Role, string>> = {
  own: 'cardFrameOwn',
  shared: 'cardFrame',
  external: 'cardFrameExternal',
};

function tagShapes(f: PlacedFrame, blocks: boolean): Shape[] {
  const tag = f.head.tag;
  if (!tag || !f.group.tag) return [];
  const text: Shape = {
    kind: 'text',
    ...tag.text,
    text: f.group.tag,
    role: 'tagText',
    font: 'block',
    anchor: 'middle',
  };
  return blocks
    ? [...filledShapes(tag.rect, 'red', TAG_RX), text]
    : [{ kind: 'rect', ...tag.rect, rx: TAG_RX, role: 'tag' }, text];
}

function plainFrame(f: PlacedFrame, texts: Texts): Shape[] {
  const { group: g, head } = f;
  const line = g.tone ? `tint-${g.tone}` : g.role === 'own' ? 'frameOwn' : 'frame';
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  return [
    { kind: 'rect', ...f.rect, rx: PLAIN_RX, role: line },
    { kind: 'text', ...head.title, text: g.title, role: 'frameTitle', font: 'group' },
    { kind: 'text', ...head.subtitle, text: team, role: 'frameTeam', font: 'note' },
  ];
}

function cardFrame(f: PlacedFrame): Shape[] {
  const { group: g, head } = f;
  const line = g.tone ? `tint-${g.tone}` : CARD_FRAME[g.role ?? 'shared'];
  return [
    { kind: 'rect', ...f.rect, rx: CARD_RX, role: line },
    ...(head.titleBox ? [{ kind: 'rect', ...head.titleBox, role: 'knockout' } as const] : []),
    { kind: 'text', ...head.title, text: g.title, role: 'cardTitle', font: 'large' },
  ];
}

function blockFrame(f: PlacedFrame): Shape[] {
  const { group: g, head } = f;
  const out = filledShapes(f.rect, g.tone ?? 'peach', BLOCK_RX);
  if (g.title)
    out.push({
      kind: 'text',
      ...head.title,
      text: g.title,
      role: 'blockTitle',
      font: 'heading',
      ...(head.titleAnchor ? { anchor: head.titleAnchor } : {}),
    });
  return out;
}

/** Every frame in its group `group-<id>`, parents first, drawn in its look with its tag. */
export function frameShapes(frames: readonly PlacedFrame[], look: Look, texts: Texts): Shape[] {
  return frames.map((f): Shape => {
    const children =
      look === 'blocks'
        ? [...blockFrame(f), ...tagShapes(f, true)]
        : [
            ...(look === 'cards' ? cardFrame(f) : look === 'paper' ? paperFrame(f, texts) : plainFrame(f, texts)),
            ...tagShapes(f, false),
          ];
    return { kind: 'group', id: domId.group(f.group.id), children };
  });
}
