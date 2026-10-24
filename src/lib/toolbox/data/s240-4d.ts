// PENDING SPARKY — 240.4(D) small-conductor overcurrent limits.
import { pending, same } from '../types';
export interface SmallConductorRow { size: string; material: 'Cu' | 'Al'; maxOcpdAmps: number }
export const S240_4D = pending<SmallConductorRow>(same('240.4(D)'));
