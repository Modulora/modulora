# Creator Earnings Terms — drafting outline

> **Status: outline for counsel.** This is a structured skeleton of the binding
> Creator Earnings Terms, meant to be expanded into full, jurisdiction-correct
> Terms & Conditions by a qualified reviewer (or a model instructed to draft
> T&C). It is **not legal advice** and **not final**. Fill every `[PLACEHOLDER]`
> and resolve the Drafting notes before publishing.

---

## 0. Parties and definitions

- **"Modulora"** / **"we"** — the platform, operated by `[LEGAL ENTITY NAME]`, a
  `[ENTITY TYPE, e.g. Delaware C-Corp]` with registered address `[ADDRESS]`.
- **"Creator"** / **"you"** — a registered user who publishes components and/or
  enrolls in Creator Earnings.
- **"Connected Account"** — the Creator's Stripe Express account, created via
  Stripe Connect, through which all earnings are paid.
- **"Component"** — a published unit of code and its metadata on Modulora.
- **"Eligible Component"** — a Component that is publicly listed, approved in
  curation, compliant with the Publishing Policy, and (for Profit Share) free/
  open-source.
- **"Verified Install"** — an installation performed by the Modulora CLI that
  produces a digest-verified install receipt tied to the Component's exact
  published content hash. Installs Modulora cannot independently verify and
  attribute do **not** count.
- **"Marketplace Sale"** — a one-time purchase of a paid Component through
  Modulora Checkout.
- **"Marketplace Fee"** — Modulora's per-sale commission on a Marketplace Sale:
  `[30]%` of the sale price (before payment-processing fees). `[Confirm rate.]`
- **"Distributable Profit"** — for a given Payout Period, Attributable Revenue
  minus Attributable Costs (see §3). It is a net figure, not gross revenue.
- **"Attributable Revenue"** — the revenue Modulora allocates to the profit-share
  pool for the period. `[Define precisely: which revenue lines are included.]`
- **"Attributable Costs"** — the costs of earning the Attributable Revenue,
  including payment-processing fees, infrastructure/hosting, and operating
  expenses (including salaries). `[Define the exact cost categories + method.]`
- **"Payout Period"** — `[calendar month]`.
- **"Payout Threshold"** — the minimum accrued balance before a payout is issued:
  `[USD 25]`. `[Confirm.]`
- **"OSS Fund"** — the fund receiving the open-source allocation, administered by
  `[Modulora / a named foundation]` per `[policy link]`.

---

## 1. Scope and enrollment

- These Terms govern how Creators earn on Modulora and supplement the Terms of
  Service and Publishing Policy. If they conflict on earnings, these Terms govern.
- Enrollment requires a completed Connected Account (identity/bank/tax verified by
  Stripe) and acceptance of these Terms.
- Modulora may set eligibility requirements and may decline or revoke enrollment
  for policy violations, fraud risk, or legal/compliance reasons.

## 2. The two earning mechanisms

1. **Marketplace Sales (direct).** For each Marketplace Sale, the buyer pays
   Modulora; Modulora retains the Marketplace Fee and transfers the remainder to
   the Creator's Connected Account at the time of charge (Stripe destination
   charge). Modulora is the merchant of record.
2. **Profit Share (pooled).** Eligible Components earn a share of Distributable
   Profit based on Verified Installs, paid periodically (see §3–§4).

## 3. Profit Share split and calculation

- Of **Distributable Profit** for a Payout Period: **30% to Creators, 10% to the
  OSS Fund, 60% retained by Modulora**. `[Confirm split is final.]`
- The 30% Creator pool is allocated **pro rata by each Creator's share of total
  Verified Installs** in the period across their Eligible Components.
  `[Specify weighting, caps, minimums, and tie/rounding handling.]`
- Modulora will `[publish / make available on request]` the period's pool size
  and the inputs to each Creator's allocation. `[Define transparency commitment.]`

## 4. Payouts, taxes, adjustments

- Earnings accrue to the Creator's Modulora balance and pay out to the Connected
  Account each Payout Period once the balance meets the Payout Threshold.
- Currency: `[USD]`. FX and cross-border handling per Stripe. `[Confirm.]`
- **Taxes.** Stripe collects tax/identity information; Creators are responsible
  for their own taxes. Modulora's responsibilities as merchant of record are
  `[defined here]`. `[Counsel: reconcile MoR status + Stripe Tax + 1099/W-8.]`
- **Adjustments / clawbacks.** Refunds, chargebacks, reversed installs, or
  earnings later found to breach policy or to be fraudulent may be deducted from
  current or future balances, or reclaimed. `[Define negative-balance handling.]`

## 5. Rights, changes, termination

- Creators retain ownership and their chosen licenses; participation grants no
  transfer of rights beyond hosting/distribution already in the Terms of Service.
- Modulora may change the split, definitions, thresholds, or cadence prospectively
  with `[notice period]` notice; material changes require renewed acceptance.
- Either party may end participation; accrued, non-clawed-back earnings remain
  payable subject to the Threshold and verification.

## 6. Disclaimers

- **No guarantee of earnings.** Distributable Profit may be zero; installs and
  sales are not guaranteed.
- Provided "as is"; Modulora is not liable for indirect or consequential damages,
  to the extent permitted by law.
- Governing law and disputes: `[GOVERNING LAW / VENUE / ARBITRATION]`.

---

## Drafting notes (must resolve before publishing)

1. **Legal entity + address** for Modulora.
2. **Distributable Profit accounting** — exact Attributable Revenue lines and
   Attributable Cost categories/method (esp. how salaries/opex are apportioned),
   and the transparency/reporting commitment.
3. **Split finality** (30/10/60) and the creator-pool allocation formula
   (weighting, caps, minimums, rounding).
4. **Payout cadence, threshold, currency, FX.**
5. **Tax/MoR reconciliation** — merchant-of-record scope, Stripe Tax, 1099/W-8,
   VAT; who remits what.
6. **Clawback + negative-balance mechanics.**
7. **Governing law, venue, arbitration/class-action waiver** for the target
   jurisdiction.
8. **Notice period** and change-acceptance mechanism.
9. Confirm the **Marketplace Fee** rate and that it's distinct from the profit
   split.

Keep this consistent with: Terms of Service (`/terms`), Privacy (`/privacy`),
Publishing Policy (`/publishing-policy`), and the explainer (`/profit-share`).
