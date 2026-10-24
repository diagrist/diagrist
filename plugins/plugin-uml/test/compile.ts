import { readdirSync, readFileSync } from 'node:fs';
import { type Compilation, compile } from '@diagrist/core';
import { umlPlugin } from '../src/index.js';

export const examples = new URL('../examples/sequence/', import.meta.url);
export const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;

export const exampleNames: readonly string[] = readdirSync(examples).filter((f) => f.endsWith('.dgr'));

export const source = (name: string): string => readFileSync(new URL(name, examples), 'utf8');

/** Compiles lines of a sequence diagram with the UML plugin, adding the header. */
export const sequence = (...lines: string[]): Compilation =>
  compile(['diagram sequence "Test"', ...lines].join('\n'), { plugins: [umlPlugin] });

export const codes = (result: Compilation): string[] => result.diagnostics.map((d) => d.code);

export const usecaseExamples = new URL('../examples/usecase/', import.meta.url);

export const usecaseNames: readonly string[] = readdirSync(usecaseExamples).filter((f) => f.endsWith('.dgr'));

export const usecaseSource = (name: string): string => readFileSync(new URL(name, usecaseExamples), 'utf8');

/** Compiles lines of a use case diagram with the UML plugin, adding the header. */
export const usecase = (...lines: string[]): Compilation =>
  compile(['diagram usecase "Test"', ...lines].join('\n'), { plugins: [umlPlugin] });
