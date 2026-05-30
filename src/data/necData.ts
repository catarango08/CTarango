// NEC electrical data tables

// ── NEC 310.16 Ampacity Table (copper and aluminum) ──────────────────────────
// Key: AWG/kcmil string, Values: [Cu60, Cu75, Cu90, Al60, Al75, Al90]
export interface AmpacityRow {
  awg: string;
  cu60: number;
  cu75: number;
  cu90: number;
  al60: number;
  al75: number;
  al90: number;
}

export const AMPACITY_TABLE: AmpacityRow[] = [
  { awg: '14',    cu60: 15,  cu75: 20,  cu90: 25,  al60: 0,   al75: 0,   al90: 0   },
  { awg: '12',    cu60: 20,  cu75: 25,  cu90: 30,  al60: 15,  al75: 20,  al90: 25  },
  { awg: '10',    cu60: 30,  cu75: 35,  cu90: 40,  al60: 25,  al75: 30,  al90: 35  },
  { awg: '8',     cu60: 40,  cu75: 50,  cu90: 55,  al60: 30,  al75: 40,  al90: 45  },
  { awg: '6',     cu60: 55,  cu75: 65,  cu90: 75,  al60: 40,  al75: 50,  al90: 60  },
  { awg: '4',     cu60: 70,  cu75: 85,  cu90: 95,  al60: 55,  al75: 65,  al90: 75  },
  { awg: '3',     cu60: 85,  cu75: 100, cu90: 110, al60: 65,  al75: 75,  al90: 85  },
  { awg: '2',     cu60: 95,  cu75: 115, cu90: 130, al60: 75,  al75: 90,  al90: 100 },
  { awg: '1',     cu60: 110, cu75: 130, cu90: 150, al60: 85,  al75: 100, al90: 115 },
  { awg: '1/0',   cu60: 125, cu75: 150, cu90: 170, al60: 100, al75: 120, al90: 135 },
  { awg: '2/0',   cu60: 145, cu75: 175, cu90: 195, al60: 115, al75: 135, al90: 150 },
  { awg: '3/0',   cu60: 165, cu75: 200, cu90: 225, al60: 130, al75: 155, al90: 175 },
  { awg: '4/0',   cu60: 195, cu75: 230, cu90: 260, al60: 150, al75: 180, al90: 205 },
  { awg: '250',   cu60: 215, cu75: 255, cu90: 290, al60: 170, al75: 205, al90: 230 },
  { awg: '300',   cu60: 240, cu75: 285, cu90: 320, al60: 190, al75: 230, al90: 255 },
  { awg: '350',   cu60: 260, cu75: 310, cu90: 350, al60: 210, al75: 250, al90: 280 },
  { awg: '400',   cu60: 280, cu75: 335, cu90: 380, al60: 225, al75: 270, al90: 305 },
  { awg: '500',   cu60: 320, cu75: 380, cu90: 430, al60: 260, al75: 310, al90: 350 },
  { awg: '600',   cu60: 355, cu75: 420, cu90: 475, al60: 285, al75: 340, al90: 385 },
  { awg: '700',   cu60: 385, cu75: 460, cu90: 520, al60: 310, al75: 375, al90: 420 },
  { awg: '750',   cu60: 400, cu75: 475, cu90: 535, al60: 320, al75: 385, al90: 435 },
  { awg: '800',   cu60: 410, cu75: 490, cu90: 555, al60: 330, al75: 395, al90: 450 },
  { awg: '900',   cu60: 435, cu75: 520, cu90: 585, al60: 355, al75: 425, al90: 480 },
  { awg: '1000',  cu60: 455, cu75: 545, cu90: 615, al60: 375, al75: 445, al90: 500 },
];

// AWG sort order for display (smaller number = larger wire for AWG; kcmil opposite)
export const AWG_SORT_ORDER: string[] = [
  '14', '12', '10', '8', '6', '4', '3', '2', '1',
  '1/0', '2/0', '3/0', '4/0',
  '250', '300', '350', '400', '500', '600', '700', '750', '800', '900', '1000',
];

// ── Conduit Fill (NEC Chapter 9, Table 1) ──────────────────────────────────
// Maximum fill percentages
export const CONDUIT_FILL_PERCENT: Record<number, number> = {
  1: 53,   // 1 conductor
  2: 31,   // 2 conductors
  3: 40,   // 3+ conductors (same for all ≥3)
};

// Conduit internal areas (sq inches) — NEC Chapter 9, Table 4
export interface ConduitSize {
  tradeSizeInch: string;
  internalAreaSqIn: number;
}

export type ConduitType = 'EMT' | 'IMC' | 'PVC Sch40' | 'RMC';

export const CONDUIT_DATA: Record<ConduitType, ConduitSize[]> = {
  EMT: [
    { tradeSizeInch: '1/2',  internalAreaSqIn: 0.304 },
    { tradeSizeInch: '3/4',  internalAreaSqIn: 0.533 },
    { tradeSizeInch: '1',    internalAreaSqIn: 0.864 },
    { tradeSizeInch: '1-1/4', internalAreaSqIn: 1.496 },
    { tradeSizeInch: '1-1/2', internalAreaSqIn: 2.036 },
    { tradeSizeInch: '2',    internalAreaSqIn: 3.356 },
    { tradeSizeInch: '2-1/2', internalAreaSqIn: 5.858 },
    { tradeSizeInch: '3',    internalAreaSqIn: 8.846 },
    { tradeSizeInch: '3-1/2', internalAreaSqIn: 11.545 },
    { tradeSizeInch: '4',    internalAreaSqIn: 14.753 },
  ],
  IMC: [
    { tradeSizeInch: '1/2',  internalAreaSqIn: 0.342 },
    { tradeSizeInch: '3/4',  internalAreaSqIn: 0.586 },
    { tradeSizeInch: '1',    internalAreaSqIn: 0.959 },
    { tradeSizeInch: '1-1/4', internalAreaSqIn: 1.647 },
    { tradeSizeInch: '1-1/2', internalAreaSqIn: 2.225 },
    { tradeSizeInch: '2',    internalAreaSqIn: 3.630 },
    { tradeSizeInch: '2-1/2', internalAreaSqIn: 5.135 },
    { tradeSizeInch: '3',    internalAreaSqIn: 7.922 },
    { tradeSizeInch: '3-1/2', internalAreaSqIn: 10.584 },
    { tradeSizeInch: '4',    internalAreaSqIn: 13.631 },
  ],
  'PVC Sch40': [
    { tradeSizeInch: '1/2',  internalAreaSqIn: 0.285 },
    { tradeSizeInch: '3/4',  internalAreaSqIn: 0.508 },
    { tradeSizeInch: '1',    internalAreaSqIn: 0.832 },
    { tradeSizeInch: '1-1/4', internalAreaSqIn: 1.453 },
    { tradeSizeInch: '1-1/2', internalAreaSqIn: 1.986 },
    { tradeSizeInch: '2',    internalAreaSqIn: 3.291 },
    { tradeSizeInch: '2-1/2', internalAreaSqIn: 4.695 },
    { tradeSizeInch: '3',    internalAreaSqIn: 7.268 },
    { tradeSizeInch: '3-1/2', internalAreaSqIn: 9.737 },
    { tradeSizeInch: '4',    internalAreaSqIn: 12.554 },
  ],
  RMC: [
    { tradeSizeInch: '1/2',  internalAreaSqIn: 0.314 },
    { tradeSizeInch: '3/4',  internalAreaSqIn: 0.549 },
    { tradeSizeInch: '1',    internalAreaSqIn: 0.887 },
    { tradeSizeInch: '1-1/4', internalAreaSqIn: 1.526 },
    { tradeSizeInch: '1-1/2', internalAreaSqIn: 2.071 },
    { tradeSizeInch: '2',    internalAreaSqIn: 3.408 },
    { tradeSizeInch: '2-1/2', internalAreaSqIn: 4.866 },
    { tradeSizeInch: '3',    internalAreaSqIn: 7.499 },
    { tradeSizeInch: '3-1/2', internalAreaSqIn: 10.010 },
    { tradeSizeInch: '4',    internalAreaSqIn: 12.882 },
  ],
};

// ── Wire cross-section areas (sq inches) NEC Chapter 9, Table 5 ──────────────
// THHN/THWN-2 (most common)
export interface WireArea {
  awg: string;
  thhn: number;   // THHN/THWN-2
  thw: number;    // THW/THWN
  xhhw: number;   // XHHW/XHHW-2
}

export const WIRE_AREA_TABLE: WireArea[] = [
  { awg: '14',   thhn: 0.0097, thw: 0.0135, xhhw: 0.0097 },
  { awg: '12',   thhn: 0.0133, thw: 0.0181, xhhw: 0.0133 },
  { awg: '10',   thhn: 0.0211, thw: 0.0243, xhhw: 0.0211 },
  { awg: '8',    thhn: 0.0366, thw: 0.0437, xhhw: 0.0366 },
  { awg: '6',    thhn: 0.0507, thw: 0.0590, xhhw: 0.0507 },
  { awg: '4',    thhn: 0.0824, thw: 0.0814, xhhw: 0.0824 },
  { awg: '3',    thhn: 0.0973, thw: 0.0962, xhhw: 0.0973 },
  { awg: '2',    thhn: 0.1158, thw: 0.1146, xhhw: 0.1158 },
  { awg: '1',    thhn: 0.1562, thw: 0.1534, xhhw: 0.1562 },
  { awg: '1/0',  thhn: 0.1855, thw: 0.1825, xhhw: 0.1855 },
  { awg: '2/0',  thhn: 0.2223, thw: 0.2190, xhhw: 0.2223 },
  { awg: '3/0',  thhn: 0.2679, thw: 0.2642, xhhw: 0.2679 },
  { awg: '4/0',  thhn: 0.3237, thw: 0.3197, xhhw: 0.3237 },
  { awg: '250',  thhn: 0.3970, thw: 0.3904, xhhw: 0.3904 },
  { awg: '300',  thhn: 0.4608, thw: 0.4536, xhhw: 0.4536 },
  { awg: '350',  thhn: 0.5281, thw: 0.5166, xhhw: 0.5166 },
  { awg: '400',  thhn: 0.5958, thw: 0.5831, xhhw: 0.5831 },
  { awg: '500',  thhn: 0.7293, thw: 0.7140, xhhw: 0.7140 },
];

export type InsulationType = 'THHN' | 'THW' | 'XHHW';

export function getWireArea(awg: string, insulation: InsulationType): number {
  const row = WIRE_AREA_TABLE.find(r => r.awg === awg);
  if (!row) return 0;
  if (insulation === 'THHN') return row.thhn;
  if (insulation === 'THW') return row.thw;
  return row.xhhw;
}

// ── Box Fill (NEC 314.16) ───────────────────────────────────────────────────
// Volume allowances per conductor size (cubic inches) — Table 314.16(B)
export const BOX_FILL_VOLUME: Record<string, number> = {
  '18': 1.50,
  '16': 1.75,
  '14': 2.00,
  '12': 2.25,
  '10': 2.50,
  '8':  3.00,
  '6':  5.00,
};

// Standard box volumes (cubic inches) — Table 314.16(A)
export interface BoxSize {
  name: string;
  volumeCuIn: number;
}

export const STANDARD_BOXES: BoxSize[] = [
  { name: '3" × 2" × 1-1/2" Device',    volumeCuIn: 7.5  },
  { name: '3" × 2" × 2" Device',         volumeCuIn: 10.0 },
  { name: '3" × 2" × 2-1/4" Device',     volumeCuIn: 10.5 },
  { name: '3" × 2" × 2-1/2" Device',     volumeCuIn: 12.5 },
  { name: '3" × 2" × 2-3/4" Device',     volumeCuIn: 14.0 },
  { name: '3" × 2" × 3-1/2" Device',     volumeCuIn: 18.0 },
  { name: '4" × 1-1/4" Square',          volumeCuIn: 18.0 },
  { name: '4" × 1-1/2" Square',          volumeCuIn: 21.0 },
  { name: '4" × 2-1/8" Square',          volumeCuIn: 30.3 },
  { name: '4-11/16" × 1-1/4" Square',    volumeCuIn: 25.5 },
  { name: '4-11/16" × 1-1/2" Square',    volumeCuIn: 29.5 },
  { name: '4-11/16" × 2-1/8" Square',    volumeCuIn: 42.0 },
  { name: '3-1/2" Round/Octagon 1-1/2"', volumeCuIn: 12.0 },
  { name: '4" Round/Octagon 1-1/2"',     volumeCuIn: 15.5 },
  { name: '4" Round/Octagon 2-1/8"',     volumeCuIn: 21.5 },
];

// ── Wire resistance for voltage drop (Ω per 1000 ft) ───────────────────────
// DC resistance at 75°C (NEC Chapter 9, Table 9)
export interface ResistanceRow {
  awg: string;
  copperOhm: number;   // Ω per 1000 ft
  aluminumOhm: number;
}

export const RESISTANCE_TABLE: ResistanceRow[] = [
  { awg: '14',   copperOhm: 3.14,  aluminumOhm: 5.17  },
  { awg: '12',   copperOhm: 1.98,  aluminumOhm: 3.25  },
  { awg: '10',   copperOhm: 1.24,  aluminumOhm: 2.04  },
  { awg: '8',    copperOhm: 0.778, aluminumOhm: 1.28  },
  { awg: '6',    copperOhm: 0.491, aluminumOhm: 0.808 },
  { awg: '4',    copperOhm: 0.308, aluminumOhm: 0.508 },
  { awg: '3',    copperOhm: 0.245, aluminumOhm: 0.403 },
  { awg: '2',    copperOhm: 0.194, aluminumOhm: 0.319 },
  { awg: '1',    copperOhm: 0.154, aluminumOhm: 0.253 },
  { awg: '1/0',  copperOhm: 0.122, aluminumOhm: 0.201 },
  { awg: '2/0',  copperOhm: 0.0967, aluminumOhm: 0.159 },
  { awg: '3/0',  copperOhm: 0.0766, aluminumOhm: 0.126 },
  { awg: '4/0',  copperOhm: 0.0608, aluminumOhm: 0.100 },
  { awg: '250',  copperOhm: 0.0515, aluminumOhm: 0.0847 },
  { awg: '300',  copperOhm: 0.0429, aluminumOhm: 0.0707 },
  { awg: '350',  copperOhm: 0.0367, aluminumOhm: 0.0605 },
  { awg: '400',  copperOhm: 0.0321, aluminumOhm: 0.0529 },
  { awg: '500',  copperOhm: 0.0258, aluminumOhm: 0.0424 },
];
