# Brand

Source of truth: the Tarango Electric brand package **v1.0 (October 2026)**, "High-Contrast
Red & Black". The logos in `public/brand/` are copied from that package unchanged.

## Colors

| | Hex | Role |
| --- | --- | --- |
| Tarango Red | `#E01E25` | Bolt, accents, rules, large type |
| Panel Black | `#0C0C0C` | Type on light, dark fields, night theme |
| Clean White | `#FFFFFF` | Surfaces, estimates |
| Conduit Gray | `#555555` | Support: muted text |
| Light Gray | `#F4F4F4` | Support: page background |

Tarango Red is about 4.6:1 on white: fine for large type and fills, so small red text uses the
darker `--accent-ink` (`#B5161C`). On Panel Black, red text lifts to `#FF5A5F`.

The old Tailwind names (`charcoal`, `paper`, `gold`, `oxide`) are kept and remapped to the new
palette, so existing classes repaint with no churn.

## Type

- **Anton**: logo, headlines, phone number (`font-display`, `.display`)
- **Barlow Condensed 600–800**: labels and the tagline (`font-serif` maps here)
- **Barlow 400–600**: body (`font-sans`)

Loaded with `next/font/google` in `src/app/layout.tsx`.

## Contact

- Phone: **417-501-4752**
- Email: **tarangoelectric417@gmail.com**
- Name: always "Tarango Electric", never "Tarango Electrical".
- Based in **Elkland**. Service area: Bolivar, Buffalo, Marshfield, Fair Grove, Elkland, and
  Dallas, Polk, Webster and Greene counties. Never Springfield.

## Customer-facing output

Estimates, invoices and anything shareable or printable show the **town only**, never the
street address. Full address and Maps links stay on the passcode-protected internal screens.
Do not market commercial work in public copy.

## Do not print

Enforced by `checkCopy()` in `src/lib/domain/rules.ts`:

- **"licensed"** and **"insured"**: never print either (no liability policy is bound)
- **"24/7"** and **"emergencies"**: do not promise a response you cannot staff
- **"Built Ready"**, any **"EST. <year>"** founding myth
- **"Serving all of Southwest Missouri"**: name the towns and counties instead
- **"new construction"**: the company services existing buildings
- **Springfield, Joplin, Branson** in service-area copy

## Voice

"Speak like the person on the porch. Short sentences. Town names." No marketing tone, no
exclamation marks.

## Note

`/workspace/site-spec.md` describes a different "Storm Ready" palette. The brand package
v1.0 is newer and matches the generator-push materials, so the app follows the package.
