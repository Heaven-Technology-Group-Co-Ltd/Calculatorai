import { describe, expect, it } from "vitest";
import { formatActivityTime } from "./RecentActivityFeed";

describe("recent activity time", () => {
  const now = Date.parse("2026-11-28T00:00:00Z");
  it("renders multi-day ages in days", () => {
    expect(formatActivityTime(new Date(now - 2 * 86400000).toISOString(), "en", now)).toContain("2 days ago");
  });
  it("renders older activity as a calendar date", () => {
    expect(formatActivityTime("2026-09-01T00:00:00Z", "en-US", now)).toBe("9/1/2026");
  });
});
