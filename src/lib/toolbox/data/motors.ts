// PENDING SPARKY — Table 430.248 (single-phase FLC), Table 430.250 (three-phase FLC),
// Table 430.52 (OCPD percentages by motor type and device — column names as printed).
import { pending, same } from '../types';
export interface FlcRow { hp: string; volts: number; amps: number }
export interface OcpdPercentRow { motorType: string; device: string; percent: number }
export const T430_248 = pending<FlcRow>(same('Table 430.248'));
export const T430_250 = pending<FlcRow>(same('Table 430.250'));
export const T430_52 = pending<OcpdPercentRow>(same('Table 430.52'));
// Wire suggestion needs the motor branch-circuit conductor rule (Sparky to cite section and %).
export interface ConductorFactorRow { rule: string; percentOfFlc: number }
export const S430_22 = pending<ConductorFactorRow>(same('Motor conductor rule (section TBD by Sparky)'));
