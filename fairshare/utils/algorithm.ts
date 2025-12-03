import type { User, Expense, ExpenseSplit } from '@/db/types';

export interface PaymentInstruction {
  from_user_id: number;
  to_user_id: number;
  amount: number;
}

export function calculateDebts(
  users: User[],
  expenses: Expense[],
  splits: ExpenseSplit[]
): PaymentInstruction[] {
  const ids = new Set<number>();
  for (const u of users) ids.add(u.id);
  for (const e of expenses) ids.add(e.payer_id);
  for (const s of splits) ids.add(s.user_id);

  const balances: Record<number, number> = {};
  ids.forEach((id) => (balances[id] = 0));

  for (const e of expenses) {
    balances[e.payer_id] = (balances[e.payer_id] ?? 0) + e.amount;
  }
  for (const s of splits) {
    balances[s.user_id] = (balances[s.user_id] ?? 0) - s.amount_owed;
  }

  let sum = 0;
  for (const id of ids) sum += balances[id] ?? 0;
  if (sum !== 0) throw new Error('Net balance must sum to 0');

  type Entry = { userId: number; amount: number };
  const debtors: Entry[] = [];
  const creditors: Entry[] = [];
  for (const id of ids) {
    const b = balances[id] ?? 0;
    if (b < 0) debtors.push({ userId: id, amount: -b });
    else if (b > 0) creditors.push({ userId: id, amount: b });
  }

  const result: PaymentInstruction[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    const d = debtors[0];
    const c = creditors[0];
    const amt = Math.min(d.amount, c.amount);
    result.push({ from_user_id: d.userId, to_user_id: c.userId, amount: amt });
    d.amount -= amt;
    c.amount -= amt;
    if (d.amount === 0) debtors.shift();
    if (c.amount === 0) creditors.shift();
  }

  return result;
}

export function runTestScenario(): PaymentInstruction[] {
  const users: User[] = [
    { id: 1, name: 'Alice', avatar_color: '#ef4444' },
    { id: 2, name: 'Bob', avatar_color: '#3b82f6' },
    { id: 3, name: 'Charlie', avatar_color: '#10b981' },
  ];
  const expenses: Expense[] = [
    { id: 1, title: 'Meal', amount: 3000, payer_id: 1, created_at: new Date().toISOString() },
  ];
  const splits: ExpenseSplit[] = [
    { id: 1, expense_id: 1, user_id: 1, amount_owed: 1000 },
    { id: 2, expense_id: 1, user_id: 2, amount_owed: 1000 },
    { id: 3, expense_id: 1, user_id: 3, amount_owed: 1000 },
  ];
  const instructions = calculateDebts(users, expenses, splits);
  instructions.forEach((p) => {
    // eslint-disable-next-line no-console
    console.log(p);
  });
  return instructions;
}
