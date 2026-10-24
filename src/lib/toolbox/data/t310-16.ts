// PENDING SPARKY — Allowable ampacity table; columns by insulation temperature rating.
// Numbered 310.16 in 2023; 310.15(B)(16) in 2017 and 2011 (per Corey's brief). Rows smallest to largest.
import { pending } from '../types';
// One row per size × material × temperature column, exactly as printed.
export interface AmpacityRow { size: string; material: 'Cu' | 'Al'; column: string; amps: number }
export const T310_16 = pending<AmpacityRow>({ '2023': 'Table 310.16', '2017': 'Table 310.15(B)(16)', '2011': 'Table 310.15(B)(16)' });
