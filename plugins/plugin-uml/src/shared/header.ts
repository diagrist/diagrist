import { MARGIN } from '../theme.js';

/** Anchors of title and subtitle at the top edge. */
export interface Header {
  readonly title: { readonly x: number; readonly y: number };
  readonly subtitle: { readonly x: number; readonly y: number };
}

const TITLE_Y = 36;
const SUBTITLE_Y = 52;

export const HEADER: Header = { title: { x: MARGIN, y: TITLE_Y }, subtitle: { x: MARGIN, y: SUBTITLE_Y } };
