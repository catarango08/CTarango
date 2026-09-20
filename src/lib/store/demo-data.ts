import type { RecordValue } from '../schema';

/**
 * Deterministic-but-relative demo dataset for a small electrical contractor.
 *
 * Dates are generated around "today" so the dispatch board, aging report and
 * renewal reminders always have something meaningful in them.
 */

const DAY = 86_400_000;

function at(daysFromNow: number, hour = 8, minute = 0): string {
  const d = new Date(Date.now() + daysFromNow * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function day(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10);
}

function photo(label: string, tone: string): { name: string; url: string }[] {
  return [{ name: `${label}.jpg`, url: `/api/placeholder/photo?label=${encodeURIComponent(label)}&tone=${tone}` }];
}

let seq = 0;
function id(table: string): string {
  return `demo-${table}-${++seq}`;
}

export function buildDemoData(): Record<string, RecordValue[]> {
  /* --- team ------------------------------------------------------- */
  const techIds = {
    marcus: id('technicians'),
    dana: id('technicians'),
    rey: id('technicians'),
    priya: id('technicians'),
    tomas: id('technicians'),
    jo: id('technicians'),
  };

  const technicians: RecordValue[] = [
    {
      id: techIds.marcus, name: 'Marcus Cole', role: 'Master Electrician', status: 'Active',
      phone: '(505) 555-0142', email: 'marcus@voltflow.example', licenseNumber: 'EE-118442',
      licenseExpires: day(210), certifications: ['OSHA 30', 'NFPA 70E', 'Thermography Level 1'], certExpires: day(96),
      skills: ['Service Work', 'Troubleshooting', 'Panel Upgrades', 'Generators'],
      hourlyCost: 58, billableRate: 145, hireDate: '2016-04-11', color: 'Amber',
      emergencyContact: 'Renee Cole (505) 555-0188', notes: 'Owner. Takes the escalations and the 2 a.m. calls.',
    },
    {
      id: techIds.dana, name: 'Dana Whitfield', role: 'Journeyman', status: 'Active',
      phone: '(505) 555-0119', email: 'dana@voltflow.example', licenseNumber: 'EJ-330218',
      licenseExpires: day(41), certifications: ['OSHA 10', 'NFPA 70E', 'EVITP'], certExpires: day(41),
      skills: ['Service Work', 'EV Charging', 'Troubleshooting', 'Low Voltage'],
      hourlyCost: 44, billableRate: 128, hireDate: '2019-08-05', color: 'Blue',
      notes: 'Highest first-time-fix rate on the team.',
    },
    {
      id: techIds.rey, name: 'Rey Ortega', role: 'Journeyman', status: 'Active',
      phone: '(505) 555-0177', email: 'rey@voltflow.example', licenseNumber: 'EJ-291006',
      licenseExpires: day(320), certifications: ['OSHA 10', 'Aerial Lift', 'Confined Space'], certExpires: day(150),
      skills: ['New Construction', 'Bending / Pipe', 'Motor Control', 'Controls / PLC'],
      hourlyCost: 46, billableRate: 132, hireDate: '2018-02-19', color: 'Green',
    },
    {
      id: techIds.priya, name: 'Priya Raman', role: 'Apprentice', status: 'Active',
      phone: '(505) 555-0163', email: 'priya@voltflow.example',
      certifications: ['OSHA 10', 'CPR / First Aid'], certExpires: day(230),
      skills: ['Service Work', 'Lighting', 'Rough-In'],
      hourlyCost: 28, billableRate: 78, hireDate: '2024-06-03', color: 'Teal',
      notes: 'Year 2 of a 4-year apprenticeship. 1,180 OJT hours logged.',
    },
    {
      id: techIds.tomas, name: 'Tomás Vega', role: 'Foreman', status: 'Active',
      phone: '(505) 555-0131', email: 'tomas@voltflow.example', licenseNumber: 'EJ-274513',
      licenseExpires: day(-12), certifications: ['OSHA 30', 'NFPA 70E', 'NABCEP Solar'], certExpires: day(-12),
      skills: ['New Construction', 'Solar / Storage', 'Panel Upgrades'],
      hourlyCost: 52, billableRate: 138, hireDate: '2015-11-02', color: 'Purple',
      notes: 'License lapsed — renewal packet sent, do not schedule permitted work until cleared.',
    },
    {
      id: techIds.jo, name: 'Jo Bennett', role: 'Dispatcher', status: 'Active',
      phone: '(505) 555-0100', email: 'jo@voltflow.example', hourlyCost: 32, color: 'Slate',
      skills: [], certifications: ['CPR / First Aid'],
    },
  ];

  /* --- customers, contacts, locations ------------------------------ */
  const cust = {
    alvarez: id('customers'), harborView: id('customers'), tresPinos: id('customers'),
    meridian: id('customers'), okonkwo: id('customers'), bristol: id('customers'),
    sandia: id('customers'), delgado: id('customers'), fairmount: id('customers'), quinn: id('customers'),
  };

  const customers: RecordValue[] = [
    { id: cust.alvarez, name: 'Alvarez Residence', segment: 'Residential', stage: 'Repeat Customer', phone: '(505) 555-0201', email: 'g.alvarez@example.com', billingAddress: '1820 Camino Real, Santa Fe NM 87505', source: 'Referral', referredBy: 'Bristol Property Group', rating: 'A — Priority', paymentTerms: 'Due on Receipt', tags: ['Historic Home', 'Knob & Tube', 'Net Promoter'], lifetimeValue: 18450, openBalance: 0, firstServiceDate: '2021-03-18', lastServiceDate: day(-6), preferredTech: [{ id: techIds.marcus }], notes: '1924 adobe. Partial knob & tube remains in the north wing — quoted, not yet approved.' },
    { id: cust.harborView, name: 'Harbor View Apartments', segment: 'Multi-Family', stage: 'Service Agreement', phone: '(505) 555-0233', email: 'facilities@harborview.example', billingAddress: 'PO Box 2288, Santa Fe NM 87504', source: 'Property Manager', rating: 'A — Priority', paymentTerms: 'Net 30', tags: ['VIP', 'Federal Pacific Panel'], lifetimeValue: 92310, openBalance: 4820, firstServiceDate: '2019-06-02', lastServiceDate: day(-2), notes: '84 units across 6 buildings. FPE panels in buildings C and D — replacement program budgeted for next fiscal year.' },
    { id: cust.tresPinos, name: 'Tres Pinos Brewing', segment: 'Commercial', stage: 'Active Customer', phone: '(505) 555-0244', email: 'ops@trespinos.example', billingAddress: '410 Industrial Way, Santa Fe NM 87507', source: 'Google', rating: 'B — Good', paymentTerms: 'Net 15', tags: [], lifetimeValue: 41200, openBalance: 12650, firstServiceDate: '2022-09-14', lastServiceDate: day(-9), notes: '277/480V 3Ø service. Glycol chiller circuit has nuisance-tripped twice.' },
    { id: cust.meridian, name: 'Meridian Construction', segment: 'Commercial', stage: 'Active Customer', phone: '(505) 555-0255', email: 'ap@meridianbuild.example', billingAddress: '77 Rodeo Rd, Santa Fe NM 87505', source: 'GC Partner', rating: 'B — Good', paymentTerms: 'Progress Billing', tags: ['Slow Pay'], lifetimeValue: 168900, openBalance: 34500, firstServiceDate: '2020-01-22', lastServiceDate: day(-1), notes: 'GC on the Vista Ridge build. Pays at 45–60 days despite Net 30 terms. Preliminary notices filed on every project.' },
    { id: cust.okonkwo, name: 'Okonkwo Family', segment: 'Residential', stage: 'Active Customer', phone: '(505) 555-0266', email: 'n.okonkwo@example.com', billingAddress: '55 Tesuque Ct, Santa Fe NM 87506', source: 'Referral', rating: 'A — Priority', paymentTerms: 'Card on File', tags: ['Net Promoter'], lifetimeValue: 11800, openBalance: 0, firstServiceDate: '2023-05-30', lastServiceDate: day(-14) },
    { id: cust.bristol, name: 'Bristol Property Group', segment: 'Commercial', stage: 'Service Agreement', phone: '(505) 555-0277', email: 'maint@bristolpg.example', billingAddress: '900 St Michaels Dr, Santa Fe NM 87505', source: 'Repeat Customer', rating: 'A — Priority', paymentTerms: 'Net 30', tags: ['VIP'], lifetimeValue: 138400, openBalance: 2150, firstServiceDate: '2018-11-08', lastServiceDate: day(-4), notes: 'Manages 14 retail and office properties. Quarterly thermal scans under contract.' },
    { id: cust.sandia, name: 'Sandia Machine Works', segment: 'Industrial', stage: 'Active Customer', phone: '(505) 555-0288', email: 'plant@sandiamachine.example', billingAddress: '2100 Siler Rd, Santa Fe NM 87507', source: 'Referral', rating: 'B — Good', paymentTerms: 'Net 30', tags: ['Warranty Watch'], lifetimeValue: 76500, openBalance: 0, firstServiceDate: '2021-10-11', lastServiceDate: day(-21), notes: 'Three-phase motor loads, VFDs on the CNC bank. Arc flash study on file (2024).' },
    { id: cust.delgado, name: 'Delgado Residence', segment: 'Residential', stage: 'Estimate Sent', phone: '(505) 555-0299', email: 'm.delgado@example.com', billingAddress: '312 Acequia Madre, Santa Fe NM 87501', source: 'Yard Sign', rating: 'B — Good', paymentTerms: 'Due on Receipt', tags: ['Zinsco Panel'], lifetimeValue: 0, openBalance: 0 },
    { id: cust.fairmount, name: 'Fairmount Dental', segment: 'Commercial', stage: 'Active Customer', phone: '(505) 555-0310', email: 'office@fairmountdental.example', billingAddress: '1500 Pacheco St, Santa Fe NM 87505', source: 'Google', rating: 'B — Good', paymentTerms: 'Net 15', tags: [], lifetimeValue: 22750, openBalance: 1890, firstServiceDate: '2022-02-17', lastServiceDate: day(-30) },
    { id: cust.quinn, name: 'Quinn Household', segment: 'Residential', stage: 'Lead', phone: '(505) 555-0321', email: 'd.quinn@example.com', source: 'Social', rating: 'C — Watch', paymentTerms: 'Due on Receipt', tags: [], lifetimeValue: 0, openBalance: 0, notes: 'Called about EV charger install. Wants a quote before committing to the car.' },
  ];

  const prop = {
    alvarez: id('properties'), harborC: id('properties'), harborD: id('properties'),
    tresPinos: id('properties'), vistaRidge: id('properties'), okonkwo: id('properties'),
    bristolPlaza: id('properties'), sandia: id('properties'), delgado: id('properties'),
    fairmount: id('properties'), quinn: id('properties'),
  };

  const properties: RecordValue[] = [
    { id: prop.alvarez, name: 'Alvarez — 1820 Camino Real', customer: [{ id: cust.alvarez }], address: '1820 Camino Real', city: 'Santa Fe', state: 'NM', postalCode: '87505', propertyType: 'Residential', yearBuilt: 1924, serviceSize: '100A', serviceVoltage: '120/240V 1Ø', panelMake: 'Zinsco GTE 20-space', meterNumber: 'M-449122', utility: 'PNM', ahj: 'City of Santa Fe', accessNotes: 'Side gate code 4412. Two dogs, friendly. Park on the street — driveway is soft.', hazards: ['Knob & Tube', 'Asbestos', 'Crawl Space'], arcFlashCategory: '1', gpsLat: 35.6755, gpsLng: -105.9385, notes: 'Panel in the back hallway, tight working clearance. Confirm 110.26 space before quoting a swap.' },
    { id: prop.harborC, name: 'Harbor View — Building C', customer: [{ id: cust.harborView }], address: '2200 Zafarano Dr, Bldg C', city: 'Santa Fe', state: 'NM', postalCode: '87507', propertyType: 'Multi-Family', yearBuilt: 1978, serviceSize: '400A', serviceVoltage: '120/208V 3Ø', panelMake: 'Federal Pacific Stab-Lok (meter stack)', utility: 'PNM', ahj: 'Santa Fe County', accessNotes: 'Maintenance office has the electrical room key. Onsite manager: Dee, (505) 555-0234.', hazards: ['Live Bus Duct', 'Arc Flash > 8 cal'], arcFlashCategory: '2', notes: 'FPE meter stack. Do not work this panel energized.' },
    { id: prop.harborD, name: 'Harbor View — Building D', customer: [{ id: cust.harborView }], address: '2200 Zafarano Dr, Bldg D', city: 'Santa Fe', state: 'NM', postalCode: '87507', propertyType: 'Multi-Family', yearBuilt: 1978, serviceSize: '400A', serviceVoltage: '120/208V 3Ø', panelMake: 'Federal Pacific Stab-Lok', utility: 'PNM', ahj: 'Santa Fe County', hazards: ['Live Bus Duct'], arcFlashCategory: '2' },
    { id: prop.tresPinos, name: 'Tres Pinos Brewing — Taproom & Cellar', customer: [{ id: cust.tresPinos }], address: '410 Industrial Way', city: 'Santa Fe', state: 'NM', postalCode: '87507', propertyType: 'Commercial', yearBuilt: 2014, serviceSize: '600A', serviceVoltage: '277/480V 3Ø', panelMake: 'Square D QED switchboard', utility: 'PNM', ahj: 'City of Santa Fe', accessNotes: 'Before 10 AM only — taproom opens at noon. Loading dock entry.', hazards: ['Arc Flash > 8 cal', 'Confined Space'], arcFlashCategory: '3' },
    { id: prop.vistaRidge, name: 'Vista Ridge — Lots 12–18', customer: [{ id: cust.meridian }], address: 'Vista Ridge Dr', city: 'Santa Fe', state: 'NM', postalCode: '87508', propertyType: 'Residential', yearBuilt: 2026, serviceSize: '200A', serviceVoltage: '120/240V 1Ø', utility: 'PNM', ahj: 'Santa Fe County', accessNotes: 'Active construction site. Hard hat and vest required past the trailer.', hazards: ['Trenching', 'Roof Access'] },
    { id: prop.okonkwo, name: 'Okonkwo — 55 Tesuque Ct', customer: [{ id: cust.okonkwo }], address: '55 Tesuque Ct', city: 'Santa Fe', state: 'NM', postalCode: '87506', propertyType: 'Residential', yearBuilt: 2004, serviceSize: '200A', serviceVoltage: '120/240V 1Ø', panelMake: 'Siemens 40-space', utility: 'PNM', ahj: 'Santa Fe County', accessNotes: 'Lockbox on the hose bib, code 2205.' },
    { id: prop.bristolPlaza, name: 'Bristol Plaza — 900 St Michaels', customer: [{ id: cust.bristol }], address: '900 St Michaels Dr', city: 'Santa Fe', state: 'NM', postalCode: '87505', propertyType: 'Commercial', yearBuilt: 1996, serviceSize: '800A', serviceVoltage: '277/480V 3Ø', utility: 'PNM', ahj: 'City of Santa Fe', hazards: ['Arc Flash > 8 cal', 'Roof Access'], arcFlashCategory: '2' },
    { id: prop.sandia, name: 'Sandia Machine Works — Plant 1', customer: [{ id: cust.sandia }], address: '2100 Siler Rd', city: 'Santa Fe', state: 'NM', postalCode: '87507', propertyType: 'Industrial', yearBuilt: 1988, serviceSize: '1200A', serviceVoltage: '277/480V 3Ø', utility: 'PNM', ahj: 'City of Santa Fe', hazards: ['Arc Flash > 8 cal', 'Live Bus Duct', 'Confined Space'], arcFlashCategory: '3', notes: 'Arc flash study 2024 on file in Documents. Labels current.' },
    { id: prop.delgado, name: 'Delgado — 312 Acequia Madre', customer: [{ id: cust.delgado }], address: '312 Acequia Madre', city: 'Santa Fe', state: 'NM', postalCode: '87501', propertyType: 'Residential', yearBuilt: 1961, serviceSize: '100A', serviceVoltage: '120/240V 1Ø', panelMake: 'Zinsco', utility: 'PNM', ahj: 'City of Santa Fe', hazards: ['Aluminum Branch Wiring'] },
    { id: prop.fairmount, name: 'Fairmount Dental — Suite 200', customer: [{ id: cust.fairmount }], address: '1500 Pacheco St, Ste 200', city: 'Santa Fe', state: 'NM', postalCode: '87505', propertyType: 'Commercial', yearBuilt: 2008, serviceSize: '200A', serviceVoltage: '120/208V 3Ø', ahj: 'City of Santa Fe', accessNotes: 'Closed Fridays. Work must be outside patient hours.' },
    { id: prop.quinn, name: 'Quinn — 88 Vuelta Herrera', customer: [{ id: cust.quinn }], address: '88 Vuelta Herrera', city: 'Santa Fe', state: 'NM', postalCode: '87507', propertyType: 'Residential', yearBuilt: 1999, serviceSize: '150A', serviceVoltage: '120/240V 1Ø' },
  ];

  const contacts: RecordValue[] = [
    { id: id('contacts'), name: 'Gabriela Alvarez', customer: [{ id: cust.alvarez }], role: 'Homeowner', phone: '(505) 555-0201', mobile: '(505) 555-0202', email: 'g.alvarez@example.com', primary: true, preferredChannel: 'Text' },
    { id: id('contacts'), name: 'Dee Nakamura', customer: [{ id: cust.harborView }], role: 'Property Manager', phone: '(505) 555-0234', email: 'dee@harborview.example', primary: true, preferredChannel: 'Email', notes: 'Approves anything under $2,500 on the spot.' },
    { id: id('contacts'), name: 'Alan Fisk', customer: [{ id: cust.harborView }], role: 'Accounts Payable', email: 'ap@harborview.example', primary: false, preferredChannel: 'Email' },
    { id: id('contacts'), name: 'Sam Ruiz', customer: [{ id: cust.tresPinos }], role: 'Facility Manager', phone: '(505) 555-0245', email: 'sam@trespinos.example', primary: true, preferredChannel: 'Call' },
    { id: id('contacts'), name: 'Brett Hollins', customer: [{ id: cust.meridian }], role: 'GC Superintendent', phone: '(505) 555-0256', mobile: '(505) 555-0257', email: 'brett@meridianbuild.example', primary: true, preferredChannel: 'Text', notes: 'Wants 24h notice before any rough-in inspection.' },
    { id: id('contacts'), name: 'Nkechi Okonkwo', customer: [{ id: cust.okonkwo }], role: 'Homeowner', phone: '(505) 555-0266', email: 'n.okonkwo@example.com', primary: true, preferredChannel: 'Text' },
    { id: id('contacts'), name: 'Paula Bristol', customer: [{ id: cust.bristol }], role: 'Property Manager', phone: '(505) 555-0277', email: 'paula@bristolpg.example', primary: true, preferredChannel: 'Email' },
    { id: id('contacts'), name: 'Hank Serrano', customer: [{ id: cust.sandia }], role: 'Facility Manager', phone: '(505) 555-0289', email: 'hank@sandiamachine.example', primary: true, preferredChannel: 'Call', notes: 'Plant shuts down 2nd Sunday monthly — the only window for hot work.' },
    { id: id('contacts'), name: 'Marisol Delgado', customer: [{ id: cust.delgado }], role: 'Homeowner', phone: '(505) 555-0299', email: 'm.delgado@example.com', primary: true, preferredChannel: 'Call' },
    { id: id('contacts'), name: 'Dr. Ivy Fairmount', customer: [{ id: cust.fairmount }], role: 'Homeowner', phone: '(505) 555-0310', email: 'ivy@fairmountdental.example', primary: true, preferredChannel: 'Email' },
    { id: id('contacts'), name: 'Devon Quinn', customer: [{ id: cust.quinn }], role: 'Homeowner', phone: '(505) 555-0321', email: 'd.quinn@example.com', primary: true, preferredChannel: 'Text' },
  ];

  return assemble({ technicians, customers, properties, contacts, techIds, cust, prop });
}

interface Seeded {
  technicians: RecordValue[];
  customers: RecordValue[];
  properties: RecordValue[];
  contacts: RecordValue[];
  techIds: Record<string, string>;
  cust: Record<string, string>;
  prop: Record<string, string>;
}

function assemble(s: Seeded): Record<string, RecordValue[]> {
  const { techIds: t, cust: c, prop: p } = s;

  /* --- jobs -------------------------------------------------------- */
  const job = {
    alvarezPanel: id('jobs'), harborFpe: id('jobs'), tresChiller: id('jobs'), vistaRough: id('jobs'),
    okonkwoEv: id('jobs'), bristolThermal: id('jobs'), sandiaVfd: id('jobs'), fairmountLights: id('jobs'),
    alvarezOutlets: id('jobs'), harborHall: id('jobs'), delgadoQuote: id('jobs'), meridianTrim: id('jobs'),
    tresCallback: id('jobs'), quinnEvQuote: id('jobs'), bristolExit: id('jobs'), harborLaundry: id('jobs'),
    sandiaPm: id('jobs'), okonkwoSpa: id('jobs'),
  };

  const jobs: RecordValue[] = [
    { id: job.alvarezPanel, title: 'Service upgrade 100A → 200A, relocate panel', jobNumber: 'J-2026-0184', status: 'Scheduled', priority: 'Standard', jobType: 'Panel Upgrade', customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], assignedTo: [{ id: t.marcus }, { id: t.priya }], scheduledStart: at(1, 7, 30), scheduledEnd: at(1, 16), arrivalWindow: 'First Call', estimatedHours: 10, problem: 'Panel is a Zinsco. Breakers trip when the oven and the well pump run together.', diagnosis: 'Zinsco GTE panel with a known bus failure mode. Service is undersized — load calc shows 168A demand.', recommendations: 'North-wing knob & tube replacement, quoted separately.', permitRequired: true, materialsCost: 2140, laborCost: 1160, revenue: 6850, grossMargin: 0.518, tags: ['Photo Required', 'Two-Person Job', 'Utility Coordination'] },
    { id: job.harborFpe, title: 'Building C — replace 6 FPE unit panels', jobNumber: 'J-2026-0179', status: 'In Progress', priority: 'Urgent', jobType: 'Panel Upgrade', customer: [{ id: c.harborView }], property: [{ id: p.harborC }], assignedTo: [{ id: t.rey }, { id: t.dana }], scheduledStart: at(0, 7, 0), scheduledEnd: at(0, 17), arrivalWindow: 'First Call', onSiteAt: at(0, 7, 12), estimatedHours: 24, actualHours: 15.5, problem: 'Two unit panels showed heat discoloration during the quarterly scan.', diagnosis: 'FPE Stab-Lok breakers failing to trip on test. Replacing panels in units C-11 through C-16.', permitRequired: true, materialsCost: 4980, laborCost: 3420, revenue: 16400, grossMargin: 0.488, tags: ['Photo Required', 'Two-Person Job', 'Callback Risk'] },
    { id: job.tresChiller, title: 'Glycol chiller nuisance trip — troubleshoot', jobNumber: 'J-2026-0181', status: 'Needs Parts', priority: 'Same Day', jobType: 'Troubleshooting', customer: [{ id: c.tresPinos }], property: [{ id: p.tresPinos }], assignedTo: [{ id: t.marcus }], scheduledStart: at(-2, 8), scheduledEnd: at(-2, 12), onSiteAt: at(-2, 8, 5), estimatedHours: 4, actualHours: 3.75, problem: 'Chiller drops out twice a week, usually mid-afternoon.', diagnosis: 'Phase B running 14% high on current at the disconnect. Contactor pitted, breaker within spec. Replacement contactor and overload relay on order.', recommendations: 'Add a phase monitor relay to the chiller circuit — $480 installed.', permitRequired: false, circuitsAffected: 'MDP-2 / CB-14', materialsCost: 310, laborCost: 172, revenue: 640, grossMargin: 0.247 },
    { id: job.vistaRough, title: 'Vista Ridge lots 14–16 rough-in', jobNumber: 'J-2026-0166', status: 'In Progress', priority: 'Standard', jobType: 'New Construction Rough-In', customer: [{ id: c.meridian }], property: [{ id: p.vistaRidge }], assignedTo: [{ id: t.tomas }, { id: t.rey }], scheduledStart: at(-8, 7), scheduledEnd: at(4, 16), estimatedHours: 120, actualHours: 74, problem: 'Three-lot rough-in per plan set R-4 dated 2026-06-02.', permitRequired: true, materialsCost: 11200, laborCost: 7560, revenue: 38400, grossMargin: 0.511, tags: ['Two-Person Job'] },
    { id: job.okonkwoEv, title: 'Level 2 EV charger install — 60A circuit', jobNumber: 'J-2026-0170', status: 'Ready to Invoice', priority: 'Standard', jobType: 'EV Charger Install', customer: [{ id: c.okonkwo }], property: [{ id: p.okonkwo }], assignedTo: [{ id: t.dana }], scheduledStart: at(-14, 9), scheduledEnd: at(-14, 15), onSiteAt: at(-14, 9, 3), completedAt: at(-14, 14, 40), estimatedHours: 6, actualHours: 5.6, problem: 'New EV, wants a charger in the garage.', workPerformed: 'Installed 60A 2-pole breaker, 40 ft of 6/3 NM-B through the attic to a NEMA 14-50 in the garage. Load calc confirmed capacity. Tested at 48A continuous.', permitRequired: true, materialsCost: 640, laborCost: 258, revenue: 2180, grossMargin: 0.588, signedBy: 'Nkechi Okonkwo', satisfaction: '5 — Delighted', reviewRequested: true, tags: ['Photo Required'] },
    { id: job.bristolThermal, title: 'Q3 thermal imaging survey — all panels', jobNumber: 'J-2026-0175', status: 'Invoiced', priority: 'Scheduled Maintenance', jobType: 'Thermal Imaging Survey', customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], assignedTo: [{ id: t.marcus }], scheduledStart: at(-4, 8), scheduledEnd: at(-4, 13), onSiteAt: at(-4, 8, 10), completedAt: at(-4, 12, 50), estimatedHours: 5, actualHours: 4.8, workPerformed: 'Scanned 11 panels under load. Two hot spots: MDP-1 CB-6 at 71°C and the 2nd-floor lighting panel neutral bar at 58°C.', recommendations: 'Retorque MDP-1 CB-6 and replace the lug. Quote sent.', materialsCost: 0, laborCost: 230, revenue: 1450, grossMargin: 0.841, satisfaction: '5 — Delighted', tags: ['Photo Required'] },
    { id: job.sandiaVfd, title: 'CNC bank VFD fault — intermittent E-04', jobNumber: 'J-2026-0158', status: 'Closed', priority: 'Emergency', jobType: 'Motor / Controls', customer: [{ id: c.sandia }], property: [{ id: p.sandia }], assignedTo: [{ id: t.rey }], scheduledStart: at(-21, 6), scheduledEnd: at(-21, 14), onSiteAt: at(-21, 6, 20), completedAt: at(-21, 13, 30), estimatedHours: 8, actualHours: 7.2, problem: 'Line 3 down. VFD throwing E-04 under load.', diagnosis: 'Loose incoming lug on the VFD, phase imbalance at 9%.', workPerformed: 'Retorqued all incoming and outgoing lugs to 275 in-lb. Replaced the line reactor. Verified balance at 1.8%. Logged two hours under production load.', materialsCost: 890, laborCost: 331, revenue: 3240, grossMargin: 0.623, satisfaction: '4 — Satisfied', tags: ['Hot Work'] },
    { id: job.fairmountLights, title: 'Operatory 3 lighting flicker', jobNumber: 'J-2026-0152', status: 'Closed', priority: 'Standard', jobType: 'Lighting', customer: [{ id: c.fairmount }], property: [{ id: p.fairmount }], assignedTo: [{ id: t.priya }], scheduledStart: at(-30, 17), scheduledEnd: at(-30, 20), onSiteAt: at(-30, 17, 5), completedAt: at(-30, 19, 15), estimatedHours: 3, actualHours: 2.2, problem: 'Lights flicker when the compressor kicks on.', diagnosis: 'Shared neutral with the compressor branch.', workPerformed: 'Separated the neutral and moved lighting to a dedicated circuit.', materialsCost: 145, laborCost: 62, revenue: 720, grossMargin: 0.712, satisfaction: '4 — Satisfied' },
    { id: job.alvarezOutlets, title: 'Kitchen GFCI + two counter circuits', jobNumber: 'J-2026-0177', status: 'Closed', priority: 'Standard', jobType: 'Service Call', customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], assignedTo: [{ id: t.dana }], scheduledStart: at(-6, 8), scheduledEnd: at(-6, 14), onSiteAt: at(-6, 8, 2), completedAt: at(-6, 13, 20), estimatedHours: 6, actualHours: 5.1, workPerformed: 'Added two 20A small-appliance branch circuits, GFCI protection at the counter receptacles, AFCI breakers per 210.12.', materialsCost: 285, laborCost: 224, revenue: 1420, grossMargin: 0.642, satisfaction: '5 — Delighted', reviewRequested: true },
    { id: job.harborHall, title: 'Building D — 3rd floor hallway lighting out', jobNumber: 'J-2026-0183', status: 'Dispatched', priority: 'Same Day', jobType: 'Troubleshooting', customer: [{ id: c.harborView }], property: [{ id: p.harborD }], assignedTo: [{ id: t.dana }], scheduledStart: at(0, 13), scheduledEnd: at(0, 16), arrivalWindow: '12–2 PM', estimatedHours: 3, problem: 'Entire 3rd floor hallway dark since last night. Tenants complaining.', tags: ['Callback Risk'] },
    { id: job.delgadoQuote, title: 'Zinsco panel assessment and quote', jobNumber: 'J-2026-0185', status: 'Scheduled', priority: 'Standard', jobType: 'Service Call', customer: [{ id: c.delgado }], property: [{ id: p.delgado }], assignedTo: [{ id: t.marcus }], scheduledStart: at(2, 10), scheduledEnd: at(2, 12), arrivalWindow: '10–12 PM', estimatedHours: 2, problem: 'Home inspector flagged the panel during a refinance.' },
    { id: job.meridianTrim, title: 'Vista Ridge lot 12 — trim out', jobNumber: 'J-2026-0186', status: 'Scheduled', priority: 'Standard', jobType: 'New Construction Trim', customer: [{ id: c.meridian }], property: [{ id: p.vistaRidge }], assignedTo: [{ id: t.tomas }, { id: t.priya }], scheduledStart: at(3, 7), scheduledEnd: at(5, 16), estimatedHours: 26, permitRequired: true },
    { id: job.tresCallback, title: 'Cellar receptacle dead — warranty return', jobNumber: 'J-2026-0182', status: 'Closed', priority: 'Urgent', jobType: 'Warranty Callback', customer: [{ id: c.tresPinos }], property: [{ id: p.tresPinos }], assignedTo: [{ id: t.rey }], scheduledStart: at(-9, 8), scheduledEnd: at(-9, 10), onSiteAt: at(-9, 8, 8), completedAt: at(-9, 9, 40), estimatedHours: 2, actualHours: 1.5, warranty: true, problem: 'Receptacle installed last month is dead.', diagnosis: 'Back-stabbed conductor backed out in the box. Re-terminated on the screws.', workPerformed: 'Re-terminated under screw terminals, verified the rest of the circuit.', materialsCost: 8, laborCost: 69, revenue: 0, grossMargin: -1, satisfaction: '3 — Neutral', tags: ['Callback Risk'] },
    { id: job.quinnEvQuote, title: 'EV charger site assessment', jobNumber: 'J-2026-0187', status: 'Unscheduled', priority: 'Standard', jobType: 'EV Charger Install', customer: [{ id: c.quinn }], property: [{ id: p.quinn }], estimatedHours: 1.5, problem: 'Wants to know what a Level 2 charger would cost before buying the car.' },
    { id: job.bristolExit, title: 'Emergency + exit lighting 90-minute test', jobNumber: 'J-2026-0176', status: 'Closed', priority: 'Scheduled Maintenance', jobType: 'Preventive Maintenance', customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], assignedTo: [{ id: t.priya }], scheduledStart: at(-11, 18), scheduledEnd: at(-11, 21), onSiteAt: at(-11, 18, 2), completedAt: at(-11, 20, 30), estimatedHours: 3, actualHours: 2.5, workPerformed: 'Annual 90-minute discharge test on 22 units. Four battery packs replaced, log updated and posted in the electrical room.', materialsCost: 320, laborCost: 70, revenue: 980, grossMargin: 0.602 },
    { id: job.harborLaundry, title: 'Laundry room dryer receptacle burned', jobNumber: 'J-2026-0178', status: 'Invoiced', priority: 'Emergency', jobType: 'Service Call', customer: [{ id: c.harborView }], property: [{ id: p.harborD }], assignedTo: [{ id: t.marcus }], scheduledStart: at(-2, 19), scheduledEnd: at(-2, 22), onSiteAt: at(-2, 19, 25), completedAt: at(-2, 21, 50), estimatedHours: 3, actualHours: 2.4, problem: 'Tenant reported burning smell and sparks at the dryer outlet.', diagnosis: 'NEMA 14-30 receptacle with a loose neutral, terminal carbonized. Box and whip heat-damaged.', workPerformed: 'Replaced receptacle, box and 6 ft of whip. Megged the circuit at 500V, >100 MΩ. Verified torque on the breaker.', materialsCost: 95, laborCost: 139, revenue: 780, grossMargin: 0.7, satisfaction: '5 — Delighted', tags: ['Photo Required'] },
    { id: job.sandiaPm, title: 'Semi-annual switchgear PM and IR scan', jobNumber: 'J-2026-0188', status: 'Scheduled', priority: 'Scheduled Maintenance', jobType: 'Preventive Maintenance', customer: [{ id: c.sandia }], property: [{ id: p.sandia }], assignedTo: [{ id: t.marcus }, { id: t.rey }], scheduledStart: at(9, 6), scheduledEnd: at(9, 16), estimatedHours: 10, tags: ['Two-Person Job', 'Hot Work'] },
    { id: job.okonkwoSpa, title: 'Hot tub circuit — 50A GFCI disconnect', jobNumber: 'J-2026-0189', status: 'Unscheduled', priority: 'Standard', jobType: 'Service Call', customer: [{ id: c.okonkwo }], property: [{ id: p.okonkwo }], estimatedHours: 5, problem: 'Spa arriving in three weeks. Needs the circuit and disconnect in place.', permitRequired: true },
  ];

  /* --- photos ------------------------------------------------------ */
  const jobPhotos: RecordValue[] = [
    { id: id('jobPhotos'), caption: 'Existing Zinsco panel, double-tapped breakers', file: photo('Zinsco panel — before', 'rust'), job: [{ id: job.alvarezPanel }], customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], stage: 'Before', takenAt: at(-6, 9, 12), takenBy: [{ id: t.marcus }], location: 'Back hallway', tags: ['Panel', 'Hazard'], includeInReport: true, notes: 'Two circuits under one lug on positions 4 and 6.' },
    { id: id('jobPhotos'), caption: 'Meter base and weatherhead — existing', file: photo('Meter base — before', 'slate'), job: [{ id: job.alvarezPanel }], customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], stage: 'Before', takenAt: at(-6, 9, 18), takenBy: [{ id: t.marcus }], location: 'East exterior wall', tags: ['Meter'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Knob & tube splice found in the north wing attic', file: photo('Knob and tube splice', 'amber'), job: [{ id: job.alvarezPanel }], customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], stage: 'Code Violation', takenAt: at(-6, 10, 5), takenBy: [{ id: t.marcus }], location: 'North attic', tags: ['Wiring', 'Hazard'], includeInReport: true, notes: 'Open splice, no box. Quoted under EST-2026-0061.' },
    { id: id('jobPhotos'), caption: 'FPE Stab-Lok unit panel C-11 before removal', file: photo('FPE panel C-11', 'rust'), job: [{ id: job.harborFpe }], customer: [{ id: c.harborView }], property: [{ id: p.harborC }], stage: 'Before', takenAt: at(0, 7, 40), takenBy: [{ id: t.rey }], location: 'Unit C-11 entry closet', tags: ['Panel', 'Hazard'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Thermal scan — bus discoloration at positions 9/11', file: photo('Thermal scan 78C', 'thermal'), job: [{ id: job.harborFpe }], customer: [{ id: c.harborView }], property: [{ id: p.harborC }], stage: 'Thermal Scan', takenAt: at(0, 7, 52), takenBy: [{ id: t.rey }], location: 'Unit C-11', tags: ['Thermal', 'Panel'], includeInReport: true, notes: '78°C at 62% load. Ambient 24°C.' },
    { id: id('jobPhotos'), caption: 'New Square D QO load center installed and labeled', file: photo('New QO panel', 'green'), job: [{ id: job.harborFpe }], customer: [{ id: c.harborView }], property: [{ id: p.harborC }], stage: 'After', takenAt: at(0, 14, 30), takenBy: [{ id: t.rey }], location: 'Unit C-11 entry closet', tags: ['Panel', 'Customer Copy'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Pitted contactor on the chiller circuit', file: photo('Pitted contactor', 'rust'), job: [{ id: job.tresChiller }], customer: [{ id: c.tresPinos }], property: [{ id: p.tresPinos }], stage: 'Damage / Existing Condition', takenAt: at(-2, 9, 20), takenBy: [{ id: t.marcus }], location: 'MDP-2 room', tags: ['Device', 'Hazard'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Chiller nameplate — model and serial', file: photo('Chiller nameplate', 'slate'), job: [{ id: job.tresChiller }], customer: [{ id: c.tresPinos }], property: [{ id: p.tresPinos }], stage: 'Equipment Label', takenAt: at(-2, 9, 24), takenBy: [{ id: t.marcus }], tags: ['Serial Number'] },
    { id: id('jobPhotos'), caption: 'Lot 15 rough-in, home runs dressed at the panel', file: photo('Rough-in home runs', 'blue'), job: [{ id: job.vistaRough }], customer: [{ id: c.meridian }], property: [{ id: p.vistaRidge }], stage: 'During', takenAt: at(-3, 11, 15), takenBy: [{ id: t.tomas }], location: 'Lot 15 garage', tags: ['Rough-In', 'Wiring'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Trench with conduit, before backfill', file: photo('Trench before backfill', 'amber'), job: [{ id: job.vistaRough }], customer: [{ id: c.meridian }], property: [{ id: p.vistaRidge }], stage: 'During', takenAt: at(-5, 15, 40), takenBy: [{ id: t.rey }], tags: ['Trenching'], includeInReport: true, notes: 'Inspector wants photo documentation before cover.' },
    { id: id('jobPhotos'), caption: 'NEMA 14-50 installed in garage, labeled', file: photo('EV receptacle after', 'green'), job: [{ id: job.okonkwoEv }], customer: [{ id: c.okonkwo }], property: [{ id: p.okonkwo }], stage: 'After', takenAt: at(-14, 14, 20), takenBy: [{ id: t.dana }], location: 'Garage north wall', tags: ['Device', 'Customer Copy'], includeInReport: true },
    { id: id('jobPhotos'), caption: '60A breaker in main panel, torque-marked', file: photo('60A breaker torque mark', 'blue'), job: [{ id: job.okonkwoEv }], customer: [{ id: c.okonkwo }], property: [{ id: p.okonkwo }], stage: 'After', takenAt: at(-14, 14, 26), takenBy: [{ id: t.dana }], tags: ['Panel'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'MDP-1 CB-6 at 71°C under load', file: photo('MDP-1 CB-6 71C', 'thermal'), job: [{ id: job.bristolThermal }], customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], stage: 'Thermal Scan', takenAt: at(-4, 9, 30), takenBy: [{ id: t.marcus }], tags: ['Thermal', 'Panel'], includeInReport: true, notes: 'Delta-T 47°C over the adjacent phase. Recommend retorque and lug replacement.' },
    { id: id('jobPhotos'), caption: 'Second-floor lighting panel neutral bar, 58°C', file: photo('Neutral bar 58C', 'thermal'), job: [{ id: job.bristolThermal }], customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], stage: 'Thermal Scan', takenAt: at(-4, 10, 5), takenBy: [{ id: t.marcus }], tags: ['Thermal'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Carbonized dryer receptacle terminal', file: photo('Burned dryer receptacle', 'rust'), job: [{ id: job.harborLaundry }], customer: [{ id: c.harborView }], property: [{ id: p.harborD }], stage: 'Damage / Existing Condition', takenAt: at(-2, 19, 40), takenBy: [{ id: t.marcus }], location: 'Building D laundry', tags: ['Device', 'Hazard'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'New receptacle, box and whip installed', file: photo('New dryer receptacle', 'green'), job: [{ id: job.harborLaundry }], customer: [{ id: c.harborView }], property: [{ id: p.harborD }], stage: 'After', takenAt: at(-2, 21, 30), takenBy: [{ id: t.marcus }], tags: ['Device', 'Customer Copy'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'VFD incoming lugs after retorque, marked', file: photo('VFD lugs retorqued', 'blue'), job: [{ id: job.sandiaVfd }], customer: [{ id: c.sandia }], property: [{ id: p.sandia }], stage: 'After', takenAt: at(-21, 12, 10), takenBy: [{ id: t.rey }], tags: ['Panel'], includeInReport: true },
    { id: id('jobPhotos'), caption: 'Completed kitchen counter GFCI', file: photo('Kitchen GFCI after', 'green'), job: [{ id: job.alvarezOutlets }], customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], stage: 'After', takenAt: at(-6, 13, 10), takenBy: [{ id: t.dana }], tags: ['Device', 'Customer Copy'], includeInReport: true },
  ];

  /* --- estimates and line items ------------------------------------ */
  const est = { alvarezKt: id('estimates'), harborFpeD: id('estimates'), quinnEv: id('estimates'), delgado: id('estimates'), bristolLug: id('estimates'), tresPhase: id('estimates') };

  const estimates: RecordValue[] = [
    { id: est.alvarezKt, title: 'North wing knob & tube replacement', estimateNumber: 'EST-2026-0061', status: 'Sent', customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], tier: 'Better', issuedOn: day(-5), expiresOn: day(25), subtotal: 9400, taxRate: 0.08125, taxAmount: 763.75, discount: 0, total: 10163.75, estimatedCost: 4720, scope: 'Replace remaining knob & tube in the north wing: 6 circuits, 14 devices, new AFCI protection. Includes drywall cut-in, excludes patch and paint.', exclusions: 'Drywall patching, painting, asbestos abatement if encountered in the plaster.', terms: '50% deposit, balance on completion. Price holds 30 days.' },
    { id: est.harborFpeD, title: 'Building D — 6 FPE panel replacements', estimateNumber: 'EST-2026-0059', status: 'Approved', customer: [{ id: c.harborView }], property: [{ id: p.harborD }], tier: 'Single Option', issuedOn: day(-18), expiresOn: day(12), subtotal: 15800, taxRate: 0.08125, taxAmount: 1283.75, total: 17083.75, estimatedCost: 8400, approvedOn: day(-11), approvedBy: 'Dee Nakamura', scope: 'Replace six FPE Stab-Lok unit panels in Building D with Square D QO load centers. Includes permit and inspection coordination.', exclusions: 'Tenant belongings relocation, drywall repair beyond the panel opening.' },
    { id: est.quinnEv, title: 'Level 2 EV charger — good / better / best', estimateNumber: 'EST-2026-0064', status: 'Draft', customer: [{ id: c.quinn }], property: [{ id: p.quinn }], tier: 'Good', issuedOn: day(0), expiresOn: day(30), subtotal: 1650, taxRate: 0.08125, taxAmount: 134.06, total: 1784.06, estimatedCost: 720, scope: 'NEMA 14-50 receptacle on a dedicated 50A circuit, 25 ft run from the panel.', exclusions: 'Panel upgrade if the load calc fails, trenching, permit fee.' },
    { id: est.delgado, title: 'Zinsco panel replacement, 100A → 200A', estimateNumber: 'EST-2026-0063', status: 'Sent', customer: [{ id: c.delgado }], property: [{ id: p.delgado }], tier: 'Better', issuedOn: day(-2), expiresOn: day(28), subtotal: 5850, taxRate: 0.08125, taxAmount: 475.31, total: 6325.31, estimatedCost: 2980, scope: 'Replace Zinsco panel with a 200A Square D QO load center, new meter main, grounding electrode system per 250.50.', exclusions: 'Aluminum branch circuit pigtailing (quoted separately), utility disconnect fees.' },
    { id: est.bristolLug, title: 'MDP-1 CB-6 lug replacement and retorque', estimateNumber: 'EST-2026-0062', status: 'Approved', customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], tier: 'Single Option', issuedOn: day(-3), expiresOn: day(27), subtotal: 1180, taxRate: 0.08125, taxAmount: 95.88, total: 1275.88, estimatedCost: 430, approvedOn: day(-1), approvedBy: 'Paula Bristol', scope: 'Replace the heat-damaged lug on MDP-1 CB-6, retorque the panel to spec, re-scan under load.' },
    { id: est.tresPhase, title: 'Phase monitor relay on the chiller circuit', estimateNumber: 'EST-2026-0060', status: 'Declined', customer: [{ id: c.tresPinos }], property: [{ id: p.tresPinos }], tier: 'Single Option', issuedOn: day(-8), expiresOn: day(22), subtotal: 480, taxRate: 0.08125, taxAmount: 39, total: 519, estimatedCost: 240, declineReason: 'Timing', scope: 'Install a three-phase monitor relay ahead of the chiller contactor.' },
  ];

  const lineItems: RecordValue[] = [
    { id: id('lineItems'), description: 'Journeyman labor — rewire', estimate: [{ id: est.alvarezKt }], kind: 'Labor', quantity: 48, unit: 'hr', unitCost: 44, unitPrice: 128, lineTotal: 6144, taxable: false, sortOrder: 1 },
    { id: id('lineItems'), description: '12/2 NM-B, 250 ft roll', estimate: [{ id: est.alvarezKt }], kind: 'Material', quantity: 4, unit: 'roll', unitCost: 142, unitPrice: 213, lineTotal: 852, taxable: true, sortOrder: 2 },
    { id: id('lineItems'), description: 'AFCI breaker, 20A single pole', estimate: [{ id: est.alvarezKt }], kind: 'Material', quantity: 6, unit: 'ea', unitCost: 48, unitPrice: 79, lineTotal: 474, taxable: true, sortOrder: 3 },
    { id: id('lineItems'), description: 'Devices, boxes and trim', estimate: [{ id: est.alvarezKt }], kind: 'Material', quantity: 1, unit: 'lot', unitCost: 610, unitPrice: 980, lineTotal: 980, taxable: true, sortOrder: 4 },
    { id: id('lineItems'), description: 'Permit and inspection coordination', estimate: [{ id: est.alvarezKt }], kind: 'Permit', quantity: 1, unit: 'lot', unitCost: 275, unitPrice: 350, lineTotal: 350, taxable: false, sortOrder: 5 },
    { id: id('lineItems'), description: 'Square D QO 100A load center', estimate: [{ id: est.harborFpeD }], kind: 'Material', quantity: 6, unit: 'ea', unitCost: 218, unitPrice: 395, lineTotal: 2370, taxable: true, sortOrder: 1 },
    { id: id('lineItems'), description: 'Crew labor — panel swaps', estimate: [{ id: est.harborFpeD }], kind: 'Labor', quantity: 72, unit: 'hr', unitCost: 46, unitPrice: 132, lineTotal: 9504, taxable: false, sortOrder: 2 },
    { id: id('lineItems'), description: 'Breakers and misc. material', estimate: [{ id: est.harborFpeD }], kind: 'Material', quantity: 1, unit: 'lot', unitCost: 1980, unitPrice: 3200, lineTotal: 3200, taxable: true, sortOrder: 3 },
    { id: id('lineItems'), description: 'NEMA 14-50 receptacle and enclosure', estimate: [{ id: est.quinnEv }], kind: 'Material', quantity: 1, unit: 'ea', unitCost: 86, unitPrice: 165, lineTotal: 165, taxable: true, sortOrder: 1 },
    { id: id('lineItems'), description: '6/3 NM-B, 25 ft', estimate: [{ id: est.quinnEv }], kind: 'Material', quantity: 25, unit: 'ft', unitCost: 4.4, unitPrice: 7.4, lineTotal: 185, taxable: true, sortOrder: 2 },
    { id: id('lineItems'), description: 'Installation labor', estimate: [{ id: est.quinnEv }], kind: 'Labor', quantity: 8, unit: 'hr', unitCost: 44, unitPrice: 131.25, lineTotal: 1050, taxable: false, sortOrder: 3 },
    { id: id('lineItems'), description: 'Permit', estimate: [{ id: est.quinnEv }], kind: 'Permit', quantity: 1, unit: 'lot', unitCost: 180, unitPrice: 250, lineTotal: 250, taxable: false, sortOrder: 4 },
  ];

  /* --- invoices and payments --------------------------------------- */
  const inv = { harborThermal: id('invoices'), harborLaundry: id('invoices'), bristolQ3: id('invoices'), meridianProgress: id('invoices'), fairmount: id('invoices'), tresChiller: id('invoices'), sandia: id('invoices'), alvarezKitchen: id('invoices') };

  const invoices: RecordValue[] = [
    { id: inv.bristolQ3, title: 'Q3 thermal imaging survey', invoiceNumber: 'INV-2026-0412', status: 'Sent', customer: [{ id: c.bristol }], job: [{ id: job.bristolThermal }], issuedOn: day(-3), dueOn: day(27), terms: 'Net 30', subtotal: 1450, taxRate: 0.08125, taxAmount: 0, total: 1450, amountPaid: 0, balanceDue: 1450, poNumber: 'BPG-4471' },
    { id: inv.harborLaundry, title: 'Emergency dryer receptacle replacement', invoiceNumber: 'INV-2026-0414', status: 'Sent', customer: [{ id: c.harborView }], job: [{ id: job.harborLaundry }], issuedOn: day(-1), dueOn: day(29), terms: 'Net 30', subtotal: 780, taxRate: 0.08125, taxAmount: 7.72, total: 787.72, amountPaid: 0, balanceDue: 787.72 },
    { id: inv.harborThermal, title: 'Building C panel replacements — progress 1', invoiceNumber: 'INV-2026-0409', status: 'Partially Paid', customer: [{ id: c.harborView }], job: [{ id: job.harborFpe }], issuedOn: day(-16), dueOn: day(14), terms: 'Net 30', subtotal: 8200, taxRate: 0.08125, taxAmount: 192.56, total: 8392.56, amountPaid: 4360, balanceDue: 4032.56, notes: 'Deposit received. Balance on completion of units C-14 through C-16.' },
    { id: inv.meridianProgress, title: 'Vista Ridge lots 14–16 — progress 2', invoiceNumber: 'INV-2026-0401', status: 'Overdue', customer: [{ id: c.meridian }], job: [{ id: job.vistaRough }], issuedOn: day(-52), dueOn: day(-22), terms: 'Net 30', subtotal: 34500, taxRate: 0.08125, taxAmount: 910, retainage: 3450, total: 34500, amountPaid: 0, balanceDue: 34500, poNumber: 'MC-VR-0312', lienDeadline: day(8), notes: '30 days past due. Preliminary notice filed 2026-07-02. Lien deadline in 8 days.' },
    { id: inv.fairmount, title: 'Operatory 3 lighting repair', invoiceNumber: 'INV-2026-0388', status: 'Overdue', customer: [{ id: c.fairmount }], job: [{ id: job.fairmountLights }], issuedOn: day(-29), dueOn: day(-14), terms: 'Net 15', subtotal: 720, taxRate: 0.08125, taxAmount: 11.78, total: 731.78, amountPaid: 0, balanceDue: 731.78 },
    { id: inv.tresChiller, title: 'Chiller circuit diagnostic', invoiceNumber: 'INV-2026-0410', status: 'Sent', customer: [{ id: c.tresPinos }], job: [{ id: job.tresChiller }], issuedOn: day(-2), dueOn: day(13), terms: 'Net 15', subtotal: 640, taxRate: 0.08125, taxAmount: 25.19, total: 665.19, amountPaid: 0, balanceDue: 665.19 },
    { id: inv.sandia, title: 'CNC bank VFD emergency repair', invoiceNumber: 'INV-2026-0376', status: 'Paid', customer: [{ id: c.sandia }], job: [{ id: job.sandiaVfd }], issuedOn: day(-20), dueOn: day(10), terms: 'Net 30', subtotal: 3240, taxRate: 0.08125, taxAmount: 72.31, total: 3312.31, amountPaid: 3312.31, balanceDue: 0, paidOn: day(-6) },
    { id: inv.alvarezKitchen, title: 'Kitchen GFCI and counter circuits', invoiceNumber: 'INV-2026-0411', status: 'Paid', customer: [{ id: c.alvarez }], job: [{ id: job.alvarezOutlets }], issuedOn: day(-6), dueOn: day(-6), terms: 'Due on Receipt', subtotal: 1420, taxRate: 0.08125, taxAmount: 23.16, total: 1443.16, amountPaid: 1443.16, balanceDue: 0, paidOn: day(-6) },
  ];

  const payments: RecordValue[] = [
    { id: id('payments'), reference: 'ACH 8841 — Sandia Machine Works', invoice: [{ id: inv.sandia }], customer: [{ id: c.sandia }], amount: 3312.31, method: 'ACH', receivedOn: day(-6), kind: 'Final Payment' },
    { id: id('payments'), reference: 'Card •••• 4417 — Alvarez', invoice: [{ id: inv.alvarezKitchen }], customer: [{ id: c.alvarez }], amount: 1443.16, method: 'Card', receivedOn: day(-6), kind: 'Final Payment', processorFee: 41.85 },
    { id: id('payments'), reference: 'Check 20114 — Harbor View deposit', invoice: [{ id: inv.harborThermal }], customer: [{ id: c.harborView }], amount: 4360, method: 'Check', receivedOn: day(-15), kind: 'Deposit' },
  ];

  /* --- time, materials, supply chain -------------------------------- */
  const timeEntries: RecordValue[] = [
    { id: id('timeEntries'), label: 'Rey — Building C panels', technician: [{ id: t.rey }], job: [{ id: job.harborFpe }], kind: 'Labor', startedAt: at(0, 7, 12), endedAt: at(0, 15, 30), hours: 8.3, billable: true },
    { id: id('timeEntries'), label: 'Dana — Building C panels', technician: [{ id: t.dana }], job: [{ id: job.harborFpe }], kind: 'Labor', startedAt: at(0, 7, 15), endedAt: at(0, 14, 30), hours: 7.2, billable: true },
    { id: id('timeEntries'), label: 'Marcus — chiller diagnostic', technician: [{ id: t.marcus }], job: [{ id: job.tresChiller }], kind: 'Labor', startedAt: at(-2, 8, 5), endedAt: at(-2, 11, 50), hours: 3.75, billable: true },
    { id: id('timeEntries'), label: 'Marcus — travel to Tres Pinos', technician: [{ id: t.marcus }], job: [{ id: job.tresChiller }], kind: 'Travel', startedAt: at(-2, 7, 35), endedAt: at(-2, 8, 5), hours: 0.5, billable: false },
    { id: id('timeEntries'), label: 'Dana — EV charger install', technician: [{ id: t.dana }], job: [{ id: job.okonkwoEv }], kind: 'Labor', startedAt: at(-14, 9, 3), endedAt: at(-14, 14, 40), hours: 5.6, billable: true },
    { id: id('timeEntries'), label: 'Rey — warranty return, Tres Pinos', technician: [{ id: t.rey }], job: [{ id: job.tresCallback }], kind: 'Warranty', startedAt: at(-9, 8, 8), endedAt: at(-9, 9, 40), hours: 1.5, billable: false },
    { id: id('timeEntries'), label: 'Tomás — Vista Ridge rough-in', technician: [{ id: t.tomas }], job: [{ id: job.vistaRough }], kind: 'Labor', startedAt: at(-1, 7, 0), endedAt: at(-1, 16, 0), hours: 9, overtime: true, billable: true },
    { id: id('timeEntries'), label: 'Priya — emergency lighting test', technician: [{ id: t.priya }], job: [{ id: job.bristolExit }], kind: 'Labor', startedAt: at(-11, 18, 2), endedAt: at(-11, 20, 30), hours: 2.5, overtime: true, billable: true },
    { id: id('timeEntries'), label: 'Marcus — after-hours laundry call', technician: [{ id: t.marcus }], job: [{ id: job.harborLaundry }], kind: 'Labor', startedAt: at(-2, 19, 25), endedAt: at(-2, 21, 50), hours: 2.4, overtime: true, billable: true },
  ];

  const mat = {
    romex122: id('materials'), romex63: id('materials'), qo200: id('materials'), qo100: id('materials'),
    afci20: id('materials'), gfci: id('materials'), nema1450: id('materials'), emt34: id('materials'),
    contactor: id('materials'), lineReactor: id('materials'), groundRod: id('materials'), wireNuts: id('materials'),
    ledTroffer: id('materials'), exitBattery: id('materials'), phaseMonitor: id('materials'), lug350: id('materials'),
  };

  const materials: RecordValue[] = [
    { id: mat.romex122, name: '12/2 NM-B Romex, 250 ft roll', sku: 'WIR-122-250', category: 'Wire & Cable', unit: 'roll', cost: 142, price: 213, markup: 0.5, onHand: 11, reorderPoint: 6, stockLocation: 'Shop', manufacturer: 'Southwire' },
    { id: mat.romex63, name: '6/3 NM-B with ground, per ft', sku: 'WIR-63-FT', category: 'Wire & Cable', unit: 'ft', cost: 4.4, price: 7.4, markup: 0.682, onHand: 180, reorderPoint: 100, stockLocation: 'Truck 1', manufacturer: 'Southwire' },
    { id: mat.qo200, name: 'Square D QO 200A main breaker load center, 40 space', sku: 'PNL-QO200-40', category: 'Panels & Load Centers', unit: 'ea', cost: 412, price: 749, markup: 0.818, onHand: 2, reorderPoint: 2, stockLocation: 'Shop', manufacturer: 'Square D' },
    { id: mat.qo100, name: 'Square D QO 100A load center, 20 space', sku: 'PNL-QO100-20', category: 'Panels & Load Centers', unit: 'ea', cost: 218, price: 395, markup: 0.812, onHand: 1, reorderPoint: 4, stockLocation: 'Shop', manufacturer: 'Square D' },
    { id: mat.afci20, name: 'QO AFCI breaker 20A 1-pole', sku: 'BRK-AFCI-20', category: 'Breakers', unit: 'ea', cost: 48, price: 79, markup: 0.646, onHand: 14, reorderPoint: 10, stockLocation: 'Truck 1', manufacturer: 'Square D' },
    { id: mat.gfci, name: 'GFCI receptacle 20A, tamper resistant', sku: 'DEV-GFCI-20', category: 'Devices', unit: 'ea', cost: 18.5, price: 39, markup: 1.108, onHand: 32, reorderPoint: 20, stockLocation: 'Truck 1', manufacturer: 'Leviton' },
    { id: mat.nema1450, name: 'NEMA 14-50 receptacle, industrial grade', sku: 'DEV-1450', category: 'EV Equipment', unit: 'ea', cost: 86, price: 165, markup: 0.919, onHand: 3, reorderPoint: 3, stockLocation: 'Truck 2', manufacturer: 'Hubbell' },
    { id: mat.emt34, name: 'EMT conduit 3/4", 10 ft stick', sku: 'CON-EMT-34', category: 'Conduit & Fittings', unit: 'ea', cost: 12.8, price: 24, markup: 0.875, onHand: 46, reorderPoint: 24, stockLocation: 'Shop' },
    { id: mat.contactor, name: 'Definite purpose contactor, 3-pole 40A', sku: 'CTL-CON-40', category: 'Controls', unit: 'ea', cost: 118, price: 215, markup: 0.822, onHand: 0, reorderPoint: 2, stockLocation: 'Shop', manufacturer: 'Eaton' },
    { id: mat.lineReactor, name: 'Line reactor 3%, 25 HP', sku: 'CTL-LR-25', category: 'Controls', unit: 'ea', cost: 610, price: 1080, markup: 0.77, onHand: 0, reorderPoint: 1, stockLocation: 'Vendor Direct' },
    { id: mat.groundRod, name: 'Ground rod 5/8" x 8 ft, copper clad', sku: 'GND-ROD-58', category: 'Grounding', unit: 'ea', cost: 21, price: 44, markup: 1.095, onHand: 9, reorderPoint: 6, stockLocation: 'Truck 2' },
    { id: mat.wireNuts, name: 'Wire connectors, assorted (box of 500)', sku: 'CON-NUT-500', category: 'Consumables', unit: 'box', cost: 62, price: 110, markup: 0.774, onHand: 4, reorderPoint: 3, stockLocation: 'Shop' },
    { id: mat.ledTroffer, name: 'LED troffer 2x4, 40W 4000K', sku: 'LGT-TRF-24', category: 'Lighting', unit: 'ea', cost: 78, price: 149, markup: 0.91, onHand: 12, reorderPoint: 8, stockLocation: 'Shop' },
    { id: mat.exitBattery, name: 'Emergency ballast battery pack', sku: 'LGT-EMB-01', category: 'Lighting', unit: 'ea', cost: 38, price: 79, markup: 1.079, onHand: 2, reorderPoint: 6, stockLocation: 'Truck 3' },
    { id: mat.phaseMonitor, name: '3-phase monitor relay, adjustable', sku: 'CTL-PMR-3', category: 'Controls', unit: 'ea', cost: 132, price: 248, markup: 0.879, onHand: 1, reorderPoint: 1, stockLocation: 'Shop' },
    { id: mat.lug350, name: 'Mechanical lug, 350 MCM', sku: 'LUG-350', category: 'Grounding', unit: 'ea', cost: 34, price: 68, markup: 1.0, onHand: 5, reorderPoint: 4, stockLocation: 'Truck 1' },
  ];

  const materialUsage: RecordValue[] = [
    { id: id('materialUsage'), label: 'QO 100A load centers — Building C', job: [{ id: job.harborFpe }], material: [{ id: mat.qo100 }], quantity: 6, unitCost: 218, extendedCost: 1308, usedOn: day(0), usedBy: [{ id: t.rey }], billable: true },
    { id: id('materialUsage'), label: 'AFCI breakers — Building C', job: [{ id: job.harborFpe }], material: [{ id: mat.afci20 }], quantity: 24, unitCost: 48, extendedCost: 1152, usedOn: day(0), usedBy: [{ id: t.rey }], billable: true },
    { id: id('materialUsage'), label: '6/3 NM-B — Okonkwo EV run', job: [{ id: job.okonkwoEv }], material: [{ id: mat.romex63 }], quantity: 42, unitCost: 4.4, extendedCost: 184.8, usedOn: day(-14), usedBy: [{ id: t.dana }], billable: true },
    { id: id('materialUsage'), label: 'NEMA 14-50 — Okonkwo', job: [{ id: job.okonkwoEv }], material: [{ id: mat.nema1450 }], quantity: 1, unitCost: 86, extendedCost: 86, usedOn: day(-14), usedBy: [{ id: t.dana }], billable: true },
    { id: id('materialUsage'), label: 'GFCI receptacles — Alvarez kitchen', job: [{ id: job.alvarezOutlets }], material: [{ id: mat.gfci }], quantity: 4, unitCost: 18.5, extendedCost: 74, usedOn: day(-6), usedBy: [{ id: t.dana }], billable: true },
    { id: id('materialUsage'), label: 'Line reactor — Sandia VFD', job: [{ id: job.sandiaVfd }], material: [{ id: mat.lineReactor }], quantity: 1, unitCost: 610, extendedCost: 610, usedOn: day(-21), usedBy: [{ id: t.rey }], billable: true },
    { id: id('materialUsage'), label: 'Emergency battery packs — Bristol', job: [{ id: job.bristolExit }], material: [{ id: mat.exitBattery }], quantity: 4, unitCost: 38, extendedCost: 152, usedOn: day(-11), usedBy: [{ id: t.priya }], billable: true },
    { id: id('materialUsage'), label: 'Romex 12/2 — Vista Ridge lot 15', job: [{ id: job.vistaRough }], material: [{ id: mat.romex122 }], quantity: 14, unitCost: 142, extendedCost: 1988, usedOn: day(-3), usedBy: [{ id: t.tomas }], billable: true },
  ];

  const vend = { cityElectric: id('vendors'), rexel: id('vendors'), platt: id('vendors'), sunbelt: id('vendors') };
  const vendors: RecordValue[] = [
    { id: vend.cityElectric, name: 'City Electric Supply — Siler Rd', kind: 'Supply House', accountNumber: 'CES-40118', phone: '(505) 555-0401', email: 'santafe@ces.example', rep: 'Luis Barrera', terms: 'Net 30', address: '1900 Siler Rd, Santa Fe NM 87507' },
    { id: vend.rexel, name: 'Rexel Southwest', kind: 'Supply House', accountNumber: 'RX-88213', phone: '(505) 555-0412', rep: 'Anita Cruz', terms: 'Net 30' },
    { id: vend.platt, name: 'Platt Electric', kind: 'Supply House', accountNumber: 'PL-22907', phone: '(505) 555-0423', terms: 'Net 15', website: 'https://platt.example' },
    { id: vend.sunbelt, name: 'Sunbelt Rentals', kind: 'Rental', accountNumber: 'SB-71144', phone: '(505) 555-0434', terms: 'COD', notes: 'Scissor lifts and trenchers.' },
  ];

  const purchaseOrders: RecordValue[] = [
    { id: id('purchaseOrders'), title: 'Chiller contactor + overload relay', poNumber: 'PO-2026-0233', vendor: [{ id: vend.cityElectric }], job: [{ id: job.tresChiller }], status: 'Backordered', orderedOn: day(-2), expectedOn: day(3), total: 286, orderedBy: [{ id: t.marcus }], items: '1x definite purpose contactor 40A 3P, 1x overload relay 12–18A. Contactor backordered to the 3rd.' },
    { id: id('purchaseOrders'), title: 'Building D panel package', poNumber: 'PO-2026-0231', vendor: [{ id: vend.rexel }], job: [{ id: job.harborFpe }], status: 'Received', orderedOn: day(-12), expectedOn: day(-6), receivedOn: day(-7), total: 3894, orderedBy: [{ id: t.jo }], items: '6x QO 100A load center, 24x QO AFCI 20A, misc. trim.' },
    { id: id('purchaseOrders'), title: 'Vista Ridge wire restock', poNumber: 'PO-2026-0235', vendor: [{ id: vend.platt }], job: [{ id: job.vistaRough }], status: 'Ordered', orderedOn: day(-1), expectedOn: day(2), total: 2130, orderedBy: [{ id: t.tomas }], items: '12x 12/2 NM-B 250ft, 6x 14/2 NM-B 250ft, 4x 12/3 NM-B 250ft.' },
    { id: id('purchaseOrders'), title: 'Scissor lift rental — Bristol Plaza', poNumber: 'PO-2026-0230', vendor: [{ id: vend.sunbelt }], status: 'Received', orderedOn: day(-13), receivedOn: day(-11), total: 410, orderedBy: [{ id: t.jo }], items: '19 ft scissor lift, 2-day rental.' },
  ];

  /* --- compliance, assets, CRM activity ----------------------------- */
  const permits: RecordValue[] = [
    { id: id('permits'), title: 'Alvarez service upgrade permit', permitNumber: 'SF-2026-4412', job: [{ id: job.alvarezPanel }], property: [{ id: p.alvarez }], ahj: 'City of Santa Fe', status: 'Issued', permitType: 'Service Change', appliedOn: day(-9), issuedOn: day(-4), expiresOn: day(176), inspectionType: 'Service', inspectionDate: at(2, 13), inspector: 'R. Salas', fee: 245 },
    { id: id('permits'), title: 'Harbor View Building C panels', permitNumber: 'SFC-2026-1180', job: [{ id: job.harborFpe }], property: [{ id: p.harborC }], ahj: 'Santa Fe County', status: 'Inspection Scheduled', permitType: 'Electrical', appliedOn: day(-20), issuedOn: day(-14), inspectionType: 'Final', inspectionDate: at(3, 9), fee: 620 },
    { id: id('permits'), title: 'Vista Ridge lots 14–16 rough-in', permitNumber: 'SFC-2026-1044', job: [{ id: job.vistaRough }], property: [{ id: p.vistaRidge }], ahj: 'Santa Fe County', status: 'Corrections Required', permitType: 'Electrical', appliedOn: day(-40), issuedOn: day(-34), inspectionType: 'Rough-In', inspectionDate: at(-2, 10), inspector: 'M. Tenorio', result: 'Failed', corrections: 'Lot 15: missing nail plates on two studs at the panel wall. Lot 16: box fill exceeded at the kitchen 4-square. Re-inspection required before cover.', fee: 880 },
    { id: id('permits'), title: 'Okonkwo EV charger', permitNumber: 'SFC-2026-1155', job: [{ id: job.okonkwoEv }], property: [{ id: p.okonkwo }], ahj: 'Santa Fe County', status: 'Finaled', permitType: 'EV Charger', appliedOn: day(-22), issuedOn: day(-18), inspectionType: 'Final', inspectionDate: at(-10, 11), inspector: 'M. Tenorio', result: 'Passed', fee: 185 },
    { id: id('permits'), title: 'Delgado panel replacement', job: [{ id: job.delgadoQuote }], property: [{ id: p.delgado }], ahj: 'City of Santa Fe', status: 'Not Started', permitType: 'Service Change', fee: 245 },
  ];

  const safety: RecordValue[] = [
    { id: id('safety'), title: 'JHA — Building C energized panel work', kind: 'Job Hazard Analysis', date: day(0), job: [{ id: job.harborFpe }], crew: [{ id: t.rey }, { id: t.dana }], severity: 'None', hazards: ['Shock', 'Arc Flash'], ppe: ['Class 0 Gloves', 'Arc Flash Suit 8 cal', 'Face Shield', 'FR Clothing'], voltageLevel: '120/240V', controls: 'De-energize the unit panel at the meter stack. Verify absence of voltage with a tested meter. Apply lock and tag. Boundary taped at 42 inches.' },
    { id: id('safety'), title: 'LOTO — Tres Pinos MDP-2 CB-14', kind: 'Lockout / Tagout', date: day(-2), job: [{ id: job.tresChiller }], crew: [{ id: t.marcus }], severity: 'None', hazards: ['Shock', 'Arc Flash'], ppe: ['Class 2 Gloves', 'Arc Flash Suit 40 cal', 'Face Shield'], voltageLevel: '277/480V', controls: 'Breaker opened and locked, tag 118. Absence of voltage verified phase-to-phase and phase-to-ground. Lock removed at 11:45 by the same person who applied it.' },
    { id: id('safety'), title: 'Toolbox talk — trenching and shoring', kind: 'Toolbox Talk', date: day(-5), job: [{ id: job.vistaRough }], crew: [{ id: t.tomas }, { id: t.rey }, { id: t.priya }], severity: 'None', hazards: ['Trenching', 'Traffic'], controls: 'Reviewed 5-foot rule, spoil pile setback, daily competent-person inspection. Signed by all three.' },
    { id: id('safety'), title: 'Near miss — ladder slip, Building D stairwell', kind: 'Near Miss', date: day(-11), job: [{ id: job.bristolExit }], crew: [{ id: t.priya }], severity: 'None', hazards: ['Fall', 'Ladder'], correctiveAction: 'Stairwell ladder leveler added to Truck 3. Reminder issued: no straight ladders on stair treads without a leveler.' },
    { id: id('safety'), title: 'Energized work permit — Sandia switchgear PM', kind: 'Energized Work Permit', date: day(9), job: [{ id: job.sandiaPm }], crew: [{ id: t.marcus }, { id: t.rey }], severity: 'None', hazards: ['Arc Flash', 'Shock'], ppe: ['Arc Flash Suit 40 cal', 'Class 2 Gloves', 'Face Shield', 'Hearing Protection'], voltageLevel: '277/480V', controls: 'IR scan through inspection windows only. No covers removed while energized. Second person stationed at the disconnect.' },
  ];

  const agreements: RecordValue[] = [
    { id: id('agreements'), title: 'Bristol Plaza — quarterly thermal scan', customer: [{ id: c.bristol }], property: [{ id: p.bristolPlaza }], plan: 'Thermal Imaging', status: 'Active', frequency: 'Quarterly', startDate: '2023-01-15', renewalDate: day(117), nextServiceDate: day(84), price: 5800, billingCycle: 'Annual Upfront', benefits: 'Quarterly IR scan of all panels, written report with images, priority dispatch, 15% labor discount, waived trip charge.', autoRenew: true },
    { id: id('agreements'), title: 'Harbor View — common area PM', customer: [{ id: c.harborView }], property: [{ id: p.harborC }], plan: 'Commercial PM', status: 'Active', frequency: 'Semi-Annual', startDate: '2022-04-01', renewalDate: day(28), nextServiceDate: day(12), price: 7200, billingCycle: 'Monthly', benefits: 'Semi-annual panel inspection, emergency lighting test, exterior lighting sweep, 2-hour emergency response.', autoRenew: true },
    { id: id('agreements'), title: 'Sandia Machine — switchgear PM', customer: [{ id: c.sandia }], property: [{ id: p.sandia }], plan: 'Commercial PM', status: 'Active', frequency: 'Semi-Annual', startDate: '2022-08-20', renewalDate: day(63), nextServiceDate: day(9), price: 9400, billingCycle: 'Per Visit', benefits: 'Switchgear torque check, IR scan, breaker exercise, arc flash label verification.', autoRenew: false },
    { id: id('agreements'), title: 'Alvarez — residential safety check', customer: [{ id: c.alvarez }], property: [{ id: p.alvarez }], plan: 'Residential Safety Check', status: 'Pending Renewal', frequency: 'Annual', startDate: '2024-03-18', renewalDate: day(-4), nextServiceDate: day(11), price: 349, billingCycle: 'Annual Upfront', benefits: 'Annual panel and device inspection, smoke/CO check, 10% discount, no trip charge.', autoRenew: false },
  ];

  const assets: RecordValue[] = [
    { id: id('assets'), name: 'Truck 1 — 2022 Ford Transit 250', kind: 'Vehicle', identifier: '1FTBR1C8XNKA44120', status: 'In Service', purchasedOn: '2022-05-14', lastServiceDate: day(-48), nextServiceDate: day(12), registrationExpires: day(140), odometer: 74210 },
    { id: id('assets'), name: 'Truck 2 — 2020 Ram ProMaster 2500', kind: 'Vehicle', identifier: '3C6TRVDG4LE110882', status: 'In Shop', purchasedOn: '2020-09-02', lastServiceDate: day(-2), nextServiceDate: day(88), registrationExpires: day(-6), odometer: 112480, notes: 'Registration expired. In the shop for brakes — back Thursday.' },
    { id: id('assets'), name: 'Truck 3 — 2019 Chevy Express 2500', kind: 'Vehicle', identifier: '1GCWGAFP4K1234567', status: 'In Service', purchasedOn: '2019-03-11', lastServiceDate: day(-20), nextServiceDate: day(70), registrationExpires: day(240), odometer: 138900 },
    { id: id('assets'), name: 'FLIR E8-XT thermal camera', kind: 'Thermal Camera', identifier: 'FLIR-E8XT-77341', status: 'In Service', purchasedOn: '2023-02-08', calibrationDue: day(21), notes: 'Annual calibration cert required for insurer-accepted reports.' },
    { id: id('assets'), name: 'Fluke 1587 insulation tester', kind: 'Test Equipment', identifier: 'FLK-1587-22910', status: 'In Service', purchasedOn: '2021-11-30', calibrationDue: day(-9), notes: 'Calibration overdue — pull from service until returned.' },
    { id: id('assets'), name: 'Fluke 376 FC clamp meter', kind: 'Test Equipment', identifier: 'FLK-376-55120', status: 'In Service', calibrationDue: day(115) },
  ];

  const interactions: RecordValue[] = [
    { id: id('interactions'), summary: 'Dee approved Building D panel quote', customer: [{ id: c.harborView }], channel: 'Email', occurredAt: at(-11, 10, 15), owner: [{ id: t.jo }], outcome: 'Booked Job', sentiment: 'Promoter', details: 'Approved EST-2026-0059 in writing. Wants the work scheduled around tenant notice — 48h minimum.' },
    { id: id('interactions'), summary: 'Marisol asked about financing for the panel', customer: [{ id: c.delgado }], channel: 'Inbound Call', occurredAt: at(-1, 14, 30), owner: [{ id: t.jo }], outcome: 'Follow Up Needed', followUpOn: day(2), sentiment: 'Neutral', details: 'Quote is at the top of her budget. Asked whether we offer 12-month financing. Sent the lender link.' },
    { id: id('interactions'), summary: 'Devon Quinn — EV charger inquiry from Instagram', customer: [{ id: c.quinn }], channel: 'Web Form', occurredAt: at(-3, 9, 5), owner: [{ id: t.jo }], outcome: 'Quote Requested', followUpOn: day(1), sentiment: 'Neutral', details: 'Hasn’t bought the car yet. Wants a ballpark before committing. Sent the EV guide, offered a free site assessment.' },
    { id: id('interactions'), summary: 'Meridian AP — payment status on INV-0401', customer: [{ id: c.meridian }], channel: 'Outbound Call', occurredAt: at(-4, 11, 0), owner: [{ id: t.jo }], outcome: 'Follow Up Needed', followUpOn: day(1), sentiment: 'Detractor', details: 'AP says the invoice is "in the approval queue." Third call on this one. Lien deadline is in 8 days — escalating to Marcus.' },
    { id: id('interactions'), summary: 'Gabriela left a 5-star review', customer: [{ id: c.alvarez }], channel: 'Review', occurredAt: at(-5, 16, 45), owner: [{ id: t.jo }], outcome: 'Info Only', sentiment: 'Promoter', details: '"Dana explained everything and cleaned up better than he found it." Asked for permission to use the quote in marketing.' },
    { id: id('interactions'), summary: 'Sam Ruiz — chiller down again', customer: [{ id: c.tresPinos }], channel: 'Inbound Call', occurredAt: at(-2, 7, 20), owner: [{ id: t.jo }], outcome: 'Booked Job', sentiment: 'Neutral', details: 'Second trip in three weeks. Told him the contactor is on order and we would prioritize the install.' },
    { id: id('interactions'), summary: 'Hank confirmed the monthly shutdown window', customer: [{ id: c.sandia }], channel: 'Email', occurredAt: at(-7, 8, 10), owner: [{ id: t.marcus }], outcome: 'Booked Job', sentiment: 'Promoter', details: 'Plant down the 2nd Sunday. Booked the switchgear PM for that window.' },
    { id: id('interactions'), summary: 'Complaint — tenant, Building D hallway dark', customer: [{ id: c.harborView }], job: [{ id: job.harborHall }], channel: 'Complaint', occurredAt: at(0, 8, 5), owner: [{ id: t.jo }], outcome: 'Escalated', sentiment: 'Detractor', details: 'Third-floor tenant called the property manager directly. Dana dispatched for the afternoon window.' },
  ];

  const tasks: RecordValue[] = [
    { id: id('tasks'), title: 'Call Meridian AP — lien deadline in 8 days', status: 'In Progress', priority: 'High', assignee: [{ id: t.jo }], dueDate: day(1), customer: [{ id: c.meridian }], category: 'Collections', notes: 'If no commitment by Friday, send the intent-to-lien letter.' },
    { id: id('tasks'), title: 'Schedule re-inspection for Vista Ridge rough-in', status: 'To Do', priority: 'High', assignee: [{ id: t.tomas }], dueDate: day(0), job: [{ id: job.vistaRough }], category: 'Schedule Inspection', notes: 'Nail plates and box fill corrected. County wants 24h notice.' },
    { id: id('tasks'), title: 'Chase the backordered chiller contactor', status: 'To Do', priority: 'High', assignee: [{ id: t.jo }], dueDate: day(1), job: [{ id: job.tresChiller }], category: 'Order Parts' },
    { id: id('tasks'), title: 'Dana — NFPA 70E recert expires in 41 days', status: 'To Do', priority: 'Medium', assignee: [{ id: t.marcus }], dueDate: day(20), category: 'Admin' },
    { id: id('tasks'), title: 'Tomás license renewal — do not schedule permitted work', status: 'In Progress', priority: 'High', assignee: [{ id: t.marcus }], dueDate: day(3), category: 'Admin', notes: 'Renewal packet mailed. Confirm with the state board.' },
    { id: id('tasks'), title: 'Send Alvarez the knob & tube follow-up', status: 'To Do', priority: 'Medium', assignee: [{ id: t.jo }], dueDate: day(2), customer: [{ id: c.alvarez }], category: 'Quote Follow Up', notes: 'EST-2026-0061 sent 5 days ago, no response yet.' },
    { id: id('tasks'), title: 'Pull the Fluke 1587 from service — calibration overdue', status: 'To Do', priority: 'High', assignee: [{ id: t.marcus }], dueDate: day(0), category: 'Admin' },
    { id: id('tasks'), title: 'Renew Alvarez residential safety agreement', status: 'To Do', priority: 'Low', assignee: [{ id: t.jo }], dueDate: day(5), customer: [{ id: c.alvarez }], category: 'Follow Up' },
  ];

  const documents: RecordValue[] = [
    { id: id('documents'), title: 'Sandia Machine arc flash study (2024)', kind: 'Other', file: photo('Arc flash study', 'slate'), customer: [{ id: c.sandia }], property: [{ id: p.sandia }], date: '2024-07-19', expiresOn: day(670) },
    { id: id('documents'), title: 'Harbor View master service agreement', kind: 'Contract', file: photo('Service agreement', 'slate'), customer: [{ id: c.harborView }], date: '2022-04-01', expiresOn: day(28) },
    { id: id('documents'), title: 'Certificate of insurance — Meridian additional insured', kind: 'Certificate of Insurance', file: photo('COI', 'slate'), customer: [{ id: c.meridian }], date: day(-190), expiresOn: day(175) },
    { id: id('documents'), title: 'Alvarez load calculation, 200A service', kind: 'Load Calculation', file: photo('Load calc', 'blue'), customer: [{ id: c.alvarez }], job: [{ id: job.alvarezPanel }], property: [{ id: p.alvarez }], date: day(-7) },
    { id: id('documents'), title: 'Vista Ridge panel schedules, lots 14–16', kind: 'Panel Schedule', file: photo('Panel schedule', 'blue'), customer: [{ id: c.meridian }], job: [{ id: job.vistaRough }], date: day(-30) },
  ];

  return {
    customers: s.customers, contacts: s.contacts, properties: s.properties, interactions,
    jobs, jobPhotos, tasks,
    estimates, lineItems, invoices, payments,
    technicians: s.technicians, timeEntries,
    materials, materialUsage, vendors, purchaseOrders,
    permits, safety, agreements, assets, documents,
  };
}
