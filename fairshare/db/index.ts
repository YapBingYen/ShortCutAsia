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
    CREATE TABLE IF NOT EXISTS ExpenseItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ExpenseItemAssignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL
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

export async function createUser(name: string, avatarColor?: string): Promise<number> {
  const db = await dbPromise;
  const color = avatarColor ?? '#64748b';
  const res = await db.runAsync('INSERT INTO Users (name, avatar_color) VALUES (?, ?)', name, color);
  return res.lastInsertRowId as number;
}

export async function updateUser(id: number, name: string): Promise<void> {
  const db = await dbPromise;
  await db.runAsync('UPDATE Users SET name = ? WHERE id = ?', name, id);
}

export async function deleteUser(id: number): Promise<boolean> {
  const db = await dbPromise;
  
  // Check for dependencies
  const expenseCheck = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM Expenses WHERE payer_id = ?',
    id
  );
  if ((expenseCheck?.count ?? 0) > 0) return false;

  const splitCheck = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ExpenseSplits WHERE user_id = ?',
    id
  );
  if ((splitCheck?.count ?? 0) > 0) return false;

  await db.runAsync('DELETE FROM Users WHERE id = ?', id);
  return true;
}

export async function resetDatabase(): Promise<void> {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM ExpenseSplits');
  await db.runAsync('DELETE FROM Expenses');
  await db.runAsync('DELETE FROM Users');
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

export async function updateExpense(
  expenseId: number,
  title: string,
  amountCents: number,
  payerId: number,
  userIds: number[],
  perUserAmountCents: number[]
): Promise<void> {
  const db = await dbPromise;
  await db.runAsync(
    'UPDATE Expenses SET title = ?, amount = ?, payer_id = ? WHERE id = ?',
    title,
    amountCents,
    payerId,
    expenseId
  );
  
  // Delete old splits and re-insert
  await db.runAsync('DELETE FROM ExpenseSplits WHERE expense_id = ?', expenseId);
  
  for (let i = 0; i < userIds.length; i++) {
    await db.runAsync(
      'INSERT INTO ExpenseSplits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)',
      expenseId,
      userIds[i],
      perUserAmountCents[i]
    );
  }
}

export async function deleteExpense(expenseId: number): Promise<void> {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM ExpenseSplits WHERE expense_id = ?', expenseId);
  // Also delete items and assignments if they exist
  const items = await db.getAllAsync<{id: number}>('SELECT id FROM ExpenseItems WHERE expense_id = ?', expenseId);
  for (const item of items) {
     await db.runAsync('DELETE FROM ExpenseItemAssignments WHERE item_id = ?', item.id);
  }
  await db.runAsync('DELETE FROM ExpenseItems WHERE expense_id = ?', expenseId);
  await db.runAsync('DELETE FROM Expenses WHERE id = ?', expenseId);
}

export async function createExpenseItems(
  expenseId: number, 
  items: { name: string; amount: number; assignedTo: number[] }[]
): Promise<void> {
  const db = await dbPromise;
  for (const item of items) {
    const res = await db.runAsync(
      'INSERT INTO ExpenseItems (expense_id, name, amount) VALUES (?, ?, ?)',
      expenseId,
      item.name,
      item.amount
    );
    const itemId = res.lastInsertRowId as number;
    for (const userId of item.assignedTo) {
      await db.runAsync(
        'INSERT INTO ExpenseItemAssignments (item_id, user_id) VALUES (?, ?)',
        itemId,
        userId
      );
    }
  }
}

export async function getExpenseItems(expenseId: number): Promise<{
  id: number;
  name: string;
  amount: number;
  assignments: number[];
}[]> {
  const db = await dbPromise;
  const items = await db.getAllAsync<import('./types').ExpenseItem>(
    'SELECT id, name, amount FROM ExpenseItems WHERE expense_id = ?',
    expenseId
  );
  
  const result = [];
  for (const item of items) {
    const assignments = await db.getAllAsync<{user_id: number}>(
      'SELECT user_id FROM ExpenseItemAssignments WHERE item_id = ?',
      item.id
    );
    result.push({
      ...item,
      assignments: assignments.map(a => a.user_id)
    });
  }
  return result;
}

export async function getUserSpending(): Promise<import('./types').UserSpending[]> {
  const db = await dbPromise;
  const rows = await db.getAllAsync<import('./types').UserSpending>(`
    SELECT 
      u.id, 
      u.name, 
      u.avatar_color, 
      COALESCE(split_sum.total_share, 0) as total_spent,
      COALESCE(paid_cnt.count, 0) as paid_count
    FROM Users u
    LEFT JOIN (
      SELECT user_id, SUM(amount_owed) as total_share
      FROM ExpenseSplits
      GROUP BY user_id
    ) split_sum ON u.id = split_sum.user_id
    LEFT JOIN (
      SELECT payer_id, COUNT(*) as count
      FROM Expenses
      GROUP BY payer_id
    ) paid_cnt ON u.id = paid_cnt.payer_id
    ORDER BY total_spent DESC
  `);
  return rows;
}
