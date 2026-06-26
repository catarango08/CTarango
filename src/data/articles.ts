// Knowledge base content for licensed journeyman wiremen.
//
// NOTE: This material is for study and reference only. Code values change
// between NEC cycles and are amended locally. Always verify against the
// edition of the National Electrical Code (NFPA 70) adopted in your
// jurisdiction and the manufacturer's instructions before doing any work.

export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type Article = {
  slug: string;
  title: string;
  categorySlug: string;
  summary: string;
  tags: string[];
  // Body is Markdown-ish plain text; rendered as paragraphs/lists.
  body: string;
};

export const categories: Category[] = [
  {
    slug: "code-fundamentals",
    name: "NEC Code Fundamentals",
    description:
      "How the National Electrical Code is organized and how to navigate it on the job and on the exam.",
  },
  {
    slug: "conductors-wiring",
    name: "Conductors & Wiring Methods",
    description:
      "Conductor sizing, ampacity, insulation types, and common wiring methods.",
  },
  {
    slug: "overcurrent",
    name: "Overcurrent Protection",
    description:
      "Breakers, fuses, and the rules that keep conductors and equipment from overheating.",
  },
  {
    slug: "grounding-bonding",
    name: "Grounding & Bonding",
    description:
      "The difference between grounding and bonding and how to size the conductors that do each job.",
  },
  {
    slug: "raceways-boxes",
    name: "Raceways & Boxes",
    description:
      "Conduit fill, box fill, and support requirements for raceways and enclosures.",
  },
  {
    slug: "motors-controls",
    name: "Motors & Controls",
    description:
      "Sizing conductors and protection for motors and reading basic control circuits.",
  },
  {
    slug: "calculations",
    name: "Calculations",
    description:
      "Load calcs, voltage drop, and the math a journeyman is expected to do in the field.",
  },
  {
    slug: "safety",
    name: "Safety & Work Practices",
    description:
      "Lockout/tagout, PPE, and NFPA 70E electrical safe work practices.",
  },
];

export const articles: Article[] = [
  // ---------------------------------------------------------------------------
  // Code fundamentals
  // ---------------------------------------------------------------------------
  {
    slug: "how-the-nec-is-organized",
    title: "How the NEC Is Organized",
    categorySlug: "code-fundamentals",
    summary:
      "The chapter structure of NFPA 70 and the fast way to find an answer during an exam or inspection.",
    tags: ["nec", "navigation", "chapters", "exam"],
    body: `The National Electrical Code (NFPA 70) is divided into an introduction (Article 90), nine chapters, and a set of informative annexes.

**The nine chapters**

- Chapter 1 – General (definitions, Article 100; general requirements, Article 110)
- Chapter 2 – Wiring and Protection (branch circuits, feeders, services, grounding)
- Chapter 3 – Wiring Methods and Materials (conductors, boxes, raceways, cables)
- Chapter 4 – Equipment for General Use (receptacles, switches, motors-as-equipment, AC)
- Chapter 5 – Special Occupancies (hazardous locations, health care, places of assembly)
- Chapter 6 – Special Equipment (signs, elevators, pools, PV systems)
- Chapter 7 – Special Conditions (emergency systems, fire pumps, optical fiber)
- Chapter 8 – Communications Systems (mostly stands alone from Chapters 1–7)
- Chapter 9 – Tables (conduit fill, conductor properties, voltage drop)

**The rule of application (90.3)**

Chapters 1 through 4 apply generally. Chapters 5, 6, and 7 supplement or modify the general rules for special situations. Chapter 8 is independent — it only follows Chapters 1–7 where a rule in Chapter 8 specifically references them. Chapter 9 tables are mandatory where referenced.

**Finding an answer fast**

1. Start with the **index** for a keyword, or the **table of contents** if you know the subject area.
2. Jump to the article, then scan the **section numbers** (e.g., 210.8).
3. Read the parent rule before the exception. Exceptions only modify the rule directly above them.

**Mandatory vs. permissive language**

- "Shall" = a requirement.
- "Shall not" = a prohibition.
- "Shall be permitted" = allowed but not required.
- Informational notes are explanatory and are **not enforceable**.`,
  },
  {
    slug: "shall-vs-shall-be-permitted",
    title: "Reading Code Language: Shall, Shall Not, and Exceptions",
    categorySlug: "code-fundamentals",
    summary:
      "Why the exact wording in the NEC matters and how to read exceptions and informational notes.",
    tags: ["nec", "language", "exceptions", "interpretation"],
    body: `Passing the exam and passing inspection both come down to reading the Code precisely.

**Key words**

- **Shall** — mandatory. You must do it.
- **Shall not** — prohibited.
- **Shall be permitted** — optional; one allowed way to comply.
- **Shall not be required** — relief from an otherwise mandatory rule.

**Exceptions**

An exception modifies only the rule it sits under. "Exception No. 1" and "Exception No. 2" are independent unless the text says otherwise. A *mandatory* exception uses "shall"; a *permissive* exception uses "shall be permitted."

**Informational notes**

These explain or point to other standards (for example, a note referencing NFPA 70E). They are guidance only and an inspector cannot cite a violation of an informational note.

**Defined terms**

Article 100 definitions govern the whole Code. If a word is defined there (for example, "dwelling unit," "accessible," "readily accessible," "qualified person"), use that meaning, not the everyday one. Many exam mistakes come from confusing *accessible* with *readily accessible*.`,
  },

  // ---------------------------------------------------------------------------
  // Conductors & wiring
  // ---------------------------------------------------------------------------
  {
    slug: "conductor-ampacity-and-derating",
    title: "Conductor Ampacity, Temperature, and Derating",
    categorySlug: "conductors-wiring",
    summary:
      "Reading Table 310.16, picking the right temperature column, and applying ambient and bundling adjustments.",
    tags: ["ampacity", "310.16", "derating", "temperature", "conductors"],
    body: `Ampacity is the current a conductor can carry continuously without exceeding its temperature rating.

**Use the right temperature column**

Table 310.16 lists 60°C, 75°C, and 90°C columns. The conductor's *insulation* rating sets the highest column you may read from, but **termination ratings (110.14(C)) usually limit you to the 75°C column** for most equipment. The 90°C column is generally used only as a starting point for derating, not for the final terminated ampacity.

**The two big adjustments**

1. **Ambient temperature correction** — Table 310.15(B)(1). If the air around the raceway is hotter than the 30°C basis, multiply by the correction factor (less than 1).
2. **Conductor bundling / fill** — Table 310.15(C)(1). When more than 3 current-carrying conductors share a raceway or cable, apply the adjustment percentage (e.g., 4–6 conductors = 80%, 7–9 = 70%).

**A worked example**

A 90°C THHN copper #8 starts at 55 A in the 90°C column. Six current-carrying conductors in one conduit at 40°C ambient:

- Ambient (40°C, 90°C column): ~0.91
- Fill (4–6 conductors): 0.80
- 55 A × 0.91 × 0.80 = **40 A** adjusted ampacity.

Then verify the terminations: the 75°C value for #8 is 50 A, so the 40 A derated figure governs. Protect at the next standard size down or per 240.4.

**Continuous loads**

For a continuous load (3 hours or more), the conductor and the overcurrent device must be sized at **125%** of the continuous load (or use a 100%-rated assembly).`,
  },
  {
    slug: "conductor-insulation-types",
    title: "Conductor Insulation Types (THHN, THWN, XHHW and Friends)",
    categorySlug: "conductors-wiring",
    summary:
      "What the letters in a conductor's insulation marking mean and where each type can be used.",
    tags: ["insulation", "thhn", "thwn", "xhhw", "wet location"],
    body: `The letters stamped on building wire tell you its rating and where it can go. Read them left to right.

**Decoding the letters**

- **T** — Thermoplastic insulation.
- **H** — Heat resistant (75°C). **HH** — Highly heat resistant (90°C).
- **W** — Suitable for wet locations.
- **N** — Nylon jacket (abrasion/oil/gas resistant).
- **X** — Cross-linked polyethylene (XLPE), as in XHHW.

**Common building wires**

- **THHN** — 90°C **dry** only.
- **THWN** — 75°C wet or dry.
- **THWN-2** — 90°C wet *and* dry (the dual rating is why most modern building wire is dual-marked THHN/THWN-2).
- **XHHW** — 90°C dry, 75°C wet.
- **XHHW-2** — 90°C wet and dry.

**Why it matters**

Conduit underground or in a damp/wet location requires a **wet-location-rated** conductor. A raceway exposed to weather or below grade is a wet location (300.5, 300.9). Pulling plain THHN there is a violation even though the same spool may be dual-rated — check the printing on the jacket.

**Locations defined (Article 100)**

- **Dry** — not normally subject to dampness.
- **Damp** — partially protected, moderate moisture (covered porch).
- **Wet** — underground, in concrete in contact with earth, or exposed to weather.`,
  },

  // ---------------------------------------------------------------------------
  // Overcurrent
  // ---------------------------------------------------------------------------
  {
    slug: "overcurrent-protection-basics",
    title: "Overcurrent Protection: Breakers, Fuses, and 240.4",
    categorySlug: "overcurrent",
    summary:
      "How overcurrent devices protect conductors, the standard ampere ratings, and the small-conductor rules.",
    tags: ["overcurrent", "breaker", "fuse", "240.4", "240.6"],
    body: `Overcurrent protection guards conductors and equipment against current beyond their rating — both overloads and short circuits/ground faults.

**Protect the conductor (240.4)**

As a general rule, a conductor must be protected at its ampacity after derating. Where the ampacity doesn't match a standard device size, **240.4(B)** lets you round **up** to the next standard size if: the device is 800 A or less, the conductor isn't a multioutlet branch circuit to receptacles, and the ampacity doesn't already correspond to a standard size.

**Standard ampere ratings (240.6(A))**

15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800… and up.

**Small-conductor rule (240.4(D))**

Regardless of ampacity, these are the maximum overcurrent ratings for small copper conductors:

- #14 Cu → **15 A**
- #12 Cu → **20 A**
- #10 Cu → **30 A**

(Aluminum: #12 → 15 A, #10 → 25 A.) This rule is a frequent exam item — the derated ampacity may be higher, but you still cap the breaker at these values.

**Overload vs. short circuit**

A breaker has a thermal element (overload, slow) and a magnetic element (short circuit, instantaneous). A fuse may be time-delay (dual-element, motor loads) or fast-acting.`,
  },
  {
    slug: "continuous-load-125-percent",
    title: "The 125% Rule for Continuous Loads",
    categorySlug: "overcurrent",
    summary:
      "When a load counts as continuous and how the 125% factor flows into conductor and breaker sizing.",
    tags: ["continuous load", "125%", "210.19", "215.2", "sizing"],
    body: `A **continuous load** is one expected to run at its maximum current for **3 hours or more** (Article 100).

**The rule**

Where a circuit serves continuous loads, the rating of the overcurrent device and the minimum conductor ampacity (before adjustment) must be at least:

> 100% of the noncontinuous load **+ 125% of the continuous load**

This appears in 210.19/210.20 for branch circuits and 215.2/215.3 for feeders.

**Why 125%**

A standard breaker is calibrated to carry only 80% of its rating continuously inside an enclosure. Sizing at 125% of the continuous load is the inverse of that 80% (1 ÷ 0.8 = 1.25), keeping the device from nuisance-tripping and the terminals from overheating.

**Example**

A panel feeds 40 A of continuous lighting plus a 30 A noncontinuous receptacle load:

- 30 A × 1.00 = 30 A
- 40 A × 1.25 = 50 A
- Minimum OCPD/conductor = **80 A**

Use a 100%-rated assembly and you may size at the actual 70 A instead, but those assemblies are special-listed and uncommon in everyday work.`,
  },

  // ---------------------------------------------------------------------------
  // Grounding & bonding
  // ---------------------------------------------------------------------------
  {
    slug: "grounding-vs-bonding",
    title: "Grounding vs. Bonding: They Are Not the Same Thing",
    categorySlug: "grounding-bonding",
    summary:
      "The job each conductor does, why bonding clears faults, and where the system is grounded only once.",
    tags: ["grounding", "bonding", "egc", "gec", "250"],
    body: `These two words get used interchangeably in the field, but Article 250 treats them as separate jobs.

**Grounding** connects a system or equipment to the **earth**. Its main purpose is to stabilize voltage to ground and dissipate lightning/transient energy. Earth is a *poor* fault-current path — it does **not** clear faults.

**Bonding** connects metal parts together so they are at the **same potential** and creates a **low-impedance path back to the source** so an overcurrent device can open. Bonding is what actually clears a ground fault and protects people.

**The conductors**

- **EGC** (Equipment Grounding Conductor) — bonds equipment enclosures back to the source; sized by **Table 250.122** based on the circuit's overcurrent device.
- **GEC** (Grounding Electrode Conductor) — connects the grounded system to the grounding electrode (ground rod, water pipe, Ufer); sized by **Table 250.66**.
- **Main Bonding Jumper (MBJ)** — ties the grounded (neutral) bus to the enclosure/EGC **at the service** — and only there.

**Grounded once**

The neutral and ground are bonded together **only at the service disconnect** (or the source of a separately derived system). Downstream — at every subpanel — the neutral must be **isolated** from the equipment ground. Bonding them again creates parallel neutral paths and current on metal parts. This is one of the most-cited residential violations.`,
  },
  {
    slug: "sizing-the-egc",
    title: "Sizing the Equipment Grounding Conductor (Table 250.122)",
    categorySlug: "grounding-bonding",
    summary:
      "How to size an EGC from the overcurrent device and the rule for upsizing it when conductors are enlarged.",
    tags: ["egc", "250.122", "grounding", "sizing", "voltage drop"],
    body: `The equipment grounding conductor (EGC) is sized from the rating of the **overcurrent device** ahead of the circuit, using **Table 250.122** — not from the load or the ungrounded conductor size directly.

**Common values (copper)**

- Up to 15 A OCPD → **#14**
- 20 A → **#12**
- 60 A → **#10**
- 100 A → **#8**
- 200 A → **#6**
- 300 A → **#4**
- 400 A → **#3**

**Upsizing for voltage drop (250.122(B))**

If you **increase the ungrounded conductors** in size (commonly to fight voltage drop on a long run), you must increase the EGC **proportionally** by the same ratio of circular-mil area.

Example: A 40 A circuit normally uses #8 phase conductors and a #10 EGC. To beat voltage drop you bump the phase conductors to #6 (the area roughly doubles from ~16,510 to ~26,240 cmil, a factor of ~1.59). Multiply the EGC area by the same factor and pick the next standard size up — the #10 (~10,380 cmil) becomes about #8.

**EGC never has to exceed the circuit conductors**

You never have to make the EGC larger than the ungrounded conductors of the circuit it serves.`,
  },

  // ---------------------------------------------------------------------------
  // Raceways & boxes
  // ---------------------------------------------------------------------------
  {
    slug: "conduit-fill",
    title: "Conduit Fill: The 40% Rule and Chapter 9",
    categorySlug: "raceways-boxes",
    summary:
      "How many conductors fit in a raceway using the Chapter 9 tables and the standard fill percentages.",
    tags: ["conduit fill", "chapter 9", "raceway", "40 percent"],
    body: `Conduit fill limits how much cross-sectional area conductors may take up inside a raceway so heat can dissipate and conductors can be pulled without damage.

**The fill percentages (Chapter 9, Table 1)**

- **1 conductor** → 53%
- **2 conductors** → 31%
- **3 or more conductors** → **40%**

**The method**

1. Find each conductor's area in **Chapter 9, Table 5** (by insulation type and size). For bare grounds use Table 8.
2. Add the areas together.
3. Compare to the allowable fill area of the raceway in **Chapter 9, Table 4** (pick the raceway type — EMT, RMC, PVC Sch 40, etc. — and read the 40% column).

**Shortcut for identical conductors**

When all conductors are the **same size and insulation**, **Annex C** tables give the maximum number directly — no math. For example, Annex C1 covers EMT.

**A quick example**

Nine #12 THHN conductors in EMT. #12 THHN area ≈ 0.0133 in². 9 × 0.0133 = 0.1197 in². The 40% column for 3/4″ EMT is 0.213 in², so 3/4″ EMT works (and Annex C1 confirms 16 #12 THHN allowed in 3/4″ EMT).

**Don't forget**

Conduit fill (cross-section, for pulling) and conductor **derating** for more than 3 current-carrying conductors (for heat) are *two separate checks*. Passing fill does not exempt you from derating.`,
  },
  {
    slug: "box-fill-calculations",
    title: "Box Fill Calculations (314.16)",
    categorySlug: "raceways-boxes",
    summary:
      "Counting conductors, devices, clamps, and grounds to make sure a box is legally large enough.",
    tags: ["box fill", "314.16", "device", "volume", "junction box"],
    body: `Box fill ensures conductors and devices aren't crammed into a box so tightly that insulation is damaged or heat builds up. Use **314.16** and the volume allowances in **Table 314.16(B)**.

**Volume allowance per conductor size**

- #14 → **2.00 in³**
- #12 → **2.25 in³**
- #10 → **2.50 in³**
- #8 → **3.00 in³**
- #6 → **5.00 in³**

**What counts (and how much)**

- **Each ungrounded and grounded conductor** that passes through or terminates = 1 volume (based on the **largest** conductor in the box for that count). A conductor that runs through unbroken still counts as one.
- **All equipment grounding conductors** together = **1** volume (of the largest EGC). If there are two EGC sizes... still one, largest.
- **One or more clamps** (internal cable clamps) = **1** volume (largest conductor).
- **Each yoke/strap (device)** = **2** volumes (largest conductor connected to that device).
- **Conductors originating outside and terminating inside** (like pigtails entirely inside the box) are **not** counted.

**Example**

A device box with three 14/2 NM cables (each a hot, a neutral, a ground), one duplex receptacle, and internal clamps:

- 6 insulated #14 conductors (3 hots + 3 neutrals) = 6 × 2.00 = 12.00 in³
- Grounds (3) count as 1 = 2.00 in³
- Clamps = 1 = 2.00 in³
- Device (1 yoke) = 2 = 4.00 in³
- **Total = 20.00 in³**

A standard single-gang box must be marked at least 20.0 in³ (for example, a 4″ square × 1½″ deep box at ~21 in³ works; many plastic single-gang boxes do not).`,
  },

  // ---------------------------------------------------------------------------
  // Motors & controls
  // ---------------------------------------------------------------------------
  {
    slug: "motor-circuit-sizing",
    title: "Sizing a Motor Branch Circuit (Article 430)",
    categorySlug: "motors-controls",
    summary:
      "Why motor conductors and protection use table FLC values, and the 125% / short-circuit sizing steps.",
    tags: ["motor", "430", "flc", "overload", "branch circuit"],
    body: `Motors are sized differently from ordinary loads because of inrush current at startup. Article 430 splits the job into separate parts: conductors, short-circuit/ground-fault protection, and overload protection.

**Use the table, not the nameplate (for conductors)**

For sizing **conductors and short-circuit protection**, use the **full-load current (FLC)** values from Tables 430.247–430.250, *not* the motor nameplate amps. (Use the **nameplate** amps only for **overload** sizing.)

**Conductor sizing (430.22)**

A single continuous-duty motor's conductors must be at least **125% of the motor FLC**.

**Branch-circuit short-circuit/ground-fault protection (430.52)**

Size the protective device as a percentage of FLC by device type, e.g.:

- Inverse-time breaker → up to **250%** of FLC
- Non-time-delay fuse → up to **300%**
- Dual-element (time-delay) fuse → up to **175%**

If the calculated value doesn't match a standard size, you may round up (and 430.52 even allows further increases if the motor won't start).

**Overload protection (430.32)**

Sized from the **nameplate** FLA and service factor:

- SF ≥ 1.15 or temp rise ≤ 40°C → **125%**
- All others → **115%**

**Example (10 hp, 230 V, 3-phase)**

- FLC from Table 430.250 = 28 A.
- Conductors: 28 × 1.25 = 35 A → #8 Cu (75°C, 50 A) is plenty.
- Inverse-time breaker: 28 × 2.50 = 70 A → 70 A standard breaker.
- Overload (nameplate, SF 1.15): nameplate × 1.25.`,
  },

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------
  {
    slug: "voltage-drop-calculations",
    title: "Voltage Drop Calculations",
    categorySlug: "calculations",
    summary:
      "The single-phase and three-phase voltage drop formulas, the 3%/5% recommendation, and a worked run.",
    tags: ["voltage drop", "calculation", "cmil", "k factor", "3 percent"],
    body: `The NEC *recommends* (informational notes to 210.19 and 215.2) keeping voltage drop to **3% on a branch circuit or feeder**, and **5% total** for feeder + branch combined. It's a recommendation, not a hard rule — but inspectors and engineers expect it, and the exam tests it.

**The formulas (using K, the resistivity constant)**

- Single-phase: **VD = (2 × K × I × L) / CM**
- Three-phase: **VD = (1.732 × K × I × L) / CM**

Where:
- **K** ≈ 12.9 for copper, 21.2 for aluminum (ohms-cmil/ft, approximate at 75°C)
- **I** = load current in amps
- **L** = one-way length of the run in feet
- **CM** = circular mils of the conductor (from Chapter 9, Table 8)

**Worked example**

A 120 V single-phase, 16 A load, 150 ft one-way, on #12 copper (6,530 cmil):

VD = (2 × 12.9 × 16 × 150) / 6,530 = 61,920 / 6,530 ≈ **9.5 V**

That's 9.5 / 120 = **7.9%** — far too much. Upsize the conductor. Solving for CM at a 3% (3.6 V) target:

CM = (2 × 12.9 × 16 × 150) / 3.6 ≈ 17,200 cmil → **#8** (16,510 cmil is close; go #8 or larger).

**Remember**

If you upsize ungrounded conductors for voltage drop, you must upsize the **EGC** proportionally (250.122(B)).`,
  },
  {
    slug: "dwelling-load-calculation",
    title: "Dwelling Service Load Calculation (Standard Method)",
    categorySlug: "calculations",
    summary:
      "Walking the Article 220 standard method to size a single-family dwelling service.",
    tags: ["load calculation", "220", "dwelling", "service", "demand factor"],
    body: `The standard calculation method in **Article 220, Part III** sizes a dwelling service by adding up loads and applying demand factors.

**Step 1 — General lighting and receptacle load**

**3 VA per square foot** of living area (220.12). Plus the required small-appliance and laundry branch circuits at **1,500 VA each** (220.52): at least two small-appliance + one laundry = 4,500 VA.

**Step 2 — Apply the general-lighting demand factor (Table 220.42)**

- First **3,000 VA** at **100%**
- Remainder up to 120,000 VA at **35%**

**Step 3 — Appliances and special loads**

- Fixed appliances (water heater, dishwasher, disposal): if **four or more**, apply a **75%** demand factor (220.53).
- **Range** — use **Table 220.55** (e.g., one 12-kW range demands **8 kW**).
- **Dryer** — 5,000 VA or nameplate, whichever is larger (220.54).
- Heating vs. A/C — use the **larger** of the two (220.60); they don't run together.

**Step 4 — Total and convert to amps**

Add the demand totals, then divide by the service voltage (240 V for a single-phase 120/240 V service) to get the minimum service amps. Round to the next standard service size (typically 100, 150, or 200 A).

**Optional method**

Article 220, Part IV offers an **optional** calculation that often yields a smaller service for homes with electric heat — the first 10 kVA at 100% and the remainder at 40%, plus heating/cooling factors. Both methods are exam fair game.`,
  },

  // ---------------------------------------------------------------------------
  // Safety
  // ---------------------------------------------------------------------------
  {
    slug: "lockout-tagout",
    title: "Lockout/Tagout and Establishing an Electrically Safe Condition",
    categorySlug: "safety",
    summary:
      "The steps to de-energize, lock, tag, and verify before working on a circuit — per NFPA 70E and OSHA.",
    tags: ["loto", "lockout", "tagout", "70e", "safety", "verify"],
    body: `Working de-energized is the safest condition. NFPA 70E and OSHA 1910.147/.333 lay out the procedure to establish an **electrically safe work condition**.

**The lockout/tagout sequence**

1. **Identify** all sources of energy feeding the equipment (including back-feeds and stored energy).
2. **Notify** affected personnel.
3. **Shut down** the equipment normally.
4. **Isolate** — open the disconnect(s).
5. **Lock and tag** each disconnect with your own lock and a tag. Each worker applies their **own** lock (group lockout).
6. **Release stored energy** — discharge capacitors, bleed pressure, block springs.
7. **Verify** with a properly rated meter: test the meter on a known live source, test the de-energized conductors (all phases to ground and to each other), then test the meter on the known source again. This **live-dead-live** test confirms the meter works.

**PPE and boundaries**

If any work must be done energized (justified per 70E), determine the **arc-flash boundary** and **incident energy**, then wear PPE rated for that energy (arc-rated clothing, face shield/hood, rubber insulating gloves with leather protectors). Maintain the limited/restricted approach boundaries for shock protection.

**Hierarchy of controls**

Elimination (de-energize) is always preferred over relying on PPE. PPE is the **last** line of defense, not the first.`,
  },
  {
    slug: "gfci-and-afci-protection",
    title: "Where GFCI and AFCI Protection Are Required",
    categorySlug: "safety",
    summary:
      "The locations the NEC requires ground-fault and arc-fault protection, and how they differ.",
    tags: ["gfci", "afci", "210.8", "210.12", "protection"],
    body: `GFCI and AFCI devices protect against two different hazards. Knowing where each is required (210.8 and 210.12) is core journeyman knowledge.

**GFCI — protects people from shock**

A Ground-Fault Circuit Interrupter trips on a current imbalance of about **4–6 mA** between the hot and neutral, meaning current is leaking to ground (possibly through a person). Required (dwelling, 210.8(A)) in:

- Bathrooms
- Garages and accessory buildings
- Outdoors
- Crawl spaces and unfinished basements
- Kitchens (receptacles serving countertops)
- Within 6 ft of a sink, bathtub, or shower stall
- Laundry areas, boathouses

**AFCI — protects property from fire**

An Arc-Fault Circuit Interrupter detects the high-frequency signature of a dangerous **arcing fault** (a loose connection or damaged cable) and opens before it ignites surrounding material. Required (dwelling, 210.12) on most **120 V, 15 and 20 A branch circuits** serving living areas — bedrooms, living rooms, hallways, closets, kitchens, laundry, and similar.

**Dual-function devices**

A dual-function (DF) breaker or receptacle provides both GFCI and AFCI protection in one device, common where a circuit needs both (e.g., a kitchen counter circuit).

**Test monthly**

Both devices have a TEST button. They are mechanical/electronic and can fail — they should be tested per the manufacturer's instructions.`,
  },
];
