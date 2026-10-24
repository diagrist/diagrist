/**
 * Measures of the sequence diagram. Columns and rows are not fixed: they grow with the measured labels; these
 * are gaps and minimum sizes. As in the predecessor, `selfH + rowGap` keeps a self call apart from the next label.
 */
export interface SequenceTokens {
  /** Top edge of the heads, below title and subtitle. */
  readonly headTop: number;
  /** Box head: minimum width, horizontal padding, height, extra height for the stereotype. */
  readonly headMinW: number;
  readonly headPadX: number;
  readonly headH: number;
  readonly stereoH: number;
  /** Stick figure and robustness symbols: height of the figure, radius of the circle. */
  readonly figureH: number;
  readonly symbolR: number;
  /** Minimum gap between two heads. */
  readonly headGap: number;
  /** Messages: font size, line height, wrap width, room beside the label, distance to the arrow. */
  readonly messageSize: number;
  readonly lineH: number;
  readonly labelMaxW: number;
  readonly labelPadX: number;
  readonly labelLift: number;
  /** Room between a message and the label of the next one. */
  readonly rowGap: number;
  /** Self call: reach, minimum height, gap to its label. */
  readonly selfW: number;
  readonly selfH: number;
  readonly selfLabelGap: number;
  /** Activation bars: width, offset per level, overhang, minimum height. */
  readonly barW: number;
  readonly barLevel: number;
  readonly barOverhang: number;
  readonly barMinH: number;
  /** Fragments: side, top and bottom padding, tag height, tag padding, tag corner cut, gap to the guard. */
  readonly framePadX: number;
  readonly framePadTop: number;
  readonly framePadBottom: number;
  readonly tagH: number;
  readonly tagPadX: number;
  readonly tagCut: number;
  readonly guardGap: number;
  /** Operand separator: room above, height of the guard row below. */
  readonly operandGap: number;
  readonly guardH: number;
  /** Reference and note: height, overhang beyond the lifelines, padding, dog-ear, wrap width. */
  readonly refH: number;
  readonly overhang: number;
  readonly notePad: number;
  readonly noteFold: number;
  readonly noteMaxW: number;
  /** Half the edge of the destruction X. */
  readonly destroyR: number;
  /** Piece of lifeline below the last event. */
  readonly lifelineTail: number;
  /** Lost and found messages: minimum length, radius of the filled circle. */
  readonly lostLen: number;
  readonly dotR: number;
  /** Divider: distance of its two lines, height of its text box. */
  readonly dividerGap: number;
  readonly dividerH: number;
  /** Time constraints at the left edge: distance to the picture, tick length, room to the text. */
  readonly railGap: number;
  readonly railTick: number;
  readonly railTextGap: number;
  /** Decision mark after a label: width and gap before it. */
  readonly markW: number;
  readonly markGap: number;
  /** Message with `duration=`: how far the arrow slopes down to the receiver. */
  readonly slopeH: number;
  /** Font metrics of messages: descent, baseline to x-height middle, margin of the knocked-out ground. */
  readonly descent: number;
  readonly textMid: number;
  readonly knockout: number;
  /** Coregion: half width of the bracket on the lifeline, length of its ticks, room to the message before. */
  readonly coregionW: number;
  readonly coregionTick: number;
  readonly coregionGap: number;
  /** Name of a gate: distance from the frame. */
  readonly gateNameGap: number;
}

export const SEQUENCE_TOKENS: SequenceTokens = {
  headTop: 84,
  headMinW: 96,
  headPadX: 14,
  headH: 36,
  stereoH: 12,
  figureH: 34,
  symbolR: 12,
  headGap: 32,
  messageSize: 11,
  lineH: 14,
  labelMaxW: 300,
  labelPadX: 14,
  labelLift: 5,
  rowGap: 18,
  selfW: 30,
  selfH: 20,
  selfLabelGap: 8,
  barW: 12,
  barLevel: 6,
  barOverhang: 6,
  barMinH: 16,
  framePadX: 16,
  framePadTop: 16,
  framePadBottom: 14,
  tagH: 20,
  tagPadX: 8,
  tagCut: 7,
  guardGap: 10,
  operandGap: 12,
  guardH: 16,
  refH: 36,
  overhang: 28,
  notePad: 8,
  noteFold: 8,
  noteMaxW: 240,
  destroyR: 8,
  lifelineTail: 28,
  lostLen: 64,
  dotR: 5,
  dividerGap: 3,
  dividerH: 20,
  railGap: 18,
  railTick: 8,
  railTextGap: 6,
  markW: 24,
  markGap: 8,
  slopeH: 24,
  descent: 3,
  textMid: 4,
  knockout: 3,
  coregionW: 15,
  coregionTick: 6,
  coregionGap: 10,
  gateNameGap: 4,
};
