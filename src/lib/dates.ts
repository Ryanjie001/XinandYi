const DAY = 86_400_000;
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function timestamp(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
export function togetherDays(start: string) {
  if (!start) return null;
  const days = Math.floor((timestamp(today()) - timestamp(start)) / DAY) + 1;
  return Number.isFinite(days) && days > 0 ? days : null;
}
export function readableDate(date: string, withYear = false) {
  if (!date) return "还未设置";
  const [year, month, day] = date.split("-").map(Number);
  return (withYear ? year + " 年 " : "") + month + " 月 " + day + " 日";
}
export function nextOccurrence(date: string) {
  if (!date) return null;
  const current = today();
  const year = Number(current.slice(0, 4));
  const [, month, day] = date.split("-").map(Number);
  const occurrence = (y: number) => {
    const lastDay = new Date(Date.UTC(y, month, 0)).getUTCDate();
    return Date.UTC(y, month - 1, Math.min(day, lastDay));
  };
  let next = occurrence(year);
  if (next < timestamp(current)) next = occurrence(year + 1);
  return Math.round((next - timestamp(current)) / DAY);
}
