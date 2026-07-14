# Stripe Connect and profit-share payout verification

This checklist is the human acceptance gate for Modulora's creator payout
spine. It covers Stripe Connect onboarding, the `account.updated` webhook, and
profit-share transfers created by an owner from **Dashboard → Platform → Admin**.

It does not authorize live money movement. A human operator must complete every
applicable check, retain redacted evidence, and explicitly approve the mode
change. Direct component marketplace checkout remains disabled during alpha and
is outside this checklist.

## Current readiness decision

Use **Stripe test mode only**. Do not create a live payout run yet.

The current code provides a useful test-mode ledger, but live operation has
unresolved accounting and idempotency risks:

- A payout period has no uniqueness or overlap constraint. Re-running a period
  can accrue and transfer the same installs twice.
- Stripe transfer creation has no idempotency key. A retry after an ambiguous
  response can duplicate a transfer.
- A run is inserted before creators are processed and is marked `completed`
  immediately. A Worker interruption can leave a partial run with no resumable
  state.
- Install aggregation checks the receipt digest and period, but does not yet
  filter components by the full profit-share eligibility contract: public,
  approved, open-source, unmoderated, and non-revoked.
- Per-creator floor rounding can leave cents in `creator_pool_amount` that are
  not assigned to any share, and no remainder policy is recorded.
- Distributable revenue, attributable costs, payout period, threshold, tax,
  refunds, chargebacks, negative balances, and the 60/30/10 split still contain
  unresolved terms in `docs/profit-share-terms-outline.md`.

These are stop conditions, not documentation caveats. Resolve them in code,
schema, tests, and approved terms before repeating this checklist in live mode.

## Evidence rules

Create one verification record for the run. Store it in the approved private
operator system, not in a public issue or repository.

Record:

- verifier name and UTC timestamp;
- Stripe mode: `test` or `live`;
- Git commit and deployed Worker version;
- connected account ID in redacted form, for example `acct_…7F3A`;
- webhook endpoint ID in redacted form;
- payout run ID and period;
- expected and observed amounts in cents;
- Stripe event, transfer, and payout IDs in redacted form;
- pass, fail, or not applicable for every numbered check;
- links to private screenshots or exports with email, bank, tax, identity, API
  key, webhook secret, and full account numbers redacted.

Never copy API keys, webhook signing secrets, bank details, tax identifiers,
identity documents, or full invitation/provider tokens into the record.

## 1. Confirm mode and deployment

A human operator verifies that the application, Stripe Dashboard, and evidence
all refer to the same mode and release.

- [ ] Confirm the Stripe Dashboard **Test mode** indicator is on.
- [ ] Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are test-mode
  values in Cloudflare. Do not reveal or copy their values.
- [ ] Confirm `DATABASE_URL`, `BETTER_AUTH_URL`, and immutable
  `OWNER_USER_IDS` are configured for the intended environment.
- [ ] Confirm the deployed commit and Worker version match the reviewed build.
- [ ] Confirm `VITE_DIRECT_MARKETPLACE_ENABLED=false` remains compiled into the
  production web app.
- [ ] Confirm only immutable user IDs in `OWNER_USER_IDS` can open the payout-run
  controls. Curator status alone must not grant access.
- [ ] Confirm the platform Stripe balance has enough **test-mode available
  balance** for the planned transfer. Pending balance is not sufficient.

**Pass evidence:** mode screenshot, redacted secret-presence check, commit,
Worker version, owner authorization result, and available test balance.

## 2. Verify Connect onboarding

Use a dedicated Stripe test connected account. Do not reuse a real creator or
enter real identity, bank, or tax information in test mode.

1. Sign in as the test creator and open **Dashboard → Payouts**.
2. Select **Set up payouts** and complete Stripe Express test onboarding.
3. Return to Modulora and use the status refresh when needed.
4. Open the connected account in Stripe Dashboard.

Verify:

- [ ] Modulora stores one `stripe_account_id` for the intended user.
- [ ] Stripe metadata contains the same immutable Modulora user ID.
- [ ] The account requested the `transfers` capability.
- [ ] Stripe shows `details_submitted=true`.
- [ ] Stripe shows `payouts_enabled=true`.
- [ ] Modulora stores `payouts_enabled=true` only after both Stripe fields are
  true. This is a scoped payout-readiness state, not a generic identity claim.
- [ ] **Dashboard → Payouts** shows the account as connected and ready.
- [ ] **Manage payout account** opens the matching Stripe Express account.
- [ ] No KYC, bank, tax, or identity data is stored in Modulora's database.

**Pass evidence:** redacted `acct_` ID, Stripe capability/status screenshot,
Modulora payout status, and a redacted database row.

## 3. Verify webhook delivery and signature enforcement

The endpoint is `POST https://modulora.dev/api/stripe/webhook`.

- [ ] Confirm the Stripe webhook endpoint uses the intended mode.
- [ ] Confirm it subscribes to at least `account.updated`. Existing application
  behavior also consumes `checkout.session.completed` and
  `customer.subscription.deleted`.
- [ ] Send an unsigned request and confirm the endpoint returns `400`.
- [ ] Send a request with an invalid signature and confirm it returns `400`.
- [ ] Trigger a signed `account.updated` test event and confirm Stripe receives
  a `2xx` response.
- [ ] Confirm the event updates only the user whose `stripe_account_id` matches
  the event account.
- [ ] Toggle a test account from incomplete to complete and back; confirm the
  stored payout readiness follows Stripe in both directions.
- [ ] Resend the same event and confirm the resulting readiness state is stable.
- [ ] Confirm webhook logs contain no signing secret, API key, bank data, tax
  data, or raw identity payload.

**Pass evidence:** Stripe delivery IDs and statuses, redacted before/after user
rows, and sanitized Worker log excerpts.

## 4. Prepare a deterministic test payout

Do not use an arbitrary production date range or amount. Prepare fixtures whose
expected result can be calculated independently.

- [ ] Create at least two test creators with distinct connected accounts.
- [ ] Ensure both accounts have `payouts_enabled=true`.
- [ ] Publish eligible test components under each creator.
- [ ] Create digest-matching CLI install receipts inside a closed-open UTC
  period: `period_start <= created_at < period_end`.
- [ ] Include control receipts that must not count: unverified digest, outside
  the period, and—after the eligibility blocker is fixed—ineligible listing
  states.
- [ ] Choose a distributable amount in cents and independently calculate the
  creator pool and per-creator shares.
- [ ] Include one creator below the configured threshold and one at or above it.
- [ ] Record the expected floor rounding and remainder according to the approved
  policy. Stop if no approved remainder policy exists.
- [ ] Confirm no existing run overlaps or duplicates the test period. Stop if
  uniqueness is not enforced by the database.

The current constants calculate the creator pool as 30% of the entered
`distributableAmount` and fix the profit-share payout threshold at `$25`
(`2500` cents). There is no runtime threshold override; a threshold change
requires reviewed code and terms changes.

## 5. Run in test mode

Only an owner performs this step.

1. Open **Dashboard → Platform → Admin**.
2. Enter the exact UTC period and distributable amount in cents.
3. Compare the displayed input with the independent worksheet.
4. Create the payout run once.
5. Do not retry after a timeout or ambiguous response. First reconcile the
   database and Stripe because the current transfer calls lack idempotency keys.

Verify:

- [ ] One `payout_runs` row exists for the intended period.
- [ ] `distributable_amount` equals the approved input.
- [ ] `creator_pool_amount` equals the approved creator allocation.
- [ ] `total_verified_installs` equals the independent receipt count.
- [ ] `created_by` is the immutable owner user ID.
- [ ] One `payout_run_shares` row exists for every expected creator.
- [ ] Each share's `verified_installs`, `accrued_amount`, `carried_amount`,
  `paid_amount`, and `status` match the independent worksheet.
- [ ] Below-threshold creators have `status=carried`, `paid_amount=0`, and no
  `stripe_transfer_id`.
- [ ] Eligible above-threshold creators have `status=paid`, `paid_amount` equal
  to accrued plus prior carry, and one `stripe_transfer_id`.
- [ ] A transfer failure records `status=failed`, pays zero, and leaves the full
  amount available to carry into a later approved run.
- [ ] Sum all accrued shares and reconcile any difference from
  `creator_pool_amount` to the approved rounding/remainder policy.

## 6. Verify money movement in Stripe

Application rows are not proof that money moved. A human confirms the Stripe
objects and balances.

For each paid share:

- [ ] Open the exact Stripe transfer referenced by `stripe_transfer_id`.
- [ ] Confirm mode, amount, currency (`usd`), destination connected account,
  description, and metadata `type`, `runId`, and `userId`.
- [ ] Confirm exactly one transfer exists for that run/user pair.
- [ ] Confirm the platform balance decreased by the transfer amount.
- [ ] Confirm the connected account balance increased by the same amount.
- [ ] In the Express account, confirm the transfer is available for payout.
- [ ] Trigger or wait for a **test-mode** payout and confirm its status reaches
  `paid` in Stripe.
- [ ] Confirm the test bank destination records the expected simulated result.

Do not mark the checklist passed from a Modulora `paid` row alone. Require the
matching Stripe transfer and connected-account balance evidence.

## 7. Verify creator-visible accounting

Sign in as each test creator.

- [ ] **Dashboard → Payouts** shows the expected connected/readiness state.
- [ ] **Dashboard → Earnings** shows the expected profit-share accrual.
- [ ] A carried balance remains visible and is described as retained, not
  forfeited.
- [ ] A paid amount matches the Stripe transfer.
- [ ] The creator cannot see another creator's account, balance, transfer ID, or
  share row.
- [ ] Public profiles, catalog rank, moderation, review priority, and evidence
  do not change because payouts are connected or money was received.

## 8. Exercise failure and recovery paths

Run these only with test data and test Stripe accounts.

- [ ] Incomplete Connect account: no transfer; amount carries.
- [ ] `payouts_enabled=false`: no transfer; amount carries.
- [ ] Missing Stripe client in a non-production test deployment: no transfer;
  ledger carries rather than claiming payment.
- [ ] Insufficient test platform balance: share records `failed`, pays zero, and
  the amount remains in the next-run carry calculation.
- [ ] Below threshold: no transfer and exact carry into the next approved run.
- [ ] Boundary timestamps: start is included; end is excluded.
- [ ] No verified installs: run is rejected and creates no payout run.
- [ ] Non-owner direct call: rejected and creates no run or transfer.
- [ ] Worker interruption simulation: stop and inspect for partial run/share
  state. This must be fixed before live use; do not manually rerun the period.
- [ ] Ambiguous Stripe response simulation: reconcile by metadata and transfer
  list. This must be fixed with idempotency before live use.

## 9. Final human sign-off

The verifier answers each question explicitly.

- [ ] Did every database paid row match exactly one Stripe transfer?
- [ ] Did every transfer reach the intended connected account balance?
- [ ] Did every carried/failed amount remain unpaid and available for future
  accounting?
- [ ] Did independent arithmetic match installs, accruals, carry, paid totals,
  and the remainder?
- [ ] Were all secrets and personal/financial data kept out of evidence?
- [ ] Did authorization remain owner-only and separate from curation?
- [ ] Were public trust, ranking, evidence, and review unaffected by money?
- [ ] Are all live-mode stop conditions resolved in reviewed code and approved
  terms?

Sign-off fields:

```text
Mode: test / live
Result: pass / fail
Verifier:
Verified at (UTC):
Commit:
Worker version:
Payout run ID:
Stripe transfer IDs (redacted):
Open blockers:
Notes:
```

A `test` pass proves only the tested configuration and fixtures. It does not
approve live payouts. Live activation requires a separate change review,
resolved stop conditions, approved accounting/legal terms, and a fresh human
run of this checklist in live mode with a deliberately small first payout.
