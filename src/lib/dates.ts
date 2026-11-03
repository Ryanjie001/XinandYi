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
export function daysUntil(date: string, current = today()) {
  return Math.round((timestamp(date) - timestamp(current)) / DAY);
}
export function anniversaryRemaining(date: string, yearly: boolean, current = today()) {
  if (!yearly || date > current) return daysUntil(date, current);
  return nextOccurrence(date, current);
}
export function isOnThisDay(date: string, current = today()) {
  return date.slice(5) === current.slice(5) && date.slice(0, 4) < current.slice(0, 4);
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
export function nextOccurrence(date: string, current = today()) {
  if (!date) return null;
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

type LunarDay = { month: number; day: number; leap: boolean; time: number };
const lunarYears = new Map<number, LunarDay[]>();
const lunarFormatter = new Intl.DateTimeFormat("en-US-u-ca-chinese", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
function lunarYearDays(year: number) {
  const cached = lunarYears.get(year);
  if (cached) return cached;
  const days: LunarDay[] = [];
  // A complete lunar year always lies between these Gregorian boundaries.
  for (let time = Date.UTC(year, 0, 1); time < Date.UTC(year + 1, 2, 1); time += DAY) {
    const parts = lunarFormatter.formatToParts(new Date(time));
    const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
    if (Number(value("relatedYear")) !== year) continue;
    const month = value("month");
    days.push({
      month: parseInt(month, 10),
      day: Number(value("day")),
      leap: month.endsWith("bis"),
      time,
    });
  }
  lunarYears.set(year, days);
  return days;
}
export function readableLunarDate(date: string, leap = false) {
  if (!date) return "还未设置";
  const [month, day] = date.split("-").map(Number);
  return "农历 " + (leap ? "闰" : "") + month + " 月 " + day + " 日";
}
export function nextLunarOccurrence(date: string, leap = false, current = today()) {
  if (!date) return null;
  const [month, day] = date.split("-").map(Number);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 30)) return null;
  const currentTime = timestamp(current);
  const year = Number(current.slice(0, 4));
  for (const lunarYear of [year - 1, year, year + 1]) {
    const monthDays = lunarYearDays(lunarYear).filter((item) => item.month === month);
    // A leap-month birthday falls in the regular month when the leap month is absent.
    const useLeap = leap && monthDays.some((item) => item.leap);
    const eligible = monthDays.filter((item) => item.leap === useLeap);
    const selected =
      eligible.find((item) => item.day === day) || (day === 30 ? eligible.at(-1) : undefined);
    if (selected && selected.time >= currentTime)
      return Math.round((selected.time - currentTime) / DAY);
  }
  return null;
}
