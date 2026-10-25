import type { KindReading } from '@diagrist/lang';
import { decisionOf } from '@diagrist/parts';
import type { Level } from '../grammar/elements.js';
import type { ArchitectureStatement } from '../grammar/spec.js';
import { DEFAULT_LOOK, type LookName } from '../looks/index.js';
import { compact } from './compact.js';
import { edgesOf } from './edges.js';
import type { ArchGroup, ArchitectureModel, ArchNode, Role } from './types.js';

type Of<K extends ArchitectureStatement['keyword']> = Extract<ArchitectureStatement, { keyword: K }>;
type Element = Of<'person' | 'system' | 'container' | 'component' | 'node'>;
type Style = Of<'style'>['attributes'];

const ROLES: readonly Role[] = ['own', 'shared', 'external'];
const ELEMENT_KEYWORDS: ReadonlySet<string> = new Set(['person', 'system', 'container', 'component', 'node']);

const isElement = (s: ArchitectureStatement): s is Element => ELEMENT_KEYWORDS.has(s.keyword);
const only = <K extends ArchitectureStatement['keyword']>(all: readonly ArchitectureStatement[], keyword: K) =>
  all.filter((s): s is Of<K> => s.keyword === keyword);

/** An element with the values of its style where it sets none (`style=` in the predecessor did the same). */
function nodeOf(s: Element, styles: ReadonlyMap<string, Style>): ArchNode {
  const a = { ...styles.get(s.attributes.style ?? ''), ...compact(s.attributes) };
  return {
    id: s.id,
    keyword: s.keyword,
    label: s.label,
    emph: s.flags.emph,
    source: s.span,
    ...compact({
      tech: a.tech,
      icon: a.icon,
      at: s.clauses.at,
      span: a.span,
      slot: a.slot,
      group: s.clauses.in,
      mark: a.mark,
      shape: a.shape,
      status: a.status,
      replicas: a.replicas,
      width: a.width,
      height: a.height,
      tone: a.tone,
      form: a.form,
      origin: s.origin,
    }),
  };
}

function groupOf(s: Of<'group'>, nodes: readonly ArchNode[]): ArchGroup {
  const roles = ROLES.filter((role) => s.flags[role]);
  const a = s.attributes;
  return {
    id: s.id,
    title: s.title,
    roles,
    heading: a.heading ?? 'top',
    members: nodes.filter((n) => n.group === s.id).map((n) => n.id),
    source: s.span,
    ...compact({
      role: roles.length === 1 ? roles[0] : undefined,
      team: a.team,
      parent: s.clauses.in,
      tag: a.tag,
      cover: a.cover,
      tone: a.tone,
    }),
  };
}

/** The model of a diagram of `level` from its reading: styles filled in, groups with members, edges numbered. */
export function architectureModel(level: Level, reading: KindReading<ArchitectureStatement>): ArchitectureModel {
  const all = reading.statements;
  const header = reading.header?.attributes ?? {};
  const styles = new Map(only(all, 'style').map((s) => [s.id, compact(s.attributes) as Style]));
  const nodes = all.filter(isElement).map((s) => nodeOf(s, styles));
  const grids = only(all, 'grid').map((g) => ({ axis: g.axis, names: g.names, source: g.span }));
  const names = (axis: 'cols' | 'rows') => grids.filter((g) => g.axis === axis).flatMap((g) => g.names);
  const { edges, flows } = edgesOf(only(all, 'flow'), only(all, 'edge'), styles);
  return {
    level,
    title: reading.header?.title ?? '',
    look: (header.look as LookName | undefined) ?? DEFAULT_LOOK,
    adaptive: header.layout === 'adaptive',
    cols: names('cols'),
    rows: names('rows'),
    grids,
    nodes,
    groups: only(all, 'group').map((g) => groupOf(g, nodes)),
    edges,
    flows,
    layers: only(all, 'layer').map((l) => ({ row: l.row, label: l.label, source: l.span })),
    notes: only(all, 'note').map((n) => ({ text: n.text, source: n.span, ...compact({ on: n.clauses.on }) })),
    decisions: only(all, 'adr').map(decisionOf),
    ...compact({ subtitle: header.subtitle as string | undefined, label: header.label as string | undefined }),
  };
}
