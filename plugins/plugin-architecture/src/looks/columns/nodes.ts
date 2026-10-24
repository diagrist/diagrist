import { domId, type Shape } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { PlacedElement } from '../../layout/index.js';
import { secondLineRole } from '../../layout/measure.js';
import type { Metrics } from '../../layout/metrics.js';
import { iconRole } from '../../scene/icons.js';
import type { Focus } from './focus.js';
import { hasTab, tabBlocked, tabName, tabOf } from './tabs.js';

/** Icons a box without an own icon takes from its shape, since boxes here are all square. */
const SHAPE_ICON = { db: 'database', queue: 'layers', store: 'archive', job: 'cpu', app: 'monitor' } as const;
/** How far the name sits below the top edge, and half the height of the gap cut for it. */
const TAB = { rise: 4, cut: 2 } as const;
/** Inside a box: the top kept free below the tab, the gap between icon and second line. */
const INNER = { top: 8, gap: 8, cap: 8 } as const;
/** Baselines of name and second line in a box whose top edge a line takes. */
const STACKED = { name: 26, second: 46 } as const;

/** A person: an area without border in the tint of steps, name and role centred in it. */
function personShapes(p: PlacedElement, context: boolean, m: Metrics): Shape[] {
  const { node: n, rect } = p;
  const cx = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2 + (n.tech ? -3 : 4);
  const second = secondLineRole(n);
  return [
    { kind: 'rect', ...rect, role: context ? 'personContext' : 'personArea' },
    { kind: 'text', x: cx, y, text: n.label, role: context ? 'nameContext' : 'name', font: 'name', anchor: 'middle' },
    ...(n.tech
      ? [
          {
            kind: 'text',
            x: cx,
            y: y + m.nodeLineH,
            text: n.tech,
            role: context ? `${second}Context` : second,
            font: second,
            anchor: 'middle',
          } as const,
        ]
      : []),
  ];
}

/** The body of a box: context in grey, status in its colours, emphasis as the blue focus frame. */
function bodyRole(p: PlacedElement, context: boolean): string {
  const n = p.node;
  if (context) return 'boxContext';
  if (n.status === 'planned') return 'boxPlanned';
  if (n.status === 'deprecated') return 'boxDeprecated';
  return n.emph ? 'boxFocus' : 'box';
}

/** Icon and second line of a box, centred one above the other below the name in its top edge. */
function insideShapes(p: PlacedElement, context: boolean, m: Metrics): Shape[] {
  const { node: n, rect } = p;
  const icon = n.icon ?? (n.shape ? SHAPE_ICON[n.shape] : undefined);
  const second = secondLineRole(n);
  const cx = rect.x + rect.w / 2;
  const block = (icon ? m.iconSize : 0) + (n.tech ? (icon ? INNER.gap : 0) + INNER.cap : 0);
  const top = rect.y + INNER.top + (rect.h - INNER.top - block) / 2;
  const out: Shape[] = [];
  if (icon) {
    const role = iconRole(icon, context ? 'muted' : 'ink');
    out.push({ kind: 'icon', icon, x: cx - m.iconSize / 2, y: top, size: m.iconSize, role });
  }
  if (n.tech) {
    const role = context ? `${second}Context` : second;
    out.push({ kind: 'text', x: cx, y: top + block, text: n.tech, role, font: second, anchor: 'middle' });
  }
  return out;
}

/**
 * A box: square frame, a second frame behind it for replicas, the name in a gap of the top edge with icon and second
 * line inside. A box with nothing inside keeps its name in the middle, a box without name only its inside, and a
 * box whose top edge a line takes under the name stacks name and second line inside, without icon.
 */
function boxShapes(p: PlacedElement, routes: readonly Route[], context: boolean, m: Metrics): Shape[] {
  const { node: n, rect } = p;
  const body = bodyRole(p, context);
  const name = context ? 'nameContext' : 'name';
  const behind = { ...rect, x: rect.x + m.stackOffset, y: rect.y + m.stackOffset };
  const frames: Shape[] = [
    ...(n.replicas !== undefined ? [{ kind: 'rect', ...behind, role: body } as const] : []),
    { kind: 'rect', ...rect, role: body },
  ];
  if (!hasTab(n)) {
    const at = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 + TAB.rise };
    const centred: Shape = { kind: 'text', ...at, text: tabName(n), role: name, font: 'name', anchor: 'middle' };
    return [...frames, ...(n.label ? [centred] : insideShapes(p, context, m))];
  }
  const tab = tabOf(n, rect, m);
  if (tabBlocked(tab.gap, routes)) {
    const cx = rect.x + rect.w / 2;
    const second = secondLineRole(n);
    const role = context ? `${second}Context` : second;
    const tech: Shape[] = n.tech
      ? [{ kind: 'text', x: cx, y: rect.y + STACKED.second, text: n.tech, role, font: second, anchor: 'middle' }]
      : [];
    return [
      ...frames,
      { kind: 'text', x: cx, y: rect.y + STACKED.name, text: tabName(n), role: name, font: 'name', anchor: 'middle' },
      ...tech,
    ];
  }
  return [
    ...frames,
    { kind: 'rect', ...tab.gap, y: rect.y - TAB.cut, h: 2 * TAB.cut, role: 'tabGap' },
    { kind: 'text', x: tab.x, y: rect.y + TAB.rise, text: tabName(n), role: name, font: 'name' },
    ...insideShapes(p, context, m),
  ];
}

/** Every element in its group `node-<id>`: people as tinted areas, everything else as a square box. */
export function columnsNodeShapes(
  nodes: readonly PlacedElement[],
  routes: readonly Route[],
  focus: Focus,
  m: Metrics,
): Shape[] {
  return nodes.map((p): Shape => {
    const context = focus.node(p.node.id);
    const children = p.node.keyword === 'person' ? personShapes(p, context, m) : boxShapes(p, routes, context, m);
    return { kind: 'group', id: domId.node(p.node.id), children };
  });
}
