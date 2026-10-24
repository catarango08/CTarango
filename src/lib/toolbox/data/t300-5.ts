// PENDING SPARKY — Table 300.5 minimum cover requirements (inches), by location and wiring method.
import { pending, same } from '../types';
export interface CoverRow { location: string; wiringMethod: string; inches: number | null; note?: string }
export const T300_5 = pending<CoverRow>(same('Table 300.5'));
