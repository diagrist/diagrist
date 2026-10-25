import { STANDARD } from '../layout/metrics.js';
import { PAPER_PAINT } from '../styles/paper.js';
import { inter, type Look } from './look.js';

/**
 * A quiet print look: names and texts in Inter and only technologies in JetBrains Mono, at the sizes of a printed
 * page, small capitals tracked; zones as areas, the core in yellow, status as a dot, texts standing on their line,
 * flow numbers in discs, decisions in the margin and the legend as sentences. Boxes, rows and columns keep the
 * standard grid, so a picture keeps its arrangement.
 */
export const PAPER: Look = {
  doc: 'a quiet print look: Inter on paper, zones as areas, the core in yellow, decisions in the margin',
  metrics: {
    ...STANDARD,
    firstRowY: 144,
    markerSize: 8,
    nodePad: 16,
    iconSize: 18,
    iconGap: 10,
    nodeLineH: 16,
    labelDy: 5,
    labelDyTech: -3,
    labelGap: 8,
    labelLineH: 14,
    groupTextX: 16,
    groupTitleY: 24,
    groupSubtitleY: 40,
    nodeRx: 2,
    dbTextShift: 6,
  },
  fonts: {
    title: inter(15, 600),
    name: inter(13, 600),
    group: { ...inter(9.5, 600), letterSpacing: 0.7, caps: true },
    label: inter(10.5),
    note: inter(11),
    description: inter(11),
    tech: { size: 9.5, family: 'jetbrains-mono' },
    badge: inter(9.5, 600),
    mark: inter(9.5, 600),
    replica: { size: 9, family: 'jetbrains-mono' },
    block: inter(14, 600),
    heading: inter(13, 600),
    large: inter(13),
  },
  paint: PAPER_PAINT,
  options: {
    header: 'kicker',
    nodes: 'box',
    nodeName: 'inside',
    person: 'bust',
    status: 'dot',
    replicas: 'tag',
    groups: { form: 'area', head: 'corner' },
    edgeText: { place: 'onLine', flat: false, ground: 'gap' },
    numbers: { seat: 'seated', form: 'disc' },
    marks: 'inside',
    focus: 'accent',
    layers: 'bracket',
    legend: 'sentence',
    decisions: 'notes',
  },
  crutches: { predecessorSeat: true },
};
