# Product Requirements Document (PRD): FairShare (Mobile Version)

## 1. Project Overview
**App Name:** FairShare
**Type:** Mobile Application (iOS/Android via Expo)
**Core Goal:** An offline-first expense splitter that calculates debt simplification for groups.
**Deadline:** 4-Day Sprint (MVP).
**Submission Format:** GitHub Code + Video Demo (No Store Deployment needed).

## 2. Tech Stack
* **Framework:** React Native (using **Expo Router**).
* **Language:** TypeScript.
* **Styling:** NativeWind (Tailwind CSS for React Native).
* **Database:** `expo-sqlite` (Local, offline SQLite database).
* **Icons:** Lucide-React-Native or Expo Vector Icons.

## 3. Data Schema (Local SQLite)
The app requires 3 tables. All money must be stored as **Integers (Cents)** to avoid floating point errors (e.g., RM10.50 -> `1050`).

**Table 1: Users**
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `name` (TEXT NOT NULL)
* `avatar_color` (TEXT) – *Hex code string for UI circles.*

**Table 2: Expenses**
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `title` (TEXT NOT NULL)
* `amount` (INTEGER NOT NULL) – *Stored in cents.*
* `payer_id` (INTEGER NOT NULL) – *Foreign Key linking to Users.*
* `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)

**Table 3: ExpenseSplits**
* *Purpose: Links an expense to the people who are splitting it.*
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `expense_id` (INTEGER NOT NULL) – *Foreign Key linking to Expenses.*
* `user_id` (INTEGER NOT NULL) – *Foreign Key linking to Users.*
* `amount_owed` (INTEGER NOT NULL) – *How much this user owes for this specific bill.*

## 4. Core Features (MVP)

### A. Home Screen (Dashboard)
* **Header:** Total Group Spend (Sum of all expenses).
* **Action:** "Add User" button (Modal or simple input).
* **List:** Horizontal scroll of Users.
* **List:** Vertical list of recent Expenses.
* **Floating Action Button (FAB):** "Add Expense".

### B. Add Expense Screen (Modal)
* **Input:** Title (e.g., "Dinner").
* **Input:** Amount (e.g., "50.00").
* **Select:** Who paid? (Dropdown/List of users).
* **Select:** Who is splitting? (Multi-select checkmarks for all users).
    * *Logic:* Automatically divide the Amount by the number of selected users (Equal Split).

### C. Settlement Screen (The "Algorithm" View)
* **Trigger:** A "Settle Up" or "Calculate Debts" button on the Home Screen.
* **Display:** A list of simplified payments to settle all debts.
* **Visual:** Cards showing "User A -> Arrow -> User B: RM 10.00".

## 5. The Algorithm Logic (Greedy Debt Simplification)
*Note to AI: Use this logic to generate the settlement calculation function.*

1.  **Calculate Net Balance:**
    * Iterate through all `ExpenseSplits`.
    * If User A paid RM100 for 4 people (RM25 each), User A's balance is `+75`. The other 3 users are `-25`.
2.  **Separate Lists:** Create a list of `Debtors` (negative balance) and `Creditors` (positive balance).
3.  **Greedy Match:**
    * Sort both lists by absolute value (largest amount first).
    * Take the biggest Debtor and biggest Creditor.
    * Transaction Amount = `min(|debt|, |credit|)`.
    * Record transaction: `{ from: Debtor, to: Creditor, amount: X }`.
    * Subtract X from both balances. Remove anyone who reaches 0.
    * Repeat until lists are empty.

## 6. UI/UX "Money Shots" (For Video Demo)
* **Animations:** Use LayoutAnimation or Reanimated for smooth transitions when adding items.
* **Colors:** Use a dark modern theme (Slate/Zinc colors) with bright accents (Emerald for money).
* **Feedback:** Show a "Success" toast/alert when an expense is saved.