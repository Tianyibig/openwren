import { currentLanguage } from "./currentLanguage";

const DAY = 24 * 60 * 60 * 1000;

// Own name tables: Intl output differs between runtimes ("Sep" vs "Sept").
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Chinese writes months and weekdays as numbers and characters rather than names.
const MONTHS_ZH = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const chinese = () => currentLanguage() === "zh";

/** "14 Sep 2025", or "2025年9月14日" */
function dayMonthYear(d: Date): string {
  if (chinese()) return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between `date` and `now` (0 = today, 1 = yesterday). */
export function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

/** Section heading for the message list. */
export function groupLabel(date: Date, now: Date): string {
  const d = daysAgo(date, now);
  if (d <= 0) return chinese() ? "今天" : "Today";
  if (d === 1) return chinese() ? "昨天" : "Yesterday";
  if (d < 7) return chinese() ? "本周" : "This week";
  if (date.getFullYear() === now.getFullYear()) {
    return chinese() ? MONTHS_ZH[date.getMonth()] : MONTHS[date.getMonth()];
  }
  return String(date.getFullYear());
}

const pad = (n: number) => String(n).padStart(2, "0");

let twelveHour = false;

/** Show times as "3:05 PM" (true) or "15:05" (false). Set from the "Time format" setting. */
export function useTwelveHourClock(on: boolean) {
  twelveHour = on;
}

/** The time of day: "15:05", or "3:05 PM" with the 12-hour clock. */
export function clock(date: Date): string {
  const minutes = pad(date.getMinutes());
  if (!twelveHour) return `${date.getHours()}:${minutes}`;
  const hour = `${date.getHours() % 12 || 12}:${minutes}`;
  const half = date.getHours() < 12;
  if (chinese()) return `${half ? "上午" : "下午"} ${hour}`;
  return `${hour} ${half ? "AM" : "PM"}`;
}

/** Short time for a list row: "11:58", "Wed 15:55" or "14 Sep 2025". */
export function shortTime(date: Date, now: Date): string {
  const d = daysAgo(date, now);
  const hm = clock(date);
  if (d <= 0) return hm;
  if (d < 7) return `${chinese() ? WEEKDAYS_ZH[date.getDay()] : WEEKDAYS[date.getDay()]} ${hm}`;
  return dayMonthYear(date);
}

/** Full time for the reading pane. */
export function longTime(date: Date, now: Date): string {
  const d = daysAgo(date, now);
  const hm = clock(date);
  if (d <= 0) return `${chinese() ? "今天" : "Today"} ${hm}`;
  if (d === 1) return `${chinese() ? "昨天" : "Yesterday"} ${hm}`;
  return chinese() ? `${dayMonthYear(date)} ${hm}` : `${dayMonthYear(date)}, ${hm}`;
}

/** Date that lies `years` calendar years before `now`. */
export function yearsBefore(now: Date, years: number): Date {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d;
}
