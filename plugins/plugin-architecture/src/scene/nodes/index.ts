import { domId, type Shape } from '@diagrist/core';
import { changeOf } from '../../layout/diff.js';
import type { ArchitectureLayout } from '../../layout/index.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { changeTagShapes } from '../diff.js';
import { PEOPLE } from '../person.js';
import { blockShapes } from './block.js';
import { boxShapes } from './box.js';
import { cardShapes } from './card.js';
import { tabShapes } from './tab.js';

/**
 * Every element in its group `node-<id>`, people as `person` says and boxes in the node family of the look, with
 * their name as `nodeName` says; in a diff picture with the tag of its change.
 */
export function nodeShapes(model: ArchitectureModel, layout: ArchitectureLayout, texts: Texts): Shape[] {
  const roles = new Map(model.groups.map((g) => [g.id, g.role]));
  const { look } = layout;
  return layout.nodes.map((p): Shape => {
    const art = p.art;
    const role = roles.get(p.node.group ?? '');
    const children =
      art.kind === 'person'
        ? PEOPLE(look.options.person)(p.node, art)
        : art.card
          ? cardShapes(p, art, art.card, texts)
          : art.block
            ? blockShapes(p, art, art.block)
            : art.tab
              ? tabShapes(p, art, art.tab, role, look)
              : boxShapes(p, art, role, look, texts);
    const change = changeOf(p.node.origin);
    const tag = change === undefined ? [] : changeTagShapes(change, p.rect.x, p.rect.y);
    return { kind: 'group', id: domId.node(p.node.id), children: [...children, ...tag] };
  });
}
