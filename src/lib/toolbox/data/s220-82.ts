// PENDING SPARKY — 220.82 dwelling optional calculation. All percentages and thresholds are code
// text and come from Sparky, including how the general load is split and which HVAC options apply.
import { pending, same } from '../types';
export interface OptionalCalcRow {
  kind: 'general-first-va' | 'general-remainder-pct' | 'general-va-per-sqft' | 'small-appliance-va-per-circuit' | 'laundry-va-per-circuit' | 'hvac-option-pct';
  label: string;
  value: number;
}
export const S220_82 = pending<OptionalCalcRow>(same('220.82'));
