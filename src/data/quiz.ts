// Practice exam questions for journeyman wireman study.
//
// Each question belongs to a category (matching src/data/articles.ts) and
// links to the article that explains the answer. Keep answers consistent with
// the article content. For study only — verify against your adopted NEC edition.

export type Question = {
  id: string;
  categorySlug: string;
  prompt: string;
  choices: string[];
  // Index into `choices` of the correct answer.
  answerIndex: number;
  explanation: string;
  // Slug of the article that covers this topic.
  articleSlug: string;
};

export const questions: Question[] = [
  // --- code-fundamentals ---
  {
    id: "cf-1",
    categorySlug: "code-fundamentals",
    prompt:
      "Which NEC chapter is generally independent of Chapters 1 through 7 and only follows them where it specifically references them?",
    choices: ["Chapter 4", "Chapter 5", "Chapter 8", "Chapter 9"],
    answerIndex: 2,
    explanation:
      "Per 90.3, Chapter 8 (Communications Systems) stands alone and only follows the general chapters where a Chapter 8 rule specifically references them.",
    articleSlug: "how-the-nec-is-organized",
  },
  {
    id: "cf-2",
    categorySlug: "code-fundamentals",
    prompt: "In the NEC, the phrase “shall be permitted” means the action is:",
    choices: [
      "Mandatory in all cases",
      "Prohibited",
      "Allowed but not required",
      "Required only for dwellings",
    ],
    answerIndex: 2,
    explanation:
      "“Shall be permitted” is permissive language — it describes one allowed way to comply, but it is not mandatory.",
    articleSlug: "shall-vs-shall-be-permitted",
  },
  {
    id: "cf-3",
    categorySlug: "code-fundamentals",
    prompt: "An informational note in the NEC is:",
    choices: [
      "An enforceable requirement",
      "Explanatory only and not enforceable",
      "A mandatory exception",
      "A defined term",
    ],
    answerIndex: 1,
    explanation:
      "Informational notes are explanatory and are not enforceable; an inspector cannot cite a violation of an informational note.",
    articleSlug: "shall-vs-shall-be-permitted",
  },

  // --- conductors-wiring ---
  {
    id: "cw-1",
    categorySlug: "conductors-wiring",
    prompt:
      "When more than three current-carrying conductors share a raceway, what must be applied to their ampacity?",
    choices: [
      "An ambient temperature correction only",
      "A conductor bundling/fill adjustment factor",
      "The 125% continuous-load factor",
      "Nothing — conduit fill already covers it",
    ],
    answerIndex: 1,
    explanation:
      "Table 310.15(C)(1) requires an adjustment factor (e.g., 80% for 4–6 conductors). This heat-based derating is separate from cross-sectional conduit fill.",
    articleSlug: "conductor-ampacity-and-derating",
  },
  {
    id: "cw-2",
    categorySlug: "conductors-wiring",
    prompt:
      "Which conductor insulation is rated 90°C in BOTH wet and dry locations?",
    choices: ["THHN", "THWN", "THWN-2", "XHHW"],
    answerIndex: 2,
    explanation:
      "THWN-2 carries a 90°C rating in wet and dry locations. Plain THHN is 90°C dry only; THWN and XHHW are 75°C in wet locations.",
    articleSlug: "conductor-insulation-types",
  },
  {
    id: "cw-3",
    categorySlug: "conductors-wiring",
    prompt:
      "Terminations on most equipment limit you to which temperature column when sizing the final ampacity (110.14(C))?",
    choices: ["60°C", "75°C", "90°C", "Any column you choose"],
    answerIndex: 1,
    explanation:
      "Most equipment terminations are rated 75°C, so the 75°C column usually governs the terminated ampacity. The 90°C column is generally only a starting point for derating.",
    articleSlug: "conductor-ampacity-and-derating",
  },

  // --- overcurrent ---
  {
    id: "oc-1",
    categorySlug: "overcurrent",
    prompt:
      "Under the small-conductor rule (240.4(D)), what is the maximum overcurrent device for a #12 copper conductor?",
    choices: ["15 A", "20 A", "25 A", "30 A"],
    answerIndex: 1,
    explanation:
      "Regardless of its derated ampacity, #12 copper is limited to a 20 A overcurrent device by 240.4(D).",
    articleSlug: "overcurrent-protection-basics",
  },
  {
    id: "oc-2",
    categorySlug: "overcurrent",
    prompt:
      "A circuit serves 40 A of continuous load and 30 A of noncontinuous load. The minimum overcurrent device rating is:",
    choices: ["70 A", "75 A", "80 A", "88 A"],
    answerIndex: 2,
    explanation:
      "100% of noncontinuous (30 A) + 125% of continuous (40 × 1.25 = 50 A) = 80 A.",
    articleSlug: "continuous-load-125-percent",
  },
  {
    id: "oc-3",
    categorySlug: "overcurrent",
    prompt: "A load is considered “continuous” when it is expected to run for at least:",
    choices: ["1 hour", "2 hours", "3 hours", "8 hours"],
    answerIndex: 2,
    explanation:
      "Article 100 defines a continuous load as one expected to operate at maximum current for 3 hours or more.",
    articleSlug: "continuous-load-125-percent",
  },

  // --- grounding-bonding ---
  {
    id: "gb-1",
    categorySlug: "grounding-bonding",
    prompt: "What actually provides the low-impedance path that lets an overcurrent device clear a ground fault?",
    choices: [
      "The earth/grounding electrode",
      "Bonding (the equipment grounding path)",
      "The grounded neutral at every subpanel",
      "The grounding electrode conductor",
    ],
    answerIndex: 1,
    explanation:
      "Bonding creates the low-impedance fault-current path back to the source. The earth is a poor conductor and does not clear faults.",
    articleSlug: "grounding-vs-bonding",
  },
  {
    id: "gb-2",
    categorySlug: "grounding-bonding",
    prompt: "The grounded (neutral) and equipment ground should be bonded together:",
    choices: [
      "At every panel in the building",
      "Only at the service disconnect (or source of a separately derived system)",
      "Never",
      "Only at the farthest subpanel",
    ],
    answerIndex: 1,
    explanation:
      "The main bonding jumper ties neutral and ground only at the service (or SDS source). Downstream subpanels must keep neutrals isolated from the equipment ground.",
    articleSlug: "grounding-vs-bonding",
  },
  {
    id: "gb-3",
    categorySlug: "grounding-bonding",
    prompt:
      "An equipment grounding conductor (EGC) is sized from which value?",
    choices: [
      "The load current",
      "The ungrounded conductor size",
      "The rating of the overcurrent device (Table 250.122)",
      "The grounding electrode conductor size",
    ],
    answerIndex: 2,
    explanation:
      "Table 250.122 sizes the EGC from the rating of the overcurrent device ahead of the circuit.",
    articleSlug: "sizing-the-egc",
  },

  // --- raceways-boxes ---
  {
    id: "rb-1",
    categorySlug: "raceways-boxes",
    prompt:
      "What is the maximum conduit fill percentage for three or more conductors in a raceway?",
    choices: ["31%", "40%", "53%", "60%"],
    answerIndex: 1,
    explanation:
      "Chapter 9, Table 1: 53% for one conductor, 31% for two, and 40% for three or more.",
    articleSlug: "conduit-fill",
  },
  {
    id: "rb-2",
    categorySlug: "raceways-boxes",
    prompt:
      "In box-fill calculations (314.16), how much volume does a single yoke/strap (device) count as?",
    choices: [
      "1 conductor volume",
      "2 conductor volumes",
      "Equal to the number of conductors on it",
      "It is not counted",
    ],
    answerIndex: 1,
    explanation:
      "Each yoke or strap counts as 2 volumes based on the largest conductor connected to that device.",
    articleSlug: "box-fill-calculations",
  },
  {
    id: "rb-3",
    categorySlug: "raceways-boxes",
    prompt:
      "In a box-fill calc, all equipment grounding conductors together count as:",
    choices: [
      "One conductor volume",
      "Two conductor volumes",
      "One volume per ground",
      "They are not counted",
    ],
    answerIndex: 0,
    explanation:
      "All EGCs collectively count as a single conductor volume, based on the largest EGC present.",
    articleSlug: "box-fill-calculations",
  },

  // --- motors-controls ---
  {
    id: "mc-1",
    categorySlug: "motors-controls",
    prompt:
      "When sizing motor branch-circuit conductors, which current value do you use?",
    choices: [
      "The motor nameplate amps",
      "The full-load current (FLC) from Tables 430.247–430.250",
      "The locked-rotor current",
      "125% of the nameplate amps",
    ],
    answerIndex: 1,
    explanation:
      "Conductors and short-circuit protection use the table FLC values. The nameplate FLA is used only for overload sizing.",
    articleSlug: "motor-circuit-sizing",
  },
  {
    id: "mc-2",
    categorySlug: "motors-controls",
    prompt:
      "A single continuous-duty motor's branch-circuit conductors must be at least what percentage of the motor FLC (430.22)?",
    choices: ["100%", "115%", "125%", "250%"],
    answerIndex: 2,
    explanation:
      "430.22 requires conductors sized at a minimum of 125% of the motor full-load current.",
    articleSlug: "motor-circuit-sizing",
  },

  // --- calculations ---
  {
    id: "ca-1",
    categorySlug: "calculations",
    prompt:
      "The NEC informational notes recommend limiting branch-circuit voltage drop to approximately:",
    choices: ["1%", "3%", "5%", "10%"],
    answerIndex: 1,
    explanation:
      "The recommendation is 3% on a branch circuit or feeder, and 5% total for feeder plus branch combined.",
    articleSlug: "voltage-drop-calculations",
  },
  {
    id: "ca-2",
    categorySlug: "calculations",
    prompt:
      "In the standard dwelling calculation, the general lighting load is figured at:",
    choices: [
      "1 VA per square foot",
      "3 VA per square foot",
      "5 VA per square foot",
      "100 VA per room",
    ],
    answerIndex: 1,
    explanation:
      "220.12 uses 3 VA per square foot of living area for the general lighting and receptacle load.",
    articleSlug: "dwelling-load-calculation",
  },
  {
    id: "ca-3",
    categorySlug: "calculations",
    prompt:
      "When upsizing ungrounded conductors for voltage drop, what must also happen?",
    choices: [
      "Nothing else changes",
      "The overcurrent device must be increased",
      "The equipment grounding conductor must be increased proportionally",
      "The neutral may be reduced",
    ],
    answerIndex: 2,
    explanation:
      "250.122(B) requires the EGC to be increased proportionally in circular-mil area when the ungrounded conductors are enlarged.",
    articleSlug: "sizing-the-egc",
  },

  // --- safety ---
  {
    id: "sa-1",
    categorySlug: "safety",
    prompt:
      "The “live-dead-live” test before working de-energized verifies that:",
    choices: [
      "The circuit is properly grounded",
      "Your test meter is working correctly",
      "The breaker is the correct size",
      "The arc-flash boundary is clear",
    ],
    answerIndex: 1,
    explanation:
      "Testing the meter on a known live source, then the de-energized conductors, then the known source again confirms the meter is functioning before you trust a “dead” reading.",
    articleSlug: "lockout-tagout",
  },
  {
    id: "sa-2",
    categorySlug: "safety",
    prompt: "A GFCI device typically trips on a ground-fault current of about:",
    choices: ["4–6 mA", "30 mA", "1 A", "The breaker rating"],
    answerIndex: 0,
    explanation:
      "A Class A GFCI trips on roughly 4–6 mA of imbalance between hot and neutral — protecting people from shock.",
    articleSlug: "gfci-and-afci-protection",
  },
  {
    id: "sa-3",
    categorySlug: "safety",
    prompt: "An AFCI device is primarily designed to protect against:",
    choices: [
      "Electric shock to people",
      "Overloaded conductors",
      "Fires caused by arcing faults",
      "Voltage drop",
    ],
    answerIndex: 2,
    explanation:
      "An arc-fault circuit interrupter detects the signature of a dangerous arcing fault and opens the circuit to help prevent fires.",
    articleSlug: "gfci-and-afci-protection",
  },
];
