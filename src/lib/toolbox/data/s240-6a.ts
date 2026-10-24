import { live, same } from '../types';
import { rawFile, rawText } from './raw';
// Parsed from Sparky's file 18 (comma lists in prose). No values typed by hand.
const text = rawText('18').split('\n');
const list = (line: string) => line.replace(/^[^0-9]*/, '').replace(/\.\s*$/, '').split(',').map((x) => Number(x.trim()));
const main = list(text.find((l) => /^\d/.test(l.trim()))!);
const fuseOnly = list(text.find((l) => l.startsWith('Additional standard fuse ratings'))!);
export interface StdRow { amps: number; fuseOnly: boolean }
export const S240_6A = live<StdRow>(same('240.6(A)'), [...main.map((amps) => ({ amps, fuseOnly: false })), ...fuseOnly.map((amps) => ({ amps, fuseOnly: true }))], rawFile('18'),
  ['Standard ratings for fuses and inverse-time breakers. Fuse-only ratings: ' + fuseOnly.join(', ') + '.', 'Round UP only where code permits (240.4(B), 430.52 exceptions); otherwise do not exceed.']);
export const STD_MAIN = main; export const STD_FUSE_ONLY = fuseOnly;
