/**
 * ON-SITE ESTIMATE ASSEMBLIES — one editable file.
 *
 * hours  = Corey's raw labor hours per unit (the 1.25 buffer is applied by the
 *          engine and never shown to the customer).
 * material = Corey's COST per unit in dollars (marked up x1.30 by the engine,
 *          or $0 when the quote is labor-only).
 * Sources: Estimator unit times in /workspace/estimates/_build/model.py and
 * Home Depot / supply-house prices on the Peck estimates. Rate Book flats were
 * the cross-check. Material prices are dated so stale ones are obvious.
 */
export const MATERIAL_PRICES_AS_OF = '2026-10-21';

export interface Assembly {
  id: string;
  name: string;
  /** Plain-English, customer-safe. */
  benefit: string;
  hours: number;
  material: number;
  unit?: string;
  /** Pre-ticked as the Better upgrade by "Make tiers". */
  betterAdd?: boolean;
  /** Generator unit + transfer gear, for the generator deposit rule. */
  generatorGear?: boolean;
}

export const ASSEMBLIES: Assembly[] = [
  { id: 'rec', name: 'Receptacle', benefit: 'New tamper-resistant outlet', hours: 0.5, material: 6 },
  { id: 'gfci', name: 'GFCI receptacle', benefit: 'Shock protection where there is water', hours: 0.6, material: 18 },
  { id: 'switch', name: 'Switch / dimmer', benefit: 'New switch or LED dimmer', hours: 0.4, material: 28 },
  { id: 'can', name: 'Can / disc light', benefit: 'Slim LED light, dimmable', hours: 0.75, material: 20 },
  { id: 'fan', name: 'Ceiling fan (braced box)', benefit: 'Fan hung on a fan-rated box', hours: 1.5, material: 25 },
  { id: 'c20', name: '20A circuit', benefit: 'Its own breaker, no more trips', hours: 3, material: 65, unit: 'circuit' },
  { id: 'c240', name: '240V circuit', benefit: 'Dryer, range, welder or EV power', hours: 4, material: 140, unit: 'circuit' },
  { id: 'smoke', name: 'Smoke/CO alarm', benefit: 'Hardwired, talks to the others', hours: 0.4, material: 63 },
  { id: 'surge', name: 'Whole-home surge protector', benefit: 'Guards electronics from spikes', hours: 1.5, material: 120, betterAdd: true },
  { id: 'label', name: 'Typed panel schedule', benefit: 'Every breaker labeled', hours: 1, material: 5, betterAdd: true },
  { id: 'afci', name: 'AFCI/GFCI breaker', benefit: 'Fire and shock protection on a circuit', hours: 0.5, material: 59 },
  { id: 'panel', name: 'Panel swap (200A)', benefit: 'New panel, new breakers, labeled', hours: 10, material: 650, unit: 'panel' },
  { id: 'feeder', name: 'Feeder (per ft)', benefit: 'New feeder cable', hours: 0.08, material: 9, unit: 'ft' },
  { id: 'meter', name: 'Meter base', benefit: 'New meter socket', hours: 4, material: 180 },
  { id: 'geninlet', name: 'Generator inlet + interlock', benefit: 'Plug in a portable generator safely', hours: 3, material: 165, generatorGear: true },
];

/** "If we find X" diagnostic scenarios — each becomes its own quote option. */
export interface Scenario { id: string; label: string; found: string; items: { id: string; qty: number }[]; extraHours?: number; extraMaterial?: number }
export const SCENARIOS: Scenario[] = [
  { id: 'S1', label: 'S1 · Breaker / lugs', found: 'A bad breaker or loose lug at the panel.', items: [{ id: 'afci', qty: 0 }], extraHours: 1.5, extraMaterial: 25 },
  { id: 'S2a', label: 'S2a · Feeder spot repair', found: 'Damage at one spot on the feeder.', items: [], extraHours: 3, extraMaterial: 60 },
  { id: 'S2b', label: 'S2b · Feeder replace', found: 'The feeder is bad end to end.', items: [{ id: 'feeder', qty: 60 }], extraHours: 2 },
  { id: 'S3a', label: 'S3a · Main breaker', found: 'The main breaker has failed.', items: [], extraHours: 2.5, extraMaterial: 180 },
  { id: 'S3b', label: 'S3b · Panel replace', found: 'The panel itself is failing.', items: [{ id: 'panel', qty: 1 }] },
  { id: 'S4', label: 'S4 · Open neutral add-on', found: 'A loose or open neutral.', items: [], extraHours: 2, extraMaterial: 40 },
  { id: 'S5', label: 'S5 · Meter base', found: 'The meter base is burned or loose.', items: [{ id: 'meter', qty: 1 }] },
  { id: 'S6', label: 'S6 · Clean up / refer to co-op', found: 'The problem is on the utility side.', items: [], extraHours: 0.5 },
];

export const ESTIMATE = {
  laborBuffer: 1.25,
  materialMarkup: 0.30,
  /** Effective $/hr below this turns the internal badge red. */
  minEffectiveRate: 60,
  quoteHoldDays: 14,
} as const;
