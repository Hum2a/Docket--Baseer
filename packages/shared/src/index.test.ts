import { describe, expect, it } from "vitest";
import { isReminderDueSoon } from "./index";

describe("isReminderDueSoon", () => {
  const now = new Date("2026-07-18T12:00:00Z");

  it("returns true for overdue incomplete reminders", () => {
    expect(isReminderDueSoon("2026-07-17T00:00:00Z", false, now)).toBe(true);
  });

  it("returns true within 3 days", () => {
    expect(isReminderDueSoon("2026-07-20T00:00:00Z", false, now)).toBe(true);
  });

  it("returns false beyond horizon or when completed", () => {
    expect(isReminderDueSoon("2026-07-25T00:00:00Z", false, now)).toBe(false);
    expect(isReminderDueSoon("2026-07-17T00:00:00Z", true, now)).toBe(false);
  });
});
