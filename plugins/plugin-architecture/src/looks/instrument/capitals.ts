import type { ElementKeyword, Level } from '../../grammar/elements.js';
import { secondLineRole } from '../../layout/measure.js';
import type { ArchitectureModel, ArchNode } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import type { InstrumentWords } from './words.js';

const JOIN = ' · ';

/** The element each level is about; its boxes need not say their type. */
const SUBJECT: Readonly<Record<Level, ElementKeyword>> = {
  context: 'system',
  container: 'container',
  component: 'component',
};

/**
 * The micro label above a name, in capitals: the type of a box where it differs from what the level is about (a
 * container among components), its technology and its status. A neutral `node` names no type and a description is
 * no part of it, so a picture of one kind of element shows micro labels only where they add something.
 */
export function microLabel(n: ArchNode, level: Level, texts: Texts, words: InstrumentWords): string {
  const k = n.keyword;
  const type = k === 'node' || k === 'person' || k === SUBJECT[level] ? undefined : words.types[k];
  const tech = secondLineRole(n) === 'tech' ? n.tech : undefined;
  const status = n.status ? texts.status[n.status] : undefined;
  return [type, tech, status]
    .filter((s): s is string => s !== undefined && s !== '')
    .join(JOIN)
    .toUpperCase();
}

/**
 * The model as `look=instrument` draws it, so layout measures what is drawn: names, titles, edge texts and layers
 * in capitals; on containers and components the technology line becomes the whole micro label, while a
 * description stays as written. Decisions leave the model, since the look sets them beside the picture itself.
 */
export function inCapitals(model: ArchitectureModel, texts: Texts, words: InstrumentWords): ArchitectureModel {
  return {
    ...model,
    nodes: model.nodes.map((n) => {
      const micro = microLabel(n, model.level, texts, words);
      const tech = secondLineRole(n) === 'tech' ? micro || undefined : n.tech;
      const { tech: _, ...rest } = n;
      return { ...rest, label: n.label.toUpperCase(), ...(tech ? { tech } : {}) };
    }),
    groups: model.groups.map((g) => ({ ...g, title: g.title.toUpperCase() })),
    edges: model.edges.map((e) => ({
      ...e,
      ...(e.label ? { label: e.label.toUpperCase() } : {}),
      ...(e.via ? { via: e.via.toUpperCase() } : {}),
      ...(e.schedule ? { schedule: e.schedule.toUpperCase() } : {}),
      ...(e.volume ? { volume: e.volume.toUpperCase() } : {}),
      ...(e.sla ? { sla: e.sla.toUpperCase() } : {}),
    })),
    layers: model.layers.map((l) => ({ ...l, label: l.label.toUpperCase() })),
    decisions: [],
  };
}
