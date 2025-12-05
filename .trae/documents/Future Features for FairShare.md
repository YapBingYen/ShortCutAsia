# Future Feature Plan for FairShare

Here are high-impact features to enhance your expense splitter, categorized by complexity.

## 1. User Experience Improvements
- **Edit/Delete Expenses:** Allow users to tap an expense in "Recent Activity" to modify amount/split or delete it.
- **User Management:** Add a "Manage Users" screen to rename or delete users (with validation if they have debts).
- **Group Summary:** A visual chart (pie/bar) showing who spent the most.

## 2. Advanced Splitting (Itemized Bill)
- **OCR / Receipt Scanning:** Use `expo-image-picker` + an OCR API (like Google Vision or Tesseract) to scan receipts and auto-fill items.
- **Itemized Entry Screen:** A dedicated screen to list items (Burger, Coke) and assign specific users to each item, handling tax/service charge proportionally.

## 3. Social & Sharing
- **Share Settlement:** Generate a text summary or image of the "Settle Up" cards to share via WhatsApp/Telegram (`Share.share`).
- **Deep Linking:** Allow sharing a link that opens the app with pre-filled data (requires backend sync).

## 4. Data & Sync
- **Export CSV:** Export the expense list to CSV for Excel/Sheets.
- **Multiple Groups:** Support creating separate groups (e.g., "Trip to Bali", "Housemates") with their own users/expenses.
- **Cloud Sync:** Move from local SQLite to Supabase/Firebase for real-time collaboration across devices.

## 5. Polish
- **Currency Picker:** Support multi-currency expenses (auto-convert to base currency).
- **Dark/Light Mode Toggle:** Explicit toggle in settings.

**Recommendation:** Start with **Edit/Delete Expenses** (high value, low effort) or **Share Settlement** (great for "Money Shots").

Let me know which one excites you, and I can plan the implementation!