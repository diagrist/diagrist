import { compile, formatMessage, type Plugin } from '@diagrist/core';
import { grammarOf } from '@diagrist/lang';
import type { Engine } from './engine.js';

/**
 * The `Engine` port filled by the kernel (ADR 0009): compiles with the given plugins, phrases findings from the
 * kernel's and the plugins' catalogues, and describes kinds from their tables.
 */
export function coreEngine(plugins: readonly Plugin[]): Engine {
  const kinds = plugins.flatMap((plugin) => plugin.kinds);
  return {
    compile(source, { locale, path, files }) {
      const compilation = compile(source, {
        plugins,
        ...(path === undefined ? {} : { path }),
        ...(files === undefined ? {} : { files }),
      });
      const diagnostics = compilation.diagnostics.map((found) => ({
        ...found,
        message: formatMessage(found, plugins, locale),
      }));
      const pictures = compilation.pictures.map(({ variant, svg }) => ({
        ...(variant === undefined ? {} : { variant }),
        ...(svg === undefined ? {} : { svg }),
      }));
      return { pictures, diagnostics, needs: compilation.needs };
    },
    kinds: () => kinds.map((kind) => kind.spec.name),
    grammar: (name) => {
      const kind = kinds.find((candidate) => candidate.spec.name === name);
      return kind === undefined ? undefined : grammarOf(kind.spec);
    },
  };
}
