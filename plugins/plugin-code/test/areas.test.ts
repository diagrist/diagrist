import { describe, expect, it } from 'vitest';
import { codes, compileCode, diagram } from './compile.js';

const SUBMIT = 'source submit "TransferService.submit" src="TransferService.java" symbol=submit';
const PUBLISH = 'source publish "Outbox.publish" src="Outbox.java" region=publish';
const LINK = 'link submit 34 -> publish "outbox.publish(event)"';

/** Two cards, the core and an extension, with a link from the core into the extension, beside the example sources. */
const result = compileCode(
  'ueberweisung/test.dgr',
  [
    'diagram code "Test" areas=outline locale=de',
    'area kern "Kern"',
    'area outbox "Outbox" tone=green',
    `${SUBMIT} area=kern`,
    '  mark 34 "Das Event geht an die Outbox."',
    `${PUBLISH} area=outbox`,
    LINK,
  ].join('\n'),
);

describe('areas in code diagrams', () => {
  it('mark the frame and title of a card in a coloured area, and leave the core in ink', () => {
    expect(codes(result)).toEqual([]);
    expect(result.svg).toContain('<g id="node-publish"><g class="area-green"><rect');
    expect(result.svg).toContain('<g id="node-submit"><rect');
    expect(result.svg).toContain('.diagrist .area-green .card-title { fill: #15803d; }');
  });

  it('keep the code, its marks and its notes out of the area, so no run of code is repainted', () => {
    const area = /<g class="area-green">(.*?)<\/g>/su.exec(result.svg ?? '')?.[1] ?? '';
    expect(area).toContain('class="card-title"');
    expect(area).not.toContain('code-text');
    expect(result.svg).not.toMatch(/\.area-green \.(code-text|code-keyword|band|note-text)/u);
  });

  it('give a link from the core into an extension, with its label, the tone of the extension', () => {
    expect(result.svg).toContain('<g id="edge-0" class="area-green-line">');
    expect(result.svg).toContain('.diagrist .area-green-line .link-label { fill: #15803d; }');
    expect(result.svg).toContain('marker-end="url(#m-open-green)"');
  });

  it('append a legend of the areas and name the cards of each area in the description', () => {
    expect(result.svg).toContain('>Outbox</text>');
    expect(result.svg).toContain('>Kern</text>');
    expect(result.description).toContain('Bereich Outbox (grün): Outbox.publish.');
    expect(result.description).toContain('Bereich Kern (schwarz): TransferService.submit.');
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = diagram(SUBMIT, PUBLISH, LINK);
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
