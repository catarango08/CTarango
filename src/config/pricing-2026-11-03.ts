/**
 * RESIDENTIAL SERVICE PRICING — Corey, Nov 3, 2026. This file is the authority.
 *
 * The Notion Rate Book is stale (it still says $160). The app does NOT let
 * Rate Book rows override these numbers. Do not edit Rate Book rows from the app.
 *
 * - Service call $250: includes the Zone 1 trip and up to 2 hours on site.
 *   Zone 2 +$45, Zone 3 +$85.
 * - After 2 hours: $150/hr, billed $75 per half-hour, ONLY with the customer's OK.
 * - Parts separate.
 * - The $250 is credited once toward an approved bigger repair.
 * - After-hours $375, emergency $450, holiday $500. Each includes 2 hours, then
 *   $225/hr ($300/hr holiday).
 * - Project / flat-rate labor $90/hr.
 *
 * UNRESOLVED (do not guess, see docs/PAYMENTS.md):
 * - Whether the Zone 2/3 supplements apply to after-hours, emergency and holiday calls.
 *   The app adds nothing automatically and flags those calls for a manual decision.
 * - The billing increment for special-call overtime. Only the day rate's half-hour
 *   increment was stated, so special-call hours bill as entered and are flagged.
 * - Commercial rates. Not covered by Nov 3; commercial keeps its existing rates.
 */
export const NOV3_PRICING = {
  effective: '2026-11-03',
  serviceCall: { day: 250, afterHours: 375, emergency: 450, holiday: 500 },
  includedHours: 2,
  overtimeHourly: { day: 150, afterHours: 225, emergency: 225, holiday: 300 },
  /** Only stated for the day rate: $150/hr billed $75 per half-hour. */
  dayIncrementHours: 0.5,
  zoneSupplement: { 1: 0, 2: 45, 3: 85 },
  projectHourly: 90,
  /** Service-call credit toward an approved bigger repair. Once. */
  serviceCallCredit: 250,
} as const;
