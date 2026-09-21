import type { RecordValue } from '../schema';

/**
 * Standalone dataset mirroring the Tarango Electric OS.
 *
 * The Rate Book and Service Territory rows are the real published ones — they
 * are the numbers and the town gate the business actually runs on, so the app
 * behaves correctly even before Notion credentials are wired up. Jobs and
 * customers are illustrative.
 */

const DAY = 86_400_000;

function day(offset: number): string {
  return new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
}

function at(offset: number, hour = 8, minute = 0): string {
  const d = new Date(Date.now() + offset * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

let seq = 0;
const id = (table: string) => `demo-${table}-${++seq}`;

function photo(label: string, tone: string) {
  return [{ name: `${label}.jpg`, url: `/api/placeholder/photo?label=${encodeURIComponent(label)}&tone=${tone}` }];
}

/* ------------------------------------------------------------------ *
 * Rate Book — the published card
 * ------------------------------------------------------------------ */

const RATES: [string, string, number, string][] = [
  ['Diagnostic — residential', 'Labor / dispatch', 119, 'First hour, credited if repair approved same visit'],
  ['Commercial diagnostic', 'Labor / dispatch', 149, 'First hour, credited'],
  ['Commercial hourly', 'Labor / dispatch', 125, 'After first hour'],
  ['Residential hourly', 'Labor / dispatch', 100, 'Only if not on the flat card'],
  ['Travel Zone B', 'Labor / dispatch', 45, '25-40 miles from Bolivar'],
  ['Travel Zone C', 'Labor / dispatch', 85, 'Over 40 miles from Bolivar'],
  ['Travel beyond 25 mi', 'Labor / dispatch', 1, 'Per mile from Bolivar'],
  ['After hours multiplier', 'Labor / dispatch', 1.5, 'Times diagnostic. Evenings/Sat.'],
  ['Well/pump circuit', 'Residential flat', 550, 'Panel within 40 ft'],
  ['EVSE near panel', 'Residential flat', 750, 'Within 25 ft; unit extra'],
  ['Welder 50A shop circuit', 'Residential flat', 850, 'Capacity exists'],
  ['Smoke/CO existing', 'Residential flat', 185, 'Device extra'],
  ['AFCI/GFCI breaker', 'Residential flat', 260, 'Per pole'],
  ['Bath fan existing duct', 'Residential flat', 285, 'Fan extra'],
  ['Fan new circuit + brace', 'Residential flat', 475, 'Panel within 40 ft'],
  ['EVSE long run', 'Residential flat', 1350, 'Labor only; load calc required'],
  ['240V appliance circuit', 'Residential flat', 650, 'Range/dryer, capacity exists'],
  ['Breaker replace standard', 'Residential flat', 220, 'Like-for-like'],
  ['New receptacle accessible', 'Residential flat', 255, 'Fishable run'],
  ['Ceiling fan existing box', 'Residential flat', 265, 'Braced'],
  ['Whole-home surge', 'Residential flat', 500, 'Panel mount'],
  ['Service to 200A', 'Residential flat', 3000, 'Meter mast panel; permit extra'],
  ['GFCI receptacle', 'Residential flat', 165, 'Existing location; materials extra'],
  ['Receptacle replace', 'Residential flat', 140, 'Existing box'],
  ['200A panel swap', 'Residential flat', 1900, 'Same location; permit extra'],
  ['Switch / dimmer', 'Residential flat', 145, 'Existing box'],
  ['Dedicated 20A circuit', 'Residential flat', 450, 'Panel within 40 ft'],
  ['Panel schedule / circuit ID', 'Commercial / critical', 225, 'Up to 42 circuits'],
  ['HVAC disconnect + whip', 'Commercial / critical', 325, '30-60A accessible'],
  ['Occupancy sensor', 'Commercial / critical', 195, 'Existing box'],
  ['Disconnect replace 30-60A', 'Commercial / critical', 285, 'Like-for-like'],
  ['Resi generator annual', 'Commercial / critical', 325, 'Report + transfer if safe'],
  ['Load-bank labor', 'Commercial / critical', 750, 'Rental passed through'],
  ['Comm generator annual', 'Commercial / critical', 650, 'Per unit + report'],
  ['ATS service visit', 'Commercial / critical', 425, 'Transfer test'],
  ['LOTO / 70E add-on', 'Commercial / critical', 75, 'Written procedure that visit'],
  ['Thermal scan + report', 'Commercial / critical', 275, 'One gear room or ATS'],
  ['Exit/emergency light', 'Commercial / critical', 245, 'Unit extra'],
  ['Keep Power Basic', 'Agreement', 695, '1 visit, report, no-load'],
  ['Keep Power Standard', 'Agreement', 1550, '2 visits, transfer, thermal'],
  ['Keep Power Critical', 'Agreement', 3200, 'Do not sell response you cannot staff'],
];

/* ------------------------------------------------------------------ *
 * Service Territory — the town gate
 * ------------------------------------------------------------------ */

const TOWNS: [string, string, string, string, string, string][] = [
  ['Bolivar', 'GO', 'City', 'Yes', 'Green', 'Confirm clerk: no local electrical license. Business license + permits still apply.'],
  ['Buffalo', 'GO', 'City', 'Yes', 'Green', 'Dallas County seat. Confirm no local electrical license.'],
  ['Marshfield', 'GO', 'City', 'Yes', 'Green', 'Webster County seat. Confirm no local electrical license.'],
  ['Dallas County unincorporated', 'GO', 'County unincorporated', 'Yes', 'Green', 'Core GO. Permit if AHJ requires.'],
  ['Webster County unincorporated', 'GO', 'County unincorporated', 'Yes', 'Green', 'Core GO.'],
  ['Polk County unincorporated', 'GO', 'County unincorporated', 'Yes', 'Green', 'Not Springfield / Greene. Confirm any county permit.'],
  ['Springfield', 'NO-GO', 'City', 'Decline', 'Red', 'City electrician trade certification + contractor license.'],
  ['Branson', 'NO-GO', 'City', 'Decline', 'Red', 'Closed until licensed.'],
  ['Joplin', 'NO-GO', 'City', 'Decline', 'Red', 'City electrical license / ICC exam path.'],
  ['Kansas City MO', 'NO-GO', 'Metro / suburb', 'Decline', 'Red', 'KCMO electrical contractor + certificate of qualification.'],
  ["Lee's Summit", 'NO-GO', 'Metro / suburb', 'Decline', 'Red', 'Class D electrical contractor.'],
  ['Lebanon', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Laclede County. Call before first job.'],
  ['Monett', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'License status unverified.'],
  ['Republic', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Greene County gravity. Permits likely. License unknown until clerk says.'],
  ['Nevada', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Vernon County. Confirm permits.'],
  ['Sedalia', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Pettis County. License status unverified.'],
  ['St. Joseph', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Buchanan County. Confirm before quoting.'],
  ['Nixa', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Christian County. Call before first job.'],
  ['Carthage', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Jasper County. Confirm permits.'],
  ['Warrensburg', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Johnson County. License status unverified.'],
  ['Ozark', 'VERIFY', 'City', 'Call AHJ first', 'Amber', 'Permits published. License status unverified.'],
];

export function buildDemoData(): Record<string, RecordValue[]> {
  const cust = {
    hollis: id('customers'), reeder: id('customers'), mcafee: id('customers'),
    pinegrove: id('customers'), tarango: id('customers'), dawson: id('customers'),
  };

  const customers: RecordValue[] = [
    { id: cust.hollis, name: 'Dale Hollis', phone: '417-555-0142', email: 'dhollis@example.com', address: '1880 S Muleshoe Trail', town: 'Dallas Co', kind: 'Homeowner', stage: 'Active', foundUs: 'HVAC referral', notes: 'Well house on the back forty. Gate code 4412, dog is friendly.', jobs: [], jobCount: 2 },
    { id: cust.reeder, name: 'Reeder Farm & Shop', phone: '417-555-0188', email: 'office@reederfarm.example', address: '4402 Hwy 32', town: 'Polk Co', kind: 'Farm', stage: 'Repeat', foundUs: 'Repeat', notes: 'Grain dryer and shop. 200A service, room on the panel.', jobs: [], jobCount: 3 },
    { id: cust.mcafee, name: 'Janice McAfee', phone: '417-555-0119', address: '318 E Jackson St', town: 'Bolivar', kind: 'Homeowner', stage: 'New', foundUs: 'Magnet', notes: 'Kitchen receptacles dead on one wall.', jobs: [], jobCount: 1 },
    { id: cust.pinegrove, name: 'Pine Grove Care Center', phone: '417-555-0233', email: 'maint@pinegrove.example', address: '900 N Oakland Ave', town: 'Bolivar', kind: 'Commercial', stage: 'Active', foundUs: 'Walk-in', notes: 'Generator and ATS under a Keep Power Standard. Monthly exercise on record.', jobs: [], jobCount: 2 },
    { id: cust.tarango, name: 'Corey Tarango', phone: '417-501-4752', town: 'Dallas Co', kind: 'Homeowner', stage: 'New', foundUs: 'Phone', notes: 'Own property. Test tickets.', jobs: [], jobCount: 1 },
    { id: cust.dawson, name: 'Rhonda Dawson', phone: '417-555-0321', address: '77 W Commercial St', town: 'Springfield', kind: 'Homeowner', stage: 'Do not serve', foundUs: 'Google', notes: 'Springfield. Declined politely — outside the footprint until licensed.', jobs: [], jobCount: 1 },
  ];

  const job = {
    hollisWell: id('jobs'), mcafeeKitchen: id('jobs'), reederDryer: id('jobs'),
    pinegroveAts: id('jobs'), hollisSurge: id('jobs'), dawsonNoGo: id('jobs'),
    reederShop: id('jobs'), muleshoe: id('jobs'),
  };

  const jobs: RecordValue[] = [
    {
      id: job.hollisWell, name: 'Hollis — well pump circuit dead', jobNumber: 'TE-7', status: 'In Progress', type: 'Residential',
      source: 'HVAC referral', town: 'Dallas Co', permit: 'None', address: '1880 S Muleshoe Trail', phone: '417-555-0142',
      window: 'Today 8–10 AM', callIn: day(-2), onSite: day(0), amount: 550, installHours: 0, driveHours: 0,
      nextAction: 'Pull the pressure switch cover and meter the run.', notes: 'Well house 180 ft off the panel. Direct burial suspect.',
      estHours: 3, estTravelMin: 22, arrived: at(0, 8, 12),
      siteConditions: 'Gate code 4412. Two dogs, friendly. Well house is 180 ft behind the shop, no light in there — bring the work light. Panel is a Homeline 100A in the utility room.',
      diagnosis: 'No voltage at the pressure switch. 240V present at the breaker, so the fault is in the run. Direct burial, no conduit, crosses the drive where he had a trencher in last spring.',
      signed: false, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: false, photos: false, hiddenDamage: false,
      customer: [{ id: cust.hollis }], hourEntries: [], hoursLogged: 0, play: 'Invoice it',
    },
    {
      id: job.mcafeeKitchen, name: 'McAfee — kitchen receptacles dead one wall', jobNumber: 'TE-8', status: 'Booked', type: 'Residential',
      source: 'Magnet', town: 'Bolivar', permit: 'None', address: '318 E Jackson St', phone: '417-555-0119',
      window: 'Tomorrow 10–12', callIn: day(-1), onSite: day(1), amount: 119, installHours: 0, driveHours: 0,
      nextAction: 'Text her the window tonight.', notes: 'Sounds like a back-stabbed receptacle upstream. Diagnostic $119, credited if repaired same visit.',
      signed: false, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: false, photos: false, hiddenDamage: false,
      customer: [{ id: cust.mcafee }], hourEntries: [], hoursLogged: 0, play: 'Set the window',
    },
    {
      id: job.reederDryer, name: 'Reeder — grain dryer disconnect + whip', jobNumber: 'TE-5', status: 'Invoiced', type: 'Farm / Shop',
      source: 'Repeat', town: 'Polk Co', permit: 'None', address: '4402 Hwy 32', phone: '417-555-0188',
      window: 'Thu all day', callIn: day(-9), onSite: day(-4), amount: 1285, installHours: 6.5, driveHours: 1.25,
      nextAction: 'Collect. Net 15 written on the invoice.', notes: 'Net 15 — established farm account.',
      estHours: 6, estTravelMin: 34, arrived: at(-4, 8, 5), departed: at(-4, 15, 20),
      siteConditions: 'Shop panel has room. Dryer pad is 40 ft off the shop wall, clear run.',
      diagnosis: 'No disconnect within sight of the dryer. Existing whip was undersized and heat-damaged at the fitting.',
      workPerformed: 'Installed 60A fused disconnect within sight of the unit, new liquidtight whip, re-terminated at the dryer. Torqued to 275 in-lb and marked.',
      testResults: 'Phase A 241V, phase B 240V. Balanced at 1.2%. Megger 500V, >100 MΩ to ground.',
      recommendations: 'Shop panel is full. If he adds the second dryer he will need a sub-panel — worth quoting this winter.',
      signedBy: 'Hal Reeder', paymentMethod: 'Net 15',
      signed: true, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: true, photos: true, hiddenDamage: false,
      customer: [{ id: cust.reeder }], hourEntries: [], hoursLogged: 6.5, play: 'Run closeout',
    },
    {
      id: job.pinegroveAts, name: 'Pine Grove — ATS annual transfer test', jobNumber: 'TE-4', status: 'Closed', type: 'Standby / Critical',
      source: 'Walk-in', town: 'Bolivar', permit: 'None', address: '900 N Oakland Ave', phone: '417-555-0233',
      window: 'Sun 6 AM', callIn: day(-20), onSite: day(-14), amount: 425, installHours: 4, driveHours: 0.5,
      nextAction: 'Report filed. Next annual on the calendar.', notes: 'Transfer tested under load. Battery at 12.4V, logged.',
      signed: true, depositIn: false, paid: true, closeoutDone: true, reviewAsked: true, magnets: true, photos: true, hiddenDamage: false,
      customer: [{ id: cust.pinegrove }], hourEntries: [], hoursLogged: 4, play: 'Done',
    },
    {
      id: job.hollisSurge, name: 'Hollis — whole-home surge + panel label', jobNumber: 'TE-6', status: 'Quoted', type: 'Residential',
      source: 'Repeat', town: 'Dallas Co', permit: 'None', address: '1880 S Muleshoe Trail', phone: '417-555-0142',
      window: 'Next week', callIn: day(-5), onSite: day(3), amount: 725, installHours: 0, driveHours: 0,
      nextAction: 'Follow up tomorrow morning.', notes: 'Surge $500 plus panel schedule $225. Quoted off the card.',
      signed: false, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: false, photos: false, hiddenDamage: false,
      customer: [{ id: cust.hollis }], hourEntries: [], hoursLogged: 0, play: 'Follow up',
    },
    {
      id: job.dawsonNoGo, name: 'Dawson — Springfield panel swap', jobNumber: 'TE-3', status: 'No-go', type: 'Residential',
      source: 'Google', town: 'Other — STOP', permit: 'None', address: '77 W Commercial St, Springfield', phone: '417-555-0321',
      callIn: day(-12), amount: 0, installHours: 0, driveHours: 0,
      nextAction: 'Stop. Declined politely.', notes: 'Springfield requires city trade certification. Told her straight, offered no quote.',
      signed: false, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: false, photos: false, hiddenDamage: false,
      customer: [{ id: cust.dawson }], hourEntries: [], hoursLogged: 0, play: 'Stop',
    },
    {
      id: job.reederShop, name: 'Reeder — welder 50A shop circuit', jobNumber: 'TE-2', status: 'Closed', type: 'Farm / Shop',
      source: 'Repeat', town: 'Polk Co', permit: 'None', address: '4402 Hwy 32', phone: '417-555-0188',
      callIn: day(-34), onSite: day(-28), amount: 850, installHours: 7, driveHours: 1.5,
      nextAction: 'Closed.', notes: 'Capacity existed. Straight run to the shop wall.',
      signed: true, depositIn: false, paid: true, closeoutDone: true, reviewAsked: true, magnets: true, photos: true, hiddenDamage: true,
      customer: [{ id: cust.reeder }], hourEntries: [], hoursLogged: 7, play: 'Done',
    },
    {
      id: job.muleshoe, name: '100 Muleshoe Trail', jobNumber: 'TE-9', status: 'New call', type: 'Residential',
      source: 'Phone', town: 'Dallas Co', permit: 'None', address: '100 Muleshoe Trail Elkland, MO',
      callIn: day(0), amount: 0, installHours: 0, driveHours: 0,
      nextAction: 'Ask town. If green, book diagnostic $119.',
      signed: false, depositIn: false, paid: false, closeoutDone: false, reviewAsked: false, magnets: false, photos: false, hiddenDamage: false,
      customer: [{ id: cust.tarango }], hourEntries: [], hoursLogged: 0, play: 'Capture and qualify',
    },
  ];

  for (const c of customers) {
    c.jobs = jobs.filter((j) => (j.customer as { id: string }[])?.[0]?.id === c.id).map((j) => ({ id: j.id }));
    c.jobCount = (c.jobs as unknown[]).length;
  }

  const jobPhotos: RecordValue[] = [
    { id: id('jobPhotos'), caption: 'Panel cover off, before', file: photo('Panel cover off', 'charcoal'), job: [{ id: job.reederDryer }], stage: 'Before', takenAt: at(-4, 8, 20), location: 'Shop panel, north wall', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'Dryer nameplate — 240V 30A', file: photo('Dryer nameplate', 'gold'), job: [{ id: job.reederDryer }], stage: 'Panel / nameplate', takenAt: at(-4, 8, 35), location: 'Grain dryer', customerOk: true, notes: 'FLA 24.6A. Whip sized off this.' },
    { id: id('jobPhotos'), caption: 'Disconnect and whip complete', file: photo('Disconnect complete', 'go'), job: [{ id: job.reederDryer }], stage: 'Completed work', takenAt: at(-4, 14, 10), location: 'Dryer pad', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'Lugs torqued and marked', file: photo('Lugs torqued', 'charcoal'), job: [{ id: job.reederDryer }], stage: 'Torque / labeling', takenAt: at(-4, 14, 22), location: 'Disconnect', customerOk: true, notes: '275 in-lb, torque-marked.' },
    { id: id('jobPhotos'), caption: 'ATS cabinet before test', file: photo('ATS cabinet', 'charcoal'), job: [{ id: job.pinegroveAts }], stage: 'Before', takenAt: at(-14, 6, 15), location: 'Generator room', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'ATS nameplate and serial', file: photo('ATS nameplate', 'gold'), job: [{ id: job.pinegroveAts }], stage: 'Panel / nameplate', takenAt: at(-14, 6, 24), location: 'Generator room', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'Transfer test passed under load', file: photo('Transfer test passed', 'go'), job: [{ id: job.pinegroveAts }], stage: 'Completed work', takenAt: at(-14, 9, 40), location: 'Generator room', customerOk: true, notes: 'Transferred in 9 seconds. Battery 12.4V.' },
    { id: id('jobPhotos'), caption: 'Burnt bus behind the shop panel cover', file: photo('Burnt bus', 'hazard'), job: [{ id: job.reederShop }], stage: 'Hidden damage', takenAt: at(-28, 10, 5), location: 'Shop panel', customerOk: true, notes: 'Not visible when he signed. Showed him on his phone, wrote a change line.' },
    { id: id('jobPhotos'), caption: 'Shop panel, before', file: photo('Shop panel before', 'charcoal'), job: [{ id: job.reederShop }], stage: 'Before', takenAt: at(-28, 8, 0), location: 'Shop', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'Welder circuit complete and labeled', file: photo('Welder circuit', 'go'), job: [{ id: job.reederShop }], stage: 'Completed work', takenAt: at(-28, 15, 30), location: 'Shop wall', customerOk: true, notes: '' },
    { id: id('jobPhotos'), caption: 'Shop panel schedule filled in', file: photo('Panel schedule', 'gold'), job: [{ id: job.reederShop }], stage: 'Panel / nameplate', takenAt: at(-28, 15, 40), location: 'Shop panel', customerOk: true, notes: '' },
  ];

  const hourLedger: RecordValue[] = [
    { id: id('hourLedger'), name: 'Prior employment — opening balance', job: [], source: 'Prior employer', installHours: 5800, date: day(-420), affidavit: false, notes: 'Replace with verified Dynalectric / Local 640 letters. Do not treat as final until documented.' },
    { id: id('hourLedger'), name: 'Reeder — grain dryer disconnect — Polk Co', job: [{ id: job.reederDryer }], source: 'Self-performed', installHours: 6.5, date: day(-4), affidavit: true, notes: 'Logged from the field app closeout.' },
    { id: id('hourLedger'), name: 'Pine Grove — ATS annual — Bolivar', job: [{ id: job.pinegroveAts }], source: 'Self-performed', installHours: 4, date: day(-14), affidavit: true, notes: 'Logged from the field app closeout.' },
    { id: id('hourLedger'), name: 'Reeder — welder circuit — Polk Co', job: [{ id: job.reederShop }], source: 'Self-performed', installHours: 7, date: day(-28), affidavit: true, notes: 'Logged from the field app closeout.' },
    { id: id('hourLedger'), name: 'NFPA 70E refresher', job: [], source: 'Training', installHours: 8, date: day(-45), affidavit: true, notes: 'Certificate on file.' },
  ];

  for (const j of jobs) {
    j.hourEntries = hourLedger.filter((h) => (h.job as { id: string }[])?.[0]?.id === j.id).map((h) => ({ id: h.id }));
  }

  const rateBook: RecordValue[] = RATES.map(([name, book, price, assumes]) => ({
    id: id('rateBook'), name, book, price, assumes, active: true,
  }));

  const territory: RecordValue[] = TOWNS.map(([name, status, kind, schedule, crmColor, licenseNote]) => ({
    id: id('territory'), name, status, kind, schedule, crmColor, licenseNote,
  }));

  const referrals: RecordValue[] = [
    { id: id('referrals'), name: "David's Heating & Cooling", kind: 'HVAC', status: 'Active', phone: '417-327-6760', notes: '327 E Chestnut / also 4440 S 170th. Bryant dealer. Covers Polk + Dallas + Hickory.' },
    { id: id('referrals'), name: 'Dallas County Propane', kind: 'Propane', status: 'Introduced', phone: '417-345-7928', notes: '904 W Dallas St, Buffalo.' },
    { id: id('referrals'), name: 'FHS / Family Home Solutions', kind: 'Rental', status: 'Not called', phone: '417-942-6000', notes: 'Springfield. Marshfield in some directories. Green towns only.' },
    { id: id('referrals'), name: 'Southwest Electric Cooperative', kind: 'Co-op', status: 'Introduced', phone: '417-326-5231', notes: 'Bolivar. Ask about their contractor list.' },
    { id: id('referrals'), name: 'Buffalo Hardware & Rental', kind: 'Rental', status: 'Not called', phone: '417-345-2211', notes: 'Counter guy knows every farm in the county.' },
    { id: id('referrals'), name: 'Marshfield Heating', kind: 'HVAC', status: 'Not called', phone: '417-468-3311', notes: 'Webster County. Walk in with magnets.' },
  ];

  const equipment: RecordValue[] = [
    { id: id('equipment'), name: 'Pine Grove — Generac 48kW', kind: 'Generator', agreement: 'Standard', makeModel: 'Generac RG04854', site: '900 N Oakland Ave, Bolivar', nextService: day(12) },
    { id: id('equipment'), name: 'Pine Grove — ATS 200A', kind: 'ATS', agreement: 'Standard', makeModel: 'Generac RTSW200A3', site: '900 N Oakland Ave, Bolivar', nextService: day(12) },
    { id: id('equipment'), name: 'Reeder Farm — shop panel', kind: 'Panel', agreement: 'Basic', makeModel: 'Square D QO 200A', site: '4402 Hwy 32, Polk Co', nextService: day(96) },
    { id: id('equipment'), name: 'Hollis — well house panel', kind: 'Panel', agreement: 'None', makeModel: 'Homeline 100A', site: '1880 S Muleshoe Trail', nextService: day(-6) },
  ];

  const permits: RecordValue[] = [
    { id: id('permits'), name: 'Bolivar city hall', office: 'Bolivar', contact: 'City clerk, 417-326-5265', confirmed: day(-18), feeNotes: 'Business license annual. Electrical permit per job where required.', permitTrigger: 'Service change, new circuit, panel swap' },
    { id: id('permits'), name: 'Dallas County', office: 'Dallas Co', contact: 'County clerk, Buffalo', confirmed: day(-30), feeNotes: 'No county electrical permit confirmed for unincorporated.', permitTrigger: 'Confirm per job — AHJ may still ask' },
    { id: id('permits'), name: 'Marshfield city hall', office: 'Marshfield', contact: 'City clerk', confirmed: '', feeNotes: 'Not confirmed yet.', permitTrigger: 'Call before the first Marshfield job' },
  ];

  /* --- the van ------------------------------------------------------ */
  const stock: [string, string, number, number, string, number, number, string][] = [
    ['12/2 NM-B, 250 ft roll', 'Wire & Cable', 2, 2, 'roll', 142, 213, 'Bulk rack'],
    ['14/2 NM-B, 250 ft roll', 'Wire & Cable', 1, 2, 'roll', 98, 152, 'Bulk rack'],
    ['12/3 NM-B, 250 ft roll', 'Wire & Cable', 1, 1, 'roll', 196, 295, 'Bulk rack'],
    ['6/3 NM-B, per ft', 'Wire & Cable', 60, 50, 'ft', 4.4, 7.4, 'Bulk rack'],
    ['THHN #12 black, 500 ft', 'Wire & Cable', 1, 1, 'roll', 78, 118, 'Bulk rack'],
    ['QO 20A 1-pole breaker', 'Breakers', 8, 6, 'ea', 11, 24, 'Bin A'],
    ['QO 20A AFCI breaker', 'Breakers', 3, 4, 'ea', 48, 79, 'Bin A'],
    ['QO 50A 2-pole breaker', 'Breakers', 1, 2, 'ea', 26, 52, 'Bin A'],
    ['Homeline 20A 1-pole', 'Breakers', 6, 4, 'ea', 8, 19, 'Bin A'],
    ['GFCI receptacle 20A TR', 'Devices', 9, 6, 'ea', 18.5, 39, 'Bin B'],
    ['Receptacle 15A TR, white', 'Devices', 22, 12, 'ea', 1.4, 6, 'Bin B'],
    ['Single-pole switch, white', 'Devices', 14, 10, 'ea', 1.6, 7, 'Bin B'],
    ['3-way switch, white', 'Devices', 5, 4, 'ea', 3.2, 12, 'Bin B'],
    ['NEMA 14-50 receptacle', 'Devices', 0, 1, 'ea', 86, 165, 'Bin C'],
    ['4-square box, 2-1/8 deep', 'Boxes & Covers', 11, 8, 'ea', 2.1, 7, 'Bin D'],
    ['Old-work box, 1-gang', 'Boxes & Covers', 18, 12, 'ea', 1.8, 6, 'Bin D'],
    ['Weatherproof cover, 1-gang', 'Boxes & Covers', 3, 4, 'ea', 9, 22, 'Bin D'],
    ['EMT 3/4 in, 10 ft', 'Conduit & Fittings', 6, 6, 'ea', 12.8, 24, 'Ladder rack'],
    ['EMT connector 3/4 in', 'Conduit & Fittings', 20, 12, 'ea', 1.1, 4, 'Bin E'],
    ['Liquidtight whip, 6 ft', 'Conduit & Fittings', 2, 2, 'ea', 28, 58, 'Bin E'],
    ['LED retrofit can, 6 in', 'Lighting', 4, 4, 'ea', 16, 42, 'Shelf'],
    ['Ground rod 5/8 x 8 ft', 'Grounding', 2, 2, 'ea', 21, 44, 'Ladder rack'],
    ['Acorn clamp 5/8', 'Grounding', 7, 6, 'ea', 2.4, 8, 'Bin F'],
    ['Wire nuts, assorted, 500 ct', 'Connectors & Terminals', 1, 1, 'box', 62, 110, 'Bin F'],
    ['Wago 221 lever nuts, 100 ct', 'Connectors & Terminals', 2, 1, 'box', 34, 68, 'Bin F'],
    ['Staples 1/2 in, 250 ct', 'Fasteners', 1, 1, 'box', 9, 20, 'Bin G'],
    ['Wire labels, book', 'Consumables', 1, 1, 'ea', 14, 28, 'Bin G'],
    ['Anti-ox compound', 'Consumables', 0, 1, 'ea', 12, 26, 'Bin G'],
    ['Phase monitor relay', 'Specialty', 0, 1, 'ea', 132, 248, 'Bin C'],
  ];

  const truckInventory: RecordValue[] = stock.map(([name, category, onTruck, minOnTruck, unit, cost, sellPrice, bin]) => ({
    id: id('truckInventory'), name, category, onTruck, minOnTruck, unit, cost, sellPrice, bin,
    supplier: 'City Electric — Bolivar', notes: '',
  }));

  const byName = (n: string) => truckInventory.find((i) => i.name === n)!;

  const jobMaterials: RecordValue[] = [
    { id: id('jobMaterials'), name: 'GFCI receptacle 20A TR', job: [{ id: job.reederDryer }], item: [{ id: byName('GFCI receptacle 20A TR').id }], quantity: 2, unitCost: 18.5, extendedCost: 37, source: 'Truck stock', billable: true, pulledFromTruck: true, usedOn: day(-4), notes: '' },
    { id: id('jobMaterials'), name: 'Liquidtight whip, 6 ft', job: [{ id: job.reederDryer }], item: [{ id: byName('Liquidtight whip, 6 ft').id }], quantity: 1, unitCost: 28, extendedCost: 28, source: 'Truck stock', billable: true, pulledFromTruck: true, usedOn: day(-4), notes: '' },
    { id: id('jobMaterials'), name: '60A disconnect, fused', job: [{ id: job.reederDryer }], quantity: 1, unitCost: 118, extendedCost: 118, source: 'Supply house', billable: true, pulledFromTruck: false, usedOn: day(-4), notes: 'Picked up on the way out.' },
    { id: id('jobMaterials'), name: 'QO 20A AFCI breaker', job: [{ id: job.hollisWell }], item: [{ id: byName('QO 20A AFCI breaker').id }], quantity: 1, unitCost: 48, extendedCost: 48, source: 'Truck stock', billable: true, pulledFromTruck: true, usedOn: day(0), notes: '' },
    { id: id('jobMaterials'), name: '12/2 NM-B, 250 ft roll', job: [{ id: job.reederShop }], item: [{ id: byName('12/2 NM-B, 250 ft roll').id }], quantity: 1, unitCost: 142, extendedCost: 142, source: 'Truck stock', billable: true, pulledFromTruck: true, usedOn: day(-28), notes: '' },
  ];

  for (const j of jobs) {
    j.materials = jobMaterials.filter((m) => (m.job as { id: string }[])?.[0]?.id === j.id).map((m) => ({ id: m.id }));
  }

  return { jobs, jobPhotos, customers, hourLedger, rateBook, territory, permits, referrals, equipment, truckInventory, jobMaterials };
}
