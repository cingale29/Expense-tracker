export type Category =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#F59E0B',
  Transportation: '#3B82F6',
  Entertainment: '#8B5CF6',
  Shopping: '#EC4899',
  Bills: '#EF4444',
  Other: '#6B7280',
};

export const CATEGORY_BG: Record<Category, string> = {
  Food: 'bg-amber-100 text-amber-700',
  Transportation: 'bg-blue-100 text-blue-700',
  Entertainment: 'bg-purple-100 text-purple-700',
  Shopping: 'bg-pink-100 text-pink-700',
  Bills: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-700',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  Food: '🍽️',
  Transportation: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '📄',
  Other: '📦',
};

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
}

export interface ExpenseFormData {
  date: string;
  amount: string;
  category: Category;
  description: string;
}

export interface FormErrors {
  date?: string;
  amount?: string;
  category?: string;
  description?: string;
}

export type FilterCategory = Category | 'All';

export interface ExpenseFiltersState {
  search: string;
  category: FilterCategory;
  startDate: string;
  endDate: string;
}
