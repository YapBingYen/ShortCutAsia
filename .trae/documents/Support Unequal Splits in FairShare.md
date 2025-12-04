## Overview
Implement flexible split types so each person owes their exact amount. Start with Custom/Percent/Shares using the current `ExpenseSplits` table; optionally add Itemized receipts later.

## Split Types
- Equal: current behavior (default).
- Custom amounts: enter per-user amounts (in RM), stored as cents.
- Percentages: enter per-user %, auto-allocates and rounds to cents.
- Shares: enter per-user share counts (e.g., 1, 2), allocates proportionally.
- Itemized (optional): add receipt items and assign consumers; per-item split (equal/custom), aggregated per user.

## Data Model
- Phase A: No DB change; use existing `ExpenseSplits(amount_owed INTEGER)` per user.
- Phase B (optional):
  - `ExpenseItems(id, expense_id, title, amount INTEGER)`
  - `ItemConsumers(id, item_id, user_id, share INTEGER)`

## Utilities (new `utils/split.ts`)
- `toCents(value: string): number` – robust decimal parsing.
- `distributeRemainder(baseAmounts: number[], total: number)` – fix rounding to sum to total.
- `allocateByPercent(total: number, percents: number[]): number[]`.
- `allocateByShares(total: number, shares: number[]): number[]`.
- `validateSum(total: number, amounts: number[])` – throws if mismatch.
- Itemized helpers (Phase B): `aggregateByUser(items)`.

## Add Expense UI (`app/add-expense.tsx`)
- Add a split mode selector: Equal / Custom / Percent / Shares.
- Render per-user inputs based on mode:
  - Custom: amount input for each selected user.
  - Percent: percentage input for each user with live allocation preview.
  - Shares: integer shares per user with preview.
- Default “Split With” to all users; allow toggling selection.
- Validation: ensure total equals sum (after rounding); highlight mismatches.
- Save: compute `perUserAmountsCents` from mode, then call existing `insertExpenseSplits`.

## Itemized Flow (optional new screen)
- New `app/add-expense-items.tsx`:
  - Add items (title + amount).
  - Assign consumers per item (equal/custom or shares).
  - Show per-user totals; Save creates one `Expense` and many `ExpenseSplits` aggregated per user.

## Settlement
- No changes to `calculateDebts`: it already uses `ExpenseSplits.amount_owed`.
- Keep current modal; card styling remains.

## Edge Cases & Rules
- Always store cents (INTEGER).
- Rounding: use remainder distribution to ensure exact total.
- Prevent negative/empty inputs; enforce percentages sum to ~100%.
- Shares: require sum of shares > 0.

## Testing
- Unit-like tests in dev:
  - Percent case: 10000 cents, [50,30,20] → [5000,3000,2000].
  - Shares case: 10000 cents, [1,1,2] → [2500,2500,5000].
  - Custom case: validate mismatch detection.
- UI checks: inputs, preview updates, Save → Home totals update.

## Delivery Steps
1. Create `utils/split.ts` (allocation + rounding + validation).
2. Update `app/add-expense.tsx` to add modes and per-user inputs.
3. Wire Save logic to compute `perUserAmountsCents` then insert splits.
4. (Optional) Implement itemized screen and tables.

Confirm to proceed with Phase A (Custom/Percent/Shares) now; Phase B (Itemized) can follow after.