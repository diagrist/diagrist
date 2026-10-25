import { STANDARD } from '../layout/metrics.js';
import { COLUMNS_PAINT } from '../styles/columns.js';
import { inter, type Look } from './look.js';

/**
 * A technical sheet: grid columns grouped into bands under grey heads, which name the frame, the people, the focus
 * or the neighbours in them, and layers as grey bands at the left; square boxes in black with the name cut into the
 * top edge and icon and technology centred inside, people as boxes too, the emphasized element in a blue frame, the
 * accent flow heavy with filled numbers and whatever no flow touches greyed. Inter for names and texts, JetBrains
 * Mono for technologies, the kind as a kicker above the title, decisions as notes and the legend as sentences.
 */
export const COLUMNS: Look = {
  doc: 'a technical sheet: columns in bands under grey heads, names in the top edge of square boxes, the focus flow heavy',
  metrics: {
    ...STANDARD,
    nodeW: 200,
    nodeH: 72,
    colGap: 128,
    subColGap: 104,
    rowGap: 112,
    firstRowY: 144,
    markerSize: 9,
    nodePad: 16,
    iconSize: 20,
    nodeLineH: 16,
    labelDy: 4,
    labelGap: 8,
    labelLineH: 15,
    groupTextX: 16,
    groupTitleY: 24,
    groupSubtitleY: 40,
    stackOffset: 4,
    nodeRx: 0,
    frameRx: 0,
  },
  fonts: {
    title: inter(15, 600),
    name: inter(12, 600),
    group: { ...inter(9.5, 600), letterSpacing: 0.7, caps: true },
    label: inter(11),
    note: inter(11),
    description: inter(11),
    tech: { size: 10, family: 'jetbrains-mono' },
    badge: inter(9.5, 600),
    mark: inter(9.5, 600),
    replica: { size: 9, family: 'jetbrains-mono' },
    block: inter(14, 600),
    heading: inter(13, 600),
    large: inter(13),
  },
  paint: COLUMNS_PAINT,
  options: {
    header: 'kicker',
    nodes: 'box',
    nodeName: 'tab',
    person: 'box',
    status: 'dot',
    replicas: 'stack',
    groups: { form: 'band', head: 'corner' },
    edgeText: { place: 'beside', flat: false, ground: 'halo' },
    numbers: { seat: 'seated', form: 'disc' },
    marks: 'inside',
    focus: 'dim',
    layers: 'bands',
    legend: 'sentence',
    decisions: 'notes',
  },
};
