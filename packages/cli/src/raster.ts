/** Options of one rasterisation. */
export interface RasterOptions {
  /** Pixels per SVG unit: 2 doubles width and height. The CLI has checked it against its range. */
  readonly scale: number;
}

/** The PNG bytes, or why the renderer drew none, with the renderer's own explanation. */
export type Rasterized = { readonly png: Uint8Array } | { readonly problem: string; readonly detail: string };

/**
 * The port through which `build --png` turns an SVG into a PNG (ADR 0009). It is asynchronous because the host
 * loads the renderer only when the first picture is asked for, so commands that draw none never load it.
 */
export interface Raster {
  png(svg: string, options: RasterOptions): Promise<Rasterized>;
}
