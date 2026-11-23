import { afterEach, describe, expect, it } from "vitest";
import { clock, groupLabel, longTime, shortTime, useTwelveHourClock } from "./dates";
import { setLanguage } from "./currentLanguage";

const now = new Date(2026, 10, 16, 12, 0); // 16 November 2026, noon

afterEach(() => {
  setLanguage("en");
  useTwelveHourClock(false);
});

describe("dates in Chinese", () => {
  it("writes the list headings the way Chinese does", () => {
    setLanguage("zh");
    expect(groupLabel(new Date(2026, 10, 16, 8, 0), now)).toBe("今天");
    expect(groupLabel(new Date(2026, 10, 15, 8, 0), now)).toBe("昨天");
    expect(groupLabel(new Date(2026, 10, 12), now)).toBe("本周");
    expect(groupLabel(new Date(2026, 5, 1), now)).toBe("6月");
    expect(groupLabel(new Date(2024, 5, 1), now)).toBe("2024");
  });

  it("writes the full date and the day of the week in Chinese", () => {
    setLanguage("zh");
    expect(shortTime(new Date(2026, 10, 13, 15, 55), now)).toBe("周五 15:55");
    expect(shortTime(new Date(2026, 8, 14, 9, 0), now)).toBe("2026年9月14日");
    expect(longTime(new Date(2026, 10, 16, 15, 5), now)).toBe("今天 15:05");
    expect(longTime(new Date(2026, 10, 15, 15, 5), now)).toBe("昨天 15:05");
    expect(longTime(new Date(2026, 8, 14, 9, 0), now)).toBe("2026年9月14日 9:00");
  });

  it("writes half a day as 上午 and 下午", () => {
    setLanguage("zh");
    useTwelveHourClock(true);
    expect(clock(new Date(2026, 10, 16, 15, 5))).toBe("下午 3:05");
    expect(clock(new Date(2026, 10, 16, 9, 5))).toBe("上午 9:05");
  });
});

describe("dates in English", () => {
  it("leaves the existing wording alone", () => {
    expect(groupLabel(new Date(2026, 10, 16, 8, 0), now)).toBe("Today");
    expect(groupLabel(new Date(2026, 10, 12), now)).toBe("This week");
    expect(groupLabel(new Date(2026, 5, 1), now)).toBe("June");
    expect(longTime(new Date(2026, 8, 14, 9, 0), now)).toBe("14 Sep 2026, 9:00");
    useTwelveHourClock(true);
    expect(clock(new Date(2026, 10, 16, 15, 5))).toBe("3:05 PM");
  });
});
