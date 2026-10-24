import type { Locale } from '@diagrist/lang';

/** What the legend card of `look=panel` says beyond the plugin's `Texts`: its heading, two parties, marks, icons. */
export interface PanelWords {
  readonly legend: string;
  readonly person: string;
  readonly none: string;
  readonly mark: string;
  readonly icon: string;
}

const EN: PanelWords = {
  legend: 'Legend',
  person: 'people',
  none: 'no group',
  mark: 'decision, see its card',
  icon: 'icon: technology or role, in the colour of its party',
};

const DE: PanelWords = {
  legend: 'Legende',
  person: 'Personen',
  none: 'ohne Gruppe',
  mark: 'Entscheidung, siehe Karte',
  icon: 'Symbol: Technologie oder Rolle, in der Farbe der Zuordnung',
};

/** The words of the panel legend by locale. */
export const PANEL_WORDS: Readonly<Record<Locale, PanelWords>> = { en: EN, de: DE };
