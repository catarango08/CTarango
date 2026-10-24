// PENDING SPARKY — Table 250.66 (GEC by largest service conductor) and Table 250.122 (EGC by OCPD rating).
// Rows in table order. "serviceCu"/"serviceAl" are the row's upper bound as printed.
import { pending, same } from '../types';
export interface GecRow { serviceCu: string; serviceAl: string; gecCu: string; gecAl: string }
export interface EgcRow { ocpdAmps: number; egcCu: string; egcAl: string }
export const T250_66 = pending<GecRow>(same('Table 250.66'));
export const T250_122 = pending<EgcRow>(same('Table 250.122'));
