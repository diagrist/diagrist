import type { Party } from './party.js';

/**
 * The colours of `look=panel`: navy ink in three steps, light borders and panels, one violet for the own system
 * and the focus, three further party colours, and one red for what is negative.
 */
export const PANEL_COLORS = {
  card: '#ffffff',
  ink: '#0a2540',
  ink2: '#425466',
  faint: '#8792a2',
  border: '#e3e8ee',
  detail: '#c1c9d2',
  panel: '#f6f9fc',
  panelInner: '#edf1f6',
  edge: '#a3acb9',
  deep: '#32325d',
  own: '#635bff',
  ownTint: '#eeedff',
  blue: '#0073e6',
  green: '#1ea672',
  amber: '#f5a524',
  amberTint: '#fef3dc',
  planned: '#1ea672',
  negative: '#df1b41',
} as const;

/** The colour of each party's dot, at most four colours and a grey for elements without a group. */
export const PARTY_COLORS: Readonly<Record<Party, string>> = {
  own: PANEL_COLORS.own,
  shared: PANEL_COLORS.amber,
  external: PANEL_COLORS.blue,
  person: PANEL_COLORS.green,
  none: PANEL_COLORS.faint,
};
