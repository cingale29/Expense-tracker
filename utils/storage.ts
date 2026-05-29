import { Expense } from '@/types';

const STORAGE_KEY = 'expense-tracker-v1';

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Expense[];
    }
    const samples = generateSampleData();
    saveExpenses(samples);
    return samples;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

function offsetDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function generateSampleData(): Expense[] {
  const raw: Omit<Expense, 'id' | 'createdAt'>[] = [
    // This month
    { date: offsetDate(0),   amount: 78.40,  category: 'Food',           description: 'Weekly grocery run' },
    { date: offsetDate(-1),  amount: 14.50,  category: 'Transportation', description: 'Uber to office' },
    { date: offsetDate(-2),  amount: 129.99, category: 'Shopping',       description: 'Running shoes' },
    { date: offsetDate(-3),  amount: 15.99,  category: 'Entertainment',  description: 'Netflix subscription' },
    { date: offsetDate(-4),  amount: 95.00,  category: 'Bills',          description: 'Electric bill' },
    { date: offsetDate(-5),  amount: 42.80,  category: 'Food',           description: 'Thai restaurant dinner' },
    { date: offsetDate(-6),  amount: 8.75,   category: 'Transportation', description: 'Bus day pass' },
    { date: offsetDate(-8),  amount: 59.99,  category: 'Bills',          description: 'Internet bill' },
    { date: offsetDate(-9),  amount: 23.50,  category: 'Food',           description: 'Coffee & pastries' },
    { date: offsetDate(-11), amount: 199.00, category: 'Shopping',       description: 'Laptop bag & accessories' },
    { date: offsetDate(-12), amount: 12.99,  category: 'Entertainment',  description: 'Spotify premium' },
    { date: offsetDate(-14), amount: 35.00,  category: 'Food',           description: 'Lunch with colleagues' },
    // Previous month
    { date: offsetDate(-32), amount: 85.20,  category: 'Food',           description: 'Grocery shopping' },
    { date: offsetDate(-33), amount: 55.00,  category: 'Entertainment',  description: 'Concert tickets' },
    { date: offsetDate(-35), amount: 110.00, category: 'Bills',          description: 'Gas bill' },
    { date: offsetDate(-36), amount: 32.00,  category: 'Transportation', description: 'Gas station fill-up' },
    { date: offsetDate(-38), amount: 249.99, category: 'Shopping',       description: 'Winter jacket' },
    { date: offsetDate(-40), amount: 28.50,  category: 'Food',           description: 'Sushi takeout' },
    { date: offsetDate(-42), amount: 18.00,  category: 'Other',          description: 'Parking fees' },
    { date: offsetDate(-45), amount: 65.00,  category: 'Food',           description: 'Weekly groceries' },
    { date: offsetDate(-47), amount: 9.99,   category: 'Entertainment',  description: 'App subscription' },
    // Two months ago
    { date: offsetDate(-62), amount: 72.30,  category: 'Food',           description: 'Supermarket run' },
    { date: offsetDate(-64), amount: 88.00,  category: 'Bills',          description: 'Phone bill' },
    { date: offsetDate(-66), amount: 145.00, category: 'Shopping',       description: 'Home decor items' },
    { date: offsetDate(-68), amount: 24.00,  category: 'Transportation', description: 'Train tickets' },
    { date: offsetDate(-70), amount: 30.00,  category: 'Entertainment',  description: 'Movie night x2' },
    { date: offsetDate(-72), amount: 55.75,  category: 'Food',           description: 'Birthday dinner out' },
    { date: offsetDate(-75), amount: 13.50,  category: 'Other',          description: 'Laundry' },
  ];

  return raw.map((item, i) => ({
    ...item,
    id: `sample-${Date.now()}-${i}`,
    createdAt: new Date().toISOString(),
  }));
}
