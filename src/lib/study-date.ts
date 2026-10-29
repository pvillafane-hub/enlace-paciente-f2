/** Study dates are calendar dates, independent of the viewer's time zone. */
export function formatStudyDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PR', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function studyDateYear(value: string | Date): number {
  return new Date(value).getUTCFullYear();
}
