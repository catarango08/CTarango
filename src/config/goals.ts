/**
 * Goals dashboard targets. Every number the /dashboard page grades against
 * lives here, so moving a target is one edit. Inputs from Chief of Staff and
 * The Closer, merged Oct 2026.
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
    averageTicket: 350,
    effectiveHourly: 85,
    leadToBooked: 0.35,
    quoteTurnaroundHours: 24,
    licenseHours: 12_000,
  },

  okrs: [
    {
      id: 'O1',
      objective: 'Hit the profit target',
      keyResults: [
        { id: 'o1-profit', label: 'First month at $4,500+ profit', target: 4500, unit: 'money', due: '2027-01-31' },
        { id: 'o1-jobs', label: '16 jobs a month', target: 16, unit: 'count', due: '2027-01-31' },
        { id: 'o1-estimates', label: '48 estimates a month at a 33% close rate', target: 48, unit: 'count', due: '2027-01-31' },
        { id: 'o1-dec-revenue', label: '$4,000 revenue in Dec 2026', target: 4000, unit: 'money', due: '2026-12-31' },
      ],
    },
    {
      id: 'O2',
      objective: 'A lead machine that does not depend on ads',
      keyResults: [
        { id: 'o2-partners', label: '5 referral partners each sending 1+ lead', target: 5, unit: 'count', due: '2026-12-31' },
        { id: 'o2-reviews', label: '10 Google reviews', target: 10, unit: 'count', due: '2026-12-31' },
        { id: 'o2-leads', label: '20+ qualified leads a month', target: 20, unit: 'count', due: '2026-12-31' },
      ],
    },
    {
      id: 'O3',
      objective: 'Generator push',
      keyResults: [
        { id: 'o3-hookups', label: '5+ generator hookups booked', target: 5, unit: 'count', due: '2026-11-22' },
        { id: 'o3-quotes', label: '5 generator quotes', target: 5, unit: 'count', due: '2026-12-15' },
        { id: 'o3-dealer', label: 'Standby dealer partner signed (Lockwood first)', target: 1, unit: 'count', due: '2026-12-31' },
      ],
    },
    {
      id: 'O4',
      objective: 'Efficiency',
      keyResults: [
        { id: 'o4-hourly', label: '$85+/hr effective', target: 85, unit: 'money', due: '2027-01-31' },
        { id: 'o4-turnaround', label: 'Quote turnaround under 24h', target: 24, unit: 'hours', due: '2027-01-31' },
      ],
    },
  ],

  /** How the dashboard spots generator work, since Jobs has no generator flag. */
  generatorPattern: /generator|genset|interlock|transfer switch|standby/i,
  /** The standby dealer the O3 key result is waiting on. */
  dealerPattern: /lockwood/i,
} as const;

export type KrUnit = 'money' | 'count' | 'hours' | 'percent';
