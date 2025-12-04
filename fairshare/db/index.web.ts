import type { User, Expense, ExpenseSplit } from './types';

let users: User[] = [];
let nextUserId = 4;
let expenses: Expense[] = [];
let splits: ExpenseSplit[] = [];
let nextExpenseId = 1;
let nextSplitId = 1;

export async function initDatabase(): Promise<void> {
  // no-op for web stub
}

export async function seedUsersIfEmpty(): Promise<void> {
  if (users.length > 0) return;
  users = [
    { id: 1, name: 'Alice', avatar_color: '#ef4444' },
    { id: 2, name: 'Bob', avatar_color: '#3b82f6' },
    { id: 3, name: 'Charlie', avatar_color: '#10b981' },
  ];
}

export async function setupDatabase(): Promise<void> {
  await initDatabase();
  await seedUsersIfEmpty();
}

export async function getDatabase() {
  // not applicable on web stub
  return null as any;
}

export async function getAllUsers(): Promise<User[]> {
  return users.slice();
}

export async function createUser(name: string, avatarColor?: string): Promise<number> {
  const id = nextUserId++;
  const color = avatarColor ?? '#64748b';
  users.push({ id, name, avatar_color: color });
  return id;
}

export async function resetDatabase(): Promise<void> {
  users = [];
  expenses = [];
  splits = [];
  nextUserId = 1;
  nextExpenseId = 1;
  nextSplitId = 1;
}

export async function getAllExpenses(): Promise<Expense[]> {
  return expenses.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getAllSplits(): Promise<ExpenseSplit[]> {
  return splits.slice();
}

export async function createExpense(title: string, amountCents: number, payerId: number): Promise<number> {
  const id = nextExpenseId++;
  expenses.push({ id, title, amount: amountCents, payer_id: payerId, created_at: new Date().toISOString() });
  return id;
}

export async function insertExpenseSplits(expenseId: number, userIds: number[], perUserAmountCents: number[]): Promise<void> {
  for (let i = 0; i < userIds.length; i++) {
    splits.push({ id: nextSplitId++, expense_id: expenseId, user_id: userIds[i], amount_owed: perUserAmountCents[i] });
  }
}
