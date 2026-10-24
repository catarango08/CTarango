# Toolbox data requests (for Sparky)

Rule: nothing here was filled from memory. Every table is empty and `pending-sparky`. Fill one JSON per table (all three editions), then a developer copies rows into the listed TS file and sets `status: "reviewed"`, `source`, `reviewedBy`, `reviewedOn`. A tool shows results only when all its tables are reviewed for the selected edition.

Editions: 2023 (default), 2017, 2011. Confirm each label per edition; correct it if the numbering differs.

| File | Tool | Label (2023 / 2017 / 2011) | Columns | What to supply |
|---|---|---|---|---|
| `ch9-table8.json` | Voltage drop | Chapter 9, Table 8 / Chapter 9, Table 8 / Chapter 9, Table 8 | size, cuOhmsPerKft, alOhmsPerKft | Conductor resistance, ohms per 1000 ft, every size in table order (smallest first). Say which column (coated/uncoated Cu) and whether you used Table 8 or Table 9; Table 9 effective Z also OK if you prefer AC. |
| `t310-16.json` | Ampacity / breaker | Table 310.16 / Table 310.15(B)(16) / Table 310.15(B)(16) | size, material, column, amps | Every size × material × temperature column, as printed. One row per cell. Include the column heading text exactly (it becomes the picker label). |
| `s240-4d.json` | Ampacity / breaker | 240.4(D) / 240.4(D) / 240.4(D) | size, material, maxOcpdAmps | Each small conductor size and material listed in 240.4(D) with its max overcurrent protection. |
| `t314-16a.json` | Box fill | Table 314.16(A) / Table 314.16(A) / Table 314.16(A) | box, cubicIn | Each box row: trade size/type description as printed and its volume in cubic inches. |
| `t314-16b.json` | Box fill | Table 314.16(B) / Table 314.16(B) / Table 314.16(B) | size, cubicIn | Volume allowance per conductor, by size. |
| `s314-16b-rules.json` | Box fill | 314.16(B) / 314.16(B) / 314.16(B) | item, volumeAllowances, basis | Each counting rule (clamps, fittings, devices, grounds, etc. — as you word it): how many volume allowances and on what conductor size basis. |
| `ch9-table1.json` | Conductor fill | Chapter 9, Table 1 / Chapter 9, Table 1 / Chapter 9, Table 1 | minConductors, maxConductors, percent | Max fill percent by number of conductors. Use minConductors/maxConductors (null = no upper limit). |
| `ch9-table4.json` | Conduit fill | Chapter 9, Table 4 / Chapter 9, Table 4 / Chapter 9, Table 4 | raceway, tradeSize, totalAreaSqIn | Total internal area (100%) per trade size for EMT, PVC Schedule 40, PVC Schedule 80, RMC. |
| `ch9-table5.json` | Conduit fill | Chapter 9, Table 5 / Chapter 9, Table 5 / Chapter 9, Table 5 | insulation, size, areaSqIn | Approximate area per conductor for THHN/THWN-2 and XHHW-2, every size. |
| `t430-248.json` | Motor FLC | Table 430.248 / Table 430.248 / Table 430.248 | hp, volts, amps | Single-phase motor FLC: one row per HP × voltage column. |
| `t430-250.json` | Motor FLC | Table 430.250 / Table 430.250 / Table 430.250 | hp, volts, amps | Three-phase motor FLC (use the induction-type columns, or tell us which): one row per HP × voltage column. |
| `t430-52.json` | Motor FLC | Table 430.52 / Table 430.52 / Table 430.52 | motorType, device, percent | Percent of FLC per motor type × protective device column, headings as printed. |
| `motor-conductor-rule.json` | Motor FLC (wire suggestion) | (section TBD by Sparky) / (section TBD by Sparky) / (section TBD by Sparky) | rule, percentOfFlc | The section and percent of FLC used to size a single motor branch-circuit conductor. Also correct the label. |
| `t300-5.json` | Burial depth | Table 300.5 / Table 300.5 / Table 300.5 | location, wiringMethod, inches, note | Minimum cover in inches for every location row × wiring-method column; put footnote text in note. |
| `t250-66.json` | GEC / EGC | Table 250.66 / Table 250.66 / Table 250.66 | serviceCu, serviceAl, gecCu, gecAl | Rows in table order: the largest service conductor bound (Cu and Al as printed) and the GEC size (Cu and Al). |
| `t250-122.json` | GEC / EGC | Table 250.122 / Table 250.122 / Table 250.122 | ocpdAmps, egcCu, egcAl | Each OCPD rating row with EGC size Cu and Al. |
| `s220-82.json` | Service load calc | 220.82 / 220.82 / 220.82 | kind, label, value | All numbers of the optional dwelling method as rows: VA per sq ft, VA per small-appliance and laundry circuit, the general-load first-VA threshold and remainder percent, and each HVAC option percent (label = option wording). If the method does not fit these kinds, tell us and we will change the code. |

Not requested (not NEC): knockout chart is filled from the American Fittings NEMA chart Corey supplied; torque shows a "use manufacturer label value" note only; Ohm's law is physics.
