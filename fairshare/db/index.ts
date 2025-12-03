import * as SQLite from 'expo-sqlite';
import type { User } from './types';

const dbPromise = SQLite.openDatabaseAsync('fairshare.db');

export async function initDatabase(): Promise<void> {
  const db = await dbPromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_color TEXT
    );
    CREATE TABLE IF NOT EXISTS Expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payer_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ExpenseSplits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_owed INTEGER NOT NULL
    );
  `);
}

export async function seedUsersIfEmpty(): Promise<void> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Users');
  const count = row?.count ?? 0;
  if (count > 0) return;
  const users: Array<[string, string]> = [
    ['Alice', '#ef4444'],
    ['Bob', '#3b82f6'],
    ['Charlie', '#10b981'],
  ];
  for (const [name, color] of users) {
    await db.runAsync('INSERT INTO Users (name, avatar_color) VALUES (?, ?)', name, color);
  }
}

export async function setupDatabase(): Promise<void> {
  await initDatabase();
  await seedUsersIfEmpty();
}

export async function getDatabase() {
  return dbPromise;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await dbPromise;
  const rows = await db.getAllAsync<User>('SELECT id, name, avatar_color FROM Users ORDER BY id');
  return rows;
}

export async function getAllExpenses(): Promise<import('./types').Expense[]> {
  const db = await dbPromise;
  const rows = await db.getAllAsync<import('./types').Expense>(
    'SELECT id, title, amount, payer_id, created_at FROM Expenses ORDER BY created_at DESC'
  );
  return rows;
}

export async function getAllSplits(): Promise<import('./types').ExpenseSplit[]> {
  const db = await dbPromise;
  const rows = await db.getAllAsync<import('./types').ExpenseSplit>(
    'SELECT id, expense_id, user_id, amount_owed FROM ExpenseSplits'
  );
  return rows;
}

export async function createExpense(title: string, amountCents: number, payerId: number): Promise<number> {
  const db = await dbPromise;
  const res = await db.runAsync(
    'INSERT INTO Expenses (title, amount, payer_id) VALUES (?, ?, ?)',
    title,
    amountCents,
    payerId
  );
  return res.lastInsertRowId as number;
}

export async function insertExpenseSplits(expenseId: number, userIds: number[], perUserAmountCents: number[],): Promise<void> {
  const db = await dbPromise;
  // Ensure sums match total; this function expects pre-computed per-user amounts
  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];
    const amt = perUserAmountCents[i];
    await db.runAsync('INSERT INTO ExpenseSplits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)', expenseId, uid, amt);
  }
}
