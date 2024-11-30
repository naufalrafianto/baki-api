export const getDayOfWeek = (date: Date): string => {
  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  return days[date.getDay()];
};

export function getDayOfWeekWithTimezone(
  date: Date,
  timezone: string = 'Asia/Jakarta',
) {
  // Convert the date to user's timezone
  const userDate = new Date(
    date.toLocaleString('en-US', { timeZone: timezone }),
  );
  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  return days[userDate.getDay()];
}
