'use client';

import { useExpenses } from '@/hooks/useExpenses';
import MonthlyInsights from '@/components/MonthlyInsights';

export default function InsightsPage() {
  const { expenses, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-md mx-auto space-y-5">
        <div className="text-center">
          <div className="h-9 w-48 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          <div className="h-2 w-32 bg-gray-100 rounded-full mx-auto mt-3 animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl h-56 animate-pulse border border-gray-100" />
        <div className="bg-white rounded-2xl h-36 animate-pulse border border-gray-100" />
        <div className="rounded-2xl h-28 animate-pulse border-2 border-dashed border-gray-200" />
      </div>
    );
  }

  return <MonthlyInsights expenses={expenses} />;
}
