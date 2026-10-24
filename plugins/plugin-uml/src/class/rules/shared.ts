import type { Finding, Rule } from '@diagrist/core';
import type { Severity } from '@diagrist/lang';
import type { ClassRelation, RelationKind } from '../diagram.js';
import type { ClassModel } from '../model.js';

/** A rule of the class kind. */
export type ClassRule = Rule<ClassModel>;

/** Declares a rule; `check` returns findings, the code and severity are written once here. */
export const defineRule = (
  code: string,
  severity: Severity,
  doc: string,
  check: (model: ClassModel) => readonly Finding[],
): ClassRule => ({ code, severity, doc, check });

/** The relation as written, such as `a *-- b`, for the texts of findings. */
export const relationText = (r: ClassRelation): string => `${r.from} ${r.arrow} ${r.to}`;

/** Relations whose ends are objects and therefore have multiplicities, roles and navigability. */
export const ASSOCIATIONS: ReadonlySet<RelationKind> = new Set([
  'association',
  'directed',
  'bidirectional',
  'aggregation',
  'composition',
]);

/** The name of a classifier for a finding, with its kind, such as `the interface "Printable"`. */
export const labelOf = (m: ClassModel, id: string): string => m.classifiers.get(id)?.label ?? id;
