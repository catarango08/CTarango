// Sanity checks for Toolbox math. Table values below are FAKE placeholders (A/B/C sizes,
// round numbers) to exercise the logic only — they are not NEC data.
import assert from 'node:assert/strict';
import { ohms, voltageDrop, conduitFill, egcFor, boxFill } from '../src/lib/toolbox/calc.ts';
const o = ohms({ system: 'dc', volts: 120, amps: 10 }) as any; assert.equal(o.ohms, 12); assert.equal(o.watts, 1200);
const a = ohms({ system: 'ac1', volts: 240, watts: 4800, pf: 0.8 }) as any; assert.equal(a.amps, 25);
const t = ohms({ system: 'ac3', volts: 480, amps: 10, pf: 0.9 }) as any; assert.equal(Math.round(t.watts), Math.round(Math.sqrt(3) * 480 * 10 * 0.9));
const R = [{ size: 'A', cuOhmsPerKft: 2, alOhmsPerKft: 3 }, { size: 'B', cuOhmsPerKft: 1, alOhmsPerKft: 1.5 }];
const v = voltageDrop(R, { material: 'Cu', phase: 1, lengthFt: 100, amps: 10, volts: 100, size: 'A', targetPct: 2.5 });
assert.equal(v.dropV, 4); assert.equal(v.pct, 4); assert.equal(v.suggest, 'B');
const f = conduitFill([{ minConductors: 1, maxConductors: null, percent: 50 }], [{ raceway: 'EMT', tradeSize: 'S', totalAreaSqIn: 1 }, { raceway: 'EMT', tradeSize: 'L', totalAreaSqIn: 4 }], [{ insulation: 'XHHW-2', size: 'A', areaSqIn: 0.3 }], 'EMT', [{ insulation: 'XHHW-2', size: 'A', count: 3 }]);
assert.equal(f.tradeSize, 'L');
assert.equal(egcFor([{ ocpdAmps: 10, egcCu: 'x', egcAl: 'y' }, { ocpdAmps: 20, egcCu: 'z', egcAl: 'w' }], 15)?.egcCu, 'z');
assert.equal(boxFill([{ box: 'Q', cubicIn: 10 }], [{ size: 'A', cubicIn: 2 }], 'Q', [{ size: 'A', count: 6 }]).ok, false);
console.log('toolbox calc OK');
