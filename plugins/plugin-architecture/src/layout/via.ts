import type { CellMetrics } from '@diagrist/layout-grid';
import type { Look, LookFont, LookOptions } from '../looks/look.js';
import type { ArchEdge } from '../model/types.js';
import { signedLabel } from './diff.js';

/** A form of `protocols=`. */
type ViaForm = LookOptions['via'];

/** How far the frame of a chip reaches left and right of its text. */
export const CHIP_PAD = 5;

/** How much lower a chip stands below the sentence above it than a line would, where the layout gives room. */
export const CHIP_DROP = 3;

/** Second line of an edge label: protocol, schedule, volume and promise, in this order, where given. */
export const detailLine = (e: ArchEdge): string => [e.via, e.schedule, e.volume, e.sla].filter(Boolean).join(' · ');

/** Whether a form sets the protocol smaller than the sentence, in the font role `via`. */
const smaller = (form: ViaForm): boolean => form === 'brackets' || form === 'muted' || form === 'chip';

/** The detail of an edge as its form writes it: in square brackets for `brackets`. */
export function detailOf(e: ArchEdge, form: ViaForm): string {
  const plain = detailLine(e);
  return plain && form === 'brackets' ? `[${plain}]` : plain;
}

/**
 * The texts of an edge as its form writes them: the name with its diff sign, and the detail (`detailOf`); `inline`
 * appends the detail to the name, so both share their lines.
 */
export function edgeWords(e: ArchEdge, form: ViaForm): { name?: string; detail?: string } {
  const name = signedLabel(e.label, e.origin);
  const detail = detailOf(e, form);
  if (form === 'inline' && detail) return { name: name ? `${name} ${detail}` : detail };
  return { ...(name ? { name } : {}), ...(detail ? { detail } : {}) };
}

/** The font a detail is set in: smaller for the forms that say so, else the label's. */
export const viaFont = (look: Look): LookFont => (smaller(look.options.via) ? look.fonts.via : look.fonts.label);

/** The font role of `viaFont`, for the shapes that draw it. */
export const viaRole = (look: Look): 'via' | 'label' => (smaller(look.options.via) ? 'via' : 'label');

/** What joins name and detail where they share a line: a space, before a chip two wider ones as room for its frame. */
const JOIN = { chip: '\u00a0\u00a0 ', other: ' ' } as const;

/**
 * How the grid measures and joins details in a form other than `same`: in the smaller font, a chip with its pad,
 * and joined to the name by `JOIN` where both share a line, as the form sets them apart by itself.
 */
export function detailMetrics(look: Look): Pick<CellMetrics, 'detail'> {
  const form = look.options.via;
  if (form === 'same') return {};
  if (form === 'chip') return { detail: { font: viaFont(look), pad: CHIP_PAD, join: JOIN.chip } };
  return { detail: { font: viaFont(look), join: JOIN.other } };
}
