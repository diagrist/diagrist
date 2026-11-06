import { textWidth } from '@diagrist/core';
import type { Behaviour } from '../diagram.js';
import { guardText } from './box.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';

/**
 * Lines of a transition label. The order `trigger [guard] / effect` always stays; it breaks only between the parts:
 * first before the effect, then before the guard too.
 */
export function labelLines(t: Behaviour, protocol: boolean): string[] {
  const fits = (s: string) => textWidth(s, F.label) <= S.labelLineW;
  const guard = t.when ? guardText(t.when) : '';
  const [first, second] = protocol ? [guard, t.on ?? ''] : [t.on ?? '', guard];
  const effect = protocol && t.post ? `/ ${guardText(t.post)}` : t.do ? `/ ${t.do}` : '';
  const join = (...parts: string[]) => parts.filter(Boolean).join(' ');
  const full = join(first, second, effect);
  if (!full || fits(full)) return full ? [full] : [];
  const head = join(first, second);
  if (fits(head) || !first || !second) return [head, effect].filter(Boolean);
  return [first, second, effect].filter(Boolean);
}
