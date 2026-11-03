---
version: alpha
name: MeetMateAI
description: MeetMate's own design contract, and the file the code obeys. It supersedes DESIGN.md for anything a user of this product sees: DESIGN.md stays in the repo as a reference capture of another company's CSS, kept byte-for-byte for the mechanics it documents, and its brand layer is deliberately not reused here. Every token below is implemented in app/dashboard/dashboard.css (light, dark, darkchrome and light-overlay blocks) and drawn in designs/meetmate/project. Contrast ratios in Colors are computed, not estimated; hover and active states are proposals and are marked as such.
colors:
  # --- light theme, the default surface ---
  ink: "#14181D"
  muted-ink: "#58636F"
  canvas: "#FFFFFF"
  ground: "#EEF1F4"
  surface-subtle: "#F6F8FA"
  hairline: "#DCE2E8"
  boundary: "#7E8B99"
  primary: "#0E7C86"
  on-primary: "#FFFFFF"
  provenance: "#0E7C86"
  provenance-ink: "#0A5F67"
  provenance-tint: "#E1EFF1"
  source: "#14417F"
  source-line: "#1B5FBF"
  warn-band: "#FFF3DB"
  warn-ink: "#6E4A00"
  warn-mark: "#B07611"
  error-band: "#A62B22"
  on-error: "#FFFFFF"
  status-ended: "#C6CBD1"
  focus-ring: "#0E7C86"
  # --- dark theme, same roles, re-pointed rather than inverted ---
  dark-ground: "#12171D"
  dark-canvas: "#161C22"
  dark-surface: "#1B222A"
  dark-hairline: "#232B34"
  dark-boundary: "#61707E"
  dark-ink: "#E6EAF0"
  dark-muted-ink: "#A0B1C0"
  dark-provenance: "#3FA3AE"
  dark-on-provenance: "#0A2629"
  dark-provenance-ink: "#9BDCE3"
  dark-provenance-tint: "#20393C"
  dark-source: "#7FB0F5"
  dark-warn-band: "#3A2C10"
  dark-warn-ink: "#E8B45C"
  dark-error-band: "#F2A0A0"
  dark-on-error: "#4A0F0A"
typography:
  display-lg:
    fontFamily: "'Overpass', ui-sans-serif, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 36px
    letterSpacing: -0.025em
  heading-lg:
    fontFamily: "'Overpass', ui-sans-serif, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.025em
  heading-md:
    fontFamily: "'Overpass', ui-sans-serif, system-ui, sans-serif"
    fontSize: 19px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: -0.025em
  heading-sm:
    fontFamily: "'Overpass', ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: "'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: "'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  caption:
    fontFamily: "'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  eyebrow:
    fontFamily: "'Overpass', ui-sans-serif, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 15px
    letterSpacing: 0.05em
  data-lg:
    fontFamily: "'Overpass Mono', ui-monospace, Menlo, monospace"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 26px
    letterSpacing: 0px
  button-md:
    fontFamily: "'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  code-md:
    fontFamily: "'Overpass Mono', ui-monospace, Menlo, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 17px
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  section: 40px
components:
  post-primary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: auto
  post-cancelled:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  band-warn:
    backgroundColor: "{colors.warn-band}"
    textColor: "{colors.warn-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  band-error:
    backgroundColor: "{colors.error-band}"
    textColor: "{colors.on-error}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  button-primary:
    backgroundColor: "{colors.provenance}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    padding: 10px 18px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    padding: 10px 18px
    height: 40px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 9px 12px
    height: 40px
  nav-item:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 0 12px
    height: 44px
  pill-status:
    backgroundColor: "{colors.provenance-tint}"
    textColor: "{colors.provenance-ink}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: 3px 9px
    height: 24px
  stage-active:
    backgroundColor: "{colors.provenance}"
    textColor: "{colors.on-primary}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: 0 10px
    height: 26px
  stage-pending:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: 0 10px
    height: 26px
  card-session:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  menu:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 6px
  panel-upgrade:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 16px
  matrix-active-column:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: 7px 8px
  meter-balance:
    backgroundColor: "{colors.hairline}"
    rounded: "{rounded.full}"
    height: 4px
  meter-balance-fill:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 4px
---

# MeetMateAI — design contract

## Overview

MeetMate's output is one line of text that appears inside somebody else's box: a `MeetMate: [2/4] …`
message in Google Meet's chat column, about 13px, on white, carrying a claim ("this source is real") and
an obligation ("this link must open"). Every token in this file exists so that claim survives the worst
conditions it will actually meet — a projected meeting room, a small chat column, a Vietnamese diacritic,
a colour-blind colleague, a URL long enough to break a layout.

The visual argument, in one line each:

- **One accent, one job.** Petrol `{colors.provenance}` marks only what MeetMate itself wrote and is
  therefore answerable for. Nothing else wears it. The six pipeline stages get it by *lightness* steps,
  not by new hues.
- **Two hues, two voices.** Petrol = "MeetMate is speaking". Blue `{colors.source}` = "an external page
  is speaking". They are one step apart in lightness on purpose, so the distinction is carried by the
  underline, the mono face, and position — never by colour alone.
- **The ground is cold grey** `{colors.ground}`, not cream. MeetMate sits next to Meet's own grey chrome;
  a warm paper ground would read as a different product and would make the petrol look like a decoration.
- **Failure is a shape, not a toast.** A cancelled post keeps the exact frame of a real one with a
  hairline left border; a degraded session keeps a band; a blocked one inverts the band.

Base theme is light; dark is a re-pointing of the same roles, not an inversion (see §Colors).

## Colors

CSS: `app/dashboard/dashboard.css`. Each role is a raw HSL triplet plus a consumer, so both themes are
one number table. The hex below is the contract; the triplet is what renders it exactly (fractional
values are deliberate — rounding them drifts the hex by 1/255 and breaks the claims in this table).

| Role | Light | Triplet | Dark | Triplet | Why this product needs it |
|---|---|---|---|---|---|
| `{colors.ink}` | `#14181D` | 213.3 18.4% 9.6% | `{colors.dark-ink}` `#E6EAF0` | 216 25% 92% | body text; a blue-black that sits beside Meet's grey, not beside paper |
| `{colors.muted-ink}` | `#58636F` | 211 12% 39% | `{colors.dark-muted-ink}` `#A0B1C0` | 208 20% 69% | metadata, 11px eyebrows |
| `{colors.canvas}` | `#FFFFFF` | 0 0% 100% | `{colors.dark-canvas}` `#161C22` | 210 21% 11% | cards, dialogs, controls |
| `{colors.ground}` | `#EEF1F4` | 210 21.4% 94.5% | `{colors.dark-ground}` `#12171D` | 212.7 23.4% 9.2% | the app ground; only `.dash` and the nav rail consume it |
| `{colors.surface-subtle}` | `#F6F8FA` | 210 28.6% 97.3% | `#1B222A` | 212 21.7% 13.5% | wells, list rows, cancelled-post fill |
| `{colors.hairline}` | `#DCE2E8` | 210 20.7% 88.6% | `{colors.dark-hairline}` `#232B34` | 212 20% 17% | dividers and card edges |
| `{colors.boundary}` | `#7E8B99` | 211.1 11.7% 54.7% | `{colors.dark-boundary}` `#61707E` | 209 13% 43.7% | control edges + focus ring, where a hairline is not enough |
| `{colors.provenance}` | `#0E7C86` | 185 81% 29% | `{colors.dark-provenance}` `#3FA3AE` | 185.9 46.8% 46.5% | the brand fill — see the reservation below |
| `{colors.provenance-ink}` | `#0A5F67` | 185.2 82.3% 22.2% | `{colors.dark-provenance-ink}` `#9BDCE3` | 185.8 56.2% 74.9% | petrol as *text* |
| `{colors.provenance-tint}` | `#E1EFF1` | 187.5 36.4% 91.4% | `{colors.dark-provenance-tint}` `#20393C` | 186 30% 18% | done stage, completed pill |
| `{colors.source}` | `#14417F` | 214.8 72.8% 28.8% | `{colors.dark-source}` `#7FB0F5` | 215 86% 73% | URLs |
| `{colors.source-line}` | `#1B5FBF` | 215.1 75.2% 42.7% | `#478BEB` | 215 80% 60% | underline only |
| `{colors.warn-band}` / `{colors.warn-ink}` | `#FFF3DB` / `#6E4A00` | 40 100% 93% / 40.4 100% 21.6% | `#3A2C10` / `#E8B45C` | 40 56.8% 14.5% / 37.7 75.3% 63.5% | degraded but running |
| `{colors.error-band}` / `{colors.on-error}` | `#A62B22` / `#FFFFFF` | 4.1 66% 39.2% / 0 0% 100% | `#F2A0A0` / `#4A0F0A` | 0 75.9% 78.8% / 4.7 76.2% 16.5% | blocks the line |

Measured contrast (WCAG 2.x relative luminance, computed from the hexes above — not from the triplet
approximations, and not estimated):

| Pair | Ratio | Verdict |
|---|---|---|
| `{colors.ink}` on `{colors.canvas}` | 17.82:1 | AAA |
| `{colors.ink}` on `{colors.ground}` | 15.72:1 | AAA |
| `{colors.muted-ink}` on `{colors.canvas}` | 6.12:1 | AA; holds at 11px, which is where every eyebrow lives |
| `{colors.muted-ink}` on `{colors.surface-subtle}` | 5.75:1 | AA |
| `{colors.provenance-ink}` on `{colors.canvas}` | 7.38:1 | AAA — this is the colour of `MeetMate:` as text |
| `{colors.provenance-ink}` on `{colors.provenance-tint}` | 6.26:1 | AA |
| `{colors.on-primary}` on `{colors.provenance}` | 4.95:1 | AA — the wordmark and the stage fill |
| `{colors.source}` on `{colors.canvas}` | 10.04:1 | AAA |
| `{colors.source-line}` vs `{colors.provenance}` | 1.24:1 | **fails as text on purpose** — it is an underline, never a type colour |
| `{colors.boundary}` on `{colors.canvas}` | 3.48:1 | passes 1.4.11 for a control edge |
| `{colors.boundary}` on `{colors.ground}` | 3.07:1 | passes 1.4.11, barely — do not put a control on a darker well |
| `{colors.hairline}` on `{colors.canvas}` | 1.31:1 | fails 1.4.11: dividers only, never a control edge |
| `{colors.warn-ink}` on `{colors.warn-band}` | 7.23:1 | AAA |
| `{colors.on-error}` on `{colors.error-band}` | 7.02:1 | AAA |
| `{colors.dark-ink}` on `{colors.dark-ground}` | 14.92:1 | AAA |
| `{colors.dark-muted-ink}` on `{colors.dark-canvas}` | 7.80:1 | AAA |
| `{colors.dark-provenance-ink}` on `{colors.dark-canvas}` | 11.23:1 | AAA |
| `{colors.dark-on-provenance}` on `{colors.dark-provenance}` | 5.34:1 | AA. White on `#3FA3AE` is 2.97:1 — that combination is banned in dark |
| `{colors.dark-on-error}` on `{colors.dark-error-band}` | 7.56:1 | AAA |
| `{colors.dark-warn-ink}` on `{colors.dark-warn-band}` | 7.18:1 | AAA |

**The reservation.** `{colors.provenance}` may be filled only by: the wordmark, the pipeline's active
stage, the `MeetMate:` eyebrow and left border of a post, a live/ĐANG NGHE pill, and the primary button
when it starts or stops capture. A hover tint, a chart, a decorative bar, or a "success" badge wearing
petrol is a bug, because the moment anything else can be petrol, "MeetMate wrote this" stops being
readable at a glance.

**Where the reservation binds, and where it cannot.** It is absolute on the extension surfaces — the
popup, the Meet chat rail, the research card — because that is where the distinction it protects actually
exists: MeetMate's words sit inside somebody else's box and have to be separable from it. The web console
has no such adjacency. There, petrol is simply the brand's primary colour, and it is allowed on the
primary action, the selected control, and the active step. What survives in every surface is the negative
half of the rule: petrol never marks something MeetMate did not generate (a "Recommended" badge, a
"success" chip, a decorative bar, a chart series takes `{colors.ink}` or `{colors.surface-subtle}`
instead), and it never decorates. `#2a9d90` in the chart palette is 1.2 hue steps from petrol and is
listed in Known Gaps for exactly that reason.

**Warn vs error.** They differ in three channels, not one: polarity (pale band + dark text vs solid band
+ white text), relative luminance (0.90 vs 0.10 for the bands), and glyph (△ vs ⯄). So a projected room
or a red-green colour difference still separates "keep going, degraded" from "the line is blocked".

**Warn is reserved the same way, and the capture broke it.** `{colors.warn-band}` + `{colors.warn-ink}`
mean exactly one thing: a session that is running but degraded. The reference capture painted its
review-promo card in that amber — cream fill in light, a brown gradient in dark — so the warn hue was
doing decoration duty on a marketing surface. Under this contract that card is neutral:
`{colors.surface-subtle}` fill, `{colors.hairline}` edge, `{colors.muted-ink}` eyebrow, `{colors.ink}`
title. An amber that can appear on a promo is an amber a degraded session cannot appear in without being
read as decoration. Same reasoning retired the card's gradient in dark: dark separates tiers with
`{colors.hairline}`, never with paint.

`{colors.status-ended}`, `#2a9d90`-family chart colours and the interview-era domain surfaces
(`--session-*`, `--documents-background`) keep their names from the reference capture and carry
MeetMate values; they are renamed when the copy is renamed (Stage 6), not before. The *names* survive, the
*values* do not inherit the capture's decoration: `--cv-*` was an invented blue with no token behind it and
`--documents-background` was a byte-for-byte copy of `{colors.provenance-tint}`, so the Documents grid was
filled with the tint that means "MeetMate generated this". Both now sit on the neutral card tier —
`{colors.surface-subtle}` fill, `{colors.hairline}` edge — like the review-promo card above and every other
console card. A name that outlives its brand is fine; a reserved colour that leaks into a background is not.

## Typography

Three families, all three verified to carry the `vietnamese` subset in the Google font registry bundled at
`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`, loaded in
`app/dashboard/layout.tsx`:

- **Be Vietnam Pro** — body. Drawn for the Vietnamese diacritic stack; this product's copy is Vietnamese
  first, so that is a requirement, not a taste. It is the base face, so it is what `--font-ui` points at.
- **Overpass** — display and UI labels. Highway-Gothic lineage: numerals that stay legible at 11px, and an
  800 weight for the wordmark.
- **Overpass Mono** — data. Same foundry as the display face, so it is one download, not two.

Discipline that the fonts cannot enforce and the contract can:

1. **Mono carries ASCII only.** `00:14`, `[2/4]`, URLs, `450 ký tự`. Anything with a Vietnamese diacritic
   that must be prose — `Vì sao chọn:` above all — is set in the body face. A monospace font that supports
   Vietnamese is not an excuse to typeset sentences in it.
2. **No `text-transform: uppercase` on copy.** All twelve rules that forced it are removed. Uppercase
   breaks Vietnamese tone marks visually (and `12px` tracked labels are exactly where it looks worst).
   Eyebrows carry hierarchy by weight 700 + `letterSpacing: 0.05em` + colour instead.
3. `letterSpacing` is `-0.025em` on display and heading sizes only; body and captions stay at `0px`.
4. **`typography.eyebrow` is an 11px tier, and only six selectors are in it:** `.mm-post__eyebrow`,
   `.session-card__date`, `.ocline__who`, `.abubble__who`, `.pref__previewlabel`, `.upg__label` — all
   Overpass 700 at `0.05em`. The tracked 12px labels (`.nav-label`, `.session-table th`, `.wiz__eyebrow`,
   `.conn__label`) are a different tier the contract does not tokenise; they stay in the body face at
   weight 500-600. If a new 11px metadata label appears, it joins the eyebrow list; if it is 12px, it
   does not.

Retired, with the real reason for each: `Caveat` — the bundled registry gives it `cyrillic`, `latin`,
`latin-ext` and no `vietnamese`, so every hand-written label was a silent diacritic-loss bug; the
hand-written idiom itself belonged to the capture, not to MeetMate. `Chakra Petch` — it *does* have
`vietnamese`; it left because it is the capture's brand voice, not for a technical reason.
`Inter Tight` — replaced by Overpass so display and UI labels are one family.

Semantic variable names are unchanged (`--font-ui`, `--font-display`, `--font-mono`, `--font-hand`) —
each is referenced once in the token block and consumed in more than thirty rules, so re-pointing the
values moved the whole surface without touching a class. `--font-hand` is deleted, not aliased: its only
consumer was the CV drop-zone line, and the Resumes page that carried it is gone.

## Layout

The console is `grid-template-columns: var(--sidebar-width) minmax(0,1fr)` with a 264px rail, a 64px
topbar, and a content column capped at 1400px, `20px 24px` padding. Cards are
`repeat(auto-fill, minmax(260px, 1fr))` with 12px gaps — 260px is the width at which a Vietnamese meeting
title stops hyphenating into nonsense.

The popup is a device frame, not a page: **360×520**. 360 because Meet's chat column is ~344–360px wide,
so the popup and the surface it dictates text to share one line measure; 520 because two key fields, one
button, one status line and the six-stage strip fit without scrolling, which matters because Chrome caps
an action popup at 800×600 and scrolls awkwardly above ~600px height.

One signature governs four surfaces (popup, Meet chat, result card, meeting detail): the anatomy of a
post.

```
│ MeetMate: [2/4]              ← eyebrow, {colors.provenance-ink}, Overpass 11/700
│ Giá gói SME đang niêm yết    ← title, display 15/700, from the search result, not from the model
│ https://blaze.vn/bang-gia-sme ← Overpass Mono 12px, {colors.source}, underline, wrap-anywhere
│ Vì sao chọn: trang giá chính thức, cập nhật 14/10.
│ ─────────────────────────────
│ nguồn 1/4 · 312 ký tự        ← foot, hairline rule, {colors.muted-ink}
```

The frame is a 2px left border in `{colors.provenance}` plus `{rounded.md}` on the other three corners —
the border is the signature, so the corner radius is asymmetric by design. Hard limits are content rules,
not CSS rules, and they come from the spec: a post is ≤450 characters, a URL is never truncated,
`summaryMaxChars` 300, `reasonMaxChars` 200, `maxSources` 4. A cut URL is a broken promise, not a layout
fix; `overflow-wrap: anywhere` is the only ellipsis policy allowed.

## Elevation & Depth

Light theme uses the four captured tiers and they are *not* the identity: `--shadow-control` is
`0 1px 2px rgb(0 0 0/.05)` and nothing heavier appears inside a surface. Dark theme sets all four to
`none` and separates by `{colors.dark-hairline}` only — this is the one structural rule the capture got
right, and it is preserved verbatim.

Depth in MeetMate is instead carried by *ground vs canvas*: `{colors.ground}` is the app, `{colors.canvas}`
is a card, `{colors.surface-subtle}` is a well inside a card. Three steps, no blur. The live overlay keeps
`backdrop-filter` where it floats over Meet's own video grid, because there it is genuinely over someone
else's content.

No gradient anywhere. The chart palette is its own five values and must not be derived from
`{colors.provenance}` — a chart that looks like the brand makes the brand's claim harder to read.

## Shapes

`{rounded.none}` for the post's left border (it is a rule, not a corner), `{rounded.xs}` 8px for chips and
glyph boxes, `{rounded.sm}` 12px for tabs, menus and status bands, `{rounded.md}` 16px for cards, controls
and posts, `{rounded.lg}` 24px for buttons, `{rounded.xl}` 32px for dialogs, `{rounded.full}` for pills,
stage dots and avatars.

Two shapes carry meaning and may not be reused decoratively: the **2px left border** means "this frame is
a MeetMate post" (hairline when the post was cancelled), and the **6-stage dot row** means "this is the
pipeline" (pending = ring in `{colors.hairline}` + `{colors.muted-ink}` text, active = filled
`{colors.provenance}` + `{colors.on-primary}` text, done = `{colors.provenance-tint}` + `{colors.ink}`
text). One accent, three lightness steps, zero new hues.

Icons are 1.8px stroke, round caps, inline SVG, from `components/dashboard/icons.tsx`. No new glyph is
needed for the pipeline; `IconTranscript`, `IconFolder`, `IconCheck`, `IconAlert`, `IconLink`, `IconCopy`,
`IconMicOff` cover it. No logo is drawn: the only mark currently in the code belongs to the capture, and a
mark invented during a research pass has no right to become the brand.

## Components

`{components.post-primary}` — the signature. Uses `{typography.body-sm}` for the reason line,
`{components.post-cancelled}` for the one the user aborted: same frame, same padding, same corners, with
`{colors.hairline}` as the left border, `{colors.surface-subtle}` as the fill, and `line-through` on the
title. A cancelled post must be recognisable as a post, at a glance, in a scrollback. That is why it keeps
the frame and why failures are never toasts.

`{components.band-warn}` / `{components.band-error}` — inline bands, never floating. Warn:
`{colors.warn-band}` fill, `{colors.warn-ink}` text, △. Error: `{colors.error-band}` fill,
`{colors.on-error}` text, ⯄. The glyph is part of the token set, not an emoji, and it is the reason the
pair survives greyscale projection. In dark the polarity flips as a pair (pale-on-dark for warn, dark text
on a light band for error) — see the table in §Colors.

`{components.button-primary}` — `{colors.provenance}` fill with `{colors.on-primary}` text at 4.95:1. In
dark it is `{colors.dark-provenance}` with `{colors.dark-on-provenance}`: white on dark petrol is 2.97:1
and is banned. Buttons are real `<button>`s; `{rounded.lg}`; one primary per surface, and in the popup the
one primary is Start or Stop — never both.

`{components.text-input}` and every `.select`/`.textarea` take a `{colors.boundary}` border
(3.48:1 on canvas), because `{colors.hairline}` is 1.31:1 and fails WCAG 1.4.11 for a control edge. Focus
is a 2px `{colors.focus-ring}` outline at 2px offset — the same hue as the brand, because focus is the one
place where "this is ours" is not a claim about content.

`{components.nav-item}` is 44px tall (touch minimum), `{components.pill-status}` and
`{components.stage-active}` are 24/26px.

`{components.card-session}` / `{components.menu}` / `{components.dialog}` follow §Shapes. There are two card
tiers and the console depends on the difference: objects that sit *in a list over the app ground* — session
and document cards — are `{colors.surface-subtle}` with a `{colors.hairline}` edge, because they need one
step of separation from `{colors.ground}` and a second from each other; panels, dialogs, menus, inputs and
table rows are `{colors.canvas}`, because they are the sheet the content is written on. A list card painted
`{colors.canvas}` loses its edge to a white panel behind it, and a dialog painted `surface-subtle` reads as
one more row. Check which of the two a new surface is before picking its fill.

`{components.panel-upgrade}` is the pricing surface's tier. Pricing is a route (`/dashboard/upgrade`), not a
frame: a 640px dialog made the CTA wait behind a scroll and left the rest of the console's width empty. The
page spends that width on two columns — the card you are buying on the left, the reasons on the right — and
every panel in the right column is `{colors.canvas}`, because it is a sheet of reference, not a list object.
`{components.matrix-active-column}` marks the column for the tab you are on with a
`{colors.surface-subtle}` fill *and* a 2px `{colors.ink}` rule under its header, because "which tab is open"
and "which column is yours" are one fact shown twice. `{components.meter-balance}` and
`{components.meter-balance-fill}` take `{colors.hairline}` and `{colors.ink}`: a credit balance is a fact
about your money, not something MeetMate generated, so it is the one bar in the console deliberately not
petrol — and the rail card and the pricing page draw it with the same two tokens.

`{components.menu}` has two forms, and the difference is not a theme. The dashboard's menus are surface
menus (`{colors.canvas}` fill, `{colors.ink}` text). The live overlay's kebab menu (`.dmenu`) is an
**inverted popover**: it keeps a fixed near-black fill in both chromes, so it must carry its own ink tier
locally rather than inherit `--ink` — over the overlay's light-chrome variant that inheritance made the
items dark-on-dark and invisible. A component that paints its own background owns its own foreground;
that is the rule, the fix is the example.

**Hover and active states are proposals, not measurements** — the capture never extracted them
(`DESIGN.md` says so in its own Known Gaps). Current proposal: hover raises to `{colors.surface-subtle}`,
an interactive petrol element moves one step toward `{colors.provenance-ink}`, pressed steps back 1px, all
at 180ms `var(--ease-out-strong)`. Marked `needs-design-decision` below.

## Do's and Don'ts

Do reserve `{colors.provenance}` for text MeetMate generated and is answerable for. Do set links in
`{colors.source}` with an underline in `{colors.source-line}` and `code-md` mono — three signals, not one
colour. Do let a long Vietnamese title wrap; a meeting title is data, and cutting it is worse than a
third line. Do render the cancelled post in the same frame as the real one. Do keep 4.5:1 at 11px, which
is why `{colors.muted-ink}` is 6.12:1 rather than the 4.6:1 a lighter grey would have given. Do use
sentence case everywhere, including eyebrows.

Don't use petrol as a decorative accent, a hover tint, a success badge, or a chart colour — see the
reservation in §Colors. Don't set `{colors.source-line}` or `{colors.boundary}` as a text colour (1.24:1
and 3.48:1 respectively against what they sit on). Don't put a `{colors.boundary}` control on a
`{colors.surface-subtle}` well at 3:1 and call it visible — the table says it is barely legal on the
ground and it is on the canvas that it holds. Don't use `text-overflow: ellipsis` on a URL. Don't use a
toast for a failed step. Don't wire a primary action to the same outcome as the X: *answering* a request and
*not wanting to see it in this page* are two acts, so the review card swaps to a thank-you and stays, while
the X clears the slot for the current view only. Don't let either write `localStorage` or `sessionStorage`:
the position they sit in is the console's banner slot, and a slot a visitor can switch off for good is a slot
no later campaign can use — both answers are component state, every page view re-runs the campaign, and the
X says so in a toast instead of letting the card return unexplained. A CTA that silently deletes the card it
lives on tells the user nothing about why the surface changed. Don't put a `no-mic` session in the error band: it is degraded and it is still
running, and telling those apart is the whole point of two bands. Don't paint a promo, an upsell, or any
other non-session surface in the warn amber — see §Colors. Don't add an API-key field to any web
surface; keys live in `chrome.storage.local` in the extension and a web input for them would raise exactly
the question ("where does this key go?") that this architecture has no answer for. Don't re-use the
capture's brand layer — its wordmark, its icon, its hand-written idiom, its green.

## Responsive Behavior

Console: rail collapses to 76px at 1080px; below 900px the grid becomes a single column with the rail as a
top strip; at 640px cards are one per row, the topbar subtitle hides, and tables scroll inside their own
box rather than forcing a horizontal page scroll. Popup artboards are fixed 360×520 device frames and must
not be made fluid — the frame *is* the constraint that makes the copy honest. PAGE artboards are fluid
with a `max-width` container and work at phone width.

The pipeline row never wraps into a stack: six stages in a horizontal line is the one thing that must stay
readable in a 360px column, so below 380px it becomes `1 · 2 · 3 · 4 · 5 · 6` with the label on the active
stage only. `prefers-reduced-motion: reduce` is honoured at the file level (a global rule already zeroes
durations); no animation carries information that the static frame does not.

Where a break depends on how wide a *column* is, use a container query, not a media query. The upgrade
page's price row is the case: the buy column is ~410px at a 1081px viewport and ~358px on a phone, so a
single `@media` threshold either clips the nowrap figure on one and wastes a line on the other. The column
carries `container-type: inline-size` and the row breaks its price onto a right-aligned second line at
`max-width: 460px`.

## Known Gaps

- `needs-design-decision` — hover/active/pressed tokens for every interactive component. Proposed above;
  nothing measured. The capture never extracted them and this contract refuses to invent a fake
  provenance for them.
- `needs-design-decision` — chart palette. `#2a9d90` is teal-adjacent to `{colors.provenance}` (they are
  1.2 steps apart in hue) and the reservation in §Colors argues against that. Re-point it when charts
  appear in a real screen, not before.
- **The dashboard wears the brand but still speaks the old copy.** `lib/dashboardData.ts` still emits
  `toUpperCase()`-style English eyebrows and 818 English strings, and `components/dashboard/*.tsx` still
  names the product by its capture-era name (~41 occurrences). Changing them edits logic and accessible
  names that `scripts/dash-smoke.mjs` asserts — that is Stage 6 of the re-platform plan, deliberately out
  of this pass's scope.
- `data-lg` (22px Overpass Mono) exists in the artboards (Meetings stats) but has no consumer in code yet;
  code currently sets mono at 11–14px. Either the stat row lands or the level goes.
- The signature classes (`.mm-post*`, `.mm-band*`) and the `--mm-*` roles are implemented as tokens and
  CSS but no component consumes them yet; they are the contract Stage 2/3 implements. Until then the
  canvas is the only place the post anatomy exists in rendered form.
- **Two names for the band roles.** `{colors.warn-ink}`/`{colors.error-band}`/`{colors.on-error}` (the
  capture's `--warning-ink`, `--danger`, `--on-danger`) and `--mm-warn-text`, `--mm-error-band`,
  `--mm-error-text` carry identical values in both themes. Only the pale warn *band* is genuinely a new
  role with no name in the capture. The duplication is drift waiting to happen and collapses to one set
  when `.mm-band` gets its first consumer — do not add a third name before then.
- `.ovl[data-chrome="light"]` re-points the core ink/hairline/danger triplets but not the `--mm-*` ones,
  so a `.mm-band` placed inside the light live-chrome today would take the surrounding theme's band
  values rather than light ones. Invisible now (no consumer); the first thing to fix when `.mm-band`
  lands.
- The canvas has not been render-verified. `artifact.mjs check` reads files; it does not run scripts and
  does not know how a layout looks. Contrast in §Colors *is* computed; picture quality is not.
- `--mm-post-h` from the plan was not implemented: a fixed post height contradicts "a long title wraps".
  The frame is defined by padding + border, and that is enough.
- Where the extension's source lives is still unresolved: the spec places `extension/` under
  `agents/sidekick/`, which this pass was told not to touch. The popup artboards assume a folder that does
  not exist yet.
