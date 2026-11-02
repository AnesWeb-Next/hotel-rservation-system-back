export const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

export const daysDifference = (date1: Date, date2: Date): number => {
  const time1 = date1.getTime();
  const time2 = date2.getTime();
  const diffMilliseconds = Math.abs(time1 - time2);
  const days = diffMilliseconds / (1000 * 60 * 60 * 24);
  return Math.floor(days);
};

export const daysOverdue = (dueDate: Date): number => {
  // Get current date (reset time to midnight for accurate day comparison)
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Create a copy of dueDate and reset time to midnight
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  // If current date is less than or equal to due date, not overdue
  if (currentDate <= due) {
    return 0;
  }

  // Calculate difference in milliseconds
  const diffMilliseconds = currentDate.getTime() - due.getTime();

  // Convert to days
  const days = diffMilliseconds / (1000 * 60 * 60 * 24);

  // Round down and return
  return Math.floor(days);
};

export const isDateOverdue = (dueDate: Date): boolean => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return currentDate > due;
};

export const getCurrentDateMidnight = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDateYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
