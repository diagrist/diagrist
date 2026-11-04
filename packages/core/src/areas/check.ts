import { type Diagnostic, diagnostic } from '@diagrist/lang';
import { KERNEL_CODES } from '../messages.js';
import { declaredAreas, joinedAreas } from './model.js';
import { AREA_TONE_LIMIT } from './tones.js';

/**
 * The kernel's checks of the areas of one picture, the same for every kind (ADR 0033): an area nothing joins (K105),
 * more coloured areas than one picture can keep apart (K106), and a tone two areas share (K107).
 */
export function checkAreas(statements: readonly unknown[]): Diagnostic[] {
  const areas = declaredAreas(statements);
  if (areas.length === 0) return [];
  const joined = joinedAreas(statements);
  const found: Diagnostic[] = [];
  for (const area of areas) {
    if (!joined.has(area.id)) found.push(diagnostic(KERNEL_CODES.unusedArea, 'warning', area.span, { area: area.id }));
  }
  const toned = areas.filter((a) => a.tone !== undefined);
  const extra = toned[AREA_TONE_LIMIT];
  if (extra !== undefined) {
    const values = { count: String(toned.length), limit: String(AREA_TONE_LIMIT), area: extra.id };
    found.push(diagnostic(KERNEL_CODES.manyAreas, 'warning', extra.span, values));
  }
  toned.forEach((area, i) => {
    const first = toned.slice(0, i).find((a) => a.tone === area.tone);
    if (first === undefined) return;
    const values = { area: area.id, first: first.id, tone: area.tone ?? '' };
    found.push(diagnostic(KERNEL_CODES.sameTone, 'warning', area.span, values));
  });
  return found;
}
