'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseFormData, ExpenseFiltersState } from '@/types';
import { loadExpenses, saveExpenses } from '@/utils/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const data = loadExpenses();
    // Sort newest date first
    const sorted = [...data].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setExpenses(sorted);
    setIsLoaded(true);
  }, []);

  const persist = useCallback((updated: Expense[]) => {
    saveExpenses(updated);
    setExpenses(updated);
  }, []);

  const addExpense = useCallback(
    (data: ExpenseFormData): Expense => {
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        date: data.date,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description.trim(),
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => {
        const updated = [newExpense, ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        saveExpenses(updated);
        return updated;
      });
      return newExpense;
    },
    []
  );

  const updateExpense = useCallback(
    (id: string, data: ExpenseFormData) => {
      setExpenses((prev) => {
        const updated = prev
          .map((e) =>
            e.id === id
              ? {
                  ...e,
                  date: data.date,
                  amount: parseFloat(data.amount),
                  category: data.category,
                  description: data.description.trim(),
                }
              : e
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        saveExpenses(updated);
        return updated;
      });
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveExpenses(updated);
      return updated;
    });
  }, []);

  const filterExpenses = useCallback(
    (filters: ExpenseFiltersState): Expense[] => {
      return expenses.filter((e) => {
        if (
          filters.search &&
          !e.description.toLowerCase().includes(filters.search.toLowerCase()) &&
          !e.category.toLowerCase().includes(filters.search.toLowerCase())
        ) {
          return false;
        }
        if (filters.category !== 'All' && e.category !== filters.category) {
          return false;
        }
        if (filters.startDate && e.date < filters.startDate) return false;
        if (filters.endDate && e.date > filters.endDate) return false;
        return true;
      });
    },
    [expenses]
  );

  return {
    expenses,
    isLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    filterExpenses,
  };
}
