import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { isBorderPoint, isInside, regionsOf, regionUnder } from '../model.js';
import { defineRule, transitionText, vertexValues } from './shared.js';

export const invalidNesting = implementing(
  { uml: [S.compositeState, S.internalTransition] },
  defineRule(
    'U445',
    'error',
    'Nesting with `in` forms no cycle, and an internal transition names its trigger: it fires on an event without leaving the state.',
    (m) => {
      const cycles = m.diagram.vertices.flatMap((v): Finding[] => {
        const chain = new Set([v.id]);
        for (let p = v.parent; p !== undefined && m.vertices.has(p); p = m.vertices.get(p)?.parent) {
          if (chain.has(p)) return [{ span: v.span, values: { case: 'cycle', ...vertexValues(m, v.id) } }];
          chain.add(p);
        }
        return [];
      });
      const triggers = m.diagram.internals.flatMap((i): Finding[] =>
        i.on ? [] : [{ span: i.span, values: { case: 'trigger', ...vertexValues(m, i.state) } }],
      );
      return [...cycles, ...triggers];
    },
  ),
);

export const regionMisuse = implementing(
  { uml: [S.orthogonalRegion, S.fork, S.join] },
  defineRule(
    'U448',
    'error',
    'A region belongs to a state; a state with regions keeps its substates in them; a transition never crosses the border between two regions of one state, they run at the same time; and the branches of a fork or join lie in different regions.',
    (m) => {
      const owners = m.diagram.vertices.filter((v) => v.kind === 'state' && regionsOf(m, v.id).length > 0);
      const unowned = m.diagram.vertices.flatMap((v): Finding[] =>
        v.kind === 'region' && v.parent === undefined
          ? [{ span: v.span, values: { case: 'owner', ...vertexValues(m, v.id) } }]
          : [],
      );
      const direct = m.diagram.vertices.flatMap((v): Finding[] =>
        v.parent !== undefined && owners.some((o) => o.id === v.parent) && v.kind !== 'region' && !isBorderPoint(v.kind)
          ? [
              {
                span: v.span,
                values: { case: 'direct', ...vertexValues(m, v.id), ...vertexValues(m, v.parent, 'owner') },
              },
            ]
          : [],
      );
      const crossing = m.diagram.transitions.flatMap((t) =>
        owners.flatMap((o): Finding[] => {
          const [a, b] = [regionUnder(m, t.from, o.id), regionUnder(m, t.to, o.id)];
          return a && b && a !== b
            ? [{ span: t.span, values: { case: 'crossing', transition: transitionText(t), a, b } }]
            : [];
        }),
      );
      const bars = m.diagram.vertices.flatMap((bar) => {
        if (bar.kind !== 'fork' && bar.kind !== 'join') return [];
        const ends = bar.kind === 'fork' ? m.out(bar.id).map((t) => t.to) : m.into(bar.id).map((t) => t.from);
        return owners.flatMap((o): Finding[] => {
          const regions = ends.flatMap((id) => regionUnder(m, id, o.id) ?? []);
          const twice = regions.find((r, i) => regions.indexOf(r) !== i);
          return twice && regionsOf(m, o.id).length > 1
            ? [{ span: bar.span, values: { case: 'branches', ...vertexValues(m, bar.id), region: twice } }]
            : [];
        });
      });
      return [...unowned, ...direct, ...crossing, ...bars];
    },
  ),
);

export const connectionPoint = implementing(
  { uml: [S.entryPoint, S.exitPoint] },
  defineRule(
    'U449',
    'error',
    'Entry and exit points sit on the border of a state. An entry point is reached from outside and leads inside, an exit point the other way round.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] => {
        if (!isBorderPoint(v.kind)) return [];
        if (v.parent === undefined) return [{ span: v.span, values: { case: 'owner', ...vertexValues(m, v.id) } }];
        const owner = v.parent;
        if (!m.composites.has(owner)) return [];
        const entry = v.kind === 'entrypoint';
        const inside = (id: string) => isInside(m, id, owner);
        const wrong = (t: (typeof m.diagram.transitions)[number], how: string): Finding => ({
          span: t.span,
          values: { case: how, transition: transitionText(t), ...vertexValues(m, v.id) },
        });
        return [
          ...m
            .into(v.id)
            .filter((t) => inside(t.from) === entry)
            .map((t) => wrong(t, entry ? 'entryFromInside' : 'exitFromOutside')),
          ...m
            .out(v.id)
            .filter((t) => inside(t.to) !== entry)
            .map((t) => wrong(t, entry ? 'entryToOutside' : 'exitToInside')),
        ];
      }),
  ),
);

export const pointOnSimpleState = implementing(
  { uml: [S.entryPoint, S.exitPoint, S.submachineState] },
  defineRule(
    'U460',
    'error',
    'Entry and exit points belong to a composite state, or as connection point references to a submachine state; a simple state has none.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] => {
        const owner = isBorderPoint(v.kind) && v.parent !== undefined ? m.vertices.get(v.parent) : undefined;
        return owner?.kind === 'state' && !m.composites.has(owner.id) && owner.submachine === undefined
          ? [
              {
                span: v.span,
                values: { ...vertexValues(m, v.id), owner: owner.id, ownerName: owner.label ?? owner.id },
              },
            ]
          : [];
      }),
  ),
);

export const submachine = implementing(
  { uml: [S.submachineState] },
  defineRule(
    'U461',
    'error',
    'A submachine state calls another state machine and has no substates or regions of its own. At its points, transitions from outside end at the entry point and start at the exit point; the way inside lies in the called machine.',
    (m) =>
      m.diagram.vertices.flatMap((host) => {
        if (host.kind !== 'state' || host.submachine === undefined) return [];
        return m.diagram.vertices.flatMap((v): Finding[] => {
          if (v.parent !== host.id) return [];
          if (!isBorderPoint(v.kind))
            return [
              { span: v.span, values: { case: 'inner', machine: host.submachine ?? '', ...vertexValues(m, host.id) } },
            ];
          const entry = v.kind === 'entrypoint';
          return (entry ? m.out(v.id) : m.into(v.id)).map((t) => ({
            span: t.span,
            values: { case: entry ? 'entryOn' : 'exitInto', transition: transitionText(t), ...vertexValues(m, v.id) },
          }));
        });
      }),
  ),
);

export const noteWithoutVertex = implementing(
  { uml: [S.comment] },
  defineRule(
    'U465',
    'error',
    'A note in a state machine diagram is a comment on one vertex: it names it with `on`.',
    (m) => m.diagram.notes.flatMap((n): Finding[] => (n.on === undefined ? [{ span: n.span }] : [])),
  ),
);
