import { describe, expect, it } from "vitest";
import { EMPTY_TEXT, formatDateTime, formatNumber, formatPct, resolveSourceLabel } from "../utils";

describe("home utils", () => {
  it("formats numbers and percentages", () => {
    expect(formatNumber(1234.5678)).toBe("1234.57");
    expect(formatNumber(1234.5678, 4)).toBe("1234.5678");
    expect(formatPct(12.345)).toBe("12.35%");
    expect(formatPct(-5.67)).toBe("-5.67%");
  });

  it("returns the shared empty placeholder for invalid values", () => {
    expect(formatNumber(null)).toBe(EMPTY_TEXT);
    expect(formatNumber(undefined)).toBe(EMPTY_TEXT);
    expect(formatNumber(Number.NaN)).toBe(EMPTY_TEXT);
    expect(formatPct(null)).toBe(EMPTY_TEXT);
    expect(formatDateTime("")).toBe(EMPTY_TEXT);
    expect(resolveSourceLabel(undefined)).toBe(EMPTY_TEXT);
  });

  it("formats dates and source labels", () => {
    expect(formatDateTime("2024-01-15T14:30:00")).toBe("01-15 14:30");
    expect(formatDateTime("invalid-date")).toBe("invalid-date");
    expect(resolveSourceLabel("realtime")).toBe("实时估值");
    expect(resolveSourceLabel("official")).toBe("官方净值");
    expect(resolveSourceLabel("transition")).toBe("官方切换中");
    expect(resolveSourceLabel("holdings")).toBe("持仓估算");
    expect(resolveSourceLabel(null, true)).toBe("休市，沿用上一交易日");
  });
});
