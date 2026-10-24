// PENDING SPARKY — 314.16: Table 314.16(A) box volumes and Table 314.16(B) volume per conductor,
// plus the conductor-count allowance rules from 314.16(B) as Sparky words them.
import { pending, same } from '../types';
export interface BoxVolumeRow { box: string; cubicIn: number }
export interface ConductorVolumeRow { size: string; cubicIn: number }
export interface BoxAllowanceRow { item: string; volumeAllowances: number; basis: string }
export const T314_16A = pending<BoxVolumeRow>(same('Table 314.16(A)'));
export const T314_16B = pending<ConductorVolumeRow>(same('Table 314.16(B)'));
export const S314_16B_RULES = pending<BoxAllowanceRow>(same('314.16(B)'));
