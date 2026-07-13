---
name: Modulora
description: An open ledger for fair, inspectable component distribution.
colors:
  graphite-canvas: "oklch(0.145 0 0)"
  graphite-surface: "oklch(0.185 0 0)"
  graphite-raised: "oklch(0.24 0 0)"
  graphite-border: "oklch(0.28 0 0)"
  ledger-ink: "oklch(0.97 0 0)"
  ledger-muted: "oklch(0.68 0 0)"
  paper-canvas: "oklch(0.985 0 0)"
  paper-surface: "oklch(1 0 0)"
  paper-ink: "oklch(0.17 0 0)"
  paper-muted: "oklch(0.5 0 0)"
  ticket-amber: "oklch(0.769 0.188 70.08)"
  ticket-ink-light: "oklch(0.55 0.16 70.08)"
  receipt-emerald-light: "oklch(0.52 0.15 162.48)"
  receipt-emerald-dark: "oklch(0.696 0.17 162.48)"
  code-background: "oklch(0.12 0 0)"
  code-foreground: "oklch(0.9 0 0)"
  destructive: "oklch(0.55 0.2 25)"
typography:
  headline:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.925rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  metadata:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.graphite-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.graphite-canvas}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.graphite-canvas}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  dashboard-page-header:
    textColor: "{colors.ledger-ink}"
    typography: "{typography.headline}"
    padding: "0"
  empty-state:
    backgroundColor: "{colors.graphite-canvas}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "48px 24px"
  price-ticket:
    backgroundColor: "{colors.ticket-amber}"
    textColor: "{colors.graphite-canvas}"
    typography: "{typography.metadata}"
    rounded: "{rounded.sm}"
    padding: "4px 14px"
---

# Design System: Modulora

## 1. Overview

**Creative North Star: "The Open Ledger"**

Modulora looks like a public record that is meant to be used, not admired from a distance. Graphite surfaces organize dense component, evidence, licensing, install, and earnings data. Crisp boundaries and compact controls make every action feel accountable. The interface is bold through contrast and specificity rather than oversized type, decoration, or spectacle.

The system is tactile and exact. Controls visibly answer presses, selected filters are unmistakable, and meaningful records sit beside the decisions they support. Tonal layers provide structure while restrained amber and emerald carry narrowly defined economic meaning. This is not a generic SaaS template: no decorative purple gradients, glass-card surfaces, vague AI-era copy, or inflated trust language.

**Key Characteristics:**
- Dark-first graphite ledger with a complete light inverse.
- Compact, readable information density built around an 8px spacing rhythm.
- Inter for interface clarity; monospace only for commands, digests, versions, and machine records.
- Amber marks priced exchange; emerald marks successful records and earnings.
- Motion is short feedback or state explanation, never page-load choreography.
- Authorship, association, similarity, and review scope remain visible at the point of discovery.

## 2. Colors

Graphite holds the ledger, amber marks a ticketed exchange, and emerald confirms a receipt. Color is semantic inventory, not decoration.

### Primary
- **Ledger Ink** (`oklch(0.97 0 0)`): Primary dark-theme text and primary action fill. Its inverse is **Paper Ink** (`oklch(0.17 0 0)`) in light mode.

### Secondary
- **Ticket Amber** (`oklch(0.769 0.188 70.08)`): Paid prices, marketplace value, and explicitly promotional placement. Amber never implies trust, approval, or safety.

### Tertiary
- **Receipt Emerald** (`oklch(0.52 0.15 162.48)` light; `oklch(0.696 0.17 162.48)` dark): Successful evidence records, positive transaction outcomes, and creator earnings. The theme-adaptive values keep small receipt text above AA contrast. Pair it with text or an icon; never communicate success through color alone.
- **Ticket Ink** (`oklch(0.55 0.16 70.08)` light; Ticket Amber in dark): Amber-colored labels use a darker light-theme ink while filled tickets retain bright Ticket Amber with dark foreground text.
- **Destructive Red** (`oklch(0.55 0.2 25)`): Errors and irreversible actions only.

### Neutral
- **Graphite Canvas** (`oklch(0.145 0 0)`): Default dark page background.
- **Graphite Surface** (`oklch(0.185 0 0)`): Cards, popovers, and raised content surfaces.
- **Graphite Raised** (`oklch(0.24 0 0)`): Secondary controls, selected-neutral states, and nested tonal regions.
- **Graphite Border** (`oklch(0.28 0 0)`): Dividers, input outlines, and structural boundaries.
- **Ledger Muted** (`oklch(0.68 0 0)`): Secondary dark-theme copy; do not use for tiny or essential instructions without checking AA contrast.
- **Paper Canvas** (`oklch(0.985 0 0)`) and **Paper Surface** (`oklch(1 0 0)`): Light-mode page and elevated surfaces.
- **Paper Muted** (`oklch(0.5 0 0)`): Secondary light-theme copy.

### Named Rules

**The Receipt Rule.** Amber describes money; emerald describes a completed or successful record. Neither color is a generic highlight.

**The Scoped Trust Rule.** Approval and evidence always include a label or backing record. Never turn semantic color into a universal “verified” claim.

**The Authorship Rule.** Creator identity and original-source attribution use full text labels and traceable records. Similarity warnings use neutral review language; they never borrow success green or approval styling.

## 3. Typography

**Display Font:** Inter Variable (ui-sans-serif fallback)
**Body Font:** Inter Variable (ui-sans-serif fallback)
**Label/Mono Font:** UI monospace (SFMono-Regular, Menlo, monospace fallback)

**Character:** One disciplined sans keeps a dense cross-surface product coherent. Monospace marks content that behaves like a record: install commands, digests, versions, registry names, and machine-readable identifiers.

### Hierarchy
- **Headline** (650, 36px, 1.12): Major public or dashboard page headings; tracking never tighter than `-0.03em`.
- **Title** (600, 20px, 1.25): Panels, component detail sections, and editorial docs headings.
- **Body** (400, 14.8px, 1.65): Explanations and documentation; prose lines stop at 65–75 characters.
- **Label** (500, 14px, 1.25): Buttons, filters, navigation, field labels, and row actions.
- **Metadata** (400, 12px, 1.45): Digests, commands, versions, compact evidence metadata, and timestamps.

### Named Rules

**The Machine Record Rule.** Monospace means the user can copy, compare, or verify the value. Never use it merely to make the product look technical.

**The Fixed Scale Rule.** Product typography uses fixed sizes. Responsive behavior changes structure, not heading scale.

## 4. Elevation

Modulora is layered by tone. Canvas, surface, raised, border, and input values establish hierarchy before any shadow is considered. Small shadows may clarify floating popovers, dropdowns, and interactive controls; ordinary cards remain structurally defined by tone or border rather than decorative lift.

### Shadow Vocabulary
- **Control Edge** (`0 1px 2px rgb(0 0 0 / 0.05)`): Outline buttons and inputs where a slight physical edge improves affordance.
- **Surface Low** (`0 1px 3px rgb(0 0 0 / 0.1)`): Standalone cards only when tone and border are insufficient.

### Named Rules

**The Tone-First Rule.** If a border and a wide soft shadow appear on the same card, the hierarchy is wrong. Pick tonal structure or a restrained shadow, never a ghost card.

**The Floating Exception.** Popovers and dropdowns may lift because they leave document flow. Persistent page sections do not pretend to float.

## 5. Components

### Buttons

Tactile, compact, and decisive.
- **Shape:** Gently compact corners (8px); full pills only for account triggers and true status tags.
- **Primary:** Ledger Ink on Graphite Canvas in dark mode, inverse in light mode; 36px tall with 16px horizontal padding.
- **Hover / Focus:** 150ms transition over explicit color, border, shadow, and transform properties. Press scales to `0.97`. Focus uses a visible 3px ring at 50% ring opacity.
- **Secondary / Ghost:** Secondary uses a raised neutral fill; ghost stays transparent until hover. Disabled controls preserve shape and drop to 50% opacity.

### Chips

- **Style:** Compact full-pill tags only for status, evidence, placement disclosure, and filters whose boundary benefits comprehension.
- **State:** Selected filters use a clear foreground/background inversion or border shift. Every colored status includes readable text or an icon.

### Cards / Containers

- **Corner Style:** Standard content cards top out at 14px; compact records use 8–10px.
- **Background:** Graphite Surface over Graphite Canvas, or Paper Surface over Paper Canvas.
- **Shadow Strategy:** Tone and a low-contrast border first; see Elevation.
- **Border:** One pixel at Graphite Border, commonly reduced to 60% opacity for internal structure.
- **Internal Padding:** 16px for compact catalog records; 24px for full content cards.

### Inputs / Fields

- **Style:** 36px high, 8px corners, one-pixel input border, transparent or faintly raised fill, 12px horizontal padding.
- **Focus:** Ring and border move together; no layout shift.
- **Error / Disabled:** Destructive border plus ring and explicit text; disabled inputs retain legible values at 50% opacity.

### Navigation

Navigation is a 56px sticky ledger bar with a restrained bottom boundary. Links use compact 14px labels; current location moves from muted to full ink. The app shell prioritizes Components and Docs while account, command search, and dashboard navigation remain consistent across surfaces. Below 640px, public navigation yields to the account control. Dashboard sidebar navigation collapses into a 44px route-aware disclosure instead of stacking the desktop rail above the task.

### Dashboard Page Header

Authenticated dashboard pages use one fixed composition: a 24px semibold title, optional muted description capped at a readable width, optional contextual icon, and a shrink-resistant action aligned opposite the title. Public catalog, docs, component-detail, and legal headings remain separate because their hierarchy serves a different intent.

### Empty State

Empty product regions use one centered, dashed-boundary composition with a muted 24px icon, direct 14px title, concise 12px explanation, and an optional action. The empty state teaches the next meaningful action; it never says only “nothing here.” Borderless layout variants may reuse the composition when a whole catalog result region is empty.

### Dashboard Route States

Dashboard loaders use quiet tonal skeletons with an accessible status label; they never hide usable content behind page-load choreography. Route failures stay inside the dashboard vocabulary with a specific message and a visible retry action. Persistent product chrome and loaded task content never run orchestrated entrance sequences.

### Price Ticket

Paid prices use an amber ticket silhouette with small edge notches and tabular numerals. Free uses the same silhouette in a neutral tone. The signature communicates transaction type, not quality or trust. Promoted placement remains a separate, plainly labeled disclosure.

### Authorship and Similarity Records

Creator identity, original URL, ownership evidence, review scope, and dispute state appear as separate records rather than collapsing into one badge. Potential similarity is presented as a neutral comparison requiring human judgment, with direct access to the compared sources and review history. Reports and takedowns remain reachable from component details without forcing the reporting creator to join the marketplace.

## 6. Do's and Don'ts

### Do:
- **Do** place provenance, license, fulfillment, price, and evidence limitations beside install and purchase decisions.
- **Do** use the graphite tonal ladder before adding borders or shadows.
- **Do** reserve Ticket Amber (`oklch(0.769 0.188 70.08)`) for money and theme-adaptive Receipt Emerald for successful records and earnings.
- **Do** give every interactive component default, hover, focus, active, disabled, loading, and error behavior where applicable.
- **Do** keep press feedback at `scale(0.97)` over 150ms and honor reduced-motion preferences.
- **Do** use framework-extensible language even when an implementation is React-first.
- **Do** show original source, creator authorization, review scope, and report/dispute access beside component identity.
- **Do** label similarity as a signal for review, never as an automated verdict.

### Don't:
- **Don't** resemble a generic SaaS template: no decorative purple gradients, glass-card surfaces, interchangeable dashboard composition, or vague AI-era copy.
- **Don't** use a generic “verified” badge. State the exact evidence type, backing record, scope, and limitation.
- **Don't** let promotion, Plus, price, or visual emphasis imply approval, safety, review priority, or rank quality.
- **Don't** combine a one-pixel border with a wide soft shadow on the same element.
- **Don't** use side-stripe accent borders, gradient text, decorative grid backgrounds, or identical icon-card grids.
- **Don't** use amber or emerald as decoration, and never rely on either without a non-color label.
- **Don't** round ordinary cards beyond 16px or turn every control into a pill.
- **Don't** imply that listing review proves ownership, originality, security, or freedom from plagiarism.
- **Don't** create accounts, listings, creator profiles, imported previews, or apparent brand associations without the creator's affirmative authorization.
