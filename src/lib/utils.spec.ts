import { describe, expect, it } from "vitest";
import { cn, formatDateTime } from "./utils";

const DATE_TIME_REGEX = /\d{2}\/\d{2}\/\d{2}.*\d{2}:\d{2}/;

describe("utils", () => {
  it("cn merges class names and tailwind utilities", () => {
    expect(cn("px-2", false, "text-sm", "px-4")).toContain("px-4");
  });

  it("formatDateTime produces dd/mm/yy hh:mm (en-GB)", () => {
    const date = new Date("2024-01-02T03:04:00Z");
    const formatted = formatDateTime(date);
    // en-GB may include comma between date and time in some environments
    expect(formatted).toMatch(DATE_TIME_REGEX);
  });
});
