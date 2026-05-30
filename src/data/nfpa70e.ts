export interface ChecklistItem {
  id: string;
  text: string;
  ref?: string; // NFPA 70E section reference
  critical?: boolean; // must be checked before work begins
}

export interface ChecklistSection {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
}

export const NFPA70E_CHECKLIST: ChecklistSection[] = [
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Complete before any electrical work begins.',
    items: [
      { id: 'ra-1', text: 'Shock risk assessment completed — voltage level and approach boundaries identified', ref: '130.5(B)', critical: true },
      { id: 'ra-2', text: 'Arc flash risk assessment completed — incident energy or PPE category determined', ref: '130.5(C)', critical: true },
      { id: 'ra-3', text: 'Justified reason documented for any energized work (de-energizing is preferred)', ref: '130.2(A)', critical: true },
      { id: 'ra-4', text: 'Energized electrical work permit obtained and signed (if working on energized parts > 50V)', ref: '130.2(B)' },
      { id: 'ra-5', text: 'Job briefing conducted with all workers on site — hazards and procedures reviewed', ref: '130.2(C)' },
      { id: 'ra-6', text: 'Emergency response plan confirmed — nearest hospital route and emergency contacts known', ref: '130.2(C)(2)' },
    ],
  },
  {
    id: 'loto',
    title: 'Lockout / Tagout (LOTO)',
    description: 'Required whenever working on de-energized equipment.',
    items: [
      { id: 'loto-1', text: 'All energy sources identified (electrical, mechanical, pneumatic, thermal, chemical)', ref: '120.3', critical: true },
      { id: 'loto-2', text: 'Equipment properly de-energized and disconnected from all energy sources', ref: '120.3(B)' },
      { id: 'loto-3', text: 'Lockout/tagout devices applied to all disconnect points', ref: '120.3(D)' },
      { id: 'loto-4', text: 'Stored energy released or restrained (capacitors discharged, springs blocked)', ref: '120.3(E)' },
      { id: 'loto-5', text: 'Absence of voltage verified using properly rated test instrument on known live source first', ref: '120.5', critical: true },
      { id: 'loto-6', text: 'Test instrument verified functional again after testing — "test before touch"', ref: '120.5' },
      { id: 'loto-7', text: 'Temporary protective grounding applied where required', ref: '120.4' },
    ],
  },
  {
    id: 'ppe',
    title: 'Personal Protective Equipment (PPE)',
    description: 'Worn before entering any arc flash or shock hazard boundary.',
    items: [
      { id: 'ppe-1', text: 'Arc-rated clothing worn — CAT level appropriate for calculated incident energy', ref: '130.7(C)', critical: true },
      { id: 'ppe-2', text: 'Arc-rated face shield or arc flash suit hood in place (if required by CAT level)', ref: '130.7(C)' },
      { id: 'ppe-3', text: 'Safety glasses worn under face shield', ref: '130.7(C)' },
      { id: 'ppe-4', text: 'Rubber insulating gloves inspected and rated for working voltage — no damage or defects', ref: '130.7(C)', critical: true },
      { id: 'ppe-5', text: 'Leather protectors worn over rubber insulating gloves', ref: '130.7(C)' },
      { id: 'ppe-6', text: 'Arc-rated hard hat worn', ref: '130.7(C)' },
      { id: 'ppe-7', text: 'Hearing protection in use (arc flash produces intense noise)', ref: '130.7(C)' },
      { id: 'ppe-8', text: 'Non-melting, non-flammable clothing underneath arc-rated layers (no synthetics)', ref: '130.7(C)' },
      { id: 'ppe-9', text: 'Dielectric overshoes or arc-rated footwear worn where required', ref: '130.7(C)' },
    ],
  },
  {
    id: 'work-area',
    title: 'Work Area & Boundaries',
    description: 'Establish approach boundaries and secure the work area.',
    items: [
      { id: 'wa-1', text: 'Arc flash boundary marked and barricaded — unqualified persons excluded', ref: '130.5(C)' },
      { id: 'wa-2', text: 'Limited approach boundary identified — unqualified persons not crossing without escort', ref: '130.4(D)' },
      { id: 'wa-3', text: 'Restricted approach boundary identified — only qualified persons with full PPE inside', ref: '130.4(D)', critical: true },
      { id: 'wa-4', text: 'Warning signs posted at electrical hazard work areas', ref: '130.5(H)' },
      { id: 'wa-5', text: 'Insulating blankets or barriers in place on adjacent energized parts', ref: '130.7(D)' },
      { id: 'wa-6', text: 'Work area clear of flammable or combustible materials', ref: '130.2(C)' },
      { id: 'wa-7', text: 'Adequate lighting available for the work being performed', ref: '130.2(C)' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Test Equipment',
    description: 'Verify all tools are rated and inspected before use.',
    items: [
      { id: 'tools-1', text: 'Insulated tools used — rated for voltage, inspected for damage', ref: '130.7(D)', critical: true },
      { id: 'tools-2', text: 'Test/measurement equipment rated for circuit voltage (CAT rating checked)', ref: '110.4' },
      { id: 'tools-3', text: 'Voltage tester proven on a known live circuit before and after use', ref: '120.5' },
      { id: 'tools-4', text: 'GFCI protection in use for all cord-connected tools', ref: 'NEC 590.6' },
      { id: 'tools-5', text: 'Extension cords are rated for amperage and in good condition', ref: 'NEC 400' },
      { id: 'tools-6', text: 'Portable ladders are fiberglass (non-conductive) where electrical hazards exist', ref: '130.7(D)' },
      { id: 'tools-7', text: 'First aid kit on site and fire extinguisher accessible', ref: '130.2(C)' },
    ],
  },
  {
    id: 'post-job',
    title: 'Post-Job',
    description: 'Complete before leaving the job site.',
    items: [
      { id: 'post-1', text: 'All LOTO devices removed by the person who installed them', ref: '120.3(F)' },
      { id: 'post-2', text: 'All workers and tools clear of the equipment before re-energizing', ref: '120.3(F)' },
      { id: 'post-3', text: 'Equipment tested and verified operational after restoration', ref: '130.2' },
      { id: 'post-4', text: 'All panels, covers, and enclosures restored and secured', ref: 'NEC 110.12' },
      { id: 'post-5', text: 'Work area cleaned up — no tools, materials, or debris left inside enclosures', ref: 'NEC 110.12' },
      { id: 'post-6', text: 'As-built notes or changes to scope documented', ref: '' },
      { id: 'post-7', text: 'Customer notified and any relevant safety information communicated', ref: '' },
    ],
  },
];
