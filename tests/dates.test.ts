import { describe, expect, it } from "vitest";
import { formatDate, parseDisplayDate } from "../src/lib/dates";

describe("date-only UI formatting", () => {
  it.each([
    "2026-01-01",
    "2026-12-31",
    "2024-02-29",
    "2000-02-29",
    "0099-01-01",
  ])("round trips %s without timezone conversion", (iso) => {
    expect(parseDisplayDate(formatDate(iso))).toBe(iso);
  });
  it("uses fixed month-day-year order", () =>
    expect(formatDate("2026-09-15")).toBe("09-15-2026"));
  it.each([
    "02-29-2026",
    "02-29-1900",
    "02-30-2024",
    "04-31-2026",
    "00-01-2026",
    "13-01-2026",
    "01-00-2026",
    "2026-01-01",
    "1-1-2026",
    "01/01/2026",
    "",
    "01-01-26",
  ])("rejects invalid input %s", (value) => {
    expect(parseDisplayDate(value)).toBeUndefined();
  });
});
