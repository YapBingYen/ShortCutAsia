export type User = {
  id: number;
  name: string;
  avatar_color: string | null;
};

export type UserSpending = User & {
  total_spent: number;
  paid_count: number;
};

export type Expense = {
  id: number;
  title: string;
  amount: number;
  payer_id: number;
  created_at: string;
};

export type ExpenseSplit = {
  id: number;
  expense_id: number;
  user_id: number;
  amount_owed: number;
};

export type ExpenseItem = {
  id: number;
  expense_id: number;
  name: string;
  amount: number;
};

export type ExpenseItemAssignment = {
  id: number;
  item_id: number;
  user_id: number;
};
