# Business rules and accounting workspaces

## Booking and payment policy

- Public bookings require a published, active package inside its booking window. Each pilgrim needs a name and passport; duplicate passports within a booking are rejected.
- Booking creation locks the tier. Quota edits cannot go below confirmed **plus held** seats. The database quota constraint remains the final safeguard.
- `BOOKING_HOLD_MINUTES` defaults to 30. A scheduled job releases expired holds in each active tenant schema. Run the API/worker with Redis available.
- Prices are frozen at booking creation, which is stricter than freezing at confirmation. Full-payment bookings confirm when their obligation is paid; installment bookings confirm after the down payment.
- Installment policy is 30% down plus three payments distributed between booking and the day before departure. Bookings too close to departure must use full payment. Original dates and amounts remain fixed. Cancellation credits are stored separately as `amountWaived` and allocated from the last unpaid installment backwards.
- Payments apply to the oldest unpaid installment. Excess money stays in gross booking receipts and is refundable. `INSTALLMENT_GRACE_DAYS` defaults to 7. Overdue notifications use the tenant email configuration; successful reminders are recorded once per day. SMTP failure permits retry; a crash between sending and recording can cause a duplicate reminder.
- Confirmation moves seats from held to confirmed and closes the hold in the same transaction. Expired or cancelled bookings never regain seats from a late payment; the receipt stays available for reconciliation/refund.
- Verified callbacks serialize on the payment attempt, then the booking. Success is idempotent. A verified success can supersede an earlier failed/cancelled redirect. Amount, currency, and provider transaction/session identity must match. The stub is a local-development gateway, never a production confirmation source.
- Manual booking payments require different recorder and approver users. Arbitrary booking-status changes are rejected.

## Cancellations and refunds

Cancellation rules use the greatest `daysBeforeDeparture` threshold less than or equal to the remaining whole days. If no rule applies, the default charge is 10%. Vendor disbursements linked to the booking add their recorded BDT cost. Group cancellations allocate frozen price and vendor costs using the original pilgrim count, so repeated partial cancellations do not increase the per-person basis.

Booking refund transitions are `requested → approved → processing → paid`; requested/approved claims may instead be rejected. Paid refunds cannot be reopened. Concurrent claims are reserved under a booking lock. All non-rejected claims, including paid refunds, plus cancellation charges are capped against gross receipts. `amountReceived` is gross money collected; paying a refund does not erase collection history.

Financial history is soft-deleted only. Reports and settlement matching explicitly include archived records. Existing data written by older versions should be reconciled before release, particularly previously reduced `amountReceived` values, already-confirmed open holds, and stock issues without captured costs. Migration does not silently rewrite those financial records.

## Accounts and POS

Accounts is a navigation page. Vendors, Disbursements, Stock, Expenses, and Settlements have separate routes beneath `/dashboard/accounts`, with independent feature keys `vendors`, `disbursements`, `stock`, `expenses`, and `settlements`. Both API permissions and page access use those keys. Existing Payments, Refunds, and Reports keep their own gates.

`/dashboard/pos` uses `pos:view` to read the catalog/sales, `pos:edit` to record sales, and `pos:full` to create catalog entries and refund a sale. It supports BDT cash sales of products and services; product stock is deducted atomically, services do not consume stock. Checkout has an idempotency key. Full sale refunds restore product quantities once. Booking refunds retain their separate approval workflow. POS does not charge cards or perform a real external refund transfer; staff record cash received/returned.

Vendor costs retain SAR, the entered FX rate, and BDT equivalent. Expenses and issued-stock costs are reported separately. Stock issue costs are captured at issue time. Existing issues receive a zero-cost migration default and require review if historical cost reporting is needed.

The first Accounts feature migration copies existing Accounts role permissions, tenant flags, and tenant overrides to the new pages. Explicit new settings are preserved. After migration, each page can be independently disabled or restricted; later migrations do not restore removed role permissions. Existing subscription plans with Accounts are expanded once as well. New subscription plans must explicitly include the new keys as appropriate.

## Validation and audit

Business input schemas allow only editable fields and validate money, quantities, package dates, refund inputs, and pilgrim details. The authenticated user must belong to the current tenant. Public booking detail and payment initiation are scoped to the caller. Every successful authenticated tenant mutation creates an audit record without storing submitted secrets or passport payloads. Important financial transitions also record domain audit events inside their transactions.

## Verification

Run after installing dependencies and starting PostgreSQL/Redis:

```bash
pnpm --filter @wufud/contracts build
pnpm migrate:tenants
pnpm typecheck
pnpm test
BUSINESS_TEST_DATABASE_URL=postgresql://wufud:wufud@localhost:55432/wufud pnpm --filter backend test -- --runInBand
CI=1 pnpm --filter frontend exec playwright test e2e/accounts.spec.ts --workers=1
```

Database tests create a uniquely named temporary schema and drop only that schema. They exercise actual services and PostgreSQL locks, including last-seat competition, manual-payment maker/checker, simultaneous refund claims, hold expiry, callback duplication/reordering, stock contention, and POS retry/refund behavior. External gateway validation is mocked in these tests; production-provider sandbox certification remains a separate deployment check. Browser checks use the seeded demo administrator and inspect the Accounts subpages and POS.

## Existing seat-counter repair

The previous demo seed populated held/confirmed counters without corresponding bookings or holds. The seed is corrected. The local audit rebuilt 12 inconsistent demo-tier counters from retained booking/hold records, recording each change as `quota.rebuild`; rechecking found zero mismatches. For another existing installation, run `node backend/dist/cli/repair-seat-counters.js` after building, during a maintenance window. It locks the affected tables, retains original financial amounts, and fails rather than raising quotas if actual reservations exceed capacity.
