// PENDING SPARKY — Chapter 9 Table 1 (percent of cross section), Table 4 (raceway areas:
// EMT, PVC Schedule 40, PVC Schedule 80, RMC), Table 5 (THHN/THWN-2, XHHW-2 areas).
import { pending, same } from '../types';
export interface FillPercentRow { minConductors: number; maxConductors: number | null; percent: number }
export type Raceway = 'EMT' | 'PVC 40' | 'PVC 80' | 'RMC';
export interface RacewayAreaRow { raceway: Raceway; tradeSize: string; totalAreaSqIn: number }
export interface WireAreaRow { insulation: 'THHN/THWN-2' | 'XHHW-2'; size: string; areaSqIn: number }
export const CH9_TABLE1 = pending<FillPercentRow>(same('Chapter 9, Table 1'));
export const CH9_TABLE4 = pending<RacewayAreaRow>(same('Chapter 9, Table 4'));
export const CH9_TABLE5 = pending<WireAreaRow>(same('Chapter 9, Table 5'));
