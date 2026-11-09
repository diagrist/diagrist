import type { Engine } from '../../src/index.js';
import { fakeEngine } from './fake-engine.js';

/**
 * The fake engine with pictures as the kernel writes them, 200 × 100 with a stylesheet and a canvas, so the
 * flattener and the board have something to read. The title stays in the text, to tell the pictures apart.
 */
export function figjamEngine(): Engine {
  const inner = fakeEngine();
  return {
    ...inner,
    compile: (source, options) => {
      const compiled = inner.compile(source, options);
      const pictures = compiled.pictures.map((picture) =>
        picture.svg === undefined ? picture : { ...picture, svg: kernelSvg(picture.svg.replace(/<\/?svg>/g, '')) },
      );
      return { ...compiled, pictures };
    },
  };
}

export const kernelSvg = (title: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100" class="diagrist" role="img" aria-label="${title}"><title>${title}</title><style>\n  .diagrist { font-family: "JetBrains Mono", monospace; font-size: 11px; }\n  .diagrist .label { fill: #18181b; }\n</style><rect width="200" height="100" fill="#fafafa"/><defs></defs>\n<text x="10" y="20" class="label">${title}</text>\n</svg>\n`;
