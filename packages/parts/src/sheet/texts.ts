/** A hairline of the sheet, such as the rule over a margin note or over the legend sentences. */
export interface Hairline {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/**
 * A line of text the sheet sets around the picture: its baseline at the left end, and the role that paints it. Each
 * is measured in the font the caller's `label` font role sets.
 */
export interface SheetText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly role: 'marginId' | 'marginText' | 'marginChoice' | 'legendText';
}
