# Brand

Source: `Tarango-Electric-Brand-Kit.pdf`, `colors.txt` and the SVG marks, all in
`public/brand/`. Where the PDF and a sample file disagree, the PDF wins.

## The lock

Four colours. There is no fifth, no safety yellow, no bright accent.

| Name | Hex | RGB | Role |
| --- | --- | --- | --- |
| Charcoal | `#222426` | 34 36 38 | Wordmark, truck field, body text |
| Aged White | `#F5F1E8` | 245 241 232 | Paper, magnet field, invoice |
| Harvest Gold | `#B8871F` | 184 135 31 | Rules, badge ring, small type |
| Oxide Red | `#8E382F` | 142 56 47 | Tagline italic, decline / hazard |

**Harvest Gold is not body text.** At `#B8871F` on Aged White it measures 2.86:1, which fails
AA — which is exactly why the kit restricts it to "rules, badge ring, small type". Where gold
needs to carry words, the UI uses `--accent-ink`, a darker cut of the same hue.

**Oxide Red is not decoration.** `colors.txt` labels it "tagline / hazard only", so in the app
it appears on precisely those things: the tagline, NO-GO towns, hidden damage, overdue money,
failed closeout items.

## Contrast, measured

Every pair the UI actually renders, against WCAG AA (4.5:1):

**Day — paper**

| Pair | Ratio | |
| --- | --- | --- |
| Charcoal on Aged White | 13.82 | pass |
| Muted `#63615B` on Aged White | 5.49 | pass |
| Accent-ink `#7A570F` on Aged White | 5.83 | pass |
| Harvest Gold on Aged White | 2.86 | **fail — decorative use only** |
| Oxide Red on Aged White | 6.76 | pass |
| Go `#3F6B4A` on Aged White | 5.46 | pass |
| Charcoal on gold fill | 4.84 | pass |

**Night — the truck field**

| Pair | Ratio | |
| --- | --- | --- |
| Aged White on `#17191A` | 15.65 | pass |
| Muted `#9A968C` on `#17191A` | 5.98 | pass |
| Accent-ink `#E3BC6B` on Charcoal | 8.66 | pass |
| Gold `#D9A441` on Charcoal | 6.92 | pass |
| Oxide `#C9614F` on Charcoal | 3.94 | **fail — not used for text** |
| Hazard text `#D98A7C` on Charcoal | 5.84 | pass |
| Go `#7FB08C` on Charcoal | 6.30 | pass |

Night keeps the locked `#8E382F` for hazard *fills* (with Aged White type on top) and lifts
hazard *text* to `#D98A7C`, because the locked value alone does not clear AA on charcoal.

Re-check any change with `node scripts/contrast.mjs`.

## Type

- **Display / wordmark** — condensed gothic: Impact, with Bebas Neue or Knockout as the kit's
  own permitted substitutes. Used for the wordmark, gate verdicts and big numbers. Nothing else.
- **Body and labels** — Georgia on anything print-like, system sans for UI body.
- **Tagline** — always italic serif, never script, never restyled. Oxide Red on paper, Harvest
  Gold on the dark field, matching the two wordmark SVGs.

Wordmark metrics, from the SVG: TARANGO at letter-spacing 6, a single 360×4 gold rule,
ELECTRIC in Georgia at letter-spacing 10.

## Marks

| File | Use |
| --- | --- |
| `logo-wordmark.svg` | Primary, light field. Truck, invoice, Google name |
| `logo-wordmark-dark.svg` | Primary, dark field |
| `logo-badge.svg` | Barn badge. Magnet, shirt patch, avatar. Secondary, never the only logo |
| `logo-monogram.svg` | TE stack. App icon, sticker, folder tab |
| `magnet.svg` | The print layout |

Clear space is the height of the E in ELECTRIC. Keep one gold rule per composition.

## Do not print

The kit's list, enforced in code by `checkCopy()` in `src/lib/domain/rules.ts` and surfaced
wherever customer-facing text is typed:

- **"licensed"** — not true yet
- **"24/7"** and **"emergencies"** — do not promise a response you cannot staff
- **"Built Ready"**, any **"EST. <year>"** founding myth
- **"Serving all of Southwest Missouri"** — name the three towns instead
- **"new construction"** — the company services existing buildings
- **Springfield, Joplin, Branson** in service-area copy — NO-GO towns, and Springfield is never
  the home base

Also, per the Do/Don't table: no barn on legal pages, do not make the barn bigger than the
name, do not put the phone number in Harvest Gold, and no script face as the primary mark.

## Voice

"Speak like the person on the porch. Short sentences. Town names. No slogans about building
the future." The UI copy follows it — no marketing tone, no exclamation marks, and the
closeout items read in the same words as the paper card.

## One inconsistency

The Do/Don't table says not to set the phone number in Harvest Gold, but `magnet.svg` renders
the placeholder number in exactly that. The app follows the written rule. Worth settling
before the magnets are printed.
