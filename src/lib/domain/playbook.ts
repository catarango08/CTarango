import type { RecordValue } from '../schema';
import { num } from '../calc';
import { MONEY } from './rules';
import { depositRequired } from './gates';

/**
 * "Status = next action", transcribed from the New client process page.
 *
 * The Notion Jobs database has a `Play` formula that does this inside Notion.
 * We cannot read a formula's source through the API, so the same rules are
 * restated here from the page that defines them — and the app shows Notion's
 * own Play value alongside, so the two can be compared rather than silently
 * diverging.
 */

export interface Move {
  /** What the button says. */
  action: string;
  /** The instruction, in Corey's words. */
  instruction: string;
  /** The status this move advances to, when there is one obvious next step. */
  advanceTo?: string;
  /** True when the ticket is finished and there is nothing to advance. */
  terminal?: boolean;
}

const PLAYBOOK: Record<string, Move> = {
  'Lead': {
    action: 'Work the lead',
    instruction: 'Call them back. Name, town, what is dead, when they need you.',
    advanceTo: 'New call',
  },
  'New call': {
    action: 'Capture and qualify',
    instruction: 'Capture name, phone, town, source. Create the customer if new.',
    advanceTo: 'Qualify',
  },
  'Qualify': {
    action: 'Check the town',
    instruction: 'Check Service Territory. Red is a No-go. Amber calls the AHJ first.',
    advanceTo: 'Booked',
  },
  'Booked': {
    action: 'Set the window',
    instruction: 'On site date on the card. Text them the window.',
    advanceTo: 'On site',
  },
  'On site': {
    action: 'Diagnose and quote',
    instruction: 'Diagnose. Quote from the Rate Book — flats on residential, never the hour on the porch.',
    advanceTo: 'Quoted',
  },
  'Quoted': {
    action: 'Follow up',
    instruction: 'Waiting on yes. Follow up next morning.',
    advanceTo: 'Approved',
  },
  'Approved': {
    action: 'Take the deposit',
    instruction: 'Deposit if over $1,500. Permit Needed if required.',
    advanceTo: 'Scheduled',
  },
  'Scheduled': {
    action: 'Start the work',
    instruction: 'On the calendar. Confirm the window the morning of.',
    advanceTo: 'In Progress',
  },
  'In Progress': {
    action: 'Invoice it',
    instruction: 'Do the work. Photos cover off / cover on before you leave.',
    advanceTo: 'Invoiced',
  },
  'Invoiced': {
    action: 'Run closeout',
    instruction: 'Collect. Check Paid. Then closeout: hours, photos, signature, review, two magnets.',
    advanceTo: 'Closed',
  },
  'Closed': {
    action: 'Done',
    instruction: 'Hours to the Hour Ledger. Customer stage = Active.',
    terminal: true,
  },
  'Declined': { action: 'Stop', instruction: 'Stop. Log why in the notes.', terminal: true },
  'No-go': { action: 'Stop', instruction: 'Stop. Outside the footprint until licensed.', terminal: true },
  'Lost': { action: 'Stop', instruction: 'Stop.', terminal: true },
};

export function nextMove(job: RecordValue): Move {
  const status = String(job.status ?? 'New call');
  const move = PLAYBOOK[status] ?? { action: 'Advance', instruction: 'Move the card one status.' };

  // Approved is where the deposit rule bites, so the instruction gets specific.
  if (status === 'Approved') {
    const deposit = depositRequired(job.amount);
    if (deposit.required && !job.depositIn) {
      return {
        ...move,
        action: 'Collect the deposit',
        instruction: `Job is $${num(job.amount).toLocaleString()}. Collect $${deposit.amount.toLocaleString()} (50%) before the work starts.`,
      };
    }
  }

  // Invoiced with money outstanding is a collection call, not a closeout — and
  // there is nothing to advance to until it is settled one way or the other.
  if (status === 'Invoiced' && !job.paid && !/net\s*15/i.test(String(job.notes ?? ''))) {
    return {
      action: 'Collect',
      instruction: 'Collect first. Residential pays at completion; new commercial is due on completion, then Net 15.',
    };
  }

  return move;
}

/** The diagnostic that applies to a job, by type. */
export function diagnosticFor(jobType: unknown): { fee: number; note: string } {
  const type = String(jobType ?? '');
  if (type === 'Commercial' || type === 'Standby / Critical') {
    return { fee: MONEY.commercialDiagnostic, note: `First hour, then $${MONEY.commercialHourly}/hr.` };
  }
  return { fee: MONEY.residentialDiagnostic, note: 'First hour, credited if we repair the same visit.' };
}

export const STATUS_PLAYBOOK = PLAYBOOK;
