export function addMinutes(time: string, minutes: number) {
  const [hour, min] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(min + minutes);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
