// PENDING SPARKY — Chapter 9 Table 8 (or Table 9 if Sparky prefers) conductor resistance, ohms per 1000 ft.
// Sparky: note which table/column (and temperature basis) the values come from in `source`.
// Fill rows in table order, smallest to largest conductor. Do not fill from memory.
import { pending, same } from '../types';
export interface ResistanceRow { size: string; cuOhmsPerKft: number | null; alOhmsPerKft: number | null }
export const CH9_TABLE8 = pending<ResistanceRow>(same('Chapter 9, Table 8'));
