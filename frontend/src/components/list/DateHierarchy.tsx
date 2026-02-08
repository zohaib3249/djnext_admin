'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

interface DateHierarchyProps {
  appLabel: string;
  modelName: string;
  dateField: string;
  /** Current filter values */
  values: {
    year?: number;
    month?: number;
    day?: number;
  };
  /** Called when hierarchy selection changes */
  onChange: (values: { year?: number; month?: number; day?: number }) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Date hierarchy navigation component.
 * Provides drill-down from year → month → day.
 */
export function DateHierarchy({
  appLabel,
  modelName,
  dateField,
  values,
  onChange,
}: DateHierarchyProps) {
  const [dates, setDates] = useState<number[]>([]);
  const [level, setLevel] = useState<'year' | 'month' | 'day'>('year');
  const [loading, setLoading] = useState(true);

  // Fetch available dates based on current drill-down level
  useEffect(() => {
    const fetchDates = async () => {
      setLoading(true);
      try {
        const result = await api.getDateHierarchy(appLabel, modelName, {
          year: values.year,
          month: values.month,
        });
        setDates(result.dates);
        setLevel(result.level);
      } catch (error) {
        console.error('Failed to fetch date hierarchy:', error);
        setDates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDates();
  }, [appLabel, modelName, values.year, values.month]);

  // Navigate to a specific level
  const handleSelectYear = (year: number) => {
    onChange({ year, month: undefined, day: undefined });
  };

  const handleSelectMonth = (month: number) => {
    onChange({ ...values, month, day: undefined });
  };

  const handleSelectDay = (day: number) => {
    onChange({ ...values, day });
  };

  // Go back to a previous level
  const handleBackToYears = () => {
    onChange({ year: undefined, month: undefined, day: undefined });
  };

  const handleBackToMonths = () => {
    onChange({ year: values.year, month: undefined, day: undefined });
  };

  const handleClearAll = () => {
    onChange({ year: undefined, month: undefined, day: undefined });
  };

  if (loading && dates.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading dates...</span>
      </div>
    );
  }

  if (dates.length === 0 && !values.year) {
    return null; // No dates available, don't show the component
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-border bg-muted/30 text-sm">
      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />

      {/* Breadcrumb navigation */}
      {values.year && (
        <>
          <button
            type="button"
            onClick={handleBackToYears}
            className="text-primary hover:underline cursor-pointer"
          >
            All years
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </>
      )}

      {values.year && values.month && (
        <>
          <button
            type="button"
            onClick={handleBackToMonths}
            className="text-primary hover:underline cursor-pointer"
          >
            {values.year}
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </>
      )}

      {values.year && values.month && values.day && (
        <>
          <span className="text-muted-foreground">{MONTH_NAMES[values.month - 1]}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{values.day}</span>
        </>
      )}

      {/* Current level options */}
      {level === 'year' && !values.year && (
        <div className="flex flex-wrap items-center gap-1">
          {dates.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleSelectYear(year)}
              className="px-2 py-0.5 rounded hover:bg-primary/10 text-primary cursor-pointer"
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {level === 'month' && values.year && !values.month && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium mr-1">{values.year}:</span>
          {dates.map((month) => (
            <button
              key={month}
              type="button"
              onClick={() => handleSelectMonth(month)}
              className="px-2 py-0.5 rounded hover:bg-primary/10 text-primary cursor-pointer"
            >
              {MONTH_NAMES[month - 1]?.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {level === 'day' && values.year && values.month && !values.day && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium mr-1">
            {MONTH_NAMES[values.month - 1]} {values.year}:
          </span>
          {dates.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleSelectDay(day)}
              className="px-2 py-0.5 rounded hover:bg-primary/10 text-primary cursor-pointer min-w-[2rem]"
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* Clear filter when active */}
      {(values.year || values.month || values.day) && (
        <button
          type="button"
          onClick={handleClearAll}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Clear dates
        </button>
      )}
    </div>
  );
}
