const LOCAL_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type LocalWeekRange = {
  startDate: Date;
  endDate: Date;
  nextWeekStartDate: Date;
  startKey: string;
  endKey: string;
  nextWeekStartKey: string;
};

export function normalizeLocalDate(date = new Date()): Date {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getLocalDateFromKey(value: string): Date {
  if (!isLocalDateKey(value)) {
    throw new Error(`本地日期无效：${value}`);
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isLocalDateKey(value: string): boolean {
  if (!LOCAL_DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  return getLocalDateKey(new Date(year, month - 1, day, 12)) === value;
}

export function shiftLocalDate(date: Date, days: number): Date {
  const shiftedDate = normalizeLocalDate(date);
  shiftedDate.setDate(shiftedDate.getDate() + days);
  return shiftedDate;
}

export function getLocalWeekStart(date = new Date()): Date {
  const weekStart = normalizeLocalDate(date);
  const weekday = weekStart.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return weekStart;
}

export function getLocalWeekEnd(date = new Date()): Date {
  return shiftLocalDate(getLocalWeekStart(date), 6);
}

export function shiftLocalWeek(date: Date, weeks: number): Date {
  return shiftLocalDate(getLocalWeekStart(date), weeks * 7);
}

export function getLocalWeekRange(date = new Date()): LocalWeekRange {
  const startDate = getLocalWeekStart(date);
  const endDate = getLocalWeekEnd(startDate);
  const nextWeekStartDate = shiftLocalDate(startDate, 7);

  return {
    startDate,
    endDate,
    nextWeekStartDate,
    startKey: getLocalDateKey(startDate),
    endKey: getLocalDateKey(endDate),
    nextWeekStartKey: getLocalDateKey(nextWeekStartDate),
  };
}
