import { iconStroke } from '../icons/index.js';

/** The role of an icon by how it is drawn (lines or filled) and its colour. */
export const iconRole = (icon: string, color: 'ink' | 'muted' | 'white'): string => `icon-${iconStroke(icon)}-${color}`;
