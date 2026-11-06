import type { Placed, Rect } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import type { CoreFrame, EdgeLabel, Route } from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { Graph } from '../model.js';
import type { PlacedHead, PlacedVerb } from './heads.js';
import { layeredGraph } from './layered.js';
import type { ItemBox } from './metrics.js';

/** Where the items, lines and labels of a picture stand, however it was arranged. */
export interface Arranged {
  readonly nodes: readonly { readonly id: string; readonly rect: Rect }[];
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly boxes: ReadonlyMap<string, ItemBox>;
  readonly heads: readonly PlacedHead[];
  readonly verbs: readonly PlacedVerb[];
  readonly width: number;
  readonly bottom: number;
  readonly placed: readonly Placed[];
  /** The frame around the core of a hub, with its head. */
  readonly frame?: CoreFrame;
}

/** A picture in layers, laid out by the layered pipeline of `layout-grid` (plan L3). */
export function inLayers(m: Graph, locale: Locale): Arranged {
  const { layout, boxes } = layeredGraph(m, locale);
  return {
    ...layout,
    boxes,
    heads: [],
    verbs: [],
    width: layout.width + MARGIN,
    bottom: layout.bottom + MARGIN,
  };
}
