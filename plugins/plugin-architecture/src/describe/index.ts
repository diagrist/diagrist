import type { Words } from '@diagrist/parts';
import type { ArchEdge, ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import type { Texts } from '../texts/index.js';

/** Shape, status and instances of an element, in brackets after its name. */
function nodeText(n: ArchNode, t: Texts): string {
  const traits = [
    n.shape && t.shapes[n.shape],
    n.status && t.status[n.status],
    n.replicas !== undefined && t.prose.instances(n.replicas),
  ].filter(Boolean);
  return `${n.label}${traits.length ? ` (${traits.join(', ')})` : ''}`;
}

const edgeText = (e: ArchEdge): string => [e.label, e.via, e.schedule, e.volume, e.sla].filter(Boolean).join(', ');
const arrowOf = (e: ArchEdge): string => (e.kind === 'link' ? '—' : e.kind === 'duplex' ? '↔' : '→');

/** Names of elements and groups by id; a frame without title is named after what it holds. */
function namer(model: ArchitectureModel, t: Texts): { name: (id: string) => string; group: (g: ArchGroup) => string } {
  const group = (g: ArchGroup): string => {
    if (g.title) return g.title;
    const inner = [
      ...g.members.map((id) => model.nodes.find((n) => n.id === id)?.label ?? id),
      ...model.groups.filter((c) => c.parent === g.id).map(group),
    ];
    return `${t.prose.frameAround} ${inner.join(', ')}`;
  };
  const name = (id: string): string => {
    const node = model.nodes.find((n) => n.id === id);
    const g = model.groups.find((x) => x.id === id);
    return node?.label ?? (g ? group(g) : id);
  };
  return { name, group };
}

/** The diagram in sentences, in the locale of `t`: groups, elements, layers, flows step by step, edges, decisions. */
export function describeArchitecture(model: ArchitectureModel, t: Texts, words: Words): string {
  const p = t.prose;
  const { name, group } = namer(model, t);
  const kind = model.label === undefined ? t.kinds[model.level] : model.label || p.diagram;
  const lines = [p.summary(model.title, kind, model.nodes.length, model.groups.length)];
  const byId = (id: string) => model.nodes.find((n) => n.id === id);
  for (const g of model.groups) {
    const parent = model.groups.find((x) => x.id === g.parent);
    const traits = [g.role, g.team, g.tag && `${p.tag} ${g.tag}`, parent && `${p.within} ${group(parent)}`].filter(
      Boolean,
    );
    const members = g.members.flatMap((id) => {
      const n = byId(id);
      return n ? [nodeText(n, t)] : [];
    });
    const inner = members.length ? members : model.groups.filter((c) => c.parent === g.id).map(group);
    lines.push(`${p.group} ${group(g)}${traits.length ? ` (${traits.join(', ')})` : ''}: ${inner.join(', ')}.`);
  }
  const free = model.nodes.filter((n) => n.group === undefined);
  if (free.length) lines.push(`${p.ungrouped}: ${free.map((n) => nodeText(n, t)).join(', ')}.`);
  for (const l of model.layers) {
    const row = model.nodes.filter((n) => n.at?.row === l.row).map((n) => nodeText(n, t));
    lines.push(`${p.layer} ${l.label}: ${row.join(', ')}.`);
  }
  for (const f of model.flows) {
    lines.push(`Flow ${f.id}:`);
    for (const e of model.edges.filter((x) => x.step?.flow === f.id)) {
      const mark = e.mark ? ` ${p.markOf} ${e.mark}` : '';
      const step = `(${e.step?.n}) ${name(e.from)} ${arrowOf(e)} ${name(e.to)}: ${edgeText(e)} [${p.kinds[e.kind]}]`;
      lines.push(`  ${step}${mark}`);
    }
  }
  for (const n of model.notes) lines.push(`${p.note} ${name(n.on ?? '')}: ${n.text}.`);
  for (const e of model.edges.filter((x) => x.step === undefined)) {
    const text = edgeText(e);
    lines.push(`${p.edge}: ${name(e.from)} ${arrowOf(e)} ${name(e.to)}${text ? `: ${text}` : ''}.`);
  }
  lines.push(...model.decisions.map(words.decision));
  return lines.join('\n');
}
