# FairShare Feature Checklist

## 1. User Experience Improvements
- [x] **Edit/Delete Expenses**
  - Tap expense in "Recent Activity" to open details.
  - Edit: Modify title, amount, payer, or splits.
  - Delete: Remove expense and associated splits; update balances.
- [ ] **User Management**
  - "Manage Users" screen.
  - Rename users.
  - Delete users (validate 0 balance first).
- [ ] **Group Summary**
  - Visual chart (pie/bar) of spending by user.
  - "Who spent the most" leaderboard.

## 2. Advanced Splitting (Itemized Bill)
- [ ] **OCR / Receipt Scanning**
  - Camera integration (`expo-image-picker`).
  - OCR API integration (Google Vision/Tesseract).
  - Auto-fill items from scan.
- [ ] **Itemized Entry Screen**
  - List individual items (Dish, Price).
  - Assign users per item.
  - Proportional tax/service charge handling.

## 3. Social & Sharing
- [x] **Share Settlement**
  - Generate text summary of debts.
  - Share via system sheet (`Share.share`) to WhatsApp/Telegram.
- [ ] **Deep Linking**
  - URL scheme (`fairshare://`) to open app.
  - Shareable links with pre-filled data (requires backend).

## 4. Data & Sync
- [ ] **Export CSV**
  - Generate CSV of expenses/splits.
  - Share file to Excel/Sheets.
- [ ] **Multiple Groups**
  - Group management (Create, Switch, Delete).
  - Scope expenses/users to active group.
- [ ] **Cloud Sync**
  - Supabase/Firebase integration.
  - Auth (Login/Signup).
  - Real-time sync across devices.

## 5. Polish
- [ ] **Currency Picker**
  - Select currency per expense.
  - Auto-conversion or multi-currency totals.
- [ ] **Dark/Light Mode Toggle**
  - Settings screen.
  - Explicit theme override.
