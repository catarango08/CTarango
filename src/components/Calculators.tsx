import { useState } from 'react';
import {
  AMPACITY_TABLE,
  AWG_SORT_ORDER,
  CONDUIT_DATA,
  CONDUIT_FILL_PERCENT,
  BOX_FILL_VOLUME,
  STANDARD_BOXES,
  RESISTANCE_TABLE,
  getWireArea,
  WIRE_AREA_TABLE,
} from '../data/necData';
import type { ConduitType, InsulationType } from '../data/necData';

type CalcTab = 'wire-sizer' | 'conduit-fill' | 'box-fill' | 'voltage-drop';

// ── Wire Sizer ────────────────────────────────────────────────────────────────
function WireSizer() {
  const [amps, setAmps] = useState('');
  const [material, setMaterial] = useState<'copper' | 'aluminum'>('copper');
  const [tempRating, setTempRating] = useState<'60' | '75' | '90'>('75');
  const [derating, setDerating] = useState('1.0');

  const loadAmps = parseFloat(amps) || 0;
  const derateFactor = parseFloat(derating) || 1.0;
  const adjustedLoad = derateFactor > 0 ? loadAmps / derateFactor : loadAmps;

  let minAWG = '';
  let nextAWG = '';

  if (loadAmps > 0) {
    const col = material === 'copper'
      ? (tempRating === '60' ? 'cu60' : tempRating === '75' ? 'cu75' : 'cu90')
      : (tempRating === '60' ? 'al60' : tempRating === '75' ? 'al75' : 'al90');

    type AmpCol = 'cu60'|'cu75'|'cu90'|'al60'|'al75'|'al90';
    const key = col as AmpCol;

    // Table is ordered from smallest AWG (lowest ampacity) to largest.
    // Find the first row whose ampacity meets or exceeds the adjusted load.
    for (let i = 0; i < AMPACITY_TABLE.length; i++) {
      const row = AMPACITY_TABLE[i];
      if (row[key] === 0) continue; // aluminum not available for small gauges
      if (row[key] >= adjustedLoad) {
        minAWG = row.awg;
        // "next size up" means the next larger wire (higher ampacity = higher index)
        for (let j = i + 1; j < AMPACITY_TABLE.length; j++) {
          if (AMPACITY_TABLE[j][key] > 0) {
            nextAWG = AMPACITY_TABLE[j].awg;
            break;
          }
        }
        break;
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Load (Amps)</span>
          <input
            type="number" min="0" step="1"
            value={amps}
            onChange={e => setAmps(e.target.value)}
            placeholder="e.g. 30"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Wire Material</span>
          <select
            value={material}
            onChange={e => setMaterial(e.target.value as 'copper' | 'aluminum')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="copper">Copper</option>
            <option value="aluminum">Aluminum</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Temperature Rating</span>
          <select
            value={tempRating}
            onChange={e => setTempRating(e.target.value as '60' | '75' | '90')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="60">60°C (NM-B, UF-B)</option>
            <option value="75">75°C (THWN, XHHW)</option>
            <option value="90">90°C (THHN, THWN-2)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Conduit Fill Derating</span>
          <select
            value={derating}
            onChange={e => setDerating(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1.0">1.0 (1–3 conductors, no derating)</option>
            <option value="0.8">0.8 (4–6 conductors)</option>
            <option value="0.7">0.7 (7–9 conductors)</option>
            <option value="0.5">0.5 (10–20 conductors)</option>
          </select>
        </label>
      </div>

      {loadAmps > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {minAWG ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Minimum Wire Size</p>
                <p className="text-3xl font-bold text-green-700">
                  {minAWG.includes('/') || parseInt(minAWG) > 4 ? minAWG : `#${minAWG}`} AWG
                </p>
                {derating !== '1.0' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Adjusted load: {adjustedLoad.toFixed(1)}A (after {derating}× derating)
                  </p>
                )}
              </div>
              {nextAWG && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Next Size Up (recommended)</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {nextAWG.includes('/') || parseInt(nextAWG) > 4 ? nextAWG : `#${nextAWG}`} AWG
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 col-span-2">
              <p className="text-red-700 text-sm font-medium">Load exceeds largest conductor in NEC 310.16. Consult an engineer.</p>
            </div>
          )}
        </div>
      )}

      {/* Ampacity Table */}
      <div>
        <h3 className="font-semibold text-slate-700 text-sm mb-2">NEC 310.16 Ampacity Table</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">AWG / kcmil</th>
                <th className="px-3 py-2 text-right font-semibold">Cu 60°C</th>
                <th className="px-3 py-2 text-right font-semibold">Cu 75°C</th>
                <th className="px-3 py-2 text-right font-semibold">Cu 90°C</th>
                <th className="px-3 py-2 text-right font-semibold">Al 60°C</th>
                <th className="px-3 py-2 text-right font-semibold">Al 75°C</th>
                <th className="px-3 py-2 text-right font-semibold">Al 90°C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {AMPACITY_TABLE.map(row => {
                const isMatch = row.awg === minAWG;
                return (
                  <tr key={row.awg} className={isMatch ? 'bg-green-50 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-1.5 font-mono">{row.awg}</td>
                    <td className="px-3 py-1.5 text-right">{row.cu60 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">{row.cu75 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">{row.cu90 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">{row.al60 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">{row.al75 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">{row.al90 || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Conduit Fill ──────────────────────────────────────────────────────────────
interface ConduitWire {
  awg: string;
  insulation: InsulationType;
  qty: number;
}

function ConduitFill() {
  const [conduitType, setConduitType] = useState<ConduitType>('EMT');
  const [tradeSize, setTradeSize] = useState('1');
  const [wires, setWires] = useState<ConduitWire[]>([]);

  function addWire() {
    setWires(w => [...w, { awg: '12', insulation: 'THHN', qty: 1 }]);
  }

  function updateWire(i: number, changes: Partial<ConduitWire>) {
    setWires(w => w.map((ww, idx) => idx === i ? { ...ww, ...changes } : ww));
  }

  function removeWire(i: number) {
    setWires(w => w.filter((_, idx) => idx !== i));
  }

  const conduitSizes = CONDUIT_DATA[conduitType];
  const selectedConduit = conduitSizes.find(c => c.tradeSizeInch === tradeSize) ?? conduitSizes[0];
  const totalConduitArea = selectedConduit?.internalAreaSqIn ?? 0;

  const totalWires = wires.reduce((s, w) => s + w.qty, 0);
  const fillPct = totalWires === 1 ? 53 : totalWires === 2 ? 31 : 40;
  const maxFillArea = totalConduitArea * (fillPct / 100);

  const wireArea = wires.reduce((sum, w) => sum + getWireArea(w.awg, w.insulation) * w.qty, 0);
  const actualFillPct = totalConduitArea > 0 ? (wireArea / totalConduitArea) * 100 : 0;
  const pass = wireArea <= maxFillArea;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Conduit Type</span>
          <select
            value={conduitType}
            onChange={e => setConduitType(e.target.value as ConduitType)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(CONDUIT_DATA) as ConduitType[]).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Trade Size</span>
          <select
            value={tradeSize}
            onChange={e => setTradeSize(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONDUIT_DATA[conduitType].map(c => (
              <option key={c.tradeSizeInch} value={c.tradeSizeInch}>
                {c.tradeSizeInch}" ({c.internalAreaSqIn} in²)
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Wire List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Conductors</h3>
          <button
            onClick={addWire}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Wire
          </button>
        </div>

        {wires.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Add conductors to calculate fill.</p>
        ) : (
          <div className="space-y-2">
            {wires.map((w, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={w.awg}
                  onChange={e => updateWire(i, { awg: e.target.value })}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                >
                  {AWG_SORT_ORDER.filter(a => WIRE_AREA_TABLE.find(r => r.awg === a)).map(a => (
                    <option key={a} value={a}>#{a}</option>
                  ))}
                </select>
                <select
                  value={w.insulation}
                  onChange={e => updateWire(i, { insulation: e.target.value as InsulationType })}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                >
                  <option value="THHN">THHN</option>
                  <option value="THW">THW</option>
                  <option value="XHHW">XHHW</option>
                </select>
                <input
                  type="number" min="1" max="50"
                  value={w.qty}
                  onChange={e => updateWire(i, { qty: parseInt(e.target.value) || 1 })}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-16"
                />
                <span className="text-xs text-slate-400 w-16 text-right">
                  = {(getWireArea(w.awg, w.insulation) * w.qty).toFixed(4)} in²
                </span>
                <button onClick={() => removeWire(i)} className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {wires.length > 0 && (
        <div className={`rounded-xl p-4 border ${pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">Wire Area Used</p>
              <p className="font-bold text-slate-800">{wireArea.toFixed(4)} in²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Max Allowed ({fillPct}%)</p>
              <p className="font-bold text-slate-800">{maxFillArea.toFixed(4)} in²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Fill %</p>
              <p className={`font-bold ${pass ? 'text-green-700' : 'text-red-600'}`}>
                {actualFillPct.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Result</p>
              <p className={`font-bold text-lg ${pass ? 'text-green-700' : 'text-red-600'}`}>
                {pass ? 'PASS' : 'FAIL'}
              </p>
            </div>
          </div>
          <div className="bg-white/60 rounded-lg h-3 overflow-hidden">
            <div
              className={`h-3 rounded-lg transition-all ${pass ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(actualFillPct, 100)}%` }}
            />
          </div>
          {!pass && (
            <p className="text-xs text-red-700 mt-2">
              Exceeds {fillPct}% fill. Use larger conduit or reduce conductors.
            </p>
          )}
        </div>
      )}

      {/* Fill percent reference */}
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600 mb-1">NEC Chapter 9, Table 1 — Maximum Fill</p>
        {Object.entries(CONDUIT_FILL_PERCENT).map(([count, pct]) => (
          <p key={count}>{count === '1' ? '1 conductor' : count === '2' ? '2 conductors' : '3+ conductors'}: {pct}%</p>
        ))}
      </div>
    </div>
  );
}

// ── Box Fill ──────────────────────────────────────────────────────────────────
interface BoxConductor {
  awg: string;
  count: number;
}

function BoxFill() {
  const [conductors, setConductors] = useState<BoxConductor[]>([{ awg: '12', count: 3 }]);
  const [devices, setDevices] = useState(1);
  const [clamps, setClamps] = useState(false);
  const [groundingConductors, setGroundingConductors] = useState(1);
  const [selectedBox, setSelectedBox] = useState('');

  function addConductor() {
    setConductors(c => [...c, { awg: '12', count: 1 }]);
  }

  function updateConductor(i: number, changes: Partial<BoxConductor>) {
    setConductors(c => c.map((cc, idx) => idx === i ? { ...cc, ...changes } : cc));
  }

  function removeConductor(i: number) {
    setConductors(c => c.filter((_, idx) => idx !== i));
  }

  // Find the largest conductor AWG for clamp/device/ground calculation
  const allAWGs = conductors.map(c => c.awg);
  const largestAWG = allAWGs.reduce((largest, awg) => {
    const largestIdx = AWG_SORT_ORDER.indexOf(largest);
    const awgIdx = AWG_SORT_ORDER.indexOf(awg);
    // smaller index in AWG_SORT_ORDER means smaller (thinner) wire, larger index means larger (thicker) wire
    // We want the largest (thickest) which is the highest index
    return awgIdx > largestIdx ? awg : largest;
  }, allAWGs[0] ?? '14');

  const largestVol = BOX_FILL_VOLUME[largestAWG] ?? 2.0;

  // Calculate required volume (NEC 314.16(B))
  let totalVol = 0;

  // (1) Conductors
  conductors.forEach(c => {
    const vol = BOX_FILL_VOLUME[c.awg] ?? 0;
    totalVol += vol * c.count;
  });

  // (2) Devices: each yoke counts as 2× the largest conductor
  totalVol += devices * 2 * largestVol;

  // (3) Cable clamps: one allowance = 1× the largest conductor
  if (clamps) totalVol += largestVol;

  // (4) Equipment grounding conductors: all count as one allowance = 1× the largest EGC
  if (groundingConductors > 0) totalVol += largestVol;

  const box = selectedBox ? STANDARD_BOXES.find(b => b.name === selectedBox) : null;
  const fits = box ? totalVol <= box.volumeCuIn : null;

  const availableAWGs = Object.keys(BOX_FILL_VOLUME).filter(a => AWG_SORT_ORDER.includes(a));

  return (
    <div className="space-y-5">
      {/* Conductors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Conductors in Box</h3>
          <button
            onClick={addConductor}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {conductors.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={c.awg}
                onChange={e => updateConductor(i, { awg: e.target.value })}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
              >
                {availableAWGs.map(a => (
                  <option key={a} value={a}>#{a} AWG</option>
                ))}
              </select>
              <input
                type="number" min="1"
                value={c.count}
                onChange={e => updateConductor(i, { count: parseInt(e.target.value) || 1 })}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-16"
              />
              <span className="text-xs text-slate-400">
                = {((BOX_FILL_VOLUME[c.awg] ?? 0) * c.count).toFixed(2)} in³
              </span>
              <button onClick={() => removeConductor(i)} className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Devices & Clamps */}
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Devices (switches/outlets)</span>
          <input
            type="number" min="0"
            value={devices}
            onChange={e => setDevices(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Equipment Ground Conductors</span>
          <input
            type="number" min="0"
            value={groundingConductors}
            onChange={e => setGroundingConductors(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={clamps}
              onChange={e => setClamps(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-700">Cable clamps present</span>
          </label>
        </div>
      </div>

      {/* Required Volume */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">Required Box Volume</p>
        <p className="text-3xl font-bold text-slate-800">{totalVol.toFixed(2)} in³</p>
      </div>

      {/* Box Selector */}
      <div>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Select a Box</span>
          <select
            value={selectedBox}
            onChange={e => setSelectedBox(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choose a box —</option>
            {STANDARD_BOXES.map(b => (
              <option key={b.name} value={b.name}>
                {b.name} ({b.volumeCuIn} in³)
              </option>
            ))}
          </select>
        </label>
      </div>

      {box && (
        <div className={`rounded-xl p-4 border ${fits ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-bold text-lg ${fits ? 'text-green-700' : 'text-red-600'}`}>
            {fits ? 'FITS' : 'TOO SMALL'}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Required: {totalVol.toFixed(2)} in³ / Box volume: {box.volumeCuIn} in³
          </p>
          {!fits && (
            <p className="text-xs text-red-700 mt-1">
              Need at least {totalVol.toFixed(2)} in³ — choose a larger box.
            </p>
          )}
        </div>
      )}

      {/* Standard Boxes Reference */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Standard Box Volumes (NEC Table 314.16(A))</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Box</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Volume (in³)</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600">Fits?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {STANDARD_BOXES.map(b => {
                const boxFits = totalVol <= b.volumeCuIn;
                return (
                  <tr key={b.name} className={b.name === selectedBox ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-1.5">{b.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{b.volumeCuIn}</td>
                    <td className="px-3 py-1.5 text-center">
                      {totalVol > 0 ? (
                        <span className={`font-semibold ${boxFits ? 'text-green-600' : 'text-red-400'}`}>
                          {boxFits ? '✓' : '✗'}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Voltage Drop ──────────────────────────────────────────────────────────────
function VoltageDrop() {
  const [gauge, setGauge] = useState('12');
  const [distance, setDistance] = useState('');
  const [load, setLoad] = useState('');
  const [voltage, setVoltage] = useState('120');
  const [wireMaterial, setWireMaterial] = useState<'copper' | 'aluminum'>('copper');
  const [phase, setPhase] = useState<'single' | 'three'>('single');

  const distFt = parseFloat(distance) || 0;
  const loadAmps = parseFloat(load) || 0;
  const systemVoltage = parseFloat(voltage) || 120;

  const resistanceRow = RESISTANCE_TABLE.find(r => r.awg === gauge);
  const ohmsPerKFt = wireMaterial === 'copper'
    ? (resistanceRow?.copperOhm ?? 0)
    : (resistanceRow?.aluminumOhm ?? 0);

  // VD formula: single-phase = 2 × K × I × D / CM  (simplified: use resistance table)
  // Using table: R per 1000ft, total R for one-way = ohmsPerKFt × distFt / 1000
  // Two-way distance for single-phase: 2× one-way
  // Three-phase: √3 × one-way
  const oneWayR = ohmsPerKFt * distFt / 1000;
  const totalR = phase === 'single' ? oneWayR * 2 : oneWayR * Math.sqrt(3);
  const voltDrop = totalR * loadAmps;
  const dropPercent = systemVoltage > 0 ? (voltDrop / systemVoltage) * 100 : 0;

  const branchMax = 3;
  const totalMax = 5;
  const passColor =
    dropPercent <= branchMax ? 'text-green-600' :
    dropPercent <= totalMax ? 'text-yellow-600' : 'text-red-600';

  // Find recommended gauge to bring drop under 3%
  // Resistance table is ordered smallest AWG (highest resistance) first; iterate from end (largest wire) backwards
  let recommendedAWG = '';
  if (dropPercent > branchMax && distFt > 0 && loadAmps > 0) {
    // iterate from smallest to largest wire, find first that achieves ≤3%
    for (let i = 0; i < RESISTANCE_TABLE.length; i++) {
      const row = RESISTANCE_TABLE[i];
      const r = wireMaterial === 'copper' ? row.copperOhm : row.aluminumOhm;
      const oneR = r * distFt / 1000;
      const totR = phase === 'single' ? oneR * 2 : oneR * Math.sqrt(3);
      const drop = totR * loadAmps;
      const pct = (drop / systemVoltage) * 100;
      if (pct <= branchMax) {
        recommendedAWG = row.awg;
        break;
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Wire Gauge</span>
          <select
            value={gauge}
            onChange={e => setGauge(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RESISTANCE_TABLE.map(r => (
              <option key={r.awg} value={r.awg}>#{r.awg} AWG</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Wire Material</span>
          <select
            value={wireMaterial}
            onChange={e => setWireMaterial(e.target.value as 'copper' | 'aluminum')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="copper">Copper</option>
            <option value="aluminum">Aluminum</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">One-Way Distance (ft)</span>
          <input
            type="number" min="0" step="1"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            placeholder="e.g. 100"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Load (Amps)</span>
          <input
            type="number" min="0" step="1"
            value={load}
            onChange={e => setLoad(e.target.value)}
            placeholder="e.g. 20"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">System Voltage</span>
          <select
            value={voltage}
            onChange={e => setVoltage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="120">120V</option>
            <option value="240">240V</option>
            <option value="208">208V</option>
            <option value="480">480V</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1 block">Phase</span>
          <select
            value={phase}
            onChange={e => setPhase(e.target.value as 'single' | 'three')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="single">Single-Phase</option>
            <option value="three">Three-Phase</option>
          </select>
        </label>
      </div>

      {distFt > 0 && loadAmps > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Voltage Drop</p>
              <p className={`text-xl font-bold ${passColor}`}>{voltDrop.toFixed(2)}V</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Drop %</p>
              <p className={`text-xl font-bold ${passColor}`}>{dropPercent.toFixed(2)}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Voltage at Load</p>
              <p className="text-xl font-bold text-slate-800">{(systemVoltage - voltDrop).toFixed(1)}V</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${
              dropPercent <= branchMax ? 'bg-green-50' : dropPercent <= totalMax ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <p className="text-xs text-slate-500">NEC Status</p>
              <p className={`text-sm font-bold ${passColor}`}>
                {dropPercent <= branchMax ? 'EXCELLENT' : dropPercent <= totalMax ? 'ACCEPTABLE' : 'OVER LIMIT'}
              </p>
            </div>
          </div>

          {dropPercent > branchMax && (
            <div className={`rounded-xl p-3 text-sm ${dropPercent <= totalMax ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {dropPercent <= totalMax
                ? `Drop is between 3–5%. Acceptable for total system, but NEC recommends ≤3% for branch circuits.`
                : `Drop exceeds 5%. NEC informational note recommends ≤3% (branch) and ≤5% (total feeder + branch).`}
              {recommendedAWG && (
                <p className="mt-1 font-medium">
                  Upgrade to #{recommendedAWG} AWG to reduce drop to ≤3%.
                </p>
              )}
            </div>
          )}

          {/* NEC reference */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600 mb-1">NEC Voltage Drop Guidelines (Informational)</p>
            <p>Branch circuit: ≤3% recommended (FPN to 210.19(A))</p>
            <p>Feeder + branch circuit total: ≤5% recommended</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Calculators Component ────────────────────────────────────────────────
export default function Calculators() {
  const [tab, setTab] = useState<CalcTab>('wire-sizer');

  const tabs: { id: CalcTab; label: string }[] = [
    { id: 'wire-sizer', label: 'Wire Sizer' },
    { id: 'conduit-fill', label: 'Conduit Fill' },
    { id: 'box-fill', label: 'Box Fill' },
    { id: 'voltage-drop', label: 'Voltage Drop' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab row */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {tab === 'wire-sizer' && (
          <>
            <h2 className="font-semibold text-slate-800 mb-1">Wire Sizer (NEC 310.16)</h2>
            <p className="text-xs text-slate-400 mb-4">Find minimum conductor size for a given load.</p>
            <WireSizer />
          </>
        )}
        {tab === 'conduit-fill' && (
          <>
            <h2 className="font-semibold text-slate-800 mb-1">Conduit Fill (NEC Chapter 9)</h2>
            <p className="text-xs text-slate-400 mb-4">Calculate conductor fill percentage for conduit.</p>
            <ConduitFill />
          </>
        )}
        {tab === 'box-fill' && (
          <>
            <h2 className="font-semibold text-slate-800 mb-1">Box Fill (NEC 314.16)</h2>
            <p className="text-xs text-slate-400 mb-4">Calculate required box volume for conductors and devices.</p>
            <BoxFill />
          </>
        )}
        {tab === 'voltage-drop' && (
          <>
            <h2 className="font-semibold text-slate-800 mb-1">Voltage Drop Calculator</h2>
            <p className="text-xs text-slate-400 mb-4">Calculate voltage drop per NEC informational note guidelines.</p>
            <VoltageDrop />
          </>
        )}
      </div>
    </div>
  );
}
