export interface DateRangeFilter {
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;   // "YYYY-MM-DD"
  preset: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'this_month' | 'last_month' | 'custom';
  label: string;
}

// Format Date object to YYYY-MM-DD string in local timezone
export function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get Preset Date Range
export function getPresetDateRange(preset: DateRangeFilter['preset'], customStart?: string, customEnd?: string): DateRangeFilter {
  const today = new Date();
  
  if (preset === 'today') {
    const todayStr = formatDateToInput(today);
    return {
      startDate: todayStr,
      endDate: todayStr,
      preset: 'today',
      label: 'Today'
    };
  }

  if (preset === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDateToInput(yest);
    return {
      startDate: yestStr,
      endDate: yestStr,
      preset: 'yesterday',
      label: 'Yesterday'
    };
  }

  if (preset === 'week') {
    // Last 7 Days (1 week)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return {
      startDate: formatDateToInput(sevenDaysAgo),
      endDate: formatDateToInput(today),
      preset: 'week',
      label: 'Last 7 Days (1 Wk)'
    };
  }

  if (preset === 'month') {
    // Last 30 Days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    return {
      startDate: formatDateToInput(thirtyDaysAgo),
      endDate: formatDateToInput(today),
      preset: 'month',
      label: 'Last 30 Days'
    };
  }

  if (preset === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: formatDateToInput(firstDay),
      endDate: formatDateToInput(today),
      preset: 'this_month',
      label: 'This Month'
    };
  }

  if (preset === 'last_month') {
    const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      startDate: formatDateToInput(firstDayPrev),
      endDate: formatDateToInput(lastDayPrev),
      preset: 'last_month',
      label: 'Last Month'
    };
  }

  if (preset === 'custom' && customStart && customEnd) {
    try {
      const sDate = new Date(customStart + 'T00:00:00');
      const eDate = new Date(customEnd + 'T00:00:00');
      const formatDisplay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        startDate: customStart,
        endDate: customEnd,
        preset: 'custom',
        label: `${formatDisplay(sDate)} - ${formatDisplay(eDate)}`
      };
    } catch {
      return {
        startDate: customStart,
        endDate: customEnd,
        preset: 'custom',
        label: `${customStart} to ${customEnd}`
      };
    }
  }

  // Default: All Time
  return {
    startDate: null,
    endDate: null,
    preset: 'all',
    label: 'All Time'
  };
}

// Check if a date string/ISO timestamp/Date object falls within date range
export function isDateInRange(dateValue?: string | Date | null, range?: DateRangeFilter | null): boolean {
  if (!range || !range.startDate || !range.endDate || range.preset === 'all') {
    return true;
  }
  if (!dateValue) return false;

  const targetDate = new Date(dateValue);
  if (isNaN(targetDate.getTime())) return false;

  // Set boundary times (inclusive)
  const start = new Date(range.startDate + 'T00:00:00');
  const end = new Date(range.endDate + 'T23:59:59.999');

  return targetDate >= start && targetDate <= end;
}
