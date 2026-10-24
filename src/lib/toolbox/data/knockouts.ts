/**
 * Knockout / hole saw sizes by trade size. Not an NEC table.
 * Source (supplied by Corey/Sparky, verbatim): American Fittings NEMA
 * recommended hole and drill sizes chart,
 * https://amftgs.com/nema-recommended-hole-and-drill-sizes-for-trade-dimension/
 */
export const KNOCKOUT_SOURCE = { name: 'American Fittings — NEMA recommended hole and drill sizes', url: 'https://amftgs.com/nema-recommended-hole-and-drill-sizes-for-trade-dimension/' };

export interface KnockoutRow { trade: string; holeSaw: string; punchIn: string; punchMm: string }

export const KNOCKOUTS: KnockoutRow[] = [
  { trade: '1/2', holeSaw: '7/8"', punchIn: '.885"', punchMm: '22.5mm' },
  { trade: '3/4', holeSaw: '1-1/8"', punchIn: '1.115"', punchMm: '28.3mm' },
  { trade: '1', holeSaw: '1-3/8"', punchIn: '1.362"', punchMm: '34.6mm' },
  { trade: '1-1/4', holeSaw: '1-3/4"', punchIn: '1.701"', punchMm: '43.2mm' },
  { trade: '1-1/2', holeSaw: '2"', punchIn: '1.951"', punchMm: '49.6mm' },
  { trade: '2', holeSaw: '2-1/2"', punchIn: '2.416"', punchMm: '61.5mm' },
  { trade: '2-1/2', holeSaw: '3"', punchIn: '2.914"', punchMm: '74mm' },
  { trade: '3', holeSaw: '3-5/8"', punchIn: '3.539"', punchMm: '89.9mm' },
  { trade: '3-1/2', holeSaw: '4-1/8"', punchIn: '4.044"', punchMm: '102.7mm' },
  { trade: '4', holeSaw: '4-1/2"', punchIn: '4.544"', punchMm: '115.4mm' },
];
