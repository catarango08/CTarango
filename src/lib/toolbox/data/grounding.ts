import { live, same, type Verifiable } from '../types';
import { rawFile, rawTable } from './raw';
export interface GecRow extends Verifiable { serviceCu: string; serviceAl: string; gecCu: string; gecAl: string }
export interface EgcRow extends Verifiable { ocpdAmps: number; egcCu: string; egcAl: string }
export const T250_66 = live<GecRow>(same('Table 250.66'), rawTable('15').rows.map(([serviceCu, serviceAl, gecCu, gecAl]) => ({ serviceCu, serviceAl, gecCu, gecAl })), rawFile('15'),
  ['Rod/pipe/plate GEC need not exceed 6 Cu (250.66(A)); concrete-encased 4 Cu (B); ground ring: size of ring (C).']);
const V = 'UNVERIFIED: 2500–6000 A rows came from a search synthesis only (5000/6000 A Al: 1250; older references show 1200).';
export const T250_122 = live<EgcRow>(same('Table 250.122'), rawTable('16').rows.map(([a, egcCu, egcAl]) => ({ ocpdAmps: Number(a), egcCu, egcAl, ...(Number(a) >= 2500 ? { verify: V } : {}) })), rawFile('16'),
  ['Upsized ungrounded conductors: increase EGC proportionally by circular mils (250.122(B)). EGC need not exceed the circuit conductors.']);
