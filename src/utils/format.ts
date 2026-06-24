export function minutesToHoursMinutes(minutes: number) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function numberFormat(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
