import { compile, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { usecaseSource } from './compile.js';
import { stressSet } from './stress.js';

const stress = stressSet(new URL('stress/usecase/', import.meta.url));
const cx = (r: Rect) => r.x + r.w / 2;
const right = (r: Rect) => r.x + r.w;
const across = (a: Rect, b: Rect) => cx(a) > b.x && cx(a) < right(b);

/** Nodes and frames of a picture by id. */
function picture(source: string) {
  const result = compile(source, { plugins: [umlPlugin] });
  const rect = (list: readonly { id: string; rect: Rect }[] | undefined, id: string): Rect => {
    const found = list?.find((x) => x.id === id);
    if (!found) throw new Error(`no ${id}`);
    return found.rect;
  };
  return {
    codes: result.diagnostics.map((d) => d.code),
    node: (id: string) => rect(result.anchors?.nodes, id),
    frame: (id: string) => rect(result.anchors?.groups, id),
  };
}

describe('the columns of actors side by side, chosen by the price', () => {
  it('set an actor into the column of its use cases, where a subject in another row leaves it free', () => {
    const p = picture(stress.source('vier-subjekte.dgr'));
    expect(p.codes).toEqual([]);
    expect(across(p.node('risiko'), p.frame('zahlung'))).toBe(true);
    expect(p.node('risiko').x).toBeGreaterThan(right(p.frame('kredit')));
    expect(right(p.node('schufa'))).toBeLessThanOrEqual(right(p.frame('zahlung')));
  });

  it('set a system actor above the subject of its only use case, where that shortens its line', () => {
    const p = picture(usecaseSource('klinik.dgr'));
    const [kasse, abrechnung] = [p.node('kasse'), p.frame('abrechnung')];
    expect(across(kasse, abrechnung)).toBe(true);
    expect(kasse.y + kasse.h).toBeLessThan(abrechnung.y);
  });

  it('set an actor above its one subject in the column of its use cases, where all lie in inner columns', () => {
    const p = picture(stress.source('include-kette.dgr'));
    expect(p.codes).toEqual([]);
    const [psp, portal] = [p.node('psp'), p.frame('portal')];
    expect(across(psp, portal)).toBe(true);
    expect(psp.y + psp.h).toBeLessThan(portal.y);
    expect(Math.abs(cx(psp) - cx(p.node('bezahlen')))).toBeLessThan(1);
  });

  it('keep an actor whose side is given in its lane beside the subject', () => {
    const given = stress.source('include-kette.dgr').replace('kind=system\nsubject', 'kind=system side=right\nsubject');
    const p = picture(given);
    expect(p.node('psp').x).toBeGreaterThan(right(p.frame('portal')));
    expect(across(p.node('gds'), p.frame('portal'))).toBe(true);
  });

  it('close up the use cases of a subject in their column where that is cheaper', () => {
    const p = picture(stress.source('drei-subjekte.dgr'));
    const [status, tour, auftrag] = ['status', 'tour', 'auftrag'].map(p.node).sort((a, b) => a.y - b.y) as [
      Rect,
      Rect,
      Rect,
    ];
    expect(tour.y - (status.y + status.h)).toBeLessThanOrEqual(60);
    expect(auftrag.y - (tour.y + tour.h)).toBeLessThanOrEqual(60);
  });

  it('stand the special use case below its general that the price chooses, the other one a column deeper', () => {
    const p = picture(stress.source('faelle-generalisierung.dgr'));
    expect(p.codes).toEqual([]);
    const [loesen, schliessen, eskalieren] = [p.node('loesen'), p.node('schliessen'), p.node('eskalieren')];
    expect(Math.abs(cx(schliessen) - cx(loesen))).toBeLessThan(1);
    expect(schliessen.y).toBeGreaterThan(loesen.y + loesen.h);
    expect(eskalieren.x).toBeGreaterThan(right(loesen));
  });

  it('keep the actor beside its subject where the choices lead the search to a dearer picture', () => {
    const p = picture(stress.source('zwei-subjekte.dgr'));
    expect(p.node('bib').x).toBeGreaterThan(right(p.frame('lms')));
  });
});
