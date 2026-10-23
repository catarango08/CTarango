/**
 * Goals dashboard targets. Every number the /dashboard page grades against
 * lives here, so moving a target is one edit. The Closer's targets are the
 * primary set (Oct 2026). Kept from Chief of Staff, where they don't overlap:
 * the generator push, effective $/hr after travel, and leads by source.
 */

export const GOALS = {
  /** Day one of tracking. Nothing before this counts toward a KPI. */
  trackingStart: '2026-10-20',

  northStar: {
    label: 'Three months in a row at $4,500+ profit',
    detail: 'The go-full-time trigger.',
    monthlyProfit: 4500,
    consecutiveMonths: 3,
    targetDate: '2027-04-30',
    /** The band the gauge shades: $4K to $5K a month. */
    bandLow: 4000,
    bandHigh: 5000,
  },

  weekly: {
    outreachTouches: 50,
    calls: 25,
    estimatesSent: 12,
    closeRate: 0.33,
    jobsCompleted: 4,
    revenue: 1250,
    profit: 1125,
    followUpWithin48h: 1,
    reviewsRequested: 1,
  },

  monthly: {
    effectiveHourly: 85,
    licenseHours: 12_000,
  },

  /** The Closer's OKRs: the primary set. */
  okrs: [
    {
      id: 'O1',
      objective: 'Hit the profit target',
      primary: true,
      keyResults: [
        { id: 'o1-profit', label: 'First month at $4,500+ profit', target: 4500, unit: 'money', due: '2027-01-31' },
        { id: 'o1-jobs', label: '16 jobs a month', target: 16, unit: 'count', due: '2027-01-31' },
        { id: 'o1-estimates', label: '48 estimates a month at a 33% close rate', target: 48, unit: 'count', due: '2027-01-31' },
      ],
    },
    {
      id: 'O2',
      objective: 'A lead machine that does not depend on ads',
      primary: true,
      keyResults: [
        { id: 'o2-partners', label: '5 referral partners each sending 1+ lead', target: 5, unit: 'count', due: '2026-12-31' },
        { id: 'o2-reviews', label: '10 Google reviews', target: 10, unit: 'count', due: '2026-12-31' },
        { id: 'o2-gen-quotes', label: '5 generator quotes', target: 5, unit: 'count', due: '2026-12-15' },
      ],
    },
    {
      id: 'O3',
      objective: 'Go full time',
      primary: true,
      keyResults: [
        { id: 'o3-fulltime', label: '3 straight months at $4,500+ profit', target: 3, unit: 'count', due: '2027-04-30' },
      ],
    },
    /* Kept from Chief of Staff (no overlap with The Closer). Leads by source is its own card. */
    {
      id: 'Generator push',
      objective: 'Chief of Staff: generator push',
      primary: false,
      keyResults: [
        { id: 'gp-hookups', label: '5 generator hookups booked', target: 5, unit: 'count', due: '2026-11-22' },
        { id: 'gp-dealer', label: 'Standby dealer partner signed (Lockwood first)', target: 1, unit: 'count', due: '2026-12-31' },
      ],
    },
    {
      id: 'Efficiency',
      objective: 'Chief of Staff: effective $/hr',
      primary: false,
      keyResults: [
        { id: 'ef-hourly', label: '$85+/hr effective, after travel', target: 85, unit: 'money', due: '2027-01-31' },
      ],
    },
  ],

  /** How the dashboard spots generator work, since Jobs has no generator flag. */
  generatorPattern: /generator|genset|interlock|transfer switch|standby/i,
  /** The standby dealer the generator-push key result is waiting on. */
  dealerPattern: /lockwood/i,
} as const;

export type KrUnit = 'money' | 'count' | 'hours' | 'percent';
