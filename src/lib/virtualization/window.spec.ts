import { describe, expect, it } from "vitest";
import { computePadding, computeWindow } from "./window";

describe("virtual window", () => {
  const SCROLL_TOP = 120;
  const SCROLL_BOTTOM = 200;
  const START_INDEX = 10;
  const END_INDEX = 25;
  const TOTAL_HEIGHT = 200;
  const ROW_HEIGHT = 60;
  const EXPECTED_TOP_PAD = 600;

  const cfg = { rowHeight: 60, viewBufferRows: 6, viewportHeight: 560 };

  it("computes start and end indices", () => {
    const { startIndex, endIndex } = computeWindow(
      SCROLL_TOP,
      SCROLL_BOTTOM,
      cfg
    );
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(endIndex).toBeGreaterThan(startIndex);
  });

  it("computes padding values", () => {
    const { topPad, bottomPad } = computePadding(
      START_INDEX,
      END_INDEX,
      TOTAL_HEIGHT,
      ROW_HEIGHT
    );
    expect(topPad).toBe(EXPECTED_TOP_PAD);
    expect(bottomPad).toBeGreaterThan(0);
  });
});
