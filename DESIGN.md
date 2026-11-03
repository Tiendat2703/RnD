---
version: alpha
name: ParakeetAI-reference-capture
description: Design system captured from the production CSS of parakeet-ai.com, extended with a second pass over 19 screenshots of the live-session surfaces (create-session wizard, connect dialog, live overlay, answer preferences, session detail panel, monetisation and pricing dialogs). Reference-only capture for building a different product — not a brand license. Base theme is light; dark and a second brand theme are documented in prose.
colors:
  primary: "#16a34a"
  on-primary: "#fafafa"
  primary-dark-theme: "#166534"
  ink: "#18181b"
  muted-ink: "#71717a"
  canvas: "#ffffff"
  surface-card: "#ffffff"
  surface-subtle: "#f4f4f5"
  surface-session: "#f5f5f4"
  surface-cv: "#e0eeff"
  surface-documents: "#d6ece5"
  hairline: "#e4e4e7"
  hairline-cv: "#c4dcfd"
  canvas-sidebar: "#fafafa"
  danger: "#dc2626"
  on-danger: "#fef2f2"
  warning: "#f59f0a"
  warning-ink: "#b45309"
  # `info` is new in the third pass: the account surfaces need a "there is
  # something here" blue that is not the brand green and not an error red.
  info: "#3c83f6"
  info-dark-theme: "#639cf8"
  success-pill-bg: "#e4fccb"
  success-pill-ink: "#3a7d0e"
  success-pill-stroke: "#85e833"
  status-ended: "#d4d4d8"
  focus-ring: "#18181b"
  chart-1: "#2a9d90"
  chart-2: "#e76e50"
  chart-3: "#274754"
  chart-4: "#e8c468"
  chart-5: "#f4a462"
  # --- Dark-chrome tokens (second-pass capture; mechanical conversions of the
  # --- `.dark` HSL triplets already listed in the Colors table, given explicit
  # --- roles because the live overlay / connect dialog / session menus render
  # --- them as a permanent dark chrome) ---
  canvas-dark-theme: "#09090b"
  surface-raised-dark: "#18181b"
  hairline-dark: "#27272a"
  ink-dark-theme: "#e4e4e7"
  # --- Screenshot estimates (second pass, visual only — NOT CSS conversions;
  # --- verify against computed styles before trusting any of these four) ---
  pricing-gradient-top: "#e7f5ec"    # screenshot estimate — top of Unlimited card gradient
  pricing-gradient-bottom: "#f7f3ea" # screenshot estimate — bottom of Unlimited card gradient
  pricing-credits-canvas: "#faf6f0"  # screenshot estimate — Credits tab card background
  deal-chip-bg: "#fde047"            # screenshot estimate — "with code DEAL50" chip fill
  # --- Fourth pass: the review ask became a full-width illustrated card. The
  # --- wash is a three-stop gradient; these two are its middle and outer stops,
  # --- read off the implementation (`hsl(45 96% 93%)`, `hsl(40 92% 85%)`). ---
  promo-wash: "#fef6dc"
  promo-wash-edge: "#fce4b6"
typography:
  display-lg:
    fontFamily: "'Chakra Petch', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
    fontSize: 30px
    fontWeight: 600
    lineHeight: 36px
    letterSpacing: -0.025em
  heading-md:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.025em
  heading-sm:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  caption:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.05em
  eyebrow-sm:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  data-lg:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: 0px
  button-md:
    fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  code-md:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  annotation-hand:
    fontFamily: "'Caveat', cursive"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  section: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  card-session:
    backgroundColor: "{colors.surface-session}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px"
  card-session-frame:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "8px"
  card-cv:
    backgroundColor: "{colors.surface-cv}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-documents:
    backgroundColor: "{colors.surface-documents}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "16px"
  pill-ready:
    backgroundColor: "{colors.success-pill-bg}"
    textColor: "{colors.success-pill-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  pill-status-ended:
    backgroundColor: "{colors.status-ended}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  pill-credit:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  tab-item:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  tab-item-selected:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  # --- Fourth pass: the session filter row is page navigation, not a control, so
  # --- it underlines the active tab on a rule instead of filling a pill. ---
  tab-page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.none}"
    padding: "10px 2px"
  tab-page-selected:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.none}"
    padding: "10px 2px"
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  sidebar-nav:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px"
  alert-error:
    backgroundColor: "{colors.on-danger}"
    textColor: "{colors.danger}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  # --- Second-pass components (wizard / live overlay / detail panel / pricing).
  # --- Light-theme values shown; dark-chrome variants documented in Components. ---
  button-cta-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  button-danger-solid:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  button-on-dark:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.ink-dark-theme}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  button-primary-on-dark:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: 40px
  segment-track:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "4px"
  segment-item:
    textColor: "{colors.muted-ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  segment-item-selected:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
    height: 40px
  stepper-step-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  stepper-step-idle:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  toggle-switch-on:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
    width: 44px
    height: 24px
  radio-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  radio-card-selected:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  menu-surface:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px"
  menu-item:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  menu-item-danger:
    textColor: "{colors.danger}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  dialog-dark:
    backgroundColor: "{colors.canvas-dark-theme}"
    textColor: "{colors.ink-dark-theme}"
    typography: "{typography.body-md}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  dialog-themed:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  chat-bubble:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  chip-suggestion:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  pill-timer-free:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.ink-dark-theme}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card-free-credits:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip-deal:
    backgroundColor: "{colors.deal-chip-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  card-pricing-recommended:
    backgroundColor: "{colors.pricing-gradient-top}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "24px"
  # --- Account surfaces (third pass: user menu, credit menu, support chat,
  # --- profile page, split create button, review prompt) ---
  badge-new:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.full}"
    size: "8px"
  button-split-toggle:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    height: "40px"
    width: "40px"
  promo-card:
    backgroundColor: "{colors.promo-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "24px"
  plan-strip:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "16px"
  # --- Fourth pass: support stopped being a floating launcher and became a row
  # --- in the rail, so the rail row is the token that matters. Every nav row —
  # --- Link or button — shares this geometry; see Components. ---
  nav-item:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  support-panel:
    backgroundColor: "{colors.canvas-dark-theme}"
    textColor: "{colors.ink-dark-theme}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    width: "360px"
  support-bubble-agent:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.ink-dark-theme}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  support-bubble-you:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# ParakeetAI — captured design system (reference)

## Overview

**What this is.** A design-system capture reverse-drawn from the shipped CSS of
`parakeet-ai.com`, produced so its *mechanics* can be reused in an unrelated
product. Token architecture, naming discipline, and motion strategy are
transferable. The brand layer is not: the name "ParakeetAI", the "codeboss"
brand, the logo, marketing copy, illustrations, and the `departureMono` font
are owned assets and are deliberately **not** reproduced here.

A second pass (Nov 2026) added the **session lifecycle and monetisation
surfaces** from 19 product screenshots: the create-session wizard, the connect
dialog, the live overlay, the leave/end-session choice, answer preferences
(master–detail with live preview), the session detail panel (AI notes /
Transcript / Ask AI / Call details), and the Unlimited/Credits/Custom pricing
dialogs. These entries carry a "second pass" marker in prose and the four
non-CSS hex values are marked *(screenshot estimate)* in frontmatter; they hold
lower confidence than the CSS-derived tokens.

A third, cheaper pass read the **rendered DOM of the public page** and settled the
icon layer — library, drawing weight, size scale, glyph inventory, and the
line/pixel brand slot mechanism. It is the one section where the screenshots were
actively misleading: the markup advertises Lucide's default 2px weight, and a
single global CSS rule ships 1.5px.

**Stack observed.** Tailwind CSS v4 (`@theme` with `--spacing: 0.25rem`
dynamic scale) + shadcn/ui token vocabulary + a hand-authored semantic layer on
top. Base palette is the shadcn **zinc** ramp, not a custom grey ramp.

**Source coverage.**

| Source | Status | Confidence |
|---|---|---|
| `08kuqptwm_x9t.css` (654 KB, app theme) | authoritative | high |
| `31o6s2-f2qd7r.css` (12 KB) | supporting | medium |
| Accessibility tree of `/dashboard/callSessions` (275 nodes, via REA CDP) | supporting | high for structure |
| 19 screenshots — session lifecycle + pricing surfaces (user-supplied, Nov 2026) | supporting | high for structure/flow, medium for values |
| Rendered DOM of the public page (~210 inline SVG nodes, Nov 2026) | authoritative for the icon layer | high — verified attributes, not read off stills |
| Computed styles per element | **not captured** | — see Known Gaps |
| Figma / design docs | unavailable | — |

Every hex from the CSS pass is a mechanical conversion of an `hsl(H S% L%)`
triplet found in the theme block; nothing CSS-derived in `## Colors` is
estimated. The four tokens marked *(screenshot estimate)* in frontmatter are
visual approximations from the second pass and are the only non-mechanical hex
values in the file.

## Colors

The implementation stores colors as **bare HSL triplets** and wraps them:

```css
--primary: 142.1 76.2% 36.3%;        /* raw: themeable, alpha-composable */
--color-primary: hsl(var(--primary)); /* usable */
```

This is the single most load-bearing decision in the file. It buys three things
worth copying: brand swap by overriding triplets only, `hsl(var(--x) / .5)`
alpha without duplicate tokens, and light/dark as a data swap rather than a
second token set.

### Three themes, one attribute

| Token | `:root` light | `.dark` | `:root[data-brand=codeboss]` |
|---|---|---|---|
| `{colors.canvas}` / bg | `#ffffff` | `#09090b` | `#0b0b0b` |
| `{colors.ink}` / fg | `#18181b` | `#e4e4e7` | `#e6e6e6` |
| `{colors.primary}` | `#16a34a` | `#166534` | `#ff5f01` |
| `{colors.hairline}` | `#e4e4e7` | `#27272a` | — |
| `{colors.muted-ink}` | `#71717a` | `#a1a1aa` | — |
| base radius | `.5rem` | inherited | `2px` |
| display font | Inter Tight | inherited | Chakra Petch |

The third column is the interesting one: **a second product identity is mounted
on the same codebase via a root attribute**, and it overrides colour *and*
radius *and* type. A brand is not a palette here — it is a token namespace.

**Preference and resolution are two different values.** The account menu offers
Light / Dark / Auto, so the stored setting can be `auto` while the attribute on
the shell can only ever be `light` or `dark`. Keep them as two values: the
preference is what the radio rows check, the resolved theme is what paints and
what the quick toggle in the top bar flips. Reading `matchMedia` only while the
preference is `auto` also means a system flip mid-session moves the surface
without ever overwriting what the person chose.

### Semantic tokens keyed to business objects

Most captures stop at `surface`/`muted`. This system continues past the UI
vocabulary into domain vocabulary:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--session-background` / `-border` / `-pill` | `#f5f5f4` / `#e4e4e7` / `#e7e5e4` | `#18181b` / `#27272a` / `#27272a` | call-session card |
| `--cv-background` / `-border` | `#e0eeff` / `#c4dcfd` | `#2f3953` / `#394f82` | CV surface |
| `--documents-background` | `#d6ece5` | `#123f38`-range | documents surface |
| `--ready-pill-background` / `-text` / `-stroke` | `#e4fccb` / `#3a7d0e` / `#85e833` | `#2b5413` / `#a6f363` / `#479b0b` | "ready" state pill |
| `--status-ended` | `#d4d4d8` | `#52525b` | ended-session chip |

Note `--ready-pill-*` carries **three** tokens (fill, ink, stroke) rather than
one — the pill is filled, outlined, and legible all at once, and each of those
is separately themeable. Adopt the triple where a status chip must read against
arbitrary backgrounds; use the pair elsewhere.

Data colours `{colors.chart-1}` … `{colors.chart-5}` are a warm/teal set
(`#2a9d90`, `#e76e50`, `#274754`, `#e8c468`, `#f4a462`), and they are **not**
derived from `{colors.primary}` — charts are their own palette on purpose.

### Dark chrome is a surface, not a theme setting

The second pass shows the live-session stack — connect dialog, live overlay,
leave/end dialog, answer preferences, session kebab menu — rendering as
**permanent dark chrome** (`{colors.canvas-dark-theme}` base,
`{colors.surface-raised-dark}` raised panels, `{colors.hairline-dark}` borders,
`{colors.ink-dark-theme}` text) even while the dashboard itself is in light
theme. The overlay sits on top of someone else's app window (a Google Meet /
YouTube tab), so it pins itself dark for legibility and focus. If you adopt
this: give the call surface its own always-dark token set, and do not let the
user theme toggle leak into it.

**The chrome belongs to the opener, not the dialog.** "Answer preferences" is
reachable from two places: the live overlay's kebab and the create-session
wizard's Configure row. The first is a pinned-dark surface, the second is a
themed one — and a `{components.dialog-dark}` dropped over a light wizard, under
a 72%-black scrim, covers the entire viewport and reads as the product switching
theme by itself. The shell therefore takes a `chrome` argument:
`{components.dialog-dark}` when the opener is the call surface,
`{components.dialog-themed}` when it is not. Everything inside is already token
consumers (`.dcard` paints `var(--canvas)`, `.apreview` uses
`hsl(var(--surface-subtle-raw) / 0.6)`, `.pref__row--on` uses
`hsl(var(--ink-raw) / 0.1)`), so dropping the `darkchrome` scope re-paints the
whole dialog with no new rules. Two things were still baked to dark and had to be
scoped: the native `<option>` list (`.select--dark option` is now
`.darkchrome .select--dark option`) and the light-on-dark CTA — in theme chrome
`Save` becomes `{components.button-primary}`, because a near-white button on a
white card is invisible.

### The last-mounted modal owns the keyboard

Every dialog used to attach its own `document` Escape listener, so with
preferences stacked over the wizard, one Escape dismissed the wizard *behind* it
and left the dialog the person was looking at. `modalStack.ts` keeps a
push/pop array of mounted panels and each handler returns early unless its panel
is topmost. The registration must not re-run on parent renders — the shared
context changes whenever any preference changes, so `onClose` is held in a ref
and the effect depends only on `open`; otherwise a background dialog re-pushes
itself to the top of the stack and steals the key back.

### Two action-button roles, one accent colour

The green `{colors.primary}` is **not** the universal CTA colour. Two roles
coexist:

| Role | Token | Where it appears |
|---|---|---|
| Product action | `{components.button-primary}` (green) | dashboard ("Start session" class of actions) |
| Flow completion | `{components.button-cta-ink}` (ink; inverted to `{components.button-primary-on-dark}` on dark chrome) | wizard "Next" / "Create regular session", Send, Download, Upgrade, "Go Unlimited · Monthly $74.95" |

Green is spent on *state* instead: stepper active circle, selected radio dot,
pricing feature checkmarks, the ready pill. On dark chrome the primary action
is the **light** button (`Connect`, `Answer`, `Save`, `Select`) and the
negative/neutral one is the dark bordered button (`Back`, `Screenshot`,
`Leave for now`) — the polarity flips with the theme, the hierarchy does not.

### Screenshot-estimated values (second pass)

`{colors.pricing-gradient-top}` / `{colors.pricing-gradient-bottom}` (the
Unlimited card's vertical mint→cream gradient), `{colors.pricing-credits-canvas}`
(the Credits card's warm ivory) and `{colors.deal-chip-bg}` (the "with code
DEAL50" coupon chip) are visual approximations — the underlying CSS variables
were never observed. Treat them as starting points, not facts. The amber
"Most popular" / "Best value" / "+2 free" micro-chips read as light fills of
the existing `{colors.warning}` family.

## Typography

Two families carry the product: `'Inter Tight'` for UI text and a display face
that changes per brand (`'Chakra Petch'` default, `'Bricolage Grotesque'` in
the codeboss namespace). `'JetBrains Mono'` for code, `'Caveat'` (handwriting)
as a deliberate accent, `'Archivo'` on some marketing surfaces.

Type scale is Tailwind's default, with paired `--text-*--line-height` tokens:
12/16, 14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40. `letterSpacing` uses
`--tracking-tight: -0.025em` on headings and `--tracking-wider/-widest` on
uppercase labels — the wide tracking on small caps is the main typographic
signature.

All five faces are OFL and available on Google Fonts, so they are reusable
without licence friction. **`departureMono` is not** — it is a named custom
face; substitute any mono you have rights to.

## Layout

`--spacing: 0.25rem` makes the entire spacing scale a multiple of 4px, generated
on demand by Tailwind v4 rather than enumerated. Container widths are tokenised
(`--container-3xs` 16rem → `--container-6xl` 72rem) and reused for max-widths.

Dashboard shell, from the accessibility tree: a persistent sidebar (own token
set `{colors.canvas-sidebar}` + `--sidebar-*`), a `region "Notifications
alt+T"` toast host with a declared keyboard shortcut, and a content column of
filter tab rule → promo → search / view controls → session grid.

**The page title belongs to the topbar, not the content column** (fourth pass).
One `<h1>` per page, sitting under the brand row with a one-line subtitle beneath
it and the create action on the opposite edge; the content starts at its first
control. A page that repeats its own heading in the body has two `<h1>`s and
scrolls the useful one away. The content column is left-aligned and capped at
1400px rather than centred, because the topbar title is the page's only heading
and has to sit on the same edge as what is under it.

The second pass adds five recurring split geometries (screenshot-measured, so
round numbers only):

- **Wizard dialog** (~720px wide): fixed left rail (~260px) holding title,
  subtitle, vertical stepper and persistent help actions (`View tutorial`,
  `Mock presets`); right column is the form; footer actions sit bottom-right
  as secondary + ink CTA. The rail does not change between steps — only the
  right column and the stepper advance.
- **Session detail panel** (~900px, right slide-over): 240px sidebar-canvas
  rail (session title, subtitle, 4-item tab list, feedback links pinned to the
  rail bottom) + content column with a header row of
  section title → contextual actions → kebab → close.
- **Live overlay**: full-viewport dark shell split against the call tab;
  header row (brand · timer pill · kebab · Exit), body, then a three-tier
  footer stack — status chip row, message input row, action row (`Answer` /
  `Screenshot` full-width pair).
- **Master–detail preference dialog**: left column is the editing surface
  (list or radio cards), right column is a **persistent live preview**
  (Question Type select + rendered Answer Preview) that survives navigation
  into sub-dialogs. The preview half never changes while the left half does.
- **Pricing dialog**: tab pill floats above a single large card; the card, not
  the dialog, carries the theme of the plan (green gradient for Unlimited,
  ivory for Credits).

## Elevation & Depth

Elevation is **semantic, four tiers**, and this is worth copying verbatim:

| Token | Light | Dark |
|---|---|---|
| `--shadow-control` | `0 1px 2px 0 #0000000d` | `none` |
| `--shadow-raised` | `0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a` | `none` |
| `--shadow-popup` | `0 4px 6px -1px …, 0 2px 4px -2px …` | `none` |
| `--shadow-overlay` | `0 10px 15px -3px …, 0 4px 6px -4px …` | `none` |

In dark mode every shadow collapses to `none` and separation is carried by
`--border` instead. That is a deliberate, coherent choice — dark surfaces do not
read elevation from shadow — and it is easy to break accidentally.

43 `backdrop-filter` uses: blur is a first-class depth tool, mostly on sticky
headers and overlays.

The second pass confirms the dark rule in the wild: every dark-chrome popup
(session kebab menu, connect dialog, answer preferences) separates with a
`{colors.hairline-dark}` border and **no** visible shadow, while the light
menu on the ended-session card does carry `--shadow-popup`-class elevation.

**Stacking order (as built, and the order matters more than the numbers).**
`topbar 20 → row menu / notification panel 40 → live overlay 45 → light dialog
scrim 50 → mobile drawer scrim 55 → mobile drawer 60 → dark dialog scrim 60 →
anchored kebab menu 70 → toast host 80 → skip link 100`. Two rules fall out of
it, both verified on 390px viewports:

- A dialog launched from inside the mobile drawer must beat the drawer, so on
  `max-width: 900px` the scrims lift to `65` — above the drawer, below the
  toasts. A toast is feedback about an action, and feedback that hides behind
  the surface that triggered it is not feedback.
- The live overlay sits *under* every dialog scrim: wizard, preferences,
  pricing and leave/end all cover it, because the call keeps running while the
  user configures it. Never raise `.ovl` above `50`.

## Shapes

`{rounded.xs}` 2px → `{rounded.full}`. Component-scoped aliases exist —
`--radius-button`, `--radius-control`, `--radius-dialog` — so a button's corner
is a *role*, not a number.

**Conflict (unresolved, by design).** Each radius token is defined three times,
in cascade order:

```
--radius-xl   .75rem        ← Tailwind default
              1.5rem        ← app theme
              2px           ← data-brand=codeboss
```

The last wins, so the codeboss brand renders near-square. This is not drift — it
is the brand-namespace mechanism working. It does mean **no radius value can be
read from a screenshot alone**: you must know which brand attribute is active.
If you adopt this pattern, keep the role aliases (`--radius-button`) and never
let a component consume `--radius-xl` directly, or brand swap will half-work.

## Icons

Pulled live from `www.parakeet-ai.com` (rendered DOM + the public Tailwind chunk),
not inferred from screenshots. This is the one design layer where the code said
something the pictures could not.

**Library and markup shape (verified).** Every glyph is a **Lucide** icon rendered
inline. There is no icon font, no sprite sheet, no raster set. The shipped shape is
fixed:

```html
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
     viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-mic size-4 shrink-0" aria-hidden="true">
```

Three consequences for implementation: the 24×24 viewBox is universal, so one
`viewBox` in a shared base props helper covers the whole set; `stroke="currentColor"`
plus `fill="none"` means a glyph needs **no colour token of its own** and inherits
whatever text role it sits in — which is why `.menu__item svg { color: var(--muted-ink) }`
and `.toast svg { color: var(--primary) }` are enough; and `aria-hidden="true"` is on
every decorative icon, so meaning is always carried by adjacent text or an explicit
`aria-label` on icon-only buttons.

**Stroke weight is a CSS override, not a prop.** The markup asks for Lucide's default
`stroke-width="2"`, and exactly one global rule beats the presentation attribute
(CSS always wins over presentation attributes — the same mechanism that makes
`stroke-width` in JSX the reliable way to set it if you keep the attribute):

```css
.lucide { stroke-width: 1.5px }
:root[data-brand=codeboss] .lucide { stroke-linecap: square; stroke-linejoin: miter }
```

So the rendered truth is **1.5px, round caps and joins** on the main brand and
**1.5px, square caps and miter joins** under `data-brand=codeboss` — the same brand
switch that squares the radii in [Shapes](#shapes). The two brands are therefore one
drawing weight apart in *shape* only; weight itself is brand-independent. Everything
else in the markup is dead weight: scattered per-glyph overrides (`1.75` on plus,
`1.8` on bot/handshake/shield-check/video, `2.2`, `2.4`, and `3`–`3.2` on small
checkmarks) never render while that `.lucide` rule exists. Set the weight once in
CSS; do not thread it through 60 components.

This is also a warning about reading icons off a screenshot: at 12–16 px the
difference between 1.5 and 2 is roughly a hairline, and it is the single most
common reason a cloned UI looks "slightly wrong" without anyone being able to say
why.

**Size is set by the wrapper, not the SVG.** The `width`/`height` attributes are
always 24; the actual box comes from a Tailwind size utility on the same element.
Observed distribution across ~210 rendered icons on the public surfaces:

| Rendered size | Count | Where |
| --- | --- | --- |
| 16px (`size-4`) | 90 | default in-button, menu-leading, topbar |
| 12px (`size-3`) | 62 | meta rows, chips, keyboard hints |
| 13–18px (arbitrary) | 38 | dense controls (`size-[13px]`, `size-[15px]`, `size-[18px]`) |
| 24px (`size-6`) | 18 | empty states, feature headers |
| 20px (`size-5`) | 8 | brand mark, primary nav |
| 8px (`size-2`) | 3 | inline check inside a badge |

Our implementation already uses the same mechanism (`.btn svg` 16, `.icon-btn svg`
18, `.menu__item svg` 15, `.session-card__pills svg` 13) — the scale to keep is
**12 / 15–16 / 18 / 20 / 24**, and the fix this pass produced is the weight: the
dashboard now renders 1.5px like the capture.

**Glyph inventory for the surfaces we clone.** Lucide names, verbatim from the DOM,
mapped to the feature they serve. Use this table before drawing anything new —
roughly 60 names cover the whole product, and inventing a 61st glyph is almost
always a mis-read of an existing one.

| Surface | Glyphs |
| --- | --- |
| Session wizard / creation | `plus` `sparkles` `file-text` `file-up` `list-checks` `chevron-down` `x` |
| Live overlay | `mic` `mic-off` `phone` `video` `camera`→`images` `eraser` `send` `languages` `ellipsis-vertical` `info` `sun` |
| Answer panel | `check` `copy` `corner-down-left` `message-square` `list` `gauge`→`arrow-up-down` `pencil` |
| Session list / detail | `search` `layout-grid` `list` `download` `trash`→`delete` `undo-2` `file-pen-line` `info` |
| Credits and pricing | `gift` `zap`-family accents `thumbs-up` `thumbs-down` `handshake` `shield-check` `mail` `ticket`→`command` |
| Shell / nav | `panel-left` `bell`-family `settings`-family `globe` `bot` `contact` `briefcase-business` `audio-lines` |

(`→` marks a name we guessed from the picture before reading the DOM; the left side
is what the capture actually ships.)

**Two-identity icon slots (mechanism observed, deliberately not cloned).** Every
brand-tied icon ships in *two* variants inside the same component, and a CSS variable
decides which one renders:

```css
:root                            { --brand-icon-line: block; --brand-icon-pixel: none;  --spinner-ring: block; --spinner-diamond: none }
:root[data-brand=codeboss]       { --brand-icon-line: none;  --brand-icon-pixel: block; --spinner-ring: none;  --spinner-diamond: block }
```

Applied as `[display:var(--brand-icon-line)]` on the Lucide element and the mirror
variable on a pixel-art twin. The same trick covers empty states and loading
indicators — so a brand swap changes *illustration dialect*, not just colour. It is
an elegant answer to "one codebase, two products", and it costs a doubled DOM. We
ship one identity, so we keep **one glyph per slot**; adopt the pair of variables
only on the day a second brand is real. Their pixel set and their bird mark are the
brand layer and stay unreproduced — the rule table above is mechanics, the drawings
are theirs.

## Components

Captured surface, from the accessibility tree plus token evidence:
`{components.button-primary}`, `{components.button-secondary}`,
`{components.text-input}` → `{components.text-input-focused}` (ring is
`{colors.focus-ring}`, i.e. ink, not brand), `{components.card-session}`,
`{components.card-cv}`, `{components.card-documents}`, `{components.pill-ready}`,
`{components.pill-status-ended}`, `{components.pill-credit}`,
`{components.tab-item}` → `{components.tab-item-selected}`,
`{components.dialog}`, `{components.sidebar-nav}`, `{components.alert-error}`.

List states seen in production: filter tabs `All / Interview / Regular / Mock`;
view toggle `Card view / Table view`; sort `Newest`; search placeholder
"Search by role or company"; per-row actions `Rejoin session`,
`View transcript`, `Session actions`; a monetisation gate rendered as
`{components.pill-credit}` + `Upgrade`.

Date group headers rendered as `1 THG 11, 2026` — Vietnamese month abbreviation
inside English UI. Formatting follows `Intl` locale at runtime, not a hardcoded
string table. **We did not copy this**: our date eyebrow is
`Intl.DateTimeFormat("en-US")` uppercased (`NOV 1, 2026`) for both the card
eyebrow and the table's day rows, because the dashboard's chrome is English and
a Vietnamese month inside an English sentence reads as a bug, not a locale.

**Our toolbar (fourth pass) splits the capture's two rows.** The filter tabs are
page navigation, so they sit on a `{colors.hairline}` rule as
`{components.tab-page}` → `{components.tab-page-selected}` (ink text, 2px ink
underline, no fill) with the session total at the far right of the same rule —
one number for the whole list instead of four counts that add up to nothing when
a search is active. The type tabs reuse the card's type glyphs, so the filter row
and the grid read as one vocabulary; `All` is the only tab without one.

Everything below that rule is a control, and keeps the pill treatment
(`{components.tab-item}` / `{components.tab-item-selected}`) used inside panels.
Sort is not a `<select>`: it only ever flips between two orders, so it is one
glyph button divided off inside the search field, whose accessible name states the
current order (`Sort by newest first`). The card/table switch is icon-only for the
same reason the field is wide — the two states are adjacent and reversible — but
keeps the accessible names `Card view` and `Table view`.

At ≤900px the tab rule scrolls inside itself rather than forcing the page
sideways, and the topbar's subtitle drops out; at ≤560px the create button drops
its visible words (it keeps `aria-label="Create session"`, because a hidden label
is not an accessible one) and the theme switch steps aside for it.

### Session lifecycle surfaces (second pass, screenshot evidence)

**Create-session wizard.** Vertical stepper: `{components.stepper-step-active}`
(primary-filled circle, white digit) → `{components.stepper-step-idle}` (canvas
circle, hairline ring, muted digit); the connector between completed steps
turns primary. `Session Type` is a `{components.segment-track}` of
Interview / Regular / Mock with `{components.segment-item-selected}` as the
white pill. Field labels carry an inline muted `(Optional)` suffix. Settings
rows are a fixed pattern — leading line icon, title, helper subtitle,
trailing control (select pill, `Configure`, `Add`, or
`{components.toggle-switch-on}`). Toggles fill with ink, **not** primary.
Final CTA is `{components.button-cta-ink}` ("Next", "Create regular session").

**Connect dialog.** `{components.dialog-dark}`. Platform tiles (Zoom, Teams,
Meet, Outlook, phone) are rounded-square dark chips with hairline
`{colors.hairline-dark}` borders. They answer *where* the call is, which is a
different question from *how* Sidekick hears it — the tile row sits above the
capture-method radios and pre-selects one (a browser platform picks the tab
path, Outlook picks system audio, Phone picks the handset), so the tile is a
control with a consequence rather than a strip of logos. Footer polarity:
`Back` = `{components.button-on-dark}`, `Connect` =
`{components.button-primary-on-dark}`.

**Live overlay.** Header: `{components.pill-timer-free}` shows
`09:56 (Free)` — the `(Free)` suffix is the metering affordance, always visible
mid-call. `Exit` = `{components.button-danger-solid}`. The kebab opens a dark
`{components.menu-surface}` whose rows combine three kinds of state in one
list: value rows (`Theme — Dark`, `Language — Vietnamese`, chevron = submenu),
an inline toggle row (`Auto Answer`), and action rows below a divider
(`Answer Preferences`, `Edit session`). The answer panel's empty state is
instructional, not decorative: `No messages yet. Click "Answer" to start!`.
Call-side capture controls: `Stop` (mic-off icon + red dot), `Clear`, language
select, and a `Listening…` status line.

**Leave-or-end dialog.** A two-choice split: equal columns behind a hairline,
each column = icon → title → muted explainer → full-width button. Only the
destructive column escalates to `{components.button-danger-solid}` ("End
session"); the neutral column stays `{components.button-on-dark}` ("Leave for
now"). The monetisation rule lives in the explainer copy, not a toast: *"You'll
have 5 minutes to resume it for 0.5 credits."*

**Answer preferences.** Master–detail `{components.dialog-dark}`. Left list
rows show the *current value* as the subtitle (`Format — Script + bullets`),
each opening a sub-dialog of `{components.radio-card}` /
`{components.radio-card-selected}` (selected = 2px ink border + primary-filled
radio dot). Option rows that are unavailable dim together — label, info icon
and toggle (`Use filler words` is disabled until `Enable STAR Method` is on) —
progressive disclosure with the dependency visible. Right half is the live
`Answer Preview`: Question Type select (8 values: Behavioral, Coding
(algorithm problems), Experience check, How-do-you, Situational, System
design, Technical knowledge, Tell me about yourself) above a rendered sample
(Question / ★Answer / bullets) that updates with the left half, mid-call
included. Footer pair: `Set default` (ghost) + `Save` (light primary).

**Session detail panel.** Rail tabs: AI notes / Transcript / Ask AI / Call
details, selected = `{components.tab-item-selected}`. AI notes = icon-headed
sections (`Details`, `Summary`, `Discussion Topic`) separated by hairlines,
bold-label bullets. Transcript = right-aligned `{components.chat-bubble}` with
a `You · 02:09 PM` caption under each bubble; header carries `Clear transcript`
(secondary) + `Download` (`{components.button-cta-ink}`). Ask AI empty state =
two muted instruction lines + a row of `{components.chip-suggestion}` starter
prompts (`Follow-up email`, `Grade the call`, `How was the vibe?`) + input +
ink `Send`. Call details = key/value grid grouped under
`{typography.eyebrow-sm}` labels (Session / Answer Preferences / AI), labels
muted and values ink; money and counters use `{typography.data-lg}`-class
tabular figures.

**Session card + menu (fourth pass).** The card is a white `{components.card-session-frame}`
shell wrapping a `{components.card-session}` tile, not a tile edge-to-edge: the
frame carries the hairline and the shadow, the tile carries the date eyebrow,
title, company and pills. Anatomy, top to bottom —

- tile header: 11px `{colors.muted-ink}` uppercase eyebrow with wide tracking,
  26px kebab right
- `{typography.heading-sm}` role, then muted company
- pill row pushed to the tile's bottom edge: canvas-filled, hairline-outlined,
  `{colors.muted-ink}` `{typography.body-sm}` pills for the type, plus a second
  one for `Transcript` **only when a transcript exists**
- foot, outside the tile: status line (`● Live` / `● Ready` / `● Ended`) over the
  metering line (`24m · 1 credit`, `9m 59s · Free Session`), action button right

The status dot is the only place the three states are distinguished by colour, so
it carries the same meaning as the text beside it: `{colors.danger}` pulsing for
live (on-air, the same red as the live pill), `{colors.success-pill-stroke}`
for scheduled, `{colors.status-ended}` for finished. A scheduled session has no
duration — the foot says `Starts 08:15` and the table's duration cell says `—`;
inventing a length for a call that has not happened is the kind of disagreement
between two views of the same list that destroys trust in both.

The grid is `repeat(auto-fill, minmax(260px, 1fr))` and pins to exactly four
across at ≥1440px, which is the capture's rhythm.

The kebab menu is `{components.menu-surface}` with `{components.menu-item}` rows
(Details / Edit / Feedback) and `{components.menu-item-danger}` last for
Delete — danger text + icon, never a filled red row.

**Rail IA (fourth pass).** The navigation is grouped by what the person is doing,
not by what the product calls a feature: **Interview Assistant** holds the work
loop (Create session → Call Sessions → Resumes → Documents) and **Prepare** holds
the things you buy but do not run in a call (Mock Interview, Resume Maker,
Headshots). Group labels are 11px uppercase `{colors.muted-ink}` eyebrows.

Every row is `{components.nav-item}` whether it is a `<Link>` or a `<button>`, and
that equality has to be enforced: a `<button>` does not inherit colour or font
weight, and the sidebar's own `a { color: inherit }` rule outranks the class, so
without `a.nav-item` in the colour rule the rail's links render darker than the
action buttons standing between them. Use `font-family: inherit`, never the `font`
shorthand, on those resets — the shorthand silently resets the size and weight
this rule exists to share.

Rows that are not built here still appear, because the pricing dialog sells them;
they toast `Demo only — …` rather than 404 or silently do nothing. The active row
is `{components.nav-item-active}` plus `aria-current="page"`; the session count
rides on the Call Sessions row only, as `{components.pill-credit}`-class tabular
figures, because it is the only list that changes while you are looking at it.

**Monetisation surfaces.** Sidebar `{components.card-free-credits}`: gift icon
+ `Free` label, `7 free sessions left` as heading, muted `Buy credits for full
usage.`, full-width ink `Upgrade`. The pricing dialog's tabs are the same
segment geometry as Session Type; the recommended plan is
`{components.card-pricing-recommended}` — 2px primary border over the
mint→cream vertical gradient — carrying a solid-green `✳ Recommended` pill,
`{components.chip-deal}` (`with code DEAL50`), a Total / Per month / Per call
display toggle, plan radio rows with struck anchor price (`$149.90`) beside a
`{typography.data-lg}` current price (`$74.95 / Month`) and amber micro-chips
(`Most popular`, `Best value`), success-green check feature list, then one
full-width CTA. **The CTA style swaps with the card**: heavy ink button on the
green Unlimited card, outline white button on the ivory Credits card — one
loud button per card, never two. Credit maths is published as plain rules
(`0.5 Credit = 30 min call session (& mock)`, `0.5 Credit = 1 resume PDF
download`, `0.5 Credit = 1 headshot`), and each tab ends with a downsell link
(`1 credit for $19.00 ~~$38.00~~`).

**Account surfaces (third pass).** The sidebar floor is the account entry point:
`{components.menu-surface}` opening **upward** from the user row, because the
row sits on the bottom edge of the viewport and a downward popup would be cut
off. Its rows are Profile · Settings · Theme · Tutorials · Feedback Hub · Open desktop
app · divider · Log out, with `{components.badge-new}` on Tutorials and the current
theme as a right-aligned value before the chevron. Theme is a **submenu that
replaces the list in place**, not a second flyout — a nested flyout anchored to
the sidebar edge has no room to land. Danger stays last and stays red text.

`{components.button-split-toggle}` is the create action split in two: the wide
half keeps the default path, the narrow chevron half presets the wizard type.
Both halves share one fill, separated by a 28%-alpha hairline of the *on*-colour,
never by a gap — a gap reads as two unrelated controls.

`{components.promo-card}` sits between the tab rule and the list, not inside the
list: it is chrome, and it must not scroll away with the thing it is asking about.
Dismissal is stored, so "Later" means later. The competitor's version is a
Google-review card; the mechanics transfer (eyebrow, one-line ask, dark CTA,
dismiss) but **the brand layer does not** — no Google mark, no "Rate us on
Google", no third-party logo wall. Ours asks about Sidekick and draws its own
review card in SVG, because a copied brand asset is the one part of a screenshot
you are not allowed to reuse. The wash is a three-stop amber gradient
(`{colors.promo-wash}` → `{colors.promo-wash-edge}`) with two concentric hairline
arcs behind the art; the art is pushed to the right edge so the copy keeps a
46-character measure. Below 900px the art and the arcs are dropped rather than
shrunk — a tilted review card at 60px wide is noise.

`{components.support-panel}` is the one light-theme page element that is allowed
to be dark chrome — the same token scope as the live overlay, for the same
reason: it floats over someone's content and needs to read as a different layer.
Bubbles are `{components.support-bubble-agent}` (raised surface, left) and
`{components.support-bubble-you}` (brand green, right). **A docked helper yields
to a modal**: while the live overlay, a dialog or the slide-over is open, the
panel is not rendered at all. Pinned to the corner at a high z-index it would
otherwise cover a dialog footer and swallow clicks meant for the session beneath
it — which is exactly how it first shipped here.

Fourth pass removed the floating launcher entirely and made support a
`{components.nav-item}` row at the foot of the rail, above the account row. Two
reasons: a corner launcher competes for the same 200px of chrome as the content it
docks over, and a row in the rail is findable by someone scanning the navigation
rather than by someone who already knows the widget exists. That makes the yield
rule a correctness rule, not a cosmetic one — opening the panel from the mobile
drawer has to close the drawer first, because the panel stands down while the
drawer is up.

`{components.plan-strip}` is the profile page's billing header: plan name, a
credit meter, and the two purchase routes. The meter is the only place a credit
balance is drawn as a bar; the number rides on top of it rather than repeating
beside it.

## Motion

49 `@keyframes` and a tokenised animation layer — `--animate-*` names each
named animation with its duration and easing in one value:

```css
--animate-listening-bar: listening-bar 1.1s ease-in-out infinite;
--animate-intake-step-in: intake-step-in .3s cubic-bezier(.23,1,.32,1);
--animate-review-scan: review-scan 2.4s linear infinite alternate;
```

Easing is semantic, not just `ease-out`: `--ease-out-strong`
`cubic-bezier(.23,1,.32,1)`, `--ease-in-out-strong` `cubic-bezier(.77,0,.175,1)`,
`--ease-drawer` `cubic-bezier(.32,.72,0,1)`. **15 `prefers-reduced-motion`
blocks** — reduced motion is handled, and handled at the token level.

`--animate-*` names are domain-specific (`listening-bar`, `intake-step-in`,
`review-scan`, `bank-*`, `drill-*`). Motion is named after the feature it serves.

The second pass **attributes** (but cannot time) three of these: the
create-session wizard is the obvious referent of `intake-step-in` — step
changes animate the right column only, the rail stays put, which is exactly
what a per-step entrance token implies; the `Listening…` capture state is the
referent of `listening-bar`; and the overlay dialogs (connect, leave/end,
preferences) are consistent with a `dialog-in` + `scrim-in` pair. All
screenshots are stills — treat these as high-confidence name-to-surface
mappings, not observed motion.

## Do's and Don'ts

**Do**
- Keep the two-layer token split (raw triplet → `hsl(var(--x))` consumer).
- Name tokens after business objects once a role repeats across three surfaces.
- Use `--shadow-control/raised/popup/overlay`, and set all four to `none` in dark.
- Tokenise easing by intent (`--ease-drawer`), not by curve literal.
- Route brand swap through a root attribute and override *triplets only* — but
  only when the override lands on the **same element** that declares the
  consumers. A nested dark surface (`.darkchrome`) must re-declare the
  `hsl(var(--x-raw))` aliases as well: custom properties resolve where they are
  declared, so an ancestor's `--canvas` keeps the ancestor's triplets no matter
  what a descendant sets `--canvas-raw` to. This is the single easiest way to
  ship a dark panel that still paints light.
- Split action roles the way the capture does: green for product actions,
  ink (or light-on-dark) for flow completion, green reserved for state accents.
- Pin the live call surface to dark chrome regardless of user theme — but give a
  dialog reached from *both* a call surface and a themed one a `chrome` argument,
  and pick it from the opener. A `{components.dialog-dark}` under a black scrim is
  indistinguishable from a theme switch when it opens over a light wizard.
- Let only the topmost mounted modal handle Escape. A shared `modalStack` is three
  functions; the bug it prevents is one keypress deleting the dialog behind the one
  the person is reading.
- Put metering rules in UI copy where the decision happens — `(Free)` on the
  timer, "5 minutes to resume for 0.5 credits" in the leave dialog, the credit
  equations on the pricing card — not in a pricing page.
- Close **every** pricing tab with the smallest available next step (`1 credit
  for $19.00 ~~$38.00~~`), as a text link that routes to the tab it names. A
  downsell that only appears on the tab it sells is not a downsell.
- Name the object a clearing control acts on — `Clear transcript`, not `Clear`
  beside a `Download` that acts on the same surface. One shared button across
  three tabs still needs three labels.
- Let a preview column persist beside a settings list, so changes show their
  effect before commitment.
- In any dialog that is itself a `display: grid` with a `max-height`, set
  `grid-template-rows: minmax(0, 1fr)`. Auto rows size to content, so a step that
  grows pushes the sticky footer out of the clamped box and `overflow: hidden`
  silently eats it — the create-session wizard did exactly that until fixed.
- When that two-pane dialog collapses to one column, declare the row template for
  the collapsed case too: `grid-template-rows: auto minmax(0, 1fr)`. A lone
  `minmax(0, 1fr)` template then applies to the *first* row — the header rail —
  and its flexible minimum lets it collapse to zero height while its content
  still paints over the form below. The wizard rendered its title and stepper on
  top of the Call Title field at 390px for exactly this reason.
- Put a dialog's close control in a non-scrolling strip of its own, never
  absolutely positioned over the scroll container. The wizard's `✕` was pinned to
  the top-right corner, and once the form scrolled the full-width session-type
  pill slid up beside it, so the close read as a fourth segment. A flex row above
  the body costs ~40px and cannot collide at any scroll offset.
- Assert geometry in the screenshot walk rather than trusting the still: rail
  right edge ≤ body left edge side by side, rail bottom ≤ body top once stacked,
  footer bottom ≤ dialog bottom, with the scrollable body scrolled to the end.
- Never give a shared dialog primitive `max-height` + `overflow: hidden` without a
  scroll container. The dark-chrome `.dcard` did exactly that, so every dark dialog
  whose content outgrew the clamp lost its footer — Answer Preferences lost
  `Set default`/`Save`, Connect lost `Join session`. Clamp to the scrim's own
  reserved padding (`calc(100vh - 2 * var(--sp-md))`) and let the card scroll, then
  assert the footer's bottom edge sits inside the card *without* scrolling.
- Grow a touch target on the axis that actually fails. `{components.toggle-switch-on}`
  is 24px tall against a 44px guideline, so its `::after` hit area is `inset: -10px 0`
  — vertical only. The earlier `inset: -8px` leaked 8px past the switch's right
  edge, and because `overflow-y: auto` silently recomputes `overflow-x: visible`
  to `auto`, every vertical list of switches grew a phantom horizontal scrollbar
  (Answer Preferences' master column measured `scrollWidth 258 / clientWidth 250`).
- Never answer a cramped breakpoint with `display: none`. Hiding `Use STAR method`,
  `Use filler words` and `Answer language` below 640px made three settings
  unreachable on a phone. Give each pane its own `grid-template-areas` name so the
  same DOM reflows instead of shrinking, and assert the control's box is on screen
  at 390px rather than merely present in the DOM.
- Draw icons as Lucide-shaped inline SVG — 24×24 viewBox, `fill="none"`,
  `stroke="currentColor"`, `aria-hidden` — and set the **1.5px weight and the size
  in CSS**, once, globally (see Icons).
- Treat a docked high-z helper as a *surface that can be edited out*, not a
  permanent fixture. `{components.support-panel}` renders `null` while the live
  call, wizard, connect sheet, pricing dialog, preferences dialog, session detail
  **or the ≤900px nav drawer** is open. At `z-index: 70` in a fixed corner it sat on
  top of a `z-index: 45` overlay and ate the `Screenshot` click — a Playwright
  timeout was the only evidence, since the still screenshot looks fine. The drawer
  is the same bug with a smaller number: it is `z-index: 60` with a `55` scrim, so
  the pill floated over an open drawer, and only the mobile pass caught it. The
  fourth pass deleted the corner pill and hung the same panel on a rail row, which
  removes the collision with the content column but not the yield rule — a row
  *inside* the drawer can still be covered by it. Yield to
  anything that can be drawn over the content column, not only to things named
  "modal".
- Open a floor-anchored menu upward. `{components.menu-surface}` is `top: calc(100%
  + 6px)` by default; the sidebar account row and the credit-card kebab are both
  pinned to the bottom of a scrolling column, so they take `.menu--up`
  (`bottom: calc(100% + 6px)`) and grow into the empty sidebar above instead of
  off the viewport edge.
- Let a submenu replace its parent list in place rather than nesting a flyout. The
  user menu's `Theme` item swaps the list for three radio rows and a `← Back`,
  keeping one popover, one escape behaviour and one focus scope; a flyout inside an
  upward-anchored menu would need its own collision handling.
- Measure an anchored popup against the viewport in the screenshot walk —
  `r.left < 0 || r.right > window.innerWidth` — rather than trusting the still. A
  `.menu--left` variant (`right: auto; left: 0`) made the create-session split menu
  extend rightward from the trigger's left edge and hang off the right side of the
  screen; anchored to a trigger already inset from the edge, the default
  `right: 0` (grow leftward) is the collision-safe direction.

**Don't**
- Don't hardcode hex in components — 827 hex literals already exist in this
  stylesheet and they are the theme layer's, not yours.
- Don't consume `--radius-xl` in a component; consume `--radius-button`.
- Don't assume a screenshot's radius is the system's radius (see Shapes).
- Don't derive chart colours from `{colors.primary}`; keep them independent.
- Don't lift the brand layer. Logo, product names, copy, illustrations and
  `departureMono` are out of scope for reuse.
- Don't paint a wizard/checkout CTA green, and don't put two loud buttons in
  one pricing card (see Two action-button roles).
- Don't signal destructive choice with a filled red row in menus — Delete is
  red *text + icon* on the neutral `{components.menu-surface}`; filled danger
  is reserved for the final confirmation ("End session").
- Don't dim a control without its whole row — `Use filler words` greys label,
  info icon and toggle together, and only because a dependency is off.
- Don't pass `stroke-width` per icon. The capture has six dead per-glyph
  overrides that a single global rule already beats; a prop-level weight looks
  correct in the source and renders wrong in the browser.
- Don't mix icon libraries in one surface, and don't fill a glyph in a stroke set —
  one drawing language per identity is what makes the 1.5px scale read as a system.
- Don't name a shared shell after one of its two modes. The preferences dialog was
  built with `DarkDialog`, so rendering it themed meant either lying in the code or
  duplicating the shell; `ChromeDialog` with `chrome: "dark" | "theme"` took the
  rename across three call sites and made both modes first-class.
- Don't let a modal's keyboard effect depend on an inline `onClose` prop. With a
  shared context, every preference change re-renders the dialog behind it, the
  effect tears down and re-pushes that panel on top of the stack, and the
  background dialog wins the next Escape. Hold the callback in a ref.

## Responsive Behavior

Breakpoints are Tailwind defaults (`--breakpoint-md: 48rem` observed). The
sidebar collapses — a `Toggle sidebar` control is present in the accessibility
tree — and the session list has an explicit card/table duality rather than a
single responsive list. Fixed viewport was 1280×720 during capture; smaller
breakpoints were **not** exercised.

The implementation therefore sets its own rhythm at 1080 / 900 / 640 px, and every
step is a *reorder* rather than a reduction. The preferences dialog names its
panes (`nav`, `detail`, `preview`, `more`) and swaps `grid-template-areas` —
`"nav detail preview" / "more detail preview"` on a desktop, `"nav" / "detail" /
"more"` stacked on a phone, where the section chooser becomes a three-column chip
grid. Two-pane dialogs that collapse to one column must re-declare their row
template (`grid-template-rows: auto minmax(0, 1fr)`), and a stacked pane must drop
its own `overflow` so the dialog scrolls once instead of nesting two scrollers.

The account surfaces follow the same reorder-not-reduce rule. `{components.support-panel}`
is width-clamped (`min(360px, calc(100vw - 32px))`) and height-clamped to the
viewport rather than a fixed frame, so it survives a phone without a horizontal
scroll; the launcher and panel move from `--sp-lg` to `--sp-md` inset below 640px so
the system gesture bar never overlaps them, and the panel's max-height drops from
520px to 420px to keep the input row above the keyboard. `{components.plan-strip}`
stays a single wrapping strip. The invoice rows are the one place a column is given
up: below 860px only `.inv__date` is hidden — never the status pill, which is the
row's state — and the amount stays right-aligned because it is the value a person
scans for. The menus do not reflow at all: `{components.menu-surface}` is
`min-width: 200px` and positioned against its trigger rather than laid out in the
column, so the user menu, credit menu and split menu keep every row and their full
height. That makes an anchored popup a *viewport-fit* question instead of a
responsive one — `right: 0` grows leftward, which is safe even when the trigger sits
in the 300px-wide mobile drawer, and the screenshot walk measures
`r.left < 0 || r.right > innerWidth` for the split menu and the drawer-hung account
menu at 390px rather than eyeballing the stills. What the drawer *does* change is
the docked helper: `{components.support-panel}` is not rendered while it is open,
so the rail's `Support chat` row closes the drawer before it opens the panel.

## Known Gaps

- **No computed styles.** Per-element resolved values were not captured, so
  every `typography` and `components` entry above is *scale + token* inference,
  not observation. Mark `needs-design-decision` before treating a component's
  padding or height as fact.
- **Theme default (partially resolved).** The live-session stack is confirmed
  always-dark chrome; the dashboard follows a user theme toggle. Whether the
  *dashboard* ships light- or dark-first was still not established.
- **`codeboss` block only partially parsed** — colour and radius overrides were
  read; the full override set was not enumerated.
- **No Figma source.** Design intent vs implementation accident cannot be
  separated on any individual token.
- **Marketing pages not captured for layout or copy** — the app surfaces above
  come from the authenticated dashboard. The Icons section is the exception: its
  evidence is the *public* marketing DOM plus the shared Tailwind chunk, so the
  1.5px weight and the line/pixel slot mechanism are verified, but the glyph
  inventory may be missing app-only icons and includes marketing-only icons
  (`handshake`, `shield-check`, `bug`) that never appear in the dashboard.
- **Icon weight is a live-vs-legacy split in this repo.** `app/globals.css` sets
  `svg { stroke-width: 1.8 }` for the pre-existing meeting-room demo; the
  dashboard renders 1.5 per this contract. `needs-design-decision`: unify if the
  two surfaces ever share a shell.
- **Hover/active states not extracted.** `--primary-fill` and `group-hover:`
  variants exist in the CSS and were not resolved. One disabled state was
  observed in screenshots (the dimmed `Use filler words` row); no error/
  validation state in the wizard was ever captured.
- **Screenshot-derived values are unverified.** The four
  *(screenshot estimate)* colours, the `{components.toggle-switch-on}` 44×24
  size, segment/menu paddings, and every wizard/panel width in Layout are
  visual approximations from stills — `needs-design-decision` until read off
  computed styles.
- **Pricing numbers are offer snapshots, not tokens** (Nov 2026, Vietnamese
  market). Capture the *structure* — anchor price struck beside current price,
  per-plan display toggle, downsell footer link — never the amounts.
- **Still uncaptured from the source product:** the Custom pricing tab (our
  clone ships a form we designed, labelled as a placeholder in the UI), the
  answer-generation latency model, and any hover/focus state in dark chrome —
  no screenshot set shows a pointer resting on a dark control.
- **Now verified in our own build instead** (rendered at 1280×800 and 390×844,
  Nov 2026): the Regular and Mock wizard variants, mid-call answer bubbles with
  real composed text, the live overlay stacked at <900px, the wizard's
  single-column form at 390px (both sticky-footer bugs above were found here),
  the connect dialog's platform-tile row driving the capture method, the credit
  downsell closing all three pricing tabs, the light-chrome flip inside the
  overlay, and the 0.5-credit resume charge (the sidebar counter moves 9 → 8.5
  when a warm session is rejoined). These are *our* behaviour, not observations
  of the competitor, so they validate the contract rather than the capture.

## Drift prevention, if you adopt this

1. Lint rule: reject hex literals outside the theme layer.
2. Lint rule: reject `rounded-*` utilities inside `components/`; require
   `--radius-<role>`.
3. A theme smoke test that asserts `--shadow-*: none` under the dark selector.
4. A geometry gate in the screenshot walk: for every two-pane dialog, assert the
   rail's bottom edge is above the body's top edge and the footer's bottom edge is
   inside the dialog's, at desktop *and* at 390px, with the scrollable body scrolled
   to the bottom. Both stacking bugs in `Known Gaps` were invisible in a skimmed
   screenshot and obvious as a bounding-box comparison.
5. If you use `data-brand`, add a spec that renders one screen per brand and
   diffs computed radius/primary — that is the only guard against a
   half-working brand swap.
