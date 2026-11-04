import { describe, expect, it } from 'vitest';
import { codes, matrix } from './compile.js';

/** A table of three columns and two rows, the column and the row of each area named by `area`. */
const table = (area: (id: string) => string): string[] => [
  'col kunde "Kunde"',
  `col station "Stationsteam"${area('kern')}`,
  `col partner "Partnerwerkstatt"${area('werkstatt')}`,
  `row ausleihen "Rad ausleihen"${area('kern')}`,
  '  kunde R',
  '  station A',
  `row reparatur "Rad reparieren"${area('werkstatt')}`,
  '  partner R',
  '  station A',
];

const AREAS = ['area kern "Kern"', 'area werkstatt "Werkstatt" tone=orange', ...table((id) => ` area=${id}`)];

describe('areas in a matrix', () => {
  const result = matrix('scale=raci areas=outline locale=de', ...AREAS);

  it('paint the heads of a column and a row of a coloured area, and leave the core in ink', () => {
    expect(codes(result)).toEqual([]);
    expect(result.svg).toContain('<g id="node-partner"><g class="area-orange"><rect');
    expect(result.svg).toContain('<g id="node-reparatur"><g class="area-orange"><rect');
    expect(result.svg).toContain('<g id="node-station"><text');
    expect(result.svg).toContain('<g id="node-ausleihen"><text');
    expect(result.svg).toContain('.dia .area-orange .head-side { fill: #c2410c; }');
  });

  it('keep the cells of a row out of its area, so a value is never painted in a tone', () => {
    const area = /<g id="node-reparatur"><g class="area-orange">(.*?)<\/g>/su.exec(result.svg ?? '')?.[1] ?? '';
    expect(area).toContain('Rad reparieren');
    expect(area).not.toContain('class="cell-text"');
    expect(result.svg).not.toMatch(/\.area-orange \.(cell-text|mark-)/u);
  });

  it('add the areas to the legend of the scale and name their heads in the description', () => {
    expect(result.svg).toContain('>Werkstatt</text>');
    expect(result.svg).toContain('>Kern</text>');
    expect(result.description).toContain('Bereich Werkstatt (orange): Partnerwerkstatt, Rad reparieren.');
    expect(result.description).toContain('Bereich Kern (schwarz): Stationsteam, Rad ausleihen.');
  });

  it('keep a matrix without areas as it was', () => {
    const none = matrix('scale=raci locale=de', ...table(() => ''));
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('head-side-area');
    expect(none.svg).not.toContain('>Kern</text>');
  });
});
